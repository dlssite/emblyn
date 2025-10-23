const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField, EmbedBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const { Event: EventModel } = require('../../models/pets/events');
const { Pet } = require('../../models/pets/pets');
const { updateGold, addToInventory } = require('../../models/economy');
const { GuildSettings } = require('../../models/guild/GuildSettings');
const petShopItems = require('../../data/petShopItems');
const { v4: uuidv4 } = require('uuid');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function concludeBattle(thread, eventData, participantPets) {
    await sleep(3000);

    const petUpdatePromises = participantPets.map(p => {
        const finalHp = Math.max(0, p.currentHp);
        const isDead = finalHp <= 0;
        return Pet.findByIdAndUpdate(p.petId, {
            $set: {
                'stats.hp': finalHp,
                'isDead': isDead
            },
            $inc: {
                'stats.energy': -50
            }
        });
    });

    await Promise.all(petUpdatePromises);
    if (participantPets.length > 0) {
        await thread.send('The health and energy of all participating pets have been updated.');
    }

    if (eventData.bossHp <= 0) {
        const victoryEmbed = new EmbedBuilder().setTitle(`🎉 ${eventData.name} has been defeated! 🎉`).setDescription('The pets fought valiantly and emerged victorious! Distributing rewards...').setColor('#00FF00').setTimestamp();
        await thread.send({ embeds: [victoryEmbed] });

        const { gold, item, xp } = eventData.rewards;
        const allItems = Object.values(petShopItems).flat();
        const itemData = allItems.find(i => i.id === item);

        if (!itemData) {
            console.error(`Could not find item with id: ${item}`);
        }
        
        const rewardPromises = Array.from(eventData.participants.entries()).map(async ([userId, pData]) => {
            if (pData.petId) {
                const promises = [
                    updateGold(userId, gold),
                    Pet.findByIdAndUpdate(pData.petId, { $inc: { xp } })
                ];
                if (itemData) {
                    promises.push(addToInventory(userId, { ...itemData, uniqueId: uuidv4() }));
                }
                await Promise.all(promises);
            }
        });
        await Promise.all(rewardPromises);

        let rewardMessage = `All participants received **${gold} Gold** and their pet gained **${xp} XP**!`;
        if (itemData) {
            rewardMessage = `All participants received **${gold} Gold**, **1x ${itemData.name}**, and their pet gained **${xp} XP**!`;
        }
        await thread.send(rewardMessage);

    } else {
        await thread.send({ embeds: [new EmbedBuilder().setTitle(`☠️ The pets have been defeated. ☠️`).setDescription(`**${eventData.name}** was too strong and has escaped.`).setColor('#FF0000').setTimestamp()] });
    }

    await EventModel.findOneAndUpdate({ eventId: eventData.eventId }, { $set: { endAt: new Date(), bossHp: eventData.bossHp } });
    await sleep(10000);
    await thread.send('This thread will now be archived.');
    await thread.setArchived(true);
}

