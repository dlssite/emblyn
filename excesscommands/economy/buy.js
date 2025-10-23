const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType, AttachmentBuilder } = require('discord.js');
const { getEconomyProfile, updateWallet, updateGold, addToInventory } = require('../../models/economy');
const { shopItems } = require('../../data/shopItems');
const { v4: uuidv4 } = require('uuid');

const allItems = Object.values(shopItems).flat();
const EXPENSIVE_ITEM_THRESHOLD = 20000; // Confirmation for purchases over this amount

const categoryImages = {
    "Kingdom Properties": "properties.png",
    "Mounts & Conveyances": "mounts.png",
    "Potions & Elixirs": "potion.png",
    "Treasure Chests": "chest.png",
    "Kingdom Upgrades": "upgrades.png"
};

async function processPurchase(interaction, userId, profile, item, quantity, totalPrice, currency) {
    try {
        // For non-stackable items, if the user tries to buy one they already have.
        if (!item.stackable && profile.inventory.some(i => i.id === item.id)) {
            return interaction.editReply({ content: `You already own a(n) **${item.name}**.`, components: [], embeds: [] });
        }

        // Add the item(s) to the user's inventory
        if (item.id === 'pet_food_pack') {
            for (let i = 0; i < 10 * quantity; i++) {
                await addToInventory(userId, { id: 'pet_food', name: 'Pet Food', type: 'consumable', uniqueId: uuidv4() });
            }
        } else if (item.id === 'pet_toy_pack') {
            for (let i = 0; i < 10 * quantity; i++) {
                await addToInventory(userId, { id: 'pet_toy', name: 'Pet Toy', type: 'consumable', uniqueId: uuidv4() });
            }
        } else if (item.id === 'pet_medicine_pack') {
            for (let i = 0; i < 5 * quantity; i++) {
                await addToInventory(userId, { id: 'pet_medicine', name: 'Pet Medicine', type: 'consumable', uniqueId: uuidv4() });
            }
        } else {
            const itemData = {
                id: item.id,
                name: item.name,
                type: item.type,
                rarity: item.rarity, // Include rarity for eggs
                purchaseDate: new Date(),
                purchasePrice: item.price,
                uniqueId: uuidv4()
            };
            for (let i = 0; i < quantity; i++) {
                await addToInventory(userId, itemData);
            }
        }

        // Deduct money from wallet or gold
        if (currency === 'gold') {
            await updateGold(userId, -totalPrice);
        } else {
            await updateWallet(userId, -totalPrice);
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Purchase Successful!')
            .setDescription(`You have successfully purchased **${quantity}x ${item.name}** for **${currency === 'gold' ? 'G': ''}${totalPrice.toLocaleString()} ${currency === 'gold' ? 'gold' : 'embers'}**.`)
            .setColor('#2ECC71');

        await interaction.editReply({ embeds: [embed], components: [] });

    } catch (error) {
        console.error('Error processing purchase:', error);
        await interaction.editReply({ content: 'Something went wrong while completing your purchase.', components: [], embeds: [] });
    }
}


module.exports = {
    name: 'buy',
    description: 'Purchase an item or multiple items from the shop.',
    async execute(message, args) {
        const itemId = args[0]?.toLowerCase();
        const quantity = parseInt(args[1]) || 1;

        if (!itemId) {
            // Interactive menu for selecting item
            const categoryOptions = Object.keys(shopItems).map(key => {
                const categoryName = key.charAt(0).toUpperCase() + key.slice(1);
                const itemCount = shopItems[key].length;
                const sampleItems = shopItems[key].slice(0, 2).map(item => item.name).join(', ');
                return {
                    label: `${categoryName} (${itemCount} items)`,
                    value: key,
                    description: `e.g., ${sampleItems}${itemCount > 2 ? '...' : ''}`
                };
            });

            const categorySelect = new StringSelectMenuBuilder()
                .setCustomId('select_category')
                .setPlaceholder('Choose a category')
                .addOptions(categoryOptions);

            const embed = new EmbedBuilder()
                .setTitle('🏰 Kingdom Market - Buy Item')
                .setDescription('Select a category to browse items for purchase.')
                .setColor('#2ECC71')
                .setImage('attachment://marketplace.png');

            const row = new ActionRowBuilder().addComponents(categorySelect);

            const attachment = new AttachmentBuilder('UI/economyimages/marketplace.png', { name: 'marketplace.png' });

            const buyMessage = await message.reply({ embeds: [embed], components: [row], files: [attachment] });

            const collector = buyMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 120000 // 2 minutes
            });

            collector.on('collect', async interaction => {
                if (interaction.customId !== 'select_category') return;
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: "This isn't for you!", ephemeral: true });
                }

                await interaction.deferUpdate();

                const selectedCategory = interaction.values[0];
                const items = shopItems[selectedCategory];

                if (!items || !Array.isArray(items) || items.length === 0) {
                    return interaction.editReply({ content: 'No items available in this category.', components: [], embeds: [] });
                }

                const itemOptions = items.map(item => ({
                    label: `${item.name} - ${item.price.toLocaleString()} embers`,
                    value: item.id,
                    description: item.description.length > 100 ? item.description.substring(0, 97) + '...' : item.description
                }));

                const itemSelect = new StringSelectMenuBuilder()
                    .setCustomId('select_item')
                    .setPlaceholder('Choose an item to buy')
                    .addOptions(itemOptions);

                const imageName = categoryImages[selectedCategory] || 'marketplace.png';
                const itemEmbed = new EmbedBuilder()
                    .setTitle(`🏰 Kingdom Market - ${selectedCategory}`)
                    .setDescription('Select an item to purchase.')
                    .setColor('#2ECC71')
                    .setImage(`attachment://${imageName}`);

                const itemRow = new ActionRowBuilder().addComponents(itemSelect);

                const attachment = new AttachmentBuilder(`UI/economyimages/${imageName}`, { name: imageName });

                await interaction.editReply({ embeds: [itemEmbed], components: [itemRow], files: [attachment] });

                // Nested collector for item selection
                const itemCollector = buyMessage.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                    time: 120000
                });

                itemCollector.on('collect', async itemInteraction => {
                    if (itemInteraction.customId !== 'select_item') return;
                    if (itemInteraction.user.id !== message.author.id) {
                        return itemInteraction.reply({ content: "This isn't for you!", ephemeral: true });
                    }

                    await itemInteraction.deferUpdate();

                    const selectedItemId = itemInteraction.values[0];
                    const item = allItems.find(i => i.id === selectedItemId);

                    // Now proceed with purchase logic
                    const userId = message.author.id;
                    const profile = await getEconomyProfile(userId);
                    const totalPrice = item.price * quantity;
                    const currency = item.currency || 'wallet';

                    if ((currency === 'gold' && profile.gold < totalPrice) || (currency === 'wallet' && profile.wallet < totalPrice)) {
                        return itemInteraction.editReply({
                            content: `You don\'t have enough ${currency}. You need **${currency === 'gold' ? 'G': ''}${totalPrice.toLocaleString()} ${currency === 'gold' ? 'gold' : 'embers'}**, but you only have **${currency === 'gold' ? 'G': ''}${profile[currency].toLocaleString()} ${currency === 'gold' ? 'gold' : 'embers'}**.`,
                            components: [], embeds: []
                        });
                    }

                    // Confirmation for expensive items
                    if (totalPrice >= EXPENSIVE_ITEM_THRESHOLD && currency === 'wallet') {
                        const confirmRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('confirm_purchase').setLabel('Confirm').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId('cancel_purchase').setLabel('Cancel').setStyle(ButtonStyle.Danger)
                        );

                        await itemInteraction.editReply({
                            content: `Are you sure you want to purchase **${quantity}x ${item.name}** for **${totalPrice.toLocaleString()} embers**?`,
                            components: [confirmRow],
                            embeds: []
                        });

                        const confirmCollector = buyMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

                        confirmCollector.on('collect', async confirmInteraction => {
                            if (confirmInteraction.user.id !== message.author.id) {
                                return confirmInteraction.reply({ content: "This isn't for you!", ephemeral: true });
                            }

                            await confirmInteraction.deferUpdate();

                            if (confirmInteraction.customId === 'confirm_purchase') {
                                await processPurchase(confirmInteraction, userId, profile, item, quantity, totalPrice, currency);
                            } else {
                                await confirmInteraction.editReply({ content: 'Purchase canceled.', components: [] });
                            }
                            confirmCollector.stop();
                            itemCollector.stop();
                            collector.stop();
                        });

                        confirmCollector.on('end', (collected, reason) => {
                            if (reason === 'time') {
                                buyMessage.edit({ content: 'Confirmation timed out. Purchase canceled.', components: [] });
                            }
                        });

                    } else {
                        // Auto-confirm for cheaper items or gold purchases
                        await processPurchase(itemInteraction, userId, profile, item, quantity, totalPrice, currency);
                        itemCollector.stop();
                        collector.stop();
                    }
                });

                itemCollector.on('end', () => {
                    // Disable components
                    buyMessage.edit({ components: [] });
                });
            });

            collector.on('end', () => {
                buyMessage.edit({ components: [] });
            });

            return;
        }

        if (isNaN(quantity) || quantity < 1) {
            return message.reply('Please provide a valid quantity.');
        }

        const item = allItems.find(i => i.id.toLowerCase() === itemId);

        if (!item) {
            return message.reply(`We couldn\'t find an item with the ID \`${itemId}\`.`);
        }

        if (item.price === null) {
            return message.reply('This item cannot be purchased from the shop.');
        }

        if (quantity > 1 && !item.stackable) {
            return message.reply(`You can only own one **${item.name}** at a time.`);
        }

        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);
        const totalPrice = item.price * quantity;
        const currency = item.currency || 'wallet';

        if ((currency === 'gold' && profile.gold < totalPrice) || (currency === 'wallet' && profile.wallet < totalPrice)) {
            return message.reply(`You don\'t have enough ${currency}. You need **${currency === 'gold' ? 'G': ''}${totalPrice.toLocaleString()} ${currency === 'gold' ? 'gold' : 'embers'}**, but you only have **${currency === 'gold' ? 'G': ''}${profile[currency].toLocaleString()} ${currency === 'gold' ? 'gold' : 'embers'}**.`);
        }

        // Confirmation for expensive items
        if (totalPrice >= EXPENSIVE_ITEM_THRESHOLD && currency === 'wallet') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_purchase').setLabel('Confirm').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('cancel_purchase').setLabel('Cancel').setStyle(ButtonStyle.Danger)
            );

            const confirmationMsg = await message.reply({
                content: `Are you sure you want to purchase **${quantity}x ${item.name}** for **${totalPrice.toLocaleString()} embers**?`,
                components: [row],
                fetchReply: true
            });

            const collector = confirmationMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

            collector.on('collect', async interaction => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: "This isn't for you!", ephemeral: true });
                }

                if (interaction.customId === 'confirm_purchase') {
                    await processPurchase(interaction, userId, profile, item, quantity, totalPrice, currency);
                } else {
                    await interaction.editReply({ content: 'Purchase canceled.', components: [] });
                }
                collector.stop();
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    confirmationMsg.edit({ content: 'Confirmation timed out. Purchase canceled.', components: [] });
                }
            });

        } else {
            // Auto-confirm for cheaper items or gold purchases
            const mockInteraction = { 
                update: async (options) => { 
                    if (options.embeds) { 
                        await message.channel.send({ embeds: options.embeds, components: [] });
                    } else {
                        await message.channel.send(options);
                    }
                } 
            };
            await processPurchase(mockInteraction, userId, profile, item, quantity, totalPrice, currency);
        }
    },
};
