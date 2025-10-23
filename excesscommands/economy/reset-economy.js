const { deleteAllEconomyProfiles } = require('../../models/economy');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'reset-economy',
    description: 'Resets all economy profiles.',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('You must be an administrator to use this command.');
        }

        await deleteAllEconomyProfiles();

        message.reply('All economy profiles have been reset.');
    },
};