const { getEconomyProfile, updateEconomyProfile } = require('../../models/economy');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'withdraw',
    aliases: ['with'],
    description: 'Withdraw money from your bank.',
    async execute(message, args) {
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        if (args.length === 0) {
            return message.reply('Please specify an amount to withdraw.');
        }

        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please provide a valid amount to withdraw.');
        }

        if (profile.bank < amount) {
            return message.reply('You don\'t have enough money in your bank to make this withdrawal.');
        }

        await updateEconomyProfile(userId, {
            wallet: profile.wallet + amount,
            bank: profile.bank - amount
        });

        const embed = new EmbedBuilder()
            .setTitle('Withdrawal Successful')
            .setDescription(`You have withdrawn **${amount} embers** from your bank.`)
            .setColor('#00FF00');

        message.reply({ embeds: [embed] });
    },
};