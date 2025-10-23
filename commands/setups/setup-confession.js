const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Confession = require('../../models/confession');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-confession')
    .setDescription('Sets up the confession feature.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to use for confessions.')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText))
    .addBooleanOption(option =>
        option.setName('enabled')
            .setDescription('Enable or disable the confession feature.')
            .setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const enabled = interaction.options.getBoolean('enabled');
    const guildId = interaction.guild.id;

    const confessionConfig = await Confession.findOneAndUpdate(
      { guildId },
      { channelId: channel.id, enabled },
      { upsert: true, new: true }
    );

    if (enabled) {
      const embed = new EmbedBuilder()
        .setTitle('Confession Box')
        .setDescription('Click the buttons below to submit a confession or reply to one.')
        .setColor('#2c2d31');

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confessButton')
            .setLabel('Submit a Confession')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('mainReplyButton')
            .setLabel('Reply')
            .setStyle(ButtonStyle.Secondary),
        );

      const message = await channel.send({ embeds: [embed], components: [row] });
      confessionConfig.messageId = message.id;
      await confessionConfig.save();

      interaction.reply(`Confession feature has been enabled in ${channel}.`);
    } else {
        if(confessionConfig.messageId) {
            try {
                const oldMessage = await channel.messages.fetch(confessionConfig.messageId);
                if(oldMessage) await oldMessage.delete();
            } catch(e) {
                console.log("Couldn't find old confession message to delete.")
            }
        }

        interaction.reply(`Confession feature has been disabled.`);
    }
  },
};