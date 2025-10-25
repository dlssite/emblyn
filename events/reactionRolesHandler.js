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
          const setups = await reactionRolesCollection.find({ serverId: interaction.guild.id }).toArray();
          if (!setups || setups.length === 0) return interaction.editReply({ content: '📝 No reaction role setups found in this server.' });

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

        // List (edit) and delete flows - present buttons to choose a setup
        if (id === 'reaction_role_list' || id === 'reaction_role_delete_list') {
          const setups = await reactionRolesCollection.find({ serverId: interaction.guild.id }).toArray();
          if (!setups || setups.length === 0) return interaction.editReply({ content: '❌ No reaction role setups found in this server.' });

          const rows = setups.slice(0, 5).map(s => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId((id === 'reaction_role_list' ? `reaction_role_edit_${s.messageId}` : `reaction_role_delete_${s.messageId}`))
              .setLabel(s.title || (id === 'reaction_role_list' ? 'Edit Setup' : 'Delete Setup'))
              .setStyle(id === 'reaction_role_list' ? ButtonStyle.Secondary : ButtonStyle.Danger)
          ));

          return interaction.editReply({ content: id === 'reaction_role_list' ? '📝 Select a reaction role setup to edit:' : '⚠️ Select a reaction role setup to delete:', components: rows });
        }

        // Specific setup actions
        if (id.startsWith('reaction_role_edit_')) {
          const messageId = id.replace('reaction_role_edit_', '');
          const setup = await reactionRolesCollection.findOne({ messageId });
          if (!setup) return interaction.editReply({ content: '❌ Could not find the reaction role setup.' });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`reaction_role_edit_title_${messageId}`).setLabel('Edit Title').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`reaction_role_edit_desc_${messageId}`).setLabel('Edit Description').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`reaction_role_add_role_${messageId}`).setLabel('Add Role').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`reaction_role_remove_role_${messageId}`).setLabel('Remove Role').setStyle(ButtonStyle.Danger)
          );

          return interaction.editReply({ content: 'Choose what you want to edit:', components: [row] });
        }

        if (id.startsWith('reaction_role_delete_')) {
          const messageId = id.replace('reaction_role_delete_', '');
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
            const channel = await interaction.guild.channels.fetch(setup.channelId).catch(() => null);
            if (channel) {
              const msg = await channel.messages.fetch(messageId).catch(() => null);
              if (msg) await msg.delete().catch(() => {});
            }
          } catch (e) {
            // ignore
          }

          await reactionRolesCollection.deleteOne({ messageId }).catch(() => {});
          return interaction.editReply({ content: '✅ Reaction role setup has been deleted.', components: [] });
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
      }

      // SELECT MENUS
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('reaction_role_select_')) {
        if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});
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
