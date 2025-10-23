const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Confession = require('../models/confession');

module.exports = async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'confessButton') {
      const modal = new ModalBuilder()
        .setCustomId('confessionModal')
        .setTitle('Submit a Confession');

      const confessionInput = new TextInputBuilder()
        .setCustomId('confessionInput')
        .setLabel('Your Confession')
        .setStyle(TextInputStyle.Paragraph);

      const firstActionRow = new ActionRowBuilder().addComponents(confessionInput);
      modal.addComponents(firstActionRow);
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'mainReplyButton') {
      const modal = new ModalBuilder()
        .setCustomId('confessionReplyModal')
        .setTitle('Reply to a Confession');

      const messageIdInput = new TextInputBuilder()
        .setCustomId('messageIdInput')
        .setLabel('Confession Message ID')
        .setStyle(TextInputStyle.Short);

      const replyInput = new TextInputBuilder()
        .setCustomId('replyInput')
        .setLabel('Your Reply')
        .setStyle(TextInputStyle.Paragraph);

      const firstActionRow = new ActionRowBuilder().addComponents(messageIdInput);
      const secondActionRow = new ActionRowBuilder().addComponents(replyInput);
      modal.addComponents(firstActionRow, secondActionRow);
      await interaction.showModal(modal);
    }

    if (interaction.customId.startsWith('replyButton_')) {
      const messageId = interaction.customId.split('_')[1];
      const modal = new ModalBuilder()
        .setCustomId(`confessionReplyModal_${messageId}`)
        .setTitle('Reply to a Confession');

      const replyInput = new TextInputBuilder()
        .setCustomId('replyInput')
        .setLabel('Your Reply')
        .setStyle(TextInputStyle.Paragraph);

      const firstActionRow = new ActionRowBuilder().addComponents(replyInput);
      modal.addComponents(firstActionRow);
      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'confessionModal') {
      const confessionText = interaction.fields.getTextInputValue('confessionInput');
      const confessionConfig = await Confession.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { confessionCount: 1 } }, { new: true });

      if (!confessionConfig || !confessionConfig.enabled) {
        return interaction.reply({ content: 'The confession feature is not enabled on this server.', ephemeral: true });
      }

      const confessionChannel = await interaction.guild.channels.fetch(confessionConfig.channelId);

      if (!confessionChannel) {
        return interaction.reply({ content: 'The confession channel is not configured correctly.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`Secret Confession #${confessionConfig.confessionCount}`)
        .setDescription(`> ${confessionText.replace(/\n/g, '\n> ')}`)
        .setColor('Random')
        .setTimestamp();

      const confessionMessage = await confessionChannel.send({ embeds: [embed] });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confessButton')
            .setLabel('Submit a Confession')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`replyButton_${confessionMessage.id}`)
            .setLabel('Reply')
            .setStyle(ButtonStyle.Secondary),
        );

      await confessionMessage.edit({ components: [row] });

      await interaction.reply({ content: 'Your confession has been submitted anonymously.', ephemeral: true });
    }

    if (interaction.customId.startsWith('confessionReplyModal')) {
      const messageId = interaction.customId.split('_')[1];
      const replyText = interaction.fields.getTextInputValue('replyInput');
      const confessionConfig = await Confession.findOne({ guildId: interaction.guild.id });

      if (!confessionConfig || !confessionConfig.enabled) {
        return interaction.reply({ content: 'The confession feature is not enabled on this server.', ephemeral: true });
      }

      const confessionChannel = await interaction.guild.channels.fetch(confessionConfig.channelId);
      const confessionMessage = await confessionChannel.messages.fetch(messageId);

      if (!confessionMessage) return interaction.reply({ content: 'Could not find that confession.', ephemeral: true });

      const thread = confessionMessage.thread ?? await confessionMessage.startThread({
        name: `Confession Reply - ${messageId}`,
        autoArchiveDuration: 60,
      });

      await thread.send(`> ${replyText.replace(/\n/g, '\n> ')}`);
      interaction.reply({ content: 'Your reply has been sent.', ephemeral: true });
    }
  }
};