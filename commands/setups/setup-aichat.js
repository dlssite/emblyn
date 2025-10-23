const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const AiChat = require('../../models/aichat/aiModel');
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-aichat')
        .setDescription('Configure AI chat features for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a channel for AI chat and toggle it on/off')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to use for AI chat')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable AI chat')
                        .setRequired(true)
                        .addChoices(
                            { name: 'On', value: 'on' },
                            { name: 'Off', value: 'off' }
                        ))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current AI chat settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable AI chat for your server')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit-lore')
                .setDescription('Edit the AI personality, bio, server lore, and hierarchy')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-apikey')
                .setDescription('Set the OpenRouter API key and model for this server')
                .addStringOption(option =>
                    option.setName('apikey')
                        .setDescription('The OpenRouter API key to use for AI responses')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('model')
                        .setDescription('The AI model to use (e.g., openai/gpt-4o, anthropic/claude-3-haiku)')
                        .setRequired(false))
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            const guild = interaction.guild;
            const serverId = interaction.guild.id;
        
            
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            if (!await checkPermissions(interaction)) return;
            if (subcommand === 'set') {
                const channel = interaction.options.getChannel('channel');
                const status = interaction.options.getString('status');
                const isEnabled = status === 'on';

                await interaction.deferReply({ ephemeral: true });

                try {
                    const existingConfig = await AiChat.getConfig(guildId);
                    await AiChat.setConfig(guildId, channel.id, isEnabled, interaction.user.id);

                    let updateMessage;
                    if (existingConfig) {
                        updateMessage = existingConfig.channelId !== channel.id ?
                            `✅ AI Chat has been ${isEnabled ? 'enabled' : 'disabled'} and moved to ${channel}.` :
                            `✅ AI Chat has been ${isEnabled ? 'enabled' : 'disabled'} in ${channel}.`;
                    } else {
                        updateMessage = `✅ AI Chat has been ${isEnabled ? 'enabled' : 'disabled'} in ${channel}.`;
                    }

                    await interaction.editReply({
                        content: updateMessage
                    });
                } catch (error) {
                    console.error(`Error setting up AI chat for guild ${guildId}:`, error);
                    await interaction.editReply({
                        content: '❌ There was an error saving your settings. Please try again later.'
                    });
                }
            } else if (subcommand === 'view') {
                await interaction.deferReply({ ephemeral: true });

                try {
                    // Use model method to get config
                    const config = await AiChat.getConfig(guildId);

                    if (!config) {
                        await interaction.editReply({
                            content: '❓ AI Chat has not been set up for this server yet.'
                        });
                        return;
                    }

                    const channel = interaction.guild.channels.cache.get(config.channelId) || 'Unknown channel';

                    await interaction.editReply({
                        content: `**AI Chat Configuration**\n` +
                            `**Channel:** ${channel}\n` +
                            `**Status:** ${config.isEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                            `**Last Updated:** ${config.updatedAt?.toLocaleString() || 'Unknown'}\n`
                    });
                } catch (error) {
                    console.error(`Error fetching AI chat config for guild ${guildId}:`, error);
                    await interaction.editReply({
                        content: '❌ There was an error retrieving your settings. Please try again later.'
                    });
                }
            } else if (subcommand === 'disable') {
                await interaction.deferReply({ ephemeral: true });

                try {
                    const config = await AiChat.getConfig(guildId);

                    if (!config) {
                        await interaction.editReply({
                            content: '❓ AI Chat has not been set up for this server yet.'
                        });
                        return;
                    }

                    await AiChat.disableChat(guildId, interaction.user.id);

                    await interaction.editReply({
                        content: `✅ AI Chat has been disabled for this server.`
                    });
                } catch (error) {
                    console.error(`Error disabling AI chat for guild ${guildId}:`, error);
                    await interaction.editReply({
                        content: '❌ There was an error updating your settings. Please try again later.'
                    });
                }
            } else if (subcommand === 'edit-lore') {
                if (interaction.replied || interaction.deferred) return;

                try {
                    const config = await AiChat.getConfig(guildId);

                    const modal = new ModalBuilder()
                        .setCustomId('edit_lore_modal')
                        .setTitle('Edit AI Lore & Personality');

                    const bioInput = new TextInputBuilder()
                        .setCustomId('bio_input')
                        .setLabel('AI Bio/Personality')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Describe the AI character\'s personality, background, and behavior...')
                        .setValue(config?.bio || '')
                        .setRequired(true)
                        .setMaxLength(1000);

                    const loreInput = new TextInputBuilder()
                        .setCustomId('lore_input')
                        .setLabel('Server Lore')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Describe the server\'s lore, history, and world-building...')
                        .setValue(config?.lore || '')
                        .setRequired(true)
                        .setMaxLength(2000);

                    const hierarchyInput = new TextInputBuilder()
                        .setCustomId('hierarchy_input')
                        .setLabel('Server Hierarchy')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Describe the server roles, ranks, and social structure...')
                        .setValue(config?.hierarchy || '')
                        .setRequired(true)
                        .setMaxLength(1000);

                    const firstActionRow = new ActionRowBuilder().addComponents(bioInput);
                    const secondActionRow = new ActionRowBuilder().addComponents(loreInput);
                    const thirdActionRow = new ActionRowBuilder().addComponents(hierarchyInput);

                    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

                    await interaction.showModal(modal);
                } catch (error) {
                    console.error(`Error showing lore edit modal for guild ${guildId}:`, error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ There was an error opening the edit form. Please try again later.',
                            ephemeral: true
                        });
                    }
                }
            } else if (subcommand === 'set-apikey') {
                const apiKey = interaction.options.getString('apikey');
                const model = interaction.options.getString('model') || 'openai/gpt-4o';

                await interaction.deferReply({ ephemeral: true });

                try {
                    // Test the API key with the provided model
                    const testPayload = {
                        model: model,
                        messages: [{ role: 'user', content: 'Hello' }],
                        max_tokens: 10,
                    };

                    let fetchToUse = global.fetch;
                    if (!fetchToUse) {
                        try {
                            fetchToUse = require('node-fetch');
                        } catch (e) {
                            throw new Error('Fetch is not available and node-fetch is not installed.');
                        }
                    }

                    const testRes = await fetchToUse('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://github.com/dls/Kiaren-2.0',
                            'X-Title': process.env.OPENROUTER_TITLE || 'Emberlyn Discord Bot',
                        },
                        body: JSON.stringify(testPayload),
                    });

                    if (!testRes.ok) {
                        const text = await testRes.text().catch(() => '');
                        console.error('OpenRouter API test responded with error', testRes.status, text);
                        await interaction.editReply({
                            content: '❌ The provided API key is invalid, the model is not available, or you have insufficient credits. Please check your key and model, then try again.'
                        });
                        return;
                    }

                    // If test passes, save the API key and model
                    await AiChat.setApiKeyAndModel(guildId, apiKey, model, interaction.user.id);

                    await interaction.editReply({
                        content: `✅ API key and model have been successfully set and tested for this server!\n**Model:** ${model}\n\nNext, you can use the \`/setup-aichat set\` command to configure a channel for AI chat.`
                    });
                } catch (error) {
                    console.error(`Error setting API key for guild ${guildId}:`, error);
                    await interaction.editReply({
                        content: '❌ There was an error testing or saving the API key. Please try again later.'
                    });
                }
            }
        } else {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ 
                    name: "Alert!", 
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/sanctyr"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setup-aichat`')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};