const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const { GuildSettings } = require('../../models/guild/GuildSettings'); // Corrected import

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-battle-channel')
        .setDescription('Sets the official channel for pet battles.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The text channel to be used for battles.')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You must be an administrator to use this command.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');

        if (!channel || channel.type !== 0) { // 0 = GUILD_TEXT
            return interaction.reply({ content: 'Please select a valid text channel.', ephemeral: true });
        }

        try {
            await GuildSettings.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { battleChannelId: channel.id },
                { upsert: true, new: true }
            );

            await interaction.reply({ content: `✅ Battle channel has been set to ${channel}.` });
        } catch (error) {
            console.error('Error setting battle channel:', error);
            // The error now includes the actual error message for better debugging
            await interaction.reply({ content: `An error occurred while setting the battle channel: ${error.message}`, ephemeral: true });
        }
    },
};