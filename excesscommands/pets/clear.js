const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Pet } = require('../../models/pets/pets.js');
const { getEconomyProfile } = require('../../models/economy.js');
const petShopItems = require('../../data/petShopItems.js');

// Create a Set of all pet shop item names for efficient lookup
const allPetShopItemNames = new Set(Object.values(petShopItems).flat().map(item => item.name));
const petItemTypes = ['egg', 'food', 'toy', 'medicine'];

function isPetRelatedItem(item) {
    // Check if the item type is a known pet item type
    if (item.type && petItemTypes.includes(item.type)) {
        return true;
    }
    // Check if the item name is in the master list of pet shop items
    if (item.name && allPetShopItemNames.has(item.name)) {
        return true;
    }
    // Check for legacy/corrupted eggs that might be missing a type but have 'Egg' in the name
    if (item.name && item.name.toLowerCase().includes('egg')) {
        return true;
    }
    return false;
}

module.exports = {
    name: 'clear',
    description: 'Deletes all your pets and pet-related items.',
    async execute(message, args) {
        const userId = message.author.id;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_delete')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_delete')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
            );

        const reply = await message.reply({
            content: 'Are you sure you want to delete all of your pets and pet-related items (eggs, food, toys, etc.)? This action cannot be undone.',
            components: [row],
            ephemeral: true
        });

        const filter = i => i.user.id === message.author.id;

        try {
            const confirmation = await reply.awaitMessageComponent({ filter, time: 60000 });

            if (confirmation.customId === 'confirm_delete') {
                // Delete all pets owned by the user
                await Pet.deleteMany({ ownerId: userId });

                // Clear pet-related items from the user's inventory
                const profile = await getEconomyProfile(userId);
                if (profile && profile.inventory && profile.inventory.length > 0) {
                    // Filter the inventory, keeping only items that are NOT pet-related
                    profile.inventory = profile.inventory.filter(item => !isPetRelatedItem(item));
                    await profile.save();
                }

                await confirmation.update({ content: `All your pet data and pet-related items have been cleared.`, components: [] });
            } else if (confirmation.customId === 'cancel_delete') {
                await confirmation.update({ content: 'Action cancelled.', components: [] });
            }
        } catch (e) {
            console.error('Clear command error:', e);
            await reply.edit({ content: 'Confirmation not received within 1 minute, cancelling.', components: [] }).catch(() => {});
        }
    },
};
