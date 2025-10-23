const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateEconomyProfile, updateWallet } = require('../../models/economy');

module.exports = {
    name: 'sell',
    description: 'Sell an item from your inventory.',
    aliases: ['s'],
    async execute(message, args) {
        const userId = message.author.id;
        const itemName = args.slice(0, -1).join(' ') || args.join(' ');
        const quantity = !isNaN(parseInt(args[args.length - 1])) ? parseInt(args[args.length - 1]) : 1;

        if (!itemName) {
            return message.reply('Please specify the item you want to sell. Usage: `sell <item name> [quantity]`');
        }

        if (quantity <= 0) {
            return message.reply('Please provide a valid quantity.');
        }

        const profile = await getEconomyProfile(userId);
        const inventory = profile.inventory || [];

        const itemsToSell = inventory.filter(item => item.name.toLowerCase() === itemName.toLowerCase());

        if (itemsToSell.length < quantity) {
            return message.reply(`You don\'t have enough **${itemName}** to sell. You only have ${itemsToSell.length}.`);
        }

        // --- Calculate Sale and Update Inventory ---
        const itemsBeingSold = itemsToSell.slice(0, quantity);
        let totalSalePrice = 0;
        let itemsRemovedCount = 0;
        
        const newInventory = inventory.filter(item => {
            if (item.name.toLowerCase() === itemName.toLowerCase() && itemsRemovedCount < quantity) {
                // This is an item we are selling
                const sellPrice = Math.floor((item.purchasePrice || 0) * 0.75); // Sell for 75% of purchase price
                totalSalePrice += sellPrice;
                itemsRemovedCount++;
                return false; // Remove from inventory
            }
            return true; // Keep in inventory
        });

        if (itemsRemovedCount === 0) {
            return message.reply(`Could not find any "${itemName}" in your inventory.`);
        }

        // --- Update Database ---
        await updateWallet(userId, totalSalePrice);
        await updateEconomyProfile(userId, { inventory: newInventory });

        // --- Confirmation Message ---
        const embed = new EmbedBuilder()
            .setTitle('✅ Sale Successful')
            .setDescription(`You have sold **${itemsRemovedCount}x ${itemsBeingSold[0].name}** for **${totalSalePrice.toLocaleString()} embers**.`)
            .setColor('#2ECC71')
            .setFooter({ text: `Your wallet balance is now ${(profile.wallet + totalSalePrice).toLocaleString()} embers` });

        await message.reply({ embeds: [embed] });
    },
};