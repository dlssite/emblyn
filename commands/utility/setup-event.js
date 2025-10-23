const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const EventConfig = require('../../models/events/eventConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-event')
        .setDescription('Configure the event announcement channel.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Sets the channel for event announcements.')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to designate for events.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Removes the event channel configuration.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Views the current event channel configuration.')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'set') {
                const channel = interaction.options.getChannel('channel');
                await EventConfig.findOneAndUpdate({ guildId }, { channelId: channel.id }, { upsert: true });
                await interaction.reply({ content: `✅ Event announcement channel has been set to <#${channel.id}>.`, ephemeral: true });
            } 
            else if (subcommand === 'remove') {
                const deleted = await EventConfig.findOneAndDelete({ guildId });
                if (deleted) {
                    await interaction.reply({ content: '🗑️ Event channel configuration has been removed.', ephemeral: true });
                } else {
                    await interaction.reply({ content: '⚠️ No event channel was configured.', ephemeral: true });
                }
            } 
            else if (subcommand === 'view') {
                const config = await EventConfig.findOne({ guildId });
                if (config) {
                    await interaction.reply({ content: `ℹ️ The current event announcement channel is <#${config.channelId}>.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: '⚠️ No event channel is currently configured.', ephemeral: true });
                }
            }
        } catch (error) {
            console.error('Error managing event config:', error);
            await interaction.reply({ content: 'An error occurred while managing the event configuration.', ephemeral: true });
        }
    },
};