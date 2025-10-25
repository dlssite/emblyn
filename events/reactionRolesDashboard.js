const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { reactionRolesCollection } = require('../mongodb');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.guild) return;

        try {
            // Handle button interactions for the dashboard
            if (interaction.isButton()) {
                if (interaction.customId === 'rr_create') {
                    const embed = new EmbedBuilder()
                        .setTitle('Create Reaction Role Message')
                        .setDescription('Use the `/reaction-roles create` command to create a new reaction role message.\n\nYou\'ll be able to set:\n- Channel\n- Title\n- Description\n- Banner image (optional)')
                        .setColor('#6366f1');

                    return interaction.reply({
                        embeds: [embed],
                        ephemeral: true
                    });
                }

                if (interaction.customId === 'rr_view') {
                    const setups = await reactionRolesCollection.find({
                        serverId: interaction.guild.id
                    }).toArray();

                    if (setups.length === 0) {
                        return interaction.reply({
                            content: '📝 No reaction role setups found in this server.',
                            ephemeral: true
                        });
                    }

                    const embeds = [];
                    for (const setup of setups) {
                        const embed = new EmbedBuilder()
                            .setTitle(setup.title)
                            .setDescription(`**Channel:** <#${setup.channelId}>\n**Message ID:** ${setup.messageId}\n\n**Roles:**\n${setup.roles.map(r => `• <@&${r.id}> - ${r.label}`).join('\n')}`)
                            .setColor('#6366f1')
                            .setTimestamp(new Date(setup.createdAt));

                        if (setup.banner) {
                            embed.setImage(setup.banner);
                        }

                        embeds.push(embed);
                    }

                    for (let i = 0; i < embeds.length; i += 10) {
                        const chunk = embeds.slice(i, i + 10);
                        if (i === 0) {
                            await interaction.reply({
                                embeds: chunk,
                                ephemeral: true
                            });
                        } else {
                            await interaction.followUp({
                                embeds: chunk,
                                ephemeral: true
                            });
                        }
                    }
                    return;
                }

                // Handle role message edit buttons
                if (interaction.customId.startsWith('rr_edit_msg_')) {
                    const messageId = interaction.customId.replace('rr_edit_msg_', '');
                    const setup = await reactionRolesCollection.findOne({ messageId });

                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`rr_edit_title_${messageId}`)
                                .setLabel('Edit Title')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`rr_edit_desc_${messageId}`)
                                .setLabel('Edit Description')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`rr_edit_banner_${messageId}`)
                                .setLabel('Edit Banner')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`rr_edit_color_${messageId}`)
                                .setLabel('Edit Color')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`rr_edit_placeholder_${messageId}`)
                                .setLabel('Edit Placeholder')
                                .setStyle(ButtonStyle.Secondary)
                        );

                    return interaction.reply({
                        content: 'Choose what you want to edit:',
                        components: [row],
                        ephemeral: true
                    });
                }

                // Handle edit buttons
                if (interaction.customId.startsWith('rr_edit_title_')) {
                    const messageId = interaction.customId.replace('rr_edit_title_', '');
                    const setup = await reactionRolesCollection.findOne({ messageId });

                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`rr_edit_title_modal_${messageId}`)
                        .setTitle('Edit Title');

                    const titleInput = new TextInputBuilder()
                        .setCustomId('new_title')
                        .setLabel('New Title')
                        .setPlaceholder('Enter the new title')
                        .setStyle(TextInputStyle.Short)
                        .setValue(setup.title)
                        .setRequired(true);

                    const row = new ActionRowBuilder().addComponents(titleInput);
                    modal.addComponents(row);

                    return interaction.showModal(modal);
                }

                if (interaction.customId.startsWith('rr_edit_desc_')) {
                    const messageId = interaction.customId.replace('rr_edit_desc_', '');
                    const setup = await reactionRolesCollection.findOne({ messageId });

                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`rr_edit_desc_modal_${messageId}`)
                        .setTitle('Edit Description');

                    const descInput = new TextInputBuilder()
                        .setCustomId('new_desc')
                        .setLabel('New Description')
                        .setPlaceholder('Enter the new description (optional)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(setup.description || '')
                        .setRequired(false);

                    const row = new ActionRowBuilder().addComponents(descInput);
                    modal.addComponents(row);

                    return interaction.showModal(modal);
                }

                if (interaction.customId.startsWith('rr_edit_banner_')) {
                    const messageId = interaction.customId.replace('rr_edit_banner_', '');
                    const setup = await reactionRolesCollection.findOne({ messageId });

                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`rr_edit_banner_modal_${messageId}`)
                        .setTitle('Edit Banner');

                    const bannerInput = new TextInputBuilder()
                        .setCustomId('new_banner')
                        .setLabel('New Banner URL')
                        .setPlaceholder('Enter the new banner URL (optional)')
                        .setStyle(TextInputStyle.Short)
                        .setValue(setup.banner || '')
                        .setRequired(false);

                    const row = new ActionRowBuilder().addComponents(bannerInput);
                    modal.addComponents(row);

                    return interaction.showModal(modal);
                }

                if (interaction.customId.startsWith('rr_edit_color_')) {
                    const messageId = interaction.customId.replace('rr_edit_color_', '');
                    const setup = await reactionRolesCollection.findOne({ messageId });

                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`rr_edit_color_modal_${messageId}`)
                        .setTitle('Edit Color');

                    const colorInput = new TextInputBuilder()
                        .setCustomId('new_color')
                        .setLabel('New Color (Hex Code)')
                        .setPlaceholder('Enter hex color code (e.g., #ff0000)')
                        .setStyle(TextInputStyle.Short)
                        .setValue(setup.color || '#f59f00')
                        .setRequired(true);

                    const row = new ActionRowBuilder().addComponents(colorInput);
                    modal.addComponents(row);

                    return interaction.showModal(modal);
                }

                if (interaction.customId.startsWith('rr_edit_placeholder_')) {
                    const messageId = interaction.customId.replace('rr_edit_placeholder_', '');
                    const setup = await reactionRolesCollection.findOne({ messageId });

                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const modal = new ModalBuilder()
                        .setCustomId(`rr_edit_placeholder_modal_${messageId}`)
                        .setTitle('Edit Placeholder');

                    const placeholderInput = new TextInputBuilder()
                        .setCustomId('new_placeholder')
                        .setLabel('New Placeholder Text')
                        .setPlaceholder('Enter the new placeholder text')
                        .setStyle(TextInputStyle.Short)
                        .setValue(setup.placeholder || 'Select a role to toggle')
                        .setRequired(true);

                    const row = new ActionRowBuilder().addComponents(placeholderInput);
                    modal.addComponents(row);

                    return interaction.showModal(modal);
                }
            }

            // Handle role selection from dropdown menus
            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('rr_menu_')) {
                const roleId = interaction.values[0];
                const member = interaction.member;
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.reply({
                        content: '❌ This role no longer exists.',
                        ephemeral: true
                    });
                }

                try {
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(roleId);
                        return interaction.reply({
                            content: `✅ Removed the ${role.name} role.`,
                            ephemeral: true
                        });
                    } else {
                        await member.roles.add(roleId);
                        return interaction.reply({
                            content: `✅ Added the ${role.name} role.`,
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    return interaction.reply({
                        content: '❌ I don\'t have permission to manage that role.',
                        ephemeral: true
                    });
                }
            }

            // Handle modal submissions for editing
            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith('rr_edit_title_modal_')) {
                    const messageId = interaction.customId.replace('rr_edit_title_modal_', '');
                    const newTitle = interaction.fields.getTextInputValue('new_title');

                    const setup = await reactionRolesCollection.findOne({ messageId });
                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const channel = await interaction.guild.channels.fetch(setup.channelId);
                    const message = await channel.messages.fetch(messageId);

                    const embed = EmbedBuilder.from(message.embeds[0])
                        .setTitle(newTitle);

                    await message.edit({ embeds: [embed] });
                    await reactionRolesCollection.updateOne(
                        { messageId },
                        { $set: { title: newTitle } }
                    );

                    return interaction.reply({
                        content: '✅ Title updated successfully!',
                        ephemeral: true
                    });
                }

                if (interaction.customId.startsWith('rr_edit_desc_modal_')) {
                    const messageId = interaction.customId.replace('rr_edit_desc_modal_', '');
                    const newDesc = interaction.fields.getTextInputValue('new_desc');

                    const setup = await reactionRolesCollection.findOne({ messageId });
                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const channel = await interaction.guild.channels.fetch(setup.channelId);
                    const message = await channel.messages.fetch(messageId);

                    const embed = EmbedBuilder.from(message.embeds[0])
                        .setDescription(newDesc || null);

                    await message.edit({ embeds: [embed] });
                    await reactionRolesCollection.updateOne(
                        { messageId },
                        { $set: { description: newDesc || null } }
                    );

                    return interaction.reply({
                        content: '✅ Description updated successfully!',
                        ephemeral: true
                    });
                }

                if (interaction.customId.startsWith('rr_edit_banner_modal_')) {
                    const messageId = interaction.customId.replace('rr_edit_banner_modal_', '');
                    const newBanner = interaction.fields.getTextInputValue('new_banner');

                    const setup = await reactionRolesCollection.findOne({ messageId });
                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const channel = await interaction.guild.channels.fetch(setup.channelId);
                    const message = await channel.messages.fetch(messageId);

                    const embed = EmbedBuilder.from(message.embeds[0]);
                    if (newBanner) {
                        try {
                            embed.setImage(newBanner);
                        } catch (error) {
                            return interaction.reply({
                                content: '❌ Invalid banner URL provided.',
                                ephemeral: true
                            });
                        }
                    } else {
                        embed.setImage(null);
                    }

                    await message.edit({ embeds: [embed] });
                    await reactionRolesCollection.updateOne(
                        { messageId },
                        { $set: { banner: newBanner || null } }
                    );

                    return interaction.reply({
                        content: '✅ Banner updated successfully!',
                        ephemeral: true
                    });
                }

                if (interaction.customId.startsWith('rr_edit_color_modal_')) {
                    const messageId = interaction.customId.replace('rr_edit_color_modal_', '');
                    const newColor = interaction.fields.getTextInputValue('new_color');

                    const setup = await reactionRolesCollection.findOne({ messageId });
                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    const channel = await interaction.guild.channels.fetch(setup.channelId);
                    const message = await channel.messages.fetch(messageId);

                    const embed = EmbedBuilder.from(message.embeds[0])
                        .setColor(newColor);

                    await message.edit({ embeds: [embed] });
                    await reactionRolesCollection.updateOne(
                        { messageId },
                        { $set: { color: newColor } }
                    );

                    return interaction.reply({
                        content: '✅ Color updated successfully!',
                        ephemeral: true
                    });
                }

                if (interaction.customId.startsWith('rr_edit_placeholder_modal_')) {
                    const messageId = interaction.customId.replace('rr_edit_placeholder_modal_', '');
                    const newPlaceholder = interaction.fields.getTextInputValue('new_placeholder');

                    const setup = await reactionRolesCollection.findOne({ messageId });
                    if (!setup) {
                        return interaction.reply({
                            content: '❌ Reaction role setup not found.',
                            ephemeral: true
                        });
                    }

                    await reactionRolesCollection.updateOne(
                        { messageId },
                        { $set: { placeholder: newPlaceholder } }
                    );

                    // Update the select menu if it exists
                    const updatedSetup = await reactionRolesCollection.findOne({ messageId });
                    if (updatedSetup.roles.length > 0) {
                        const channel = await interaction.guild.channels.fetch(updatedSetup.channelId);
                        const message = await channel.messages.fetch(messageId);

                        if (message.components.length > 0) {
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
                                .setPlaceholder(newPlaceholder)
                                .setMinValues(1)
                                .setMaxValues(1)
                                .addOptions(options);

                            const row = new ActionRowBuilder().addComponents(menu);
                            await message.edit({ components: [row] });
                        }
                    }

                    return interaction.reply({
                        content: '✅ Placeholder updated successfully!',
                        ephemeral: true
                    });
                }
            }

        } catch (error) {
            console.error('Error in reaction roles handler:', error);
            try {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request.',
                    ephemeral: true
                });
            } catch (e) {
                // Interaction may have already been replied to
            }
        }
    }
};