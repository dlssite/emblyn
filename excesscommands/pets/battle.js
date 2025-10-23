const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const { GuildSettings } = require('../../models/guild/GuildSettings');
const { activeBattles } = require('./battleState');

/**
 * Creates a battle-ready clone of a pet, including applying passive abilities.
 * @param {object} pet - The original Mongoose pet document.
 * @returns {{pet: object, effects: string[]}} - The cloned pet with modified stats and a list of effect messages.
 */
const initializePetForBattle = (pet) => {
    // A more robust way to clone the pet object for battle
    const battlePet = {
        ...pet.toObject(), // Copies all top-level fields from the document
        statusEffects: [], // Ensure statusEffects is always an array
    };
    
    const effects = [];

    if (battlePet.specialAbilities && Array.isArray(battlePet.specialAbilities)) {
        for (const ability of battlePet.specialAbilities) {
            if (ability.type === 'passive' && ability.effect) {
                let message = '';
                if (ability.effect.defenseBoost) {
                    battlePet.stats.defense += ability.effect.defenseBoost;
                    message = `🛡️ **${ability.name}** boosted ${battlePet.name}\'s defense by ${ability.effect.defenseBoost}!`;
                }
                if (ability.effect.allyAttackUp) { // In 1v1, this is a self-buff
                    battlePet.stats.attack += ability.effect.allyAttackUp;
                    message = `⚔️ **${ability.name}** boosted ${battlePet.name}\'s attack by ${ability.effect.allyAttackUp}!`;
                }
                if (ability.effect.randomBuff) {
                    const statsToBuff = ability.effect.randomBuff;
                    const randomStat = statsToBuff[Math.floor(Math.random() * statsToBuff.length)];
                    const boostAmount = Math.round(battlePet.stats[randomStat] * 0.15); // 15% boost
                    battlePet.stats[randomStat] += boostAmount;
                    message = `✨ **${ability.name}** randomly boosted ${battlePet.name}\'s ${randomStat} by ${boostAmount}!`;
                }
                if (message) effects.push(message);
            }
        }
    }
    return { pet: battlePet, effects };
};


