const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
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
                                .setStyle(ButtonStyle.Secondary)
                        );

                    return interaction.reply({
                        content: 'Choose what you want to edit:',
                        components: [row],
                        ephemeral: true
                    });
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

                // Similar handlers for description and banner edits...
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