async function startAutomatedBattle(client, eventId, guildId, lobbyMessage) {
    try {
        const eventData = await EventModel.findOne({ eventId });
        if (!eventData) return;

        const thread = await lobbyMessage.startThread({ name: `Battle vs. ${eventData.name}`, autoArchiveDuration: 60 });
        const participantPets = Array.from(eventData.participants.values()).map(data => ({ ...data.toObject(), currentHp: data.hp }));

        if (participantPets.length === 0) {
            await thread.send(`**${eventData.name}** leaves, as no pets answered the call.`);
            await EventModel.findOneAndDelete({ eventId });
            return thread.setArchived(true);
        }

        await thread.send({ embeds: [new EmbedBuilder().setTitle(`The battle against ${eventData.name} begins!`).setDescription(`**${participantPets.length}** pets have joined the fight!`).setImage(eventData.image).setColor('#ff0000')] });
        await sleep(5000);

        let battleTurn = 1;
        const battleInterval = setInterval(async () => {
            let state = await EventModel.findOne({ eventId });
            if (!state || state.bossHp <= 0 || participantPets.every(p => p.currentHp <= 0)) {
                clearInterval(battleInterval);
                return concludeBattle(thread, state, participantPets);
            }

            let turnLog = `**Turn ${battleTurn} - Pets\' Attack!**\n`;
            let totalDamageThisTurn = 0;
            participantPets.forEach(p => {
                if (p.currentHp > 0 && state.bossHp > 0) {
                    const damage = Math.max(1, Math.floor(p.attack * (Math.random() * (1.2 - 0.8) + 0.8)));
                    state.bossHp -= damage;
                    totalDamageThisTurn += damage;
                    const ability = (p.abilities && p.abilities.length > 0) ? p.abilities[Math.floor(Math.random() * p.abilities.length)] : 'Basic Attack';
                    turnLog += `💥 **${p.name}** uses **${ability}** and deals **${damage}** damage!\n`;
                }
            });
            turnLog += `\n🔥 **Total damage this turn:** ${totalDamageThisTurn}`;

            const petHpField = { name: 'Pet Health', value: participantPets.map(p => `**${p.name}**: ${Math.max(0, p.currentHp)} / ${p.hp}`).join('\n'), inline: true };
            const bossHpField = { name: 'Boss HP', value: `**${Math.max(0, state.bossHp)}** / ${state.maxHp}`, inline: true };
            await thread.send({ embeds: [new EmbedBuilder().setColor('#FFFF00').setDescription(turnLog).setFields(petHpField, bossHpField)] });
            await EventModel.updateOne({ eventId }, { $set: { bossHp: state.bossHp } });
            await sleep(4000);

            state = await EventModel.findOne({ eventId });
            if (state.bossHp <= 0) return;

            let bossLog = `**Turn ${battleTurn} - ${state.name}\'s Attack!**\n`;
            const alivePets = participantPets.filter(p => p.currentHp > 0);
            if (alivePets.length > 0) {
                const target = alivePets[Math.floor(Math.random() * alivePets.length)];
                const damage = Math.max(1, Math.floor((state.rewards.gold / 4) * (Math.random() * (1.5 - 0.5) + 0.5)));
                target.currentHp -= damage;
                bossLog += `**${state.name}** strikes **${target.name}** for **${damage}** damage! **${target.name}** has **${Math.max(0, target.currentHp)}** HP remaining.`;
                 if (target.currentHp <= 0) bossLog += ` **${target.name}** is knocked out!`;
            }

            const updatedPetHpField = { name: 'Pet Health', value: participantPets.map(p => `**${p.name}**: ${Math.max(0, p.currentHp)} / ${p.hp}`).join('\n'), inline: true };
            const updatedBossHpField = { name: 'Boss HP', value: `**${Math.max(0, state.bossHp)}** / ${state.maxHp}`, inline: true };
            await thread.send({ embeds: [new EmbedBuilder().setColor('#FF4500').setDescription(bossLog).setFields(updatedPetHpField, updatedBossHpField)] });
            await sleep(4000);

            battleTurn++;
        }, 12000);
    } catch (e) { console.error("Battle startup error:", e); }
}

