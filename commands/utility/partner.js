const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const PartnerConfig = require('../../models/partnership/partnerConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('partner')
        .setDescription('Create a new partnership announcement.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

    async execute(interaction) {
        if (!interaction.isCommand()) return;

        try {
            const config = await PartnerConfig.findOne({ guildId: interaction.guild.id });
            if (!config) {
                return interaction.reply({ content: 'The partnership system has not been configured yet. Use `/setup-partner set` to set a channel first.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('partner_modal')
                .setTitle('Create Partner Listing');

            const serverNameInput = new TextInputBuilder()
                .setCustomId('partner_server_name')
                .setLabel("Server Name")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('partner_description')
                .setLabel("Description")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const inviteLinkInput = new TextInputBuilder()
                .setCustomId('partner_invite_link')
                .setLabel("Invite Link")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            const tagsInput = new TextInputBuilder()
                .setCustomId('partner_tags')
                .setLabel("Tags (e.g., Gaming, Community, Fun)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const imageLinkInput = new TextInputBuilder()
                .setCustomId('partner_image_link')
                .setLabel("Image/Banner Link")
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(serverNameInput),
                new ActionRowBuilder().addComponents(descriptionInput),
                new ActionRowBuilder().addComponents(inviteLinkInput),
                new ActionRowBuilder().addComponents(tagsInput),
                new ActionRowBuilder().addComponents(imageLinkInput)
            );

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error creating partner modal:', error);
            await interaction.reply({ content: 'There was an error opening the partner setup form.', ephemeral: true });
        }
    },
};