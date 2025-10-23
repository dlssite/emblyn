const { getEconomyProfile, updateEconomyProfile } = require('../../models/economy.js');
const petShopItems = require('../../data/petShopItems.js');

// Create a Set of all valid, current pet shop item names
const allValidItemNames = new Set(Object.values(petShopItems).flat().map(item => item.name));

function isKnownItem(item) {
    // A known item must have a name and be in the current shop list.
    return item && item.name && allValidItemNames.has(item.name);
}

module.exports = {
    name: 'fixinventory',
    description: 'Isolates corrupted or old pet items from your inventory for safe removal.',
    async execute(message, args) {
        const userId = message.author.id;

        try {
            const profile = await getEconomyProfile(userId);

            if (!profile) {
                return message.reply('You don\'t have an economy profile yet.');
            }

            if (!profile.inventory || profile.inventory.length === 0) {
                return message.reply('Your inventory is already empty.');
            }

            const goodItems = [];
            const corruptedItems = profile.corrupted_inventory || [];
            let itemsMoved = 0;

            for (const item of profile.inventory) {
                if (isKnownItem(item)) {
                    goodItems.push(item);
                } else {
                    corruptedItems.push(item);
                    itemsMoved++;
                }
            }

            // Use the existing update function to save the changes
            await updateEconomyProfile(userId, {
                inventory: goodItems,
                corrupted_inventory: corruptedItems
            });

            if (itemsMoved > 0) {
                await message.reply(`I found and isolated ${itemsMoved} corrupted item(s). They have been moved from your main inventory. Please run \`$pet clearcorrupted\` to permanently remove them.`);
            } else {
                await message.reply('I scanned your inventory and found no corrupted items.');
            }

        } catch (error) {
            console.error('Error in fixinventory command:', error);
            message.reply('An error occurred while trying to fix your inventory.');
        }
    },
};
