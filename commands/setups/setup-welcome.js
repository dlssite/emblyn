const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const WelcomeSettings = require('../../models/welcome/WelcomeSettings');
const checkPermissions = require('../../utils/checkPermissions');
const cmdIcons = require('../../UI/icons/commandicons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Set or view welcome message and DM settings for this server')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)

        .addSubcommand(sub =>
            sub.setName('setchannel')
                .setDescription('Enable/Disable and configure welcome messages in a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Select the welcome channel')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable channel welcome messages')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('welcome-message')
                        .setDescription('Custom message. Use {user} to mention the new member.')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('image-url')
                        .setDescription('URL for the image in the welcome embed.')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('embed-color')
                        .setDescription('Hex color for the embed (e.g., #FF5733).')
                        .setRequired(false))
        )

        .addSubcommand(sub =>
            sub.setName('setdm')
                .setDescription('Enable/Disable welcome DMs')
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable welcome DMs')
                        .setRequired(true))
        )

        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current welcome setup')
        ),

    async execute(interaction) {
        if (!interaction.isCommand()) return;

        const guild = interaction.guild;
        const serverID = guild.id;
        if (!await checkPermissions(interaction)) return;

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setchannel') {
            const channel = interaction.options.getChannel('channel');
            const status = interaction.options.getBoolean('status');
            const welcomeMessage = interaction.options.getString('welcome-message');
            const imageUrl = interaction.options.getString('image-url');
            const embedColor = interaction.options.getString('embed-color');

            // Basic validation for color and URL
            if (embedColor && !/^#([0-9A-F]{6})$/i.test(embedColor)) {
                return interaction.reply({
                    content: '❌ Invalid color format. Please use a valid HEX color code (e.g., `#FF5733`).',
                    ephemeral: true
                });
            }
            if (imageUrl) {
                try {
                    new URL(imageUrl);
                } catch (e) {
                    return interaction.reply({
                        content: '❌ Invalid Image URL. Please provide a valid URL starting with `http://` or `https://`.',
                        ephemeral: true
                    });
                }
            }
            
            await WelcomeSettings.updateOne(
                { serverId: serverID },
                {
                    $set: {
                        serverId: serverID,
                        welcomeChannelId: channel.id,
                        channelStatus: status,
                        welcomeMessage: welcomeMessage, // New field
                        imageUrl: imageUrl,           // New field
                        embedColor: embedColor,       // New field
                        ownerId: guild.ownerId
                    }
                },
                { upsert: true }
            );

            return interaction.reply({
                content: `📢 Welcome messages in <#${channel.id}> have been **${status ? 'enabled' : 'disabled'}** and settings have been updated.`,
                ephemeral: true
            });

        } else if (subcommand === 'setdm') {
            const status = interaction.options.getBoolean('status');

            await WelcomeSettings.updateOne(
                { serverId: serverID },
                {
                    $set: {
                        serverId: serverID,
                        dmStatus: status,
                        ownerId: guild.ownerId
                    }
                },
                { upsert: true }
            );

            return interaction.reply({
                content: `📩 Welcome DM has been **${status ? 'enabled' : 'disabled'}**.`,
                ephemeral: true
            });

        } else if (subcommand === 'view') {
            const config = await WelcomeSettings.findOne({ serverId: serverID });

            if (!config) {
                return interaction.reply({
                    content: '⚠ No welcome configuration found for this server.',
                    ephemeral: true
                });
            }
            
            // Main settings embed
            const settingsEmbed = new EmbedBuilder()
                .setColor(config.embedColor || '#3498db')
                .setTitle('📋 Current Welcome Settings')
                .addFields(
                    { name: 'Channel', value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'Not set', inline: true },
                    { name: 'Channel Status', value: config.channelStatus ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Welcome DM', value: config.dmStatus ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Embed Color', value: config.embedColor || 'Default', inline: false},
                    { name: 'Welcome Message', value: config.welcomeMessage || 'Not set', inline: false },
                    { name: 'Image URL', value: config.imageUrl || 'Not set', inline: false },
                )
                .setTimestamp();
            
            // Preview embed
            const previewEmbed = new EmbedBuilder()
                .setColor(config.embedColor || '#3498db')
                .setTitle('✨ Welcome Preview ✨')
                .setThumbnail(interaction.user.displayAvatarURL())
                .setDescription(config.welcomeMessage ? config.welcomeMessage.replace('{user}', interaction.user.toString()) : `Welcome, ${interaction.user.toString()}!`)
                .setImage(config.imageUrl || null)
                .setFooter({ text: 'This is a preview. The actual welcome message will mention the new user.'})
                .setTimestamp();

            return interaction.reply({ embeds: [settingsEmbed, previewEmbed], ephemeral: true });
        }
    }
};