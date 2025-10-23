const { PermissionsBitField } = require('discord.js');
const { getEconomyProfile, updateGold } = require('../../models/economy');

module.exports = {
    name: 'takegold',
    description: 'Takes a specified amount of gold from a user. (Admin only)',
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
        const amountToTake = Math.min(amount, userData.gold);

        // Update the user's gold balance
        await updateGold(user.id, -amountToTake);

        // Get the updated profile to show the new balance
        const updatedUserData = await getEconomyProfile(user.id);

        message.reply({ content: `Successfully took ${amountToTake} gold from ${user.username}. Their new gold balance is ${updatedUserData.gold}.` });
    },
};