module.exports = {
    name: 'spawnboss',
    description: 'Spawns a world boss.',
    async execute(message) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('boss-spawn-start').setLabel('Spawn Boss').setStyle(ButtonStyle.Primary));
        const reply = await message.reply({ content: 'Click to configure a world boss.', components: [row] });

        const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return i.reply({ content: 'Not for you!', flags: [MessageFlags.Ephemeral] });

            const modal = new ModalBuilder().setCustomId('boss-spawn-modal').setTitle('Spawn World Boss');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Name').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('hp').setLabel('HP').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gold').setLabel('Gold Reward').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item').setLabel('Item Reward ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image').setLabel('Image URL').setStyle(TextInputStyle.Short).setRequired(false))
            );
            await i.showModal(modal);

            try {
                const modalInteraction = await i.awaitModalSubmit({ time: 300000 });
                const settings = await GuildSettings.findOne({ guildId: message.guild.id });
                if (!settings || !settings.bossFightChannelId) return modalInteraction.reply({ content: 'Boss channel not set.', flags: [MessageFlags.Ephemeral] });
                
                const channel = message.guild.channels.cache.get(settings.bossFightChannelId);
                if (!channel) return modalInteraction.reply({ content: 'Boss channel not found.', flags: [MessageFlags.Ephemeral] });

                const lobbyMinutes = 5;
                const startTime = new Date();
                const hp = parseInt(modalInteraction.fields.getTextInputValue('hp'));
                const eventId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

                const newEvent = new EventModel({
                    eventId, name: modalInteraction.fields.getTextInputValue('name'),
                    startAt: startTime, endAt: new Date(startTime.getTime() + lobbyMinutes * 60000),
                    bossHp: hp, maxHp: hp, image: modalInteraction.fields.getTextInputValue('image') || null,
                    rewards: { gold: parseInt(modalInteraction.fields.getTextInputValue('gold')), item: modalInteraction.fields.getTextInputValue('item'), xp: Math.floor(hp / 2) }
                });
                await newEvent.save();

                await modalInteraction.reply({ content: `Spawned **${newEvent.name}** in ${channel}!`, flags: [MessageFlags.Ephemeral] });

                const embed = new EmbedBuilder().setTitle(`A wild ${newEvent.name} appears!`).setDescription(`Join the battle! Starts in ${lobbyMinutes} mins.`).setImage(newEvent.image).setColor('#FFA500').addFields({ name: 'Participants (0)', value: 'None yet.' });
                const msg = await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`boss-join_${eventId}`).setLabel('Join!').setStyle(ButtonStyle.Success))] });

                const lobbyCollector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: lobbyMinutes * 60000 });

                lobbyCollector.on('collect', async joinInteraction => {
                    const collectedEventId = joinInteraction.customId.split('_')[1];
                    const userPets = await Pet.find({ ownerId: joinInteraction.user.id, isDead: false, "stats.energy": { $gt: 0 } });
                    if (userPets.length === 0) return joinInteraction.reply({ content: 'You have no eligible pets.', flags: [MessageFlags.Ephemeral] });

                    const eventData = await EventModel.findOne({ eventId: collectedEventId });
                    if (!eventData || eventData.participants.has(joinInteraction.user.id)) return joinInteraction.reply({ content: 'You already joined!', flags: [MessageFlags.Ephemeral] });

                    const options = userPets.map(p => ({ label: `${p.name} (Lvl ${p.level})`, description: `ATK: ${p.stats.attack}/HP: ${p.stats.hp}`, value: p._id.toString() }));
                    const menu = new StringSelectMenuBuilder().setCustomId(`boss-pet-select_${collectedEventId}`).setPlaceholder('Choose your champion!').addOptions(options);
                    await joinInteraction.reply({ content: 'Which pet will you send?', components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral] });
                    const menuMessage = await joinInteraction.fetchReply();


                    try {
                        const selectInteraction = await menuMessage.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60000 });
                        const petId = selectInteraction.values[0];
                        const chosenPet = userPets.find(p => p._id.toString() === petId);

                        const updatedEvent = await EventModel.findOneAndUpdate(
                            { eventId: collectedEventId, [`participants.${selectInteraction.user.id}`]: { $exists: false } },
                            {
                                $set: {
                                    [`participants.${selectInteraction.user.id}`]: {
                                        petId: chosenPet._id.toString(),
                                        name: chosenPet.name,
                                        attack: chosenPet.stats.attack,
                                        hp: chosenPet.stats.hp,
                                        abilities: (chosenPet.abilities && chosenPet.abilities.length > 0) ? chosenPet.abilities.map(a => a.name) : ['Basic Attack'],
                                    }
                                }
                            },
                            { new: true }
                        );

                        if (!updatedEvent) {
                            return selectInteraction.update({ content: 'You have already joined this battle!', components: [] });
                        }

                        await selectInteraction.update({ content: `**${chosenPet.name}** is ready for battle!`, components: [] });

                        const participantList = Array.from(updatedEvent.participants.entries()).map(([userId, data]) => `<@${userId}> (**${data.name}**)`).join('\n') || 'No one yet.';
                        const updatedEmbed = EmbedBuilder.from(msg.embeds[0]).setFields({ name: `Participants (${updatedEvent.participants.size})`, value: participantList });
                        await msg.edit({ embeds: [updatedEmbed] });

                    } catch (err) {
                        if (err.code === 'InteractionCollectorError') {
                           await joinInteraction.editReply({ content: 'You took too long to select a pet.', components: []});
                        }
                    }
                });

                lobbyCollector.on('end', async () => {
                    const finalEvent = await EventModel.findOne({ eventId });
                    if (finalEvent) {
                        await msg.edit({ content: `Lobby closed! The battle against **${finalEvent.name}** begins!`, components: [] });
                        startAutomatedBattle(message.client, eventId, message.guild.id, msg);
                    }
                });

            } catch (err) { if (err.code !== 'InteractionCollectorError') console.error("Modal/Lobby Error:", err); }
        });
    },
};
