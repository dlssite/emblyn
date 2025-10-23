const { getEconomyProfile, updateEconomyProfile } = require('../../models/economy');
const { EmbedBuilder } = require('discord.js');

const DEFAULT_BANK_LIMIT = 50000;

module.exports = {
    name: 'deposit',
    aliases: ['dep'],
    description: 'Deposit money into your bank.',
    async execute(message, args) {
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        if (args.length === 0) {
            return message.reply('Please specify an amount to deposit. Usage: `deposit <amount>`');
        }

        const amountArg = args[0].toLowerCase();
        let amount;

        if (amountArg === 'all') {
            amount = profile.wallet;
        } else {
            amount = parseInt(amountArg);
        }

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please provide a valid amount to deposit.');
        }

        if (profile.wallet < amount) {
            return message.reply("You don't have that much money in your wallet.");
        }

        const bankLimit = profile.bankLimit || DEFAULT_BANK_LIMIT;
        const availableSpace = bankLimit - profile.bank;

        if (availableSpace <= 0) {
            return message.reply('Your bank is full! Consider upgrading your vault.');
        }

        const depositAmount = Math.min(amount, availableSpace);

        await updateEconomyProfile(userId, {
            wallet: profile.wallet - depositAmount,
            bank: profile.bank + depositAmount
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ Deposit Successful')
            .setDescription(`You have deposited **${depositAmount.toLocaleString()} embers** into your bank.`)
            .setColor('#2ECC71');
        
        if (amount > depositAmount) {
            embed.setFooter({ text: `Your bank was too full to deposit the full amount.` });
        }

        message.reply({ embeds: [embed] });
    },
};