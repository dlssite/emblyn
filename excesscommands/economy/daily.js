const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateWallet, updateEconomyProfile } = require('../../models/economy');
const { checkCooldown, setCooldown } = require('../../utils/cooldownManager');

module.exports = {
    name: 'daily',
    description: 'Claim your daily reward.',
    async execute(message) {
        await message.channel.sendTyping();
        const userId = message.author.id;
        const commandName = 'daily';
        const cooldown = 24 * 60 * 60 * 1000;

        const remaining = await checkCooldown(userId, commandName, cooldown);
        if (remaining > 0) {
            const remainingHours = Math.ceil(remaining / (60 * 60 * 1000));
            const embed = new EmbedBuilder()
                .setTitle('Daily Reward Cooldown')
                .setDescription(`You have already claimed your daily reward. Try again in ${remainingHours} hour(s).`)
                .setColor('#FF0000')
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        const profile = await getEconomyProfile(userId);

        let baseReward = 100;
        let reward = baseReward + (profile.dailyStreak * 10);
        const maxStreakBonus = 500;
        if (reward > baseReward + maxStreakBonus) {
            reward = baseReward + maxStreakBonus;
        }

        let newStreak = 1;
        const lastDaily = profile.cooldowns.daily || profile.lastDaily;
        if (lastDaily && Date.now() - lastDaily < cooldown + 1 * 60 * 1000) {
            newStreak = profile.dailyStreak + 1;
        }

        await updateWallet(userId, reward);
        await updateEconomyProfile(userId, { dailyStreak: newStreak });
        await setCooldown(userId, commandName);

        const embed = new EmbedBuilder()
            .setTitle('Daily Reward')
            .setDescription(`You have received ${reward} embers! Current streak: ${newStreak}`)
            .setColor('#00FF00')
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },
};