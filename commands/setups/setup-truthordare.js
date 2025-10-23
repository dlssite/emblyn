
const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TruthOrDareConfig = require('../../models/truthordare/TruthOrDareConfig');
const checkPermissions = require('../../utils/checkPermissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-truthordare')
        .setDescription('Configure the Truth or Dare channel')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('The channel to configure')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable the system for this channel')
                .setRequired(true)),

    async execute(interaction) {
        if (!await checkPermissions(interaction)) return;
        const { options, guild } = interaction;
        const targetChannel = options.getChannel('channel');
        const enabled = options.getBoolean('enabled');
        const serverId = guild.id;
        const channelId = targetChannel.id;

        if (enabled) {
            // Clean up old message if it exists in the same channel
            const oldConfig = await TruthOrDareConfig.findOne({ channelId });
            if (oldConfig) {
                try {
                    const oldMessage = await targetChannel.messages.fetch(oldConfig.messageId);
                    await oldMessage.delete();
                } catch (error) {
                    // Old message might not exist, that's fine
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🎭 Truth or Dare')
                .setDescription('Click a button below to receive a **Truth**, **Dare**, or let fate decide with **Random**! 🎲')
                .setColor('#ff66cc')
                .setFooter({ text: 'Game time!' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tod_truth').setLabel('Truth').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('tod_dare').setLabel('Dare').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('tod_random').setLabel('Random').setStyle(ButtonStyle.Secondary)
            );

            const message = await targetChannel.send({ embeds: [embed], components: [row] });

            await TruthOrDareConfig.findOneAndUpdate(
                { channelId },
                { serverId, channelId, messageId: message.id },
                { upsert: true }
            );

            return interaction.reply({ content: `✅ Truth or Dare system is now active in ${targetChannel}.`, ephemeral: true });

        } else { // Disabling
            const config = await TruthOrDareConfig.findOne({ channelId });
            if (!config) {
                return interaction.reply({ content: '❌ The Truth or Dare system is not active in this channel.', ephemeral: true });
            }

            try {
                const message = await targetChannel.messages.fetch(config.messageId);
                await message.delete();
            } catch (error) {
                console.warn('Could not delete the Truth or Dare message. It might have been deleted already.');
            }

            await TruthOrDareConfig.findOneAndDelete({ channelId });

            return interaction.reply({ content: `✅ The Truth or Dare system has been disabled for ${targetChannel}.`, ephemeral: true });
        }
    }
};
