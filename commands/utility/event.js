const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const EventConfig = require('../../models/events/eventConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Create a new event announcement.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

    async execute(interaction) {
        const config = await EventConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
            return interaction.reply({ content: 'The event system has not been configured yet. Use `/setup-event set` to set a channel first.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('event_modal')
            .setTitle('Create Event Announcement');

        const titleInput = new TextInputBuilder()
            .setCustomId('event_title')
            .setLabel("Event Title")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('event_description')
            .setLabel("Description")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const tagsInput = new TextInputBuilder()
            .setCustomId('event_tags')
            .setLabel("Tags (e.g., Gaming, Movie, Giveaway)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const imageInput = new TextInputBuilder()
            .setCustomId('event_image')
            .setLabel("Image/Banner Link")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
            
        const linkInput = new TextInputBuilder()
            .setCustomId('event_link')
            .setLabel("Optional Link (e.g., for more info)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(tagsInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(linkInput)
        );

        await interaction.showModal(modal);
    },
};