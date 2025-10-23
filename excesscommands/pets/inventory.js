const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEconomyProfile } = require('../../models/economy');
const rarityColors = require('../../utils/rarityColors');

module.exports = {
    name: 'inventory',
    description: 'Displays your item and egg inventory.',
    aliases: ['inv'],
    async execute(message, args) {
        const userId = message.author.id;
        const economyProfile = await getEconomyProfile(userId);

        const userInventory = economyProfile.inventory;
        if (userInventory.length === 0) {
            return message.reply('Your inventory is empty.');
        }

        // --- Stacking and Filtering Logic ---
        const itemCounts = new Map();
        const uniqueItemsData = new Map();

        userInventory.forEach(item => {
            // Assume items with the same name are stackable, except for eggs which should be unique unless specified otherwise.
            // For this implementation, we'll stack all items with the same name.
            const key = item.name;
            if (itemCounts.has(key)) {
                itemCounts.set(key, itemCounts.get(key) + 1);
            } else {
                itemCounts.set(key, 1);
                uniqueItemsData.set(key, item);
            }
        });

        const uniqueItems = Array.from(uniqueItemsData.values());

        // --- Sorting Logic ---
        const sortedItems = uniqueItems.sort((a, b) => {
            const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Exclusive'];
            const rarityA = rarityOrder.indexOf(a.rarity);
            const rarityB = rarityOrder.indexOf(b.rarity);
            if (rarityA !== rarityB) return rarityB - rarityA;

            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
        });

        // --- Pagination Logic ---
        const itemsPerPage = 5;
        const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
        let page = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = sortedItems.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle(`${message.member.displayName}'s Inventory`)
                .setColor('#0099ff')
                .setFooter({ text: `Page ${page + 1} of ${totalPages}` });

            if (currentItems.length === 0) {
                embed.setDescription('No items to display on this page.');
                return embed;
            }

            currentItems.forEach(item => {
                const count = itemCounts.get(item.name);
                const displayName = count > 1 ? `${item.name} (x${count})` : item.name;

                let itemType = item.type || 'N/A';
                itemType = itemType.charAt(0).toUpperCase() + itemType.slice(1);
                
                const emoji = item.type === 'egg' ? '🥚' : '📦';

                embed.addFields({
                    name: `${emoji} ${displayName}`,
                    value: `Rarity: ${item.rarity}\nType: ${itemType}`,
                    inline: false
                });
            });

            return embed;
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev_page').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next_page').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(totalPages <= 1)
        );

        const reply = await message.reply({ embeds: [generateEmbed(page)], components: [row] });

        const filter = i => i.user.id === message.author.id;
        const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'prev_page') page--;
            if (i.customId === 'next_page') page++;

            row.components[0].setDisabled(page === 0);
            row.components[1].setDisabled(page === totalPages - 1);

            await i.update({ embeds: [generateEmbed(page)], components: [row] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                row.components[0].setDisabled(true),
                row.components[1].setDisabled(true)
            );
            reply.edit({ components: [disabledRow] });
        });
    }
};
