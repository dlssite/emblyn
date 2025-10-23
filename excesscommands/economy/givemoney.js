const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { updateWallet } = require('../../models/economy');

module.exports = {
    name: 'givemoney',
    description: 'Gives a specified amount of money to a user. (Admin only)',
    aliases: ['givebal', 'addmoney'],
    async execute(message, args) {
        // Check for admin permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('❌ You do not have permission to use this command.');
            return message.reply({ embeds: [embed] });
        }

        // Get the user to give money to
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('Please mention a user to give money to.');
            return message.reply({ embeds: [embed] });
        }
        const targetId = targetUser.id;

        // Find the amount from the arguments
        const amountArg = args.find(arg => !arg.startsWith('<@'));
        const amount = parseInt(amountArg);

        if (isNaN(amount) || amount <= 0) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('Please provide a valid amount to give.');
            return message.reply({ embeds: [embed] });
        }

        try {
            // Update the user's wallet
            await updateWallet(targetId, amount);

            // Send a success message
            const embed = new EmbedBuilder()
                .setTitle('💰 Money Added 💰')
                .setDescription(`Successfully gave **${amount.toLocaleString()} embers** to **${targetUser.tag}**.`)
                .setColor('#00FF00')
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error giving money:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('An error occurred while giving money. Please try again later.');
            await message.reply({ embeds: [embed] });
        }
    },
};