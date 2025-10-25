const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { reactionRolesCollection } = require('../../mongodb');
const cmdIcons = require('../../UI/icons/commandicons');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
            .setName('reaction-roles')
            .setDescription('Manage reaction roles with an interactive dashboard')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(sub =>
                sub.setName('dashboard')
                    .setDescription('Open the reaction roles dashboard'))
            .addSubcommand(sub =>
                sub.setName('create')
                    .setDescription('Create a new reaction role message')
                    .addChannelOption(option =>
                        option.setName('channel')
                            .setDescription('The channel to send the reaction role message in')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('title')
                            .setDescription('The title for the reaction roles')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('description')
                            .setDescription('The description for the reaction roles')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('banner')
                            .setDescription('URL of the banner image (optional)')
                            .setRequired(false)))
            .addSubcommand(sub =>
                sub.setName('addrole')
                    .setDescription('Add a role to a reaction role message')
                    .addStringOption(option =>
                        option.setName('messageid')
                            .setDescription('The message ID of the reaction role message')
                            .setRequired(true))
                    .addRoleOption(option =>
                        option.setName('role')
                            .setDescription('Role to add')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('label')
                            .setDescription('Label for the role in the menu')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('emoji')
                            .setDescription('Emoji for the role (optional)')
                            .setRequired(false)))
            .addSubcommand(sub =>
                sub.setName('removerole')
                    .setDescription('Remove a role from a reaction role message')
                    .addStringOption(option =>
                        option.setName('messageid')
                            .setDescription('The message ID of the reaction role message')
                            .setRequired(true))
                    .addRoleOption(option =>
                        option.setName('role')
                            .setDescription('Role to remove')
                            .setRequired(true))),

    async execute(interaction) {
        if (!await checkPermissions(interaction)) return;

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'dashboard') {
            return await showDashboard(interaction);
        } else if (subcommand === 'create') {
            return await handleCreate(interaction);
        } else if (subcommand === 'addrole') {
            return await handleAddRole(interaction);
        } else if (subcommand === 'removerole') {
            return await handleRemoveRole(interaction);
        }
    }
};

async function showDashboard(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Reaction Roles Dashboard')
        .setDescription('Manage your server\'s reaction roles from this interactive dashboard.')
        .setColor('#6366f1')
        .addFields(
            { name: '📝 Create', value: 'Create a new reaction role message', inline: true },
            { name: '✏️ Edit', value: 'Modify existing reaction roles', inline: true },
            { name: '🗑️ Delete', value: 'Remove reaction role setups', inline: true }
        )
        .setFooter({ text: 'Use the buttons below to manage reaction roles' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('reaction_role_create')
                .setLabel('Create New')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝'),
            new ButtonBuilder()
                .setCustomId('reaction_role_list')
                .setLabel('Edit Existing')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✏️'),
            new ButtonBuilder()
                .setCustomId('reaction_role_delete_list')
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️'),
            new ButtonBuilder()
                .setCustomId('reaction_role_view')
                .setLabel('View All')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👁️')
        );

    await interaction.editReply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

async function handleCreate(interaction) {
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const banner = interaction.options.getString('banner');

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#6366f1');

    if (banner) {
        try {
            embed.setImage(banner);
        } catch (error) {
            return interaction.editReply({
                content: '❌ Invalid banner URL provided.'
            });
        }
    }

    embed.setFooter({
        text: 'Select roles from the dropdown menu below',
        iconURL: interaction.guild.iconURL({ dynamic: true })
    });

    // First, send the message without the menu
    const setupMessage = await channel.send({
        embeds: [embed]
    });

    await reactionRolesCollection.insertOne({
        serverId: interaction.guild.id,
        channelId: channel.id,
        messageId: setupMessage.id,
        title,
        description,
        banner,
        roles: [],
        type: 'menu_container',
        createdAt: new Date(),
        createdBy: interaction.user.id
    });

    const configRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`reaction_role_add_${setupMessage.id}`)
                .setLabel('Add Role')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId(`reaction_role_edit_${setupMessage.id}`)
                .setLabel('Edit Message')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✏️'),
            new ButtonBuilder()
                .setCustomId(`reaction_role_delete_${setupMessage.id}`)
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
        );

    const successEmbed = new EmbedBuilder()
        .setTitle('✅ Reaction Role Setup')
        .setDescription(`Your reaction role message has been created in ${channel}!\n\n**Next Steps:**\n1. Click "Add Role" to start adding roles\n2. Use "Edit Message" to modify the appearance\n3. Preview your changes in ${channel}`)
        .setColor('#00ff00');

    return interaction.editReply({
        embeds: [successEmbed],
        components: [configRow]
    });
}

async function handleAddRole(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const messageId = interaction.options.getString('messageid');
    const role = interaction.options.getRole('role');
    const label = interaction.options.getString('label');
    const emoji = interaction.options.getString('emoji');

    // Find the reaction role setup
    const setup = await reactionRolesCollection.findOne({ messageId });
    if (!setup) {
        return interaction.editReply({
            content: '❌ Could not find the reaction role message. Make sure you have the correct message ID.'
        });
    }

    // Check if role is already in the menu
    if (setup.roles.some(r => r.id === role.id)) {
        return interaction.editReply({
            content: '❌ This role is already in the reaction role menu.'
        });
    }

    try {
        // Add role to the database
        const roleData = {
            id: role.id,
            name: role.name,
            label,
            emoji: emoji || null
        };

        await reactionRolesCollection.updateOne(
            { messageId },
            { $push: { roles: roleData } }
        );

        // Get the channel and message
        const channel = await interaction.guild.channels.fetch(setup.channelId);
        const message = await channel.messages.fetch(messageId);

        // Update the select menu
        const updatedSetup = await reactionRolesCollection.findOne({ messageId });
        const options = updatedSetup.roles.map(r => {
            const option = {
                label: r.label,
                value: r.id,
                description: `Toggle the ${r.name} role`
            };
            if (r.emoji && r.emoji.trim() !== '') {
                option.emoji = r.emoji;
            }
            return option;
        });

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`reaction_role_select_${messageId}`)
            .setPlaceholder('Select a role to toggle')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);
        await message.edit({ components: [row] });

        return interaction.editReply({
            content: `✅ Added role ${role.name} to the reaction role menu.`
        });
    } catch (error) {
        console.error('Error adding role:', error);
        return interaction.editReply({
            content: '❌ An error occurred while adding the role.'
        });
    }
}

