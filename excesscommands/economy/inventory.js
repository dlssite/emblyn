const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile } = require('../../models/economy');
const { shopItems } = require('../../data/shopItems');

// A flattened map of all items by ID for efficient lookups
const allItemsById = Object.values(shopItems).flat().reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

module.exports = {
    name: 'inventory',
    description: 'View your purchased items, categorized and counted.',
    aliases: ['inv', 'items'],
    async execute(message, args) {
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}\'s Inventory`)
            .setColor('#F1C40F');

        const categorized = {};

        // 1. Process inventory in a single pass
        for (const userItem of profile.inventory) {
            const itemDetails = allItemsById[userItem.id];
            if (!itemDetails) continue; // Skip if item not in shop data

            const category = itemDetails.category;
            if (!categorized[category]) {
                categorized[category] = { stackable: new Map(), nonStackable: [] };
            }

            if (itemDetails.stackable) {
                const map = categorized[category].stackable;
                const existing = map.get(userItem.id) || { name: userItem.name, count: 0 };
                map.set(userItem.id, { ...existing, count: existing.count + 1 });
            } else {
                categorized[category].nonStackable.push(userItem);
            }
        }

        let hasContent = false;

        // 2. Display House
        if (profile.house) {
            embed.addFields({
                name: '🏠 Real Estate',
                value: `**${profile.house.name}**\\n*Owned since ${new Date(profile.house.purchaseDate).toLocaleDateString()}*`
            });
            hasContent = true;
        }

        // 3. Build embed fields from processed data
        const sortedCategories = Object.keys(categorized).sort();

        for (const categoryName of sortedCategories) {
            const { stackable, nonStackable } = categorized[categoryName];
            const descriptions = [];

            if (stackable.size > 0) {
                hasContent = true;
                const sortedStackable = [...stackable.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
                for (const [id, item] of sortedStackable) {
                    descriptions.push(`\`x${item.count}\` ${item.name} (\`${id}\`)`);
                }
            }

            if (nonStackable.length > 0) {
                hasContent = true;
                const sortedNonStackable = nonStackable.sort((a,b) => a.name.localeCompare(b.name));
                for (const item of sortedNonStackable) {
                    descriptions.push(`• ${item.name} (\`${item.uniqueId}\`)`);
                }
            }

            if (descriptions.length > 0) {
                embed.addFields({ name: `**${categoryName}**`, value: descriptions.join('\\n'), inline: false });
            }
        }

        if (!hasContent) {
            embed.setDescription('Your inventory is empty. Visit the `shop` to buy some items!');
        }

        message.reply({ embeds: [embed] });
    },
};