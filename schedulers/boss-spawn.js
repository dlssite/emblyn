const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cron = require('node-cron');
const GuildSettings = require('../models/guild/GuildSettings');
const { Event } = require('../models/pets/events');

module.exports = (client) => {
    const spawnBoss = async () => {
        console.log('Spawning world boss...');

        const allGuilds = await GuildSettings.find({ bossFightChannelId: { $ne: null } });

        for (const guild of allGuilds) {
            try {
                const bossFightChannel = await client.channels.fetch(guild.bossFightChannelId);

                if (bossFightChannel) {
                    const bossHp = 10000;
                    const eventId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                    const newBoss = new Event({
                        eventId: eventId,
                        name: 'The Great Beast',
                        image: 'https://i.imgur.com/8So55Xb.png', // Example Image
                        type: 'world_boss',
                        startAt: new Date(),
                        endAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
                        bossHp: bossHp,
                        maxHp: bossHp,
                        participants: {},
                        rewards: { gold: 500, item: 'legendary_chest', xp: 1000 }
                    });

                    await newBoss.save();

                    const embed = new EmbedBuilder()
                        .setTitle('A Wild World Boss Appears!')
                        .setDescription(`A fearsome **${newBoss.name}** has spawned! It has **${newBoss.bossHp}** HP.`)
                        .setImage(newBoss.image)
                        .setColor('#FF4500');

                    const joinButton = new ButtonBuilder()
                        .setCustomId(`boss-join_${eventId}`)
                        .setLabel('Join Fight')
                        .setStyle(ButtonStyle.Primary);

                    const row = new ActionRowBuilder().addComponents(joinButton);

                    await bossFightChannel.send({ embeds: [embed], components: [row] });
                }
            } catch (error) {
                console.error(`Failed to spawn boss for guild ${guild.guildId}:`, error);
            }
        }
    };

    // Schedule the boss spawn to run every 12 hours
    cron.schedule('0 */12 * * *', () => {
        spawnBoss();
    });
};
