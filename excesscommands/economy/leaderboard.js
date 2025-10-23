const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getAllEconomyProfiles } = require('../../models/economy');
const { calculateNetWorth } = require('./profile');
const { generateLeaderboardCard, generateBasicLeaderboardCard } = require('../../UI/economyLeaderboardCard');

module.exports = {
    name: 'leaderboard',
    description: 'Displays the top 10 richest users.',
    aliases: ['lb', 'top'],
    async execute(message, args) {
        await message.channel.sendTyping();
        try {
            const allProfiles = await getAllEconomyProfiles();

            // Sort by net worth in descending order
            const sortedProfiles = allProfiles.sort((a, b) => calculateNetWorth(b) - calculateNetWorth(a));

            // Get top 10
            const top10 = sortedProfiles.slice(0, 10);

            const embed = new EmbedBuilder()
                .setTitle('Top 10 Richest Users')
                .setColor('#FFD700'); // Gold color

            if (top10.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('Top 10 Richest Users')
                    .setColor('#FFD700')
                    .setDescription('There are no users to display on the leaderboard yet.');
                await message.channel.send({ embeds: [embed] });
            } else {
                // Prepare data for image generation
                const topUsers = [];
                for (let i = 0; i < top10.length; i++) {
                    const profile = top10[i];
                    const user = await message.client.users.fetch(profile.userId).catch(() => null);
                    const username = user ? user.username : `User ${i + 1}`;
                    const avatarURL = user ? user.displayAvatarURL({ format: 'png', size: 64 }) : 'https://cdn.discordapp.com/embed/avatars/0.png';
                    const netWorth = calculateNetWorth(profile);
                    topUsers.push({
                        username,
                        avatarURL,
                        netWorth
                    });
                }

                // Generate leaderboard image
                const leaderboardImageBuffer = await generateLeaderboardCard(topUsers);

                const attachment = new AttachmentBuilder(leaderboardImageBuffer, { name: 'leaderboard.png' });

                await message.channel.send({ files: [attachment] });
            }

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            message.reply('An error occurred while fetching the leaderboard.');
        }
    },
};
