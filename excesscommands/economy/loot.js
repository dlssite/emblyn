const { EmbedBuilder } = require('discord.js');
const { lootboxRewards } = require('../../data/lootboxRewards.js');
const { shopItems } = require('../../data/shopItems.js');

// A flattened map of all items by ID for efficient lookups
const allItemsById = Object.values(shopItems).flat().reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

module.exports = {
    name: 'loot',
    description: 'Check the potential rewards and rarities for a specific lootbox.',
    async execute(message, args) {
        const lootboxArg = args[0]?.toLowerCase();

        if (!lootboxArg) {
            const availableLootboxes = Object.keys(lootboxRewards)
                .map(id => `\`${id.replace('lootbox_', '')}\``)
                .join(', ');
            return message.reply(`Please specify the ID of the lootbox to check.\\nAvailable lootboxes: ${availableLootboxes}`);
        }

        const lootboxKey = `lootbox_${lootboxArg}`;
        const lootboxData = lootboxRewards[lootboxKey];

        if (!lootboxData) {
            return message.reply(`Could not find a lootbox with the ID \`${lootboxArg}\`.`);
        }

        if (!lootboxData.rewards || lootboxData.rewards.length === 0) {
            return message.reply(`The **${lootboxData.name || lootboxArg}** doesn't seem to have any rewards defined.`);
        }

        const totalWeight = lootboxData.rewards.reduce((acc, reward) => acc + reward.weight, 0);

        const rewardLines = lootboxData.rewards
            .sort((a, b) => b.weight - a.weight) // Show most common first
            .map(reward => {
                const percentage = ((reward.weight / totalWeight) * 100).toFixed(2);
                let icon = '❔';
                let rewardName = 'Unknown Reward';

                if (reward.type === 'cash') {
                    icon = '💰';
                    rewardName = `${reward.reward.amount.toLocaleString()} embers`;
                } else if (reward.type === 'item') {
                    icon = '🎁';
                    const itemInfo = allItemsById[reward.reward.id];
                    rewardName = itemInfo ? itemInfo.name : reward.reward.id;
                }
                return `${icon} **${rewardName}** - \`${percentage}%\``;
            });

        const embed = new EmbedBuilder()
            .setTitle(`🎁 Possible Loot for ${lootboxData.name} 🎁`)
            .setColor('#FFD700')
            .setDescription(`${lootboxData.description}\n\n${rewardLines.join('\n')}`);

        message.reply({ embeds: [embed] });
    },
};