const { getEconomyProfile, updateEconomyProfile } = require('../../models/economy');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'transfer',
    description: 'Transfer money from your bank to another user.',
    async execute(message, args) {
        const senderId = message.author.id;
        const senderProfile = await getEconomyProfile(senderId);

        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('Please mention a user to transfer money to.');
        }
        const targetId = targetUser.id;

        if (args.length < 2) {
            return message.reply('Please specify an amount to transfer.');
        }

        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please provide a valid amount to transfer.');
        }

        if (senderProfile.bank < amount) {
            return message.reply('You don\'t have enough money in your bank to make this transfer.');
        }

        const targetProfile = await getEconomyProfile(targetId);

        await updateEconomyProfile(senderId, { bank: senderProfile.bank - amount });
        await updateEconomyProfile(targetId, { bank: targetProfile.bank + amount });

        const embed = new EmbedBuilder()
            .setTitle('Transfer Successful')
            .setDescription(`You have successfully transferred **${amount} embers** to ${targetUser.username}.`)
            .setColor('#00FF00');

        message.reply({ embeds: [embed] });
    },
};