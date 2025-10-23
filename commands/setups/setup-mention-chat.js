const { SlashCommandBuilder, ChannelType } = require('discord.js');
const AiChat = require('../../models/aichat/aiModel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-mention-chat')
    .setDescription('Configure the AI to respond to mentions in a specific channel.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable mention-based AI responses in a channel.')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel where the AI will respond to mentions.')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable mention-based AI responses.'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View the current mention-based AI response configuration.')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'enable') {
      const channel = interaction.options.getChannel('channel');
      await AiChat.updateOne({ guildId }, { $set: { mentionChannelId: channel.id } }, { upsert: true });
      await interaction.reply(`Emberlyn will now respond to mentions in ${channel}.`);
    } else if (subcommand === 'disable') {
      await AiChat.updateOne({ guildId }, { $unset: { mentionChannelId: '' } });
      await interaction.reply('Emberlyn will no longer respond to mentions.');
    } else if (subcommand === 'view') {
      const config = await AiChat.findOne({ guildId });
      const mentionChannelId = config ? config.mentionChannelId : null;

      if (mentionChannelId) {
        const channel = interaction.guild.channels.cache.get(mentionChannelId);
        await interaction.reply(`Emberlyn is currently responding to mentions in ${channel || 'an unknown channel'}.`);
      } else {
        await interaction.reply('Mention-based AI responses are not currently enabled.');
      }
    }
  },
};