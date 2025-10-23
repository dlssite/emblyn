const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateWallet } = require('../../models/economy');
const { checkCooldown, setCooldown } = require('../../utils/cooldownManager');

module.exports = {
    name: 'roulette',
    description: 'Play a game of roulette.',
    async execute(message, args) {
        const userId = message.author.id;
        const commandName = 'roulette';
        const cooldown = 15 * 1000; // 15 seconds

        const remaining = await checkCooldown(userId, commandName, cooldown);
        if (remaining > 0) {
            const remainingSeconds = Math.ceil(remaining / 1000);
            return message.reply(`You can play roulette again in ${remainingSeconds} seconds.`);
        }

        const [betAmount, betColor] = args;

        if (!betAmount || !betColor) {
            return message.reply('Please provide a bet amount and a color (red or black).');
        }

        const amount = parseInt(betAmount);
        const color = betColor.toLowerCase();

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Invalid bet amount.');
        }

        if (color !== 'red' && color !== 'black') {
            return message.reply('Invalid color. Please bet on red or black.');
        }

        const profile = await getEconomyProfile(userId);
        if (profile.wallet < amount) {
            return message.reply('You don\'t have enough money to place that bet.');
        }

        await setCooldown(userId, commandName);

        const winningColor = Math.random() < 0.5 ? 'red' : 'black';

        let resultEmbed;
        if (color === winningColor) {
            const winnings = amount;
            await updateWallet(userId, winnings);
            resultEmbed = new EmbedBuilder()
                .setTitle('You Won!')
                .setDescription(`The ball landed on **${winningColor}**. You won **${winnings} embers**!`)
                .setColor('#00FF00');
        } else {
            const loss = amount;
            await updateWallet(userId, -loss);
            resultEmbed = new EmbedBuilder()
                .setTitle('You Lost!')
                .setDescription(`The ball landed on **${winningColor}**. You lost **${loss} embers**.`)
                .setColor('#FF0000');
        }

        message.reply({ embeds: [resultEmbed] });
    },
};