async function handleRemoveRole(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const messageId = interaction.options.getString('messageid');
    const role = interaction.options.getRole('role');

    // Find the reaction role setup
    const setup = await reactionRolesCollection.findOne({ messageId });
    if (!setup) {
        return interaction.editReply({
            content: '❌ Could not find the reaction role message. Make sure you have the correct message ID.'
        });
    }

    // Check if role exists in the menu
    if (!setup.roles.some(r => r.id === role.id)) {
        return interaction.editReply({
            content: '❌ This role is not in the reaction role menu.'
        });
    }

    try {
        // Remove role from the database
        await reactionRolesCollection.updateOne(
            { messageId },
            { $pull: { roles: { id: role.id } } }
        );

        // Get the channel and message
        const channel = await interaction.guild.channels.fetch(setup.channelId);
        const message = await channel.messages.fetch(messageId);

        // Update the select menu
        const updatedSetup = await reactionRolesCollection.findOne({ messageId });
        
        if (updatedSetup.roles.length === 0) {
            // If no roles left, remove the menu
            await message.edit({ components: [] });
        } else {
            // Update menu with remaining roles
            const options = updatedSetup.roles.map(r => {
                const option = {
                    label: r.label,
                    value: r.id,
                    description: `Toggle the ${r.name} role`
                };
                if (r.emoji && r.emoji.trim() !== '') {
                    option.emoji = r.emoji;
                }
                return option;
            });

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`reaction_role_select_${messageId}`)
                .setPlaceholder('Select a role to toggle')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(menu);
            await message.edit({ components: [row] });
        }

        return interaction.editReply({
            content: `✅ Removed role ${role.name} from the reaction role menu.`
        });
    } catch (error) {
        console.error('Error removing role:', error);
        return interaction.editReply({
            content: '❌ An error occurred while removing the role.'
        });
    }
}

// Button interaction handler (to be added to your interactionCreate.js)
async function handleButtonInteraction(interaction) {
    const customId = interaction.customId;

    if (customId.startsWith('rr_add_role_')) {
        const messageId = customId.replace('rr_add_role_', '');
        const modal = new ModalBuilder()
            .setCustomId(`rr_add_role_modal_${messageId}`)
            .setTitle('Add Role to Menu');

        const roleInput = new TextInputBuilder()
            .setCustomId('role_id')
            .setLabel('Role ID')
            .setPlaceholder('Right-click the role and copy ID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const labelInput = new TextInputBuilder()
            .setCustomId('role_label')
            .setLabel('Label')
            .setPlaceholder('Display text for this role')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const emojiInput = new TextInputBuilder()
            .setCustomId('role_emoji')
            .setLabel('Emoji (Optional)')
            .setPlaceholder('Enter an emoji or leave empty')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const roleRow = new ActionRowBuilder().addComponents(roleInput);
        const labelRow = new ActionRowBuilder().addComponents(labelInput);
        const emojiRow = new ActionRowBuilder().addComponents(emojiInput);

        modal.addComponents(roleRow, labelRow, emojiRow);
        await interaction.showModal(modal);
    }
}

// Modal submission handler (to be added to your interactionCreate.js)
async function handleModalSubmit(interaction) {
    if (interaction.customId.startsWith('rr_add_role_modal_')) {
        const messageId = interaction.customId.replace('rr_add_role_modal_', '');
        const roleId = interaction.fields.getTextInputValue('role_id');
        const label = interaction.fields.getTextInputValue('role_label');
        const emojiInput = interaction.fields.getTextInputValue('role_emoji');

        const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
            return interaction.reply({
                content: '❌ Invalid role ID provided.',
                ephemeral: true
            });
        }

        const setup = await reactionRolesCollection.findOne({ messageId });
        if (!setup) {
            return interaction.reply({
                content: '❌ Reaction role setup not found.',
                ephemeral: true
            });
        }

        const channel = await interaction.guild.channels.fetch(setup.channelId);
        const message = await channel.messages.fetch(messageId);

        // Add role to the database
        await reactionRolesCollection.updateOne(
            { messageId },
            {
                $push: {
                    roles: {
                        id: role.id,
                        name: role.name,
                        label,
                        emoji: emojiInput || null
                    }
                }
            }
        );

        // Update the message's select menu
        const roles = setup.roles.concat([{
            id: role.id,
            name: role.name,
            label,
            emoji: emojiInput || null
        }]);

        const options = roles.map(role => ({
            label: role.label,
            value: role.id,
            description: `Toggle the ${role.name} role`,
            emoji: role.emoji
        }));

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`rr_menu_${messageId}`)
            .setPlaceholder('Select a role to toggle')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);

        await message.edit({ components: [row] });

        return interaction.reply({
            content: `✅ Added role ${role.name} to the reaction role menu.`,
            ephemeral: true
        });
    }
}