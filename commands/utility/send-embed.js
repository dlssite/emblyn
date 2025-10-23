const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelType, EmbedBuilder, PermissionsBitField } = require('discord.js');

// A map to temporarily store the channel ID for each interaction
const interactionChannelMap = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-embed')
        .setDescription('Opens a form to create and send a custom embed message.')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel where the embed will be sent.')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),

    async execute(interaction, client) {
        // Check if the interaction is a command and if the user has permissions
        if (!interaction.isCommand()) return;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ 
                content: '🚫 You need the "Manage Messages" permission to use this command.',
                ephemeral: true 
            });
        }

        const targetChannel = interaction.options.getChannel('channel');
        const modalCustomId = `embed-modal-${interaction.id}`;

        // Store the selected channel ID with the interaction ID
        interactionChannelMap.set(interaction.id, targetChannel.id);

        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId(modalCustomId)
            .setTitle('Create Custom Embed');

        // Create the text input components
        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Embed Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Embed Color (Optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('e.g., #FF5733 or leave blank for default');

        const imageUrlInput = new TextInputBuilder()
            .setCustomId('embed_image_url')
            .setLabel('Image URL (Optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const footerInput = new TextInputBuilder()
            .setCustomId('embed_footer')
            .setLabel('Footer Text (Optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        // Add an action row to hold each text input component
        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(colorInput),
            new ActionRowBuilder().addComponents(imageUrlInput),
            new ActionRowBuilder().addComponents(footerInput)
        );

        // Show the modal to the user
        await interaction.showModal(modal);

        // Set up a filter to ensure we only handle the submission from this specific interaction
        const filter = (i) => i.customId === modalCustomId && i.user.id === interaction.user.id;

        try {
            // Wait for the modal to be submitted
            const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 300_000 }); // 5-minute timeout

            // Retrieve the stored channel ID
            const channelId = interactionChannelMap.get(interaction.id);
            if (!channelId) {
                await modalInteraction.reply({ content: 'Error: Could not find the channel for this interaction. Please try again.', ephemeral: true });
                return;
            }
            
            const channel = client.channels.cache.get(channelId);
            if (!channel) {
                await modalInteraction.reply({ content: 'Error: The selected channel could not be found. It might have been deleted.', ephemeral: true });
                return;
            }

            // Get data from the modal fields
            const title = modalInteraction.fields.getTextInputValue('embed_title');
            const description = modalInteraction.fields.getTextInputValue('embed_description');
            const colorHex = modalInteraction.fields.getTextInputValue('embed_color');
            const imageUrl = modalInteraction.fields.getTextInputValue('embed_image_url');
            const footer = modalInteraction.fields.getTextInputValue('embed_footer');

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description);

            // Validate and set optional color
            if (colorHex && /^#([0-9A-F]{6})$/i.test(colorHex)) {
                embed.setColor(parseInt(colorHex.replace('#', ''), 16));
            } else {
                embed.setColor(0x5865F2); // Default to Discord blurple
            }

            // Set optional image
            if (imageUrl) {
                try {
                    // Basic URL validation
                    new URL(imageUrl);
                    embed.setImage(imageUrl);
                } catch (e) {
                    await modalInteraction.reply({ content: '❌ Invalid Image URL. Please provide a valid URL starting with http:// or https://', ephemeral: true });
                    return; // Stop execution if URL is invalid
                }
            }

            // Set optional footer
            if (footer) {
                embed.setFooter({ text: footer });
            }

            // Send the embed to the target channel
            await channel.send({ embeds: [embed] });

            // Send a confirmation message
            await modalInteraction.reply({ content: `✅ Embed successfully sent to ${channel}!`, ephemeral: true });

        } catch (err) {
            // This will catch timeouts or other errors
            // The user may have dismissed the modal, so we don't need a loud error
            console.log("Modal for send-embed timed out or failed.");
        } finally {
            // Clean up the map to prevent memory leaks
            interactionChannelMap.delete(interaction.id);
        }
    },
};