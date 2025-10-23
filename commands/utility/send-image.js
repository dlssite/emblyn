const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-image')
        .setDescription('Sends an image to a specified channel.')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel where the image will be sent.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addStringOption(option =>
            option
                .setName('image-url')
                .setDescription('The URL of the image to send.')
                .setRequired(true)),

    async execute(interaction, client) {
        if (!interaction.isCommand()) return;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ 
                content: '🚫 You need the "Manage Messages" permission to use this command.',
                ephemeral: true 
            });
        }

        const targetChannel = interaction.options.getChannel('channel');
        const imageUrl = interaction.options.getString('image-url');

        try {
            // Basic URL validation
            new URL(imageUrl);
        } catch (e) {
            await interaction.reply({ content: '❌ Invalid Image URL. Please provide a valid URL starting with http:// or https://', ephemeral: true });
            return; // Stop execution if URL is invalid
        }

        try {
            await targetChannel.send({ files: [imageUrl] });
            await interaction.reply({ content: `✅ Image successfully sent to ${targetChannel}!`, ephemeral: true });
        } catch (error) {
            console.error('Error sending image:', error);
            await interaction.reply({ content: '❌ There was an error sending the image. Please check the URL and my permissions in that channel.', ephemeral: true });
        }
    },
};
