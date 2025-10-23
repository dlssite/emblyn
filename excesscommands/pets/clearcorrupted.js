const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEconomyProfile, updateEconomyProfile } = require('../../models/economy.js');

module.exports = {
    name: 'clearcorrupted',
    description: 'Permanently deletes all items isolated by the fixinventory command.',
    async execute(message, args) {
        const userId = message.author.id;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_clear_corrupted')
                    .setLabel('Confirm Deletion')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_clear_corrupted')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
            );

        const profile = await getEconomyProfile(userId);
        if (!profile) {
            return message.reply('You don\'t have an economy profile yet.');
        }

        const corruptedCount = profile.corrupted_inventory ? profile.corrupted_inventory.length : 0;

        if (corruptedCount === 0) {
            return message.reply('You have no corrupted items to clear.');
        }

        const reply = await message.reply({
            content: `Are you sure you want to permanently delete ${corruptedCount} corrupted item(s)? This action cannot be undone.`,
            components: [row],
            ephemeral: true
        });

        const filter = i => i.user.id === message.author.id;

        try {
            const confirmation = await reply.awaitMessageComponent({ filter, time: 60000 });

            if (confirmation.customId === 'confirm_clear_corrupted') {
                await updateEconomyProfile(userId, { corrupted_inventory: [] });
                await confirmation.update({ content: `Successfully deleted ${corruptedCount} corrupted item(s).`, components: [] });
            } else if (confirmation.customId === 'cancel_clear_corrupted') {
                await confirmation.update({ content: 'Action cancelled.', components: [] });
            }
        } catch (e) {
            await reply.edit({ content: 'Confirmation not received within 1 minute, cancelling.', components: [] }).catch(() => {});
        }
    },
};