module.exports = {
    name: 'battle',
    description: 'Challenge another user to a pet battle.',
    async execute(message, args) {
        const guildSettings = await GuildSettings.findOne({ guildId: message.guild.id });
        const battleChannelId = guildSettings ? guildSettings.battleChannelId : null;

        if (!battleChannelId) {
            return message.reply('A battle channel has not been set up for this server. An admin must run the `/setup-battle-channel` command first.');
        }

        const battle = [...activeBattles.values()].find(b => b.participants.has(message.author.id));

        if (battle) {
            return message.reply(`You are already in a battle. Head to <#${battleChannelId}> to fight!`);
        }

        const opponentUser = message.mentions.users.first();

        if (!opponentUser) {
            return message.reply('Usage: `$pet battle @user <your-pet-name>`');
        }

        if (opponentUser.bot || opponentUser.id === message.author.id) {
            return message.reply('You cannot battle a bot or yourself.');
        }
        
        const challengerId = message.author.id;
        const challengerPets = await Pet.find({ ownerId: challengerId, isDead: false });

        if (challengerPets.length === 0) {
            return message.reply('You have no available pets to battle with.');
        }

        const petNameArg = args.filter(arg => !arg.startsWith('<@')).join(' ').trim();
        let challengerPetDoc;

        if (petNameArg) {
            challengerPetDoc = challengerPets.find(p => p.name.toLowerCase() === petNameArg.toLowerCase());
            if (!challengerPetDoc) {
                return message.reply(`You do not own an undefeated pet named "${petNameArg}".`);
            }
        } else {
            const options = challengerPets.map(pet => ({
                label: pet.name,
                description: `HP: ${pet.stats.hp}, Atk: ${pet.stats.attack}, Def: ${pet.stats.defense}, Spd: ${pet.stats.speed}`,
                value: pet._id.toString(),
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('challenger_pet_select')
                    .setPlaceholder('Select your pet for the battle...')
                    .addOptions(options)
            );

            const selectMessage = await message.reply({ content: 'Please select your pet for the battle:', components: [row] });

            const collector = selectMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect, time: 60000, filter: i => i.user.id === challengerId
            });

            challengerPetDoc = await new Promise(resolve => {
                collector.on('collect', async i => {
                    const selectedPet = challengerPets.find(p => p._id.toString() === i.values[0]);
                    await i.update({ content: `You have selected **${selectedPet.name}**.`, components: [] });
                    resolve(selectedPet);
                });
                collector.on('end', collected => {
                    if (collected.size === 0) resolve(null);
                });
            });

            if (!challengerPetDoc) return message.channel.send('Pet selection timed out.');
        }


        const battleId1 = `${challengerId}-${opponentUser.id}`;
        const battleId2 = `${opponentUser.id}-${challengerId}`;
        if (activeBattles.has(battleId1) || activeBattles.has(battleId2)) {
            return message.reply('There is already an active battle or challenge between you and this user.');
        }

        const challengeEmbed = new EmbedBuilder()
            .setTitle('⚔️ A Battle Challenge has been issued! ⚔️')
            .setDescription(`${opponentUser.username}, ${message.author.username} challenges you to a battle with **${challengerPetDoc.name}**.\n\nDo you accept? (yes/no)`)
            .setColor('#FFD700');
        const challengeMessage = await message.channel.send({ content: `${opponentUser}`, embeds: [challengeEmbed] });

        const filter = (response) => response.author.id === opponentUser.id && ['yes', 'no'].includes(response.content.toLowerCase());
        try {
            const collected = await message.channel.awaitMessages({ filter, time: 60000, max: 1, errors: ['time'] });
            if (collected.first().content.toLowerCase() === 'yes') {
                const opponentPets = await Pet.find({ ownerId: opponentUser.id, isDead: false });
                if (opponentPets.length === 0) {
                    return challengeMessage.reply('You have no available pets to battle with.');
                }

                const options = opponentPets.map(pet => ({
                    label: pet.name,
                    description: `HP: ${pet.stats.hp}, Atk: ${pet.stats.attack}, Def: ${pet.stats.defense}, Spd: ${pet.stats.speed}`,
                    value: pet._id.toString(),
                }));

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('opponent_pet_select')
                        .setPlaceholder('Select your pet...')
                        .addOptions(options)
                );

                const selectMessage = await challengeMessage.reply({ content: `${opponentUser.username}, please select your pet for the battle:`, components: [row] });

                const collector = selectMessage.createMessageComponentCollector({ 
                    componentType: ComponentType.StringSelect, time: 60000, filter: i => i.user.id === opponentUser.id
                });
                
                const opponentPetDoc = await new Promise(resolve => {
                    collector.on('collect', async i => {
                        const selectedPet = opponentPets.find(p => p._id.toString() === i.values[0]);
                        await i.update({ content: `You have selected **${selectedPet.name}**.`, components: [] });
                        resolve(selectedPet);
                    });
                    collector.on('end', collected => {
                        if (collected.size === 0) resolve(null);
                    });
                });

                if (!opponentPetDoc) return message.channel.send('Pet selection timed out.');


                const { pet: challengerBattlePet, effects: challengerEffects } = initializePetForBattle(challengerPetDoc);
                const { pet: opponentBattlePet, effects: opponentEffects } = initializePetForBattle(opponentPetDoc);

                let firstTurnUser, turnMessage;
                if (challengerBattlePet.stats.speed > opponentBattlePet.stats.speed) {
                    firstTurnUser = message.author;
                    turnMessage = `**${challengerBattlePet.name}** is faster and gets the first move!`;
                } else if (opponentBattlePet.stats.speed > challengerBattlePet.stats.speed) {
                    firstTurnUser = opponentUser;
                    turnMessage = `**${opponentBattlePet.name}** is faster and gets the first move!`;
                } else {
                    firstTurnUser = Math.random() < 0.5 ? message.author : opponentUser;
                    turnMessage = `Both pets have the same speed! By a coin toss, **${firstTurnUser.username}** gets the first move!`;
                }

                const newBattle = {
                    id: battleId1,
                    turn: firstTurnUser.id,
                    participants: new Map([
                        [challengerId, { user: message.author, pet: challengerBattlePet, originalPetId: challengerPetDoc._id }],
                        [opponentUser.id, { user: opponentUser, pet: opponentBattlePet, originalPetId: opponentPetDoc._id }]
                    ]),
                };
                activeBattles.set(battleId1, newBattle);

                const battleChannel = message.guild.channels.cache.get(battleChannelId);
                if (!battleChannel) {
                    return message.reply('The battle channel is missing or has been deleted. Please ask an admin to reconfigure it.');
                }

                await message.reply(`The challenge was accepted! Head to <#${battleChannelId}> to begin the fight!`);

                let battleStartMessage = `The battle between ${message.author.username} and ${opponentUser.username} begins!\n\n${turnMessage}\n\nIt is **${firstTurnUser.username}**'s turn!\nUse \`$pet move <ability name>\` to attack.`;
                const allEffects = [...challengerEffects, ...opponentEffects];
                if (allEffects.length > 0) {
                    battleStartMessage += '\n\n**Passive abilities activated:**\n' + allEffects.join('\n');
                }

                const startEmbed = new EmbedBuilder()
                    .setTitle('🔥 The Battle Begins! 🔥')
                    .setDescription(battleStartMessage)
                    .setColor('#FF0000');
                await battleChannel.send({ embeds: [startEmbed] });

            } else {
                await message.channel.send('The challenge was declined.');
            }
        } catch (err) {
            console.log(err);
            await message.channel.send('The challenge expired or something went wrong.');
        }
    },
};