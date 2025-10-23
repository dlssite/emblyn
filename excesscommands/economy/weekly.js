const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateEconomyProfile } = require('../../models/economy');
const { checkCooldown, setCooldown } = require('../../utils/cooldownManager');

module.exports = {
    name: 'weekly',
    description: 'Claim your weekly reward.',
    async execute(message) {
        await message.channel.sendTyping();
        const userId = message.author.id;
        const commandName = 'weekly';
        const cooldown = 7 * 24 * 60 * 60 * 1000;

        const remaining = await checkCooldown(userId, commandName, cooldown);
        if (remaining > 0) {
            const remainingDays = Math.ceil(remaining / (24 * 60 * 60 * 1000));
            const embed = new EmbedBuilder()
                .setTitle('Weekly Reward Cooldown')
                .setDescription(`You have already claimed your weekly reward. Try again in ${remainingDays} day(s).`)
                .setColor('#FF0000');
            return message.reply({ embeds: [embed] });
        }

        const profile = await getEconomyProfile(userId);

        let baseReward = 1000;
        let reward = baseReward + (profile.dailyStreak * 100);
        const maxStreakBonus = 1000;
        if (reward > baseReward + maxStreakBonus) {
            reward = baseReward + maxStreakBonus;
        }

        await updateEconomyProfile(userId, { 
            wallet: profile.wallet + reward, 
        });
        await setCooldown(userId, commandName);

        const embed = new EmbedBuilder()
            .setTitle('Weekly Reward')
            .setDescription(`You have received ${reward} embers!`)
            .setColor('#00FF00');

        message.reply({ embeds: [embed] });
    },
};