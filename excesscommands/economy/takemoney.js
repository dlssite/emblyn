const { PermissionsBitField } = require('discord.js');
const { getEconomyProfile, updateWallet } = require('../../models/economy');

module.exports = {
    name: 'takemoney',
    description: 'Takes a specified amount of money from a user. (Admin only)',
    async execute(message, args) {
        // Check for admin permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const user = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!user || isNaN(amount) || amount <= 0) {
            return message.reply({ content: 'Please provide a valid user and a positive amount.', ephemeral: true });
        }

        const userData = await getEconomyProfile(user.id);

        // Determine the actual amount to take
        const amountToTake = Math.min(amount, userData.wallet);

        // Update the user's wallet balance
        await updateWallet(user.id, -amountToTake);

        // Get the updated profile to show the new balance
        const updatedUserData = await getEconomyProfile(user.id);

        message.reply({ content: `Successfully took ${amountToTake} embers from ${user.username}. Their new balance is ${updatedUserData.wallet} embers.` });
    },
};
