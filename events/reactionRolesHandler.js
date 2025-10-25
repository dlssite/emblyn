const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonStyle
} = require('discord.js');
const { reactionRolesCollection } = require('../mongodb');

/**
 * Consolidated interaction handler for reaction-roles dashboard
 * - Single try/catch
 * - Defer + editReply for long-running button/select operations
 * - Modal submits are handled and replied once
 */
module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.guild) return;

    try {
      // BUTTONS
      if (interaction.isButton()) {
        const id = interaction.customId;

        // Defer early for all button interactions unless they show a modal
        if (!interaction.deferred && !interaction.replied &&
            !id.startsWith('reaction_role_add_') &&
            !id.startsWith('reaction_role_add_role_') &&
            !id.startsWith('reaction_role_edit_title_') &&
            !id.startsWith('reaction_role_edit_desc_') &&
            !id.startsWith('reaction_role_edit_banner_') &&
            !id.startsWith('reaction_role_edit_color_') &&
            !id.startsWith('reaction_role_edit_placeholder_') &&
            !id.startsWith('reaction_role_toggle_desc_')) {
          await interaction.deferReply({ ephemeral: true }).catch(() => {});
        }

        // Buttons that open modals MUST call showModal immediately and MUST NOT be deferred first.
        if (id.startsWith('reaction_role_add_') || id.startsWith('reaction_role_add_role_')) {
          const messageId = id.split('_').pop();
          const modal = new ModalBuilder().setCustomId(`reaction_role_add_modal_${messageId}`).setTitle('Add Role to Menu');

          const roleInput = new TextInputBuilder().setCustomId('role_id').setLabel('Role ID').setPlaceholder('Copy role ID').setStyle(TextInputStyle.Short).setRequired(true);
          const labelInput = new TextInputBuilder().setCustomId('role_label').setLabel('Label (shown in menu)').setStyle(TextInputStyle.Short).setRequired(true);
          const descInput = new TextInputBuilder().setCustomId('role_description').setLabel('Description (optional)').setStyle(TextInputStyle.Short).setRequired(false);
          const emojiInput = new TextInputBuilder().setCustomId('role_emoji').setLabel('Emoji (optional)').setStyle(TextInputStyle.Short).setRequired(false);

          modal.addComponents(new ActionRowBuilder().addComponents(roleInput), new ActionRowBuilder().addComponents(labelInput), new ActionRowBuilder().addComponents(descInput), new ActionRowBuilder().addComponents(emojiInput));
          return interaction.showModal(modal).catch(() => {});
        }

        if (id.startsWith('reaction_role_edit_title_') || id.startsWith('reaction_role_edit_desc_') || id.startsWith('reaction_role_edit_banner_') || id.startsWith('reaction_role_toggle_desc_') || id.startsWith('reaction_role_edit_color_') || id.startsWith('reaction_role_edit_placeholder_')) {
          const messageId = id.split('_').pop();
          if (id.startsWith('reaction_role_edit_title_')) {
            const modal = new ModalBuilder().setCustomId(`reaction_role_edit_title_modal_${messageId}`).setTitle('Edit Reaction Role Title');
            const titleInput = new TextInputBuilder().setCustomId('new_title').setLabel('New Title').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(titleInput));
            return interaction.showModal(modal).catch(() => {});
          } else if (id.startsWith('reaction_role_edit_desc_')) {
            const modal = new ModalBuilder().setCustomId(`reaction_role_edit_desc_modal_${messageId}`).setTitle('Edit Reaction Role Description');
            const descInput = new TextInputBuilder().setCustomId('new_description').setLabel('New Description (leave empty to remove)').setStyle(TextInputStyle.Paragraph).setRequired(false);
            modal.addComponents(new ActionRowBuilder().addComponents(descInput));
            return interaction.showModal(modal).catch(() => {});
          } else if (id.startsWith('reaction_role_toggle_desc_')) {
            const setup = await reactionRolesCollection.findOne({ messageId });
            if (!setup) {
              await interaction.deferReply({ ephemeral: true }).catch(() => {});
              return interaction.editReply({ content: '❌ Reaction role setup not found.' });
            }

            const channel = await interaction.guild.channels.fetch(setup.channelId).catch(() => null);
            if (!channel) {
              await interaction.deferReply({ ephemeral: true }).catch(() => {});
              return interaction.editReply({ content: '❌ Could not access the channel.' });
            }

            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (!msg) {
              await interaction.deferReply({ ephemeral: true }).catch(() => {});
              return interaction.editReply({ content: '❌ Could not access the message.' });
            }

            const embed = EmbedBuilder.from(msg.embeds[0] || new EmbedBuilder());
            if (setup.description) {
              // Remove description
              await interaction.deferReply({ ephemeral: true }).catch(() => {});
              embed.setDescription(null);
              await reactionRolesCollection.updateOne({ messageId }, { $set: { description: null } }).catch(() => {});
              await msg.edit({ embeds: [embed] }).catch(() => {});
              return interaction.editReply({ content: '✅ Description removed successfully!' });
            } else {
              // Add description - show modal
              const modal = new ModalBuilder().setCustomId(`reaction_role_toggle_desc_modal_${messageId}`).setTitle('Add Reaction Role Description');
              const descInput = new TextInputBuilder().setCustomId('new_description').setLabel('New Description').setStyle(TextInputStyle.Paragraph).setRequired(true);
              modal.addComponents(new ActionRowBuilder().addComponents(descInput));
              return interaction.showModal(modal).catch(() => {});
            }
          } else if (id.startsWith('reaction_role_edit_banner_')) {
            const modal = new ModalBuilder().setCustomId(`reaction_role_edit_banner_modal_${messageId}`).setTitle('Edit Reaction Role Banner');
            const bannerInput = new TextInputBuilder().setCustomId('new_banner').setLabel('New Banner URL (leave empty to remove)').setPlaceholder('https://example.com/image.png').setStyle(TextInputStyle.Short).setRequired(false);
            modal.addComponents(new ActionRowBuilder().addComponents(bannerInput));
            return interaction.showModal(modal).catch(() => {});
          } else if (id.startsWith('reaction_role_edit_color_')) {
            const modal = new ModalBuilder().setCustomId(`reaction_role_edit_color_modal_${messageId}`).setTitle('Edit Reaction Role Color');
            const colorInput = new TextInputBuilder().setCustomId('new_color').setLabel('New Color (Hex Code)').setPlaceholder('Enter hex color code (e.g., #ff0000)').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(colorInput));
            return interaction.showModal(modal).catch(() => {});
          } else if (id.startsWith('reaction_role_edit_placeholder_')) {
            const modal = new ModalBuilder().setCustomId(`reaction_role_edit_placeholder_modal_${messageId}`).setTitle('Edit Reaction Role Placeholder');
            const placeholderInput = new TextInputBuilder().setCustomId('new_placeholder').setLabel('New Placeholder Text').setPlaceholder('Enter the new placeholder text').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(placeholderInput));
            return interaction.showModal(modal).catch(() => {});
          }
        }

        // Defer early so we avoid unknown/expired interaction issues for non-modal buttons
        // We keep replies ephemeral for dashboard operations
        if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

        // Dashboard-level actions
        if (id === 'reaction_role_create') {
          const embed = new EmbedBuilder()
            .setTitle('Create Reaction Role Message')
            .setDescription(
              'Use the `/reaction-roles create` command to create a new reaction role message.\n\nYou\'ll be able to set:\n- Channel\n- Title\n- Description\n- Banner image (optional)'
            )
            .setColor('#6366f1');

          return interaction.editReply({ embeds: [embed] });
        }

        if (id === 'reaction_role_view') {
          const setups = await reactionRolesCollection.find({ serverId: interaction.guild.id, channelId: interaction.channel.id }).toArray();
          if (!setups || setups.length === 0) return interaction.editReply({ content: '📝 No reaction role setups found in this channel.' });

          const embeds = setups.map(s => {
            const e = new EmbedBuilder()
              .setTitle(s.title || 'Reaction Roles')
              .setDescription(
                `**Channel:** <#${s.channelId}>\n**Message ID:** ${s.messageId}\n\n**Roles:**\n${(s.roles || []).map(r => `• <@&${r.id}> - ${r.label}`).join('\n') || 'No roles added yet'}`
              )
              .setColor('#6366f1')
              .setTimestamp(s.createdAt ? new Date(s.createdAt) : undefined);

            if (s.banner) e.setImage(s.banner);
            return e;
          });

          await interaction.editReply({ embeds: embeds.slice(0, 10) });
          for (let i = 10; i < embeds.length; i += 10) await interaction.followUp({ embeds: embeds.slice(i, i + 10), ephemeral: true });
          return;
        }

        // List (edit) and delete flows - present dropdown menu to choose a setup
        if (id === 'reaction_role_list' || id === 'reaction_role_delete_list') {
          const setups = await reactionRolesCollection.find({ serverId: interaction.guild.id }).toArray();
          if (!setups || setups.length === 0) return interaction.editReply({ content: '❌ No reaction role setups found in this server.' });

          const options = setups.map(setup => ({
            label: setup.title || 'Untitled Setup',
            value: (id === 'reaction_role_list' ? `edit_${setup.messageId}` : `delete_${setup.messageId}`),
            description: `Message ID: ${setup.messageId}`
          }));

          const menu = new StringSelectMenuBuilder()
            .setCustomId('reaction_role_manage_select')
            .setPlaceholder(id === 'reaction_role_list' ? 'Select a setup to edit' : 'Select a setup to delete')
            .addOptions(options);

          const row = new ActionRowBuilder().addComponents(menu);

          return interaction.editReply({
            content: id === 'reaction_role_list' ? '📝 Select a reaction role setup to edit:' : '⚠️ Select a reaction role setup to delete:',
            components: [row]
          });
        }

        // Specific setup actions
        if (id.startsWith('reaction_role_edit_')) {
          const messageId = id.replace('reaction_role_edit_', '');
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Could not find the reaction role setup.' });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`reaction_role_edit_title_${messageId}`).setLabel('Edit Title').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`reaction_role_toggle_desc_${messageId}`).setLabel('Toggle Description').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`reaction_role_edit_banner_${messageId}`).setLabel('Edit Banner').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`reaction_role_edit_color_${messageId}`).setLabel('Edit Color').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`reaction_role_edit_placeholder_${messageId}`).setLabel('Edit Placeholder').setStyle(ButtonStyle.Secondary)
          );

          return interaction.editReply({ content: 'Choose what you want to edit:', components: [row] });
        }

        // Initial delete button (not confirm/cancel)
        if (id.startsWith('reaction_role_delete_') && 
            !id.startsWith('reaction_role_delete_confirm_') && 
            !id.startsWith('reaction_role_delete_cancel_') &&
            !id.startsWith('reaction_role_delete_list')) {
          const messageId = id.replace('reaction_role_delete_', '');
          
          // Verify the setup exists before showing confirm dialog
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Could not find the reaction role setup.' });
          
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`reaction_role_delete_confirm_${messageId}`).setLabel('Confirm Delete').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`reaction_role_delete_cancel_${messageId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
          );

          return interaction.editReply({ content: '⚠️ Are you sure you want to delete this reaction role setup? This action cannot be undone.', components: [row] });
        }

        if (id.startsWith('reaction_role_delete_confirm_')) {
          const messageId = id.replace('reaction_role_delete_confirm_', '');
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Could not find the reaction role setup.' });

          try {
            // Try to delete the message if it exists
            try {
              const channel = await interaction.guild.channels.fetch(setup.channelId);
              if (channel) {
                const msg = await channel.messages.fetch(messageId);
                if (msg) await msg.delete();
              }
            } catch (messageError) {
              // Message might already be deleted or inaccessible, continue with database cleanup
              console.log('Message not found or already deleted:', messageError.message);
            }

            // Always delete from database
            await reactionRolesCollection.deleteOne({ messageId });
            
            return interaction.editReply({ 
              content: '✅ Reaction role setup has been deleted.',
              components: [] 
            });
          } catch (error) {
            console.error('Error deleting reaction role setup:', error);
            if (error.code === 10008) { // Unknown Message
              // Message is already gone, just clean up the database
              await reactionRolesCollection.deleteOne({ messageId });
              return interaction.editReply({ 
                content: '✅ Reaction role setup has been deleted from the database.',
                components: [] 
              });
            }
            return interaction.editReply({ 
              content: '❌ Failed to delete the reaction role setup completely. Please try again or contact an administrator.',
              components: [] 
            });
          }
        }

        if (id.startsWith('reaction_role_delete_cancel_')) {
          return interaction.editReply({ content: '❌ Deletion cancelled.', components: [] });
        }

        // Add role / show modal to add role
        if (id.startsWith('reaction_role_add_') || id.startsWith('reaction_role_add_role_')) {
          const messageId = id.split('_').pop();
          const modal = new ModalBuilder().setCustomId(`reaction_role_add_modal_${messageId}`).setTitle('Add Role to Menu');

          const roleInput = new TextInputBuilder().setCustomId('role_id').setLabel('Role ID').setPlaceholder('Copy role ID').setStyle(TextInputStyle.Short).setRequired(true);
          const labelInput = new TextInputBuilder().setCustomId('role_label').setLabel('Label (shown in menu)').setStyle(TextInputStyle.Short).setRequired(true);
          const descInput = new TextInputBuilder().setCustomId('role_description').setLabel('Description (optional)').setStyle(TextInputStyle.Short).setRequired(false);
          const emojiInput = new TextInputBuilder().setCustomId('role_emoji').setLabel('Emoji (optional)').setStyle(TextInputStyle.Short).setRequired(false);

          modal.addComponents(new ActionRowBuilder().addComponents(roleInput), new ActionRowBuilder().addComponents(labelInput), new ActionRowBuilder().addComponents(descInput), new ActionRowBuilder().addComponents(emojiInput));
          return interaction.showModal(modal).catch(() => {});
        }

        // Edit title / description - open modals
        if (id.startsWith('reaction_role_edit_title_') || id.startsWith('reaction_role_edit_desc_')) {
          const messageId = id.split('_').pop();
          if (id.startsWith('reaction_role_edit_title_')) {
            const modal = new ModalBuilder().setCustomId(`reaction_role_edit_title_modal_${messageId}`).setTitle('Edit Reaction Role Title');
            const titleInput = new TextInputBuilder().setCustomId('new_title').setLabel('New Title').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(titleInput));
            return interaction.showModal(modal).catch(() => {});
          } else {
            const modal = new ModalBuilder().setCustomId(`reaction_role_edit_desc_modal_${messageId}`).setTitle('Edit Reaction Role Description');
            const descInput = new TextInputBuilder().setCustomId('new_description').setLabel('New Description').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(descInput));
            return interaction.showModal(modal).catch(() => {});
          }
        }

        // Unknown button id - just acknowledge
        return interaction.editReply({ content: '⚠️ Unknown action or already handled.', components: [] });
      }

      // MODAL SUBMITS
      if (interaction.isModalSubmit()) {
        // Defer modal replies - modals are a separate interaction
        if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

        const id = interaction.customId;

        // Add role modal
        if (id.startsWith('reaction_role_add_modal_')) {
          const messageId = id.replace('reaction_role_add_modal_', '');
          const roleId = interaction.fields.getTextInputValue('role_id');
          const label = interaction.fields.getTextInputValue('role_label');
          const description = interaction.fields.getTextInputValue('role_description') || undefined;
          const emoji = interaction.fields.getTextInputValue('role_emoji') || undefined;

          try {
            const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
            if (!role) return interaction.editReply({ content: '❌ Invalid role ID.' });

            const setup = await reactionRolesCollection.findOne({ messageId });
            if (!setup) return interaction.editReply({ content: '❌ Reaction role setup not found.' });

            const roleData = { id: role.id, name: role.name, label, description, emoji };
            await reactionRolesCollection.updateOne({ messageId }, { $push: { roles: roleData } });

            // Update message menu
            const channel = await interaction.guild.channels.fetch(setup.channelId).catch(() => null);
            if (channel) {
              const msg = await channel.messages.fetch(messageId).catch(() => null);
              if (msg) {
                const updatedSetup = await reactionRolesCollection.findOne({ messageId });
                const options = (updatedSetup.roles || []).map(r => ({ label: r.label, value: r.id, description: r.description || `Toggle the ${r.name} role`, emoji: r.emoji }));
                if (options.length > 0) {
                  const menu = new StringSelectMenuBuilder().setCustomId(`reaction_role_select_${messageId}`).setPlaceholder('Select a role to toggle').setMinValues(1).setMaxValues(1).addOptions(options);
                  await msg.edit({ components: [new ActionRowBuilder().addComponents(menu)] }).catch(() => {});
                }
              }
            }

            return interaction.editReply({ content: `✅ Added role ${role.name} to the menu!` });
          } catch (err) {
            console.error('Error in add role modal:', err);
            return interaction.editReply({ content: '❌ Failed to add role.' });
          }
        }

        // Edit title modal
        if (id.startsWith('reaction_role_edit_title_modal_')) {
          const messageId = id.replace('reaction_role_edit_title_modal_', '');
          const newTitle = interaction.fields.getTextInputValue('new_title');
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Reaction role setup not found.' });

          const channel = await interaction.guild.channels.fetch(setup.channelId).catch(() => null);
          if (channel) {
            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (msg) {
              const embed = EmbedBuilder.from(msg.embeds[0] || new EmbedBuilder()).setTitle(newTitle);
              await msg.edit({ embeds: [embed] }).catch(() => {});
            }
          }

          await reactionRolesCollection.updateOne({ messageId }, { $set: { title: newTitle } }).catch(() => {});
          return interaction.editReply({ content: '✅ Title updated successfully!' });
        }

        // Edit description modal
        if (id.startsWith('reaction_role_edit_desc_modal_')) {
          const messageId = id.replace('reaction_role_edit_desc_modal_', '');
          const newDesc = interaction.fields.getTextInputValue('new_description');
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Reaction role setup not found.' });

          const channel = await interaction.guild.channels.fetch(setup.channelId).catch(() => null);
          if (channel) {
            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (msg) {
              const embed = EmbedBuilder.from(msg.embeds[0] || new EmbedBuilder()).setDescription(newDesc);
              await msg.edit({ embeds: [embed] }).catch(() => {});
            }
          }

          await reactionRolesCollection.updateOne({ messageId }, { $set: { description: newDesc } }).catch(() => {});
          return interaction.editReply({ content: '✅ Description updated successfully!' });
        }

        // Edit banner modal
        if (id.startsWith('reaction_role_edit_banner_modal_')) {
          const messageId = id.replace('reaction_role_edit_banner_modal_', '');
          const newBanner = interaction.fields.getTextInputValue('new_banner') || null;
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Reaction role setup not found.' });

          const channel = await interaction.guild.channels.fetch(setup.channelId).catch(() => null);
          if (channel) {
            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (msg) {
              const embed = EmbedBuilder.from(msg.embeds[0] || new EmbedBuilder());
              if (newBanner) {
                embed.setImage(newBanner);
              } else {
                embed.setImage(null);
              }
              await msg.edit({ embeds: [embed] }).catch(() => {});
            }
          }

          await reactionRolesCollection.updateOne({ messageId }, { $set: { banner: newBanner } }).catch(() => {});
          return interaction.editReply({ content: newBanner ? '✅ Banner updated successfully!' : '✅ Banner removed successfully!' });
        }

        // Edit color modal
        if (id.startsWith('reaction_role_edit_color_modal_')) {
          const messageId = id.replace('reaction_role_edit_color_modal_', '');
          const newColor = interaction.fields.getTextInputValue('new_color');
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Reaction role setup not found.' });

          const channel = await interaction.guild.channels.fetch(setup.channelId).catch(() => null);
          if (channel) {
            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (msg) {
              const embed = EmbedBuilder.from(msg.embeds[0] || new EmbedBuilder()).setColor(newColor);
              await msg.edit({ embeds: [embed] }).catch(() => {});
            }
          }

          await reactionRolesCollection.updateOne({ messageId }, { $set: { color: newColor } }).catch(() => {});
          return interaction.editReply({ content: '✅ Color updated successfully!' });
        }

        // Edit placeholder modal
        if (id.startsWith('reaction_role_edit_placeholder_modal_')) {
          const messageId = id.replace('reaction_role_edit_placeholder_modal_', '');
          const newPlaceholder = interaction.fields.getTextInputValue('new_placeholder');
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Reaction role setup not found.' });

          await reactionRolesCollection.updateOne({ messageId }, { $set: { placeholder: newPlaceholder } }).catch(() => {});

          // Update the select menu if it exists
          const updatedSetup = await reactionRolesCollection.findOne({ messageId });
          if (updatedSetup.roles.length > 0) {
            const channel = await interaction.guild.channels.fetch(updatedSetup.channelId).catch(() => null);
            if (channel) {
              const msg = await channel.messages.fetch(messageId).catch(() => null);
              if (msg && msg.components.length > 0) {
                const options = updatedSetup.roles.map(r => ({
                  label: r.label,
                  value: r.id,
                  description: `Toggle the ${r.name} role`,
                  emoji: r.emoji
                }));

                const menu = new StringSelectMenuBuilder()
                  .setCustomId(`reaction_role_select_${messageId}`)
                  .setPlaceholder(newPlaceholder)
                  .setMinValues(1)
                  .setMaxValues(1)
                  .addOptions(options);

                const row = new ActionRowBuilder().addComponents(menu);
                await msg.edit({ components: [row] }).catch(() => {});
              }
            }
          }

          return interaction.editReply({ content: '✅ Placeholder updated successfully!' });
        }

        // Toggle description modal (add description)
        if (id.startsWith('reaction_role_toggle_desc_modal_')) {
          const messageId = id.replace('reaction_role_toggle_desc_modal_', '');
          const newDesc = interaction.fields.getTextInputValue('new_description');
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Reaction role setup not found.' });

          const channel = await interaction.guild.channels.fetch(setup.channelId).catch(() => null);
          if (channel) {
            const msg = await channel.messages.fetch(messageId).catch(() => null);
            if (msg) {
              const embed = EmbedBuilder.from(msg.embeds[0] || new EmbedBuilder()).setDescription(newDesc);
              await msg.edit({ embeds: [embed] }).catch(() => {});
            }
          }

          await reactionRolesCollection.updateOne({ messageId }, { $set: { description: newDesc } }).catch(() => {});
          return interaction.editReply({ content: '✅ Description added successfully!' });
        }
      }

      // SELECT MENUS
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'reaction_role_manage_select') {
          // Handle manage select menu (edit/delete selection)
          await interaction.deferReply({ ephemeral: true }).catch(() => {});
          const value = interaction.values[0];
          const [action, messageId] = value.split('_');

          if (action === 'edit') {
            const setup = await reactionRolesCollection.findOne({ messageId });

            if (!setup) {
              return interaction.editReply({
                content: '❌ Reaction role setup not found.',
                ephemeral: true
              });
            }

            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`reaction_role_edit_title_${messageId}`)
                  .setLabel('Edit Title')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId(`reaction_role_toggle_desc_${messageId}`)
                  .setLabel('Toggle Description')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId(`reaction_role_edit_banner_${messageId}`)
                  .setLabel('Edit Banner')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId(`reaction_role_edit_color_${messageId}`)
                  .setLabel('Edit Color')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId(`reaction_role_edit_placeholder_${messageId}`)
                  .setLabel('Edit Placeholder')
                  .setStyle(ButtonStyle.Secondary)
              );

            return interaction.editReply({
              content: 'Choose what you want to edit:',
              components: [row],
              ephemeral: true
            });
          } else if (action === 'delete') {
            const setup = await reactionRolesCollection.findOne({ messageId });

            if (!setup) {
              return interaction.editReply({
                content: '❌ Reaction role setup not found.',
                ephemeral: true
              });
            }

            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`reaction_role_delete_confirm_${messageId}`)
                  .setLabel('Confirm Delete')
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`reaction_role_delete_cancel_${messageId}`)
                  .setLabel('Cancel')
                  .setStyle(ButtonStyle.Secondary)
              );

            return interaction.editReply({
              content: `Are you sure you want to delete the "${setup.title}" reaction role setup? This action cannot be undone.`,
              components: [row],
              ephemeral: true
            });
          }
        } else if (interaction.customId.startsWith('reaction_role_select_')) {
          // Always defer first for role toggles since they involve API calls
          await interaction.deferReply({ ephemeral: true }).catch(() => {});
          const roleId = interaction.values[0];
          const member = interaction.member;

          try {
            const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
            if (!role) return interaction.editReply({ content: '❌ This role no longer exists.' });

            if (member.roles.cache.has(roleId)) {
              await member.roles.remove(roleId).catch(() => {});
              return interaction.editReply({ content: `✅ Removed the ${role.name} role.` });
            } else {
              await member.roles.add(roleId).catch(() => {});
              return interaction.editReply({ content: `✅ Added the ${role.name} role.` });
            }
          } catch (err) {
            console.error('Error toggling role:', err);
            return interaction.editReply({ content: '❌ An error occurred while toggling the role.' });
          }
        }
      }

    } catch (error) {
      console.error('reactionRolesHandler error:', error);
      try {
        if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ An internal error occurred.', ephemeral: true }).catch(() => {});
        else await interaction.editReply({ content: '❌ An internal error occurred.' }).catch(() => {});
      } catch (e) {
        // ignore
      }
    }
  }
};
