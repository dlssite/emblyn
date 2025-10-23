const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Event } = require('../../models/pets/events');
const { Pet } = require('../../models/pets/pets');
const { updateGold, addToInventory } = require('../../models/economy');
const { GuildSettings } = require('../../models/guild/GuildSettings');
const { v4: uuidv4 } = require('uuid');
const allShopItems = Object.values(require('../../data/petShopItems')).flat();

async function startAutomatedBattle(client, eventId, guildId) {
    const event = await Event.findById(eventId);
    if (!event || event.type !== 'boss') return;

    const guildSettings = await GuildSettings.findOne({ guildId });
    const channel = client.channels.cache.get(guildSettings.bossFightChannelId);

    if (!channel) return;

    const participants = Array.from(event.participants.keys());
    const participantPets = [];
    for (const userId of participants) {
        const pets = await Pet.find({ ownerId: userId, isDead: false, 'stats.hp': { $gt: 0 }, 'stats.energy': { $gte: 50 } });
        if (pets.length > 0) {
            const petIds = pets.map(p => p._id);
            await Pet.updateMany({ _id: { $in: petIds } }, { $inc: { 'stats.energy': -50 } });
            participantPets.push(...pets.map(pet => ({ ...pet.toObject(), ownerId: userId })));
        }
    }

    if (participantPets.length === 0) {
        await channel.send(`The boss, **${event.name}**, has appeared, but no pets were ready to fight. The boss leaves victorious.`);
        event.endAt = new Date();
        await event.save();
        return;
    }

    let battleLog = 'The battle begins!\n\n';
    const battleEmbed = new EmbedBuilder()
        .setTitle(`Automated Battle: ${event.name}`)
        .setDescription('The fight is starting... get ready!')
        .setColor('#ff0000');
    const battleMessage = await channel.send({ embeds: [battleEmbed] });

    const interval = setInterval(async () => {
        let turnLog = '';

        // Pets' turn
        participantPets.forEach(pet => {
            if (pet.stats.hp > 0 && event.bossHp > 0) {
                const damage = Math.max(1, Math.floor(pet.stats.attack * (Math.random() * 0.5 + 0.75)));
                event.bossHp -= damage;
                turnLog += `${pet.name} hits **${event.name}** for ${damage} damage!\n`;
            }
        });

        // Boss's turn
        if (event.bossHp > 0) {
            const alivePets = participantPets.filter(p => p.stats.hp > 0);
            if (alivePets.length > 0) {
                const targetPet = alivePets[Math.floor(Math.random() * alivePets.length)];
                const damage = Math.max(1, Math.floor(event.rewards.gold * 0.1 * (Math.random() * 0.5 + 0.75)));
                targetPet.stats.hp -= damage;
                turnLog += `**${event.name}** strikes ${targetPet.name} for ${damage} damage!\n`;
            }
        }

        battleLog += turnLog + '\n';
        const updatedEmbed = new EmbedBuilder()
            .setTitle(`Automated Battle: ${event.name}`)
            .setDescription(battleLog)
            .setColor('#ff0000')
            .addFields(
                { name: 'Boss HP', value: `${event.bossHp > 0 ? event.bossHp : 0}` },
                { name: 'Pets Remaining', value: `${participantPets.filter(p => p.stats.hp > 0).length}` }
            );
        await battleMessage.edit({ embeds: [updatedEmbed] });

        if (event.bossHp <= 0 || participantPets.every(p => p.stats.hp <= 0)) {
            clearInterval(interval);
            concludeBattle(channel, event, participantPets);
        }
    }, 5000);
}

async function concludeBattle(channel, event, participantPets) {
    const petUpdatePromises = participantPets.map(p => {
        const hp = Math.max(0, p.stats.hp);
        const isDead = hp <= 0;
        return Pet.updateOne({ _id: p._id }, { $set: { 'stats.hp': hp, isDead: isDead } });
    });
    await Promise.all(petUpdatePromises);

    if (event.bossHp <= 0) {
        await channel.send(`**${event.name} has been defeated!** Distributing rewards...`);

        const { gold: goldReward, item: itemRewardId, xp: xpReward } = event.rewards;
        const itemTemplate = allShopItems.find(i => i.id === itemRewardId);

        if (!itemTemplate) {
            console.error(`Could not find item with ID: ${itemRewardId}`);
        }

        const participants = Array.from(event.participants.keys());
        const rewardPromises = participants.map(async (userId) => {
            if (goldReward > 0) await updateGold(userId, goldReward);
            if (itemTemplate) {
                const itemData = { ...itemTemplate, uniqueId: uuidv4(), purchasePrice: 0, purchaseDate: new Date() };
                await addToInventory(userId, itemData);
            }
            if (xpReward > 0) {
                const userPetsInBattle = participantPets.filter(p => p.ownerId === userId);
                if (userPetsInBattle.length > 0) {
                    const xpPerPet = Math.floor(xpReward / userPetsInBattle.length);
                    if (xpPerPet > 0) {
                        const petIds = userPetsInBattle.map(p => p._id);
                        await Pet.updateMany({ _id: { $in: petIds } }, { $inc: { xp: xpPerPet } });
                    }
                }
            }
        });

        await Promise.all(rewardPromises);
        let rewardMessage = `All participants have received their rewards!`
        if (goldReward > 0) rewardMessage += `\n- **${goldReward} Gold**`;
        if (itemTemplate) rewardMessage += `\n- **1x ${itemTemplate.name}**`;
        if (xpReward > 0) rewardMessage += `\n- Pets that fought have shared **${xpReward} XP**!`;
        await channel.send(rewardMessage);

    } else {
        await channel.send(`The pets fought bravely, but **${event.name}** was too strong. The boss has escaped.`);
    }

    event.endAt = new Date();
    await event.save();
}

module.exports = {
    name: 'boss',
    description: 'Initiates a lobby for an automated boss battle.',
    async execute(message) {
        const event = await Event.findOne({ type: 'boss', endAt: { $gt: new Date() } });
        if (!event) {
            return message.reply('There is no boss ready for battle.');
        }

        const joinButton = new ButtonBuilder().setCustomId('join_boss_battle').setLabel('Join the Fray!').setStyle(ButtonStyle.Success);
        const row = new ActionRowBuilder().addComponents(joinButton);

        const embed = new EmbedBuilder()
            .setTitle(`A wild ${event.name} appears!`)
            .setDescription('A mighty boss is challenging all pet owners! Click the button to send your pets into the automated battle. The fight will begin in **5 minutes**.')
            .setColor('#FFA500');
        
        const reply = await message.channel.send({ embeds: [embed], components: [row] });

        const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

        collector.on('collect', async interaction => {
            if (!event.participants.has(interaction.user.id)) {
                event.participants.set(interaction.user.id, { joinedAt: new Date() });
                await event.save();
                interaction.reply({ content: 'Your pets have joined the upcoming battle!', ephemeral: true });
            } else {
                interaction.reply({ content: 'Your pets are already in the queue!', ephemeral: true });
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] });
            message.channel.send('The lobby has closed. The automated battle is starting now!');
            startAutomatedBattle(message.client, event._id, message.guild.id);
        });
    },
};