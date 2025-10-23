const { SlashCommandBuilder, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const PartnerConfig = require('../../models/partnership/partnerConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-partner')
        .setDescription('Configure the partnership announcement channel.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Sets the channel where partner embeds will be sent.')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to designate for partnerships.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Removes the partnership channel configuration.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Views the current partnership channel configuration.')),

    async execute(interaction) {
        if (!interaction.isCommand()) return;

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'set') {
                const channel = interaction.options.getChannel('channel');
                await PartnerConfig.findOneAndUpdate({ guildId }, { channelId: channel.id }, { upsert: true });
                await interaction.reply({ content: `✅ Partnership channel has been set to <#${channel.id}>.`, ephemeral: true });
            } 
            else if (subcommand === 'remove') {
                const deleted = await PartnerConfig.findOneAndDelete({ guildId });
                if (deleted) {
                    await interaction.reply({ content: '🗑️ Partnership channel configuration has been removed.', ephemeral: true });
                } else {
                    await interaction.reply({ content: '⚠️ No partnership channel was configured.', ephemeral: true });
                }
            } 
            else if (subcommand === 'view') {
                const config = await PartnerConfig.findOne({ guildId });
                if (config) {
                    await interaction.reply({ content: `ℹ️ The current partnership channel is <#${config.channelId}>.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: '⚠️ No partnership channel is currently configured.', ephemeral: true });
                }
            }
        } catch (error) {
            console.error('Error managing partner config:', error);
            await interaction.reply({ content: 'An error occurred while managing the partnership configuration.', ephemeral: true });
        }
    },
};