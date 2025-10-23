const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');
const { GuildSettings } = require('../../models/guild/GuildSettings'); // Corrected import

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-bossfight-channel')
        .setDescription('Sets the channel for boss fight events.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The text channel to be used for boss fights.')
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
                { bossFightChannelId: channel.id },
                { upsert: true, new: true }
            );

            await interaction.reply({ content: `✅ Boss fight channel has been set to ${channel}.` });
        } catch (error) {
            console.error('Error setting boss fight channel:', error);
            await interaction.reply({ content: 'An error occurred while setting the boss fight channel. Please try again.', ephemeral: true });
        }
    },
};
