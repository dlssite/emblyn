const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, AttachmentBuilder } = require('discord.js');
const { getEconomyProfile, updateEconomyProfile, removeFromInventory, addToInventory, updateWallet } = require('../../models/economy');
const { getRandomReward } = require('../../data/lootboxRewards');
const { shopItems } = require('../../data/shopItems');

const allItems = Object.values(shopItems).flat();

const useableItems = {
    'elixir of wisdom': { duration: 60 * 60 * 1000, description: 'XP gain is doubled for 1 hour.', category: 'boosts' },
    'potion of luck': { duration: 60 * 60 * 1000, description: 'Luck increased by 10% for 1 hour.', category: 'boosts' },
    'stamina elixir': { duration: 30 * 60 * 1000, description: 'Work cooldown reduced by 50% for 30 minutes.', category: 'boosts' },
    'ward of protection': { duration: 24 * 60 * 60 * 1000, description: 'You are protected from one robbery attempt for 24 hours.', category: 'boosts' },
    'treasury expansion': { permanent: true, description: 'Your bank vault has been permanently upgraded, increasing its limit by 25%.', category: 'upgrades' },
    'hidden sanctuary': { permanent: true, description: 'You now have a Safe House, permanently decreasing your chances of being robbed.', category: 'upgrades' },
};

module.exports = {
    name: 'use',
    description: 'Use a consumable, upgrade, or open a lootbox from your inventory.',
    async execute(message, args) {
        const itemName = args.join(' ').toLowerCase();
        const userId = message.author.id;

        if (!itemName) {
            // Interactive menu for selecting item
            const profile = await getEconomyProfile(userId);
            const usableInventory = profile.inventory.filter(i => i.type === 'lootbox' || useableItems[i.name.toLowerCase()]);

            if (usableInventory.length === 0) {
                return message.reply('You have no usable items in your inventory.');
            }

            // Group items by category
            const categories = {};
            usableInventory.forEach(item => {
                const category = item.type === 'lootbox' ? 'lootboxes' : useableItems[item.name.toLowerCase()].category;
                if (!categories[category]) categories[category] = [];
                categories[category].push(item);
            });

            const categoryOptions = Object.keys(categories).map(key => {
                const categoryName = key.charAt(0).toUpperCase() + key.slice(1);
                const itemCount = categories[key].length;
                const sampleItems = categories[key].slice(0, 2).map(item => item.name).join(', ');
                return {
                    label: `${categoryName} (${itemCount} items)`,
                    value: key,
                    description: `e.g., ${sampleItems}${itemCount > 2 ? '...' : ''}`
                };
            });

            const categorySelect = new StringSelectMenuBuilder()
                .setCustomId('select_use_category')
                .setPlaceholder('Choose a category')
                .addOptions(categoryOptions);

            const embed = new EmbedBuilder()
                .setTitle('🧰 Inventory - Use Item')
                .setDescription('Select a category to browse usable items.')
                .setColor('#2ECC71')
                .setImage('attachment://marketplace.png');

            const row = new ActionRowBuilder().addComponents(categorySelect);

            const attachment = new AttachmentBuilder('UI/economyimages/marketplace.png', { name: 'marketplace.png' });

            const useMessage = await message.reply({ embeds: [embed], components: [row], files: [attachment] });

            const collector = useMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 120000 // 2 minutes
            });

            collector.on('collect', async interaction => {
                if (interaction.customId !== 'select_use_category') return;
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: "This isn't for you!", ephemeral: true });
                }

                await interaction.deferUpdate();

                const selectedCategory = interaction.values[0];
                const items = categories[selectedCategory];

                if (!items || !Array.isArray(items) || items.length === 0) {
                    return interaction.editReply({ content: 'No items available in this category.', components: [], embeds: [] });
                }

                const itemOptions = items.map(item => ({
                    label: `${item.name} (x${profile.inventory.filter(i => i.name === item.name).length})`,
                    value: item.uniqueId,
                    description: item.type === 'lootbox' ? 'Open this lootbox for a random reward' : useableItems[item.name.toLowerCase()].description
                }));

                const itemSelect = new StringSelectMenuBuilder()
                    .setCustomId('select_use_item')
                    .setPlaceholder('Choose an item to use')
                    .addOptions(itemOptions);

                const itemEmbed = new EmbedBuilder()
                    .setTitle(`🧰 Inventory - ${selectedCategory}`)
                    .setDescription('Select an item to use.')
                    .setColor('#2ECC71');

                const itemRow = new ActionRowBuilder().addComponents(itemSelect);

                await interaction.editReply({ embeds: [itemEmbed], components: [itemRow] });

                // Nested collector for item selection
                const itemCollector = useMessage.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                    time: 120000
                });

                itemCollector.on('collect', async itemInteraction => {
                    if (itemInteraction.customId !== 'select_use_item') return;
                    if (itemInteraction.user.id !== message.author.id) {
                        return itemInteraction.reply({ content: "This isn't for you!", ephemeral: true });
                    }

                    await itemInteraction.deferUpdate();

                    const selectedItemId = itemInteraction.values[0];
                    const itemInInventory = profile.inventory.find(i => i.uniqueId === selectedItemId);

                    if (!itemInInventory) {
                        return itemInteraction.editReply({ content: 'Item not found in your inventory.', components: [], embeds: [] });
                    }

                    if (itemInInventory.type === 'lootbox') {
                        await handleLootbox(itemInteraction, userId, itemInInventory);
                    } else {
                        await useItem(itemInteraction, userId, itemInInventory);
                    }

                    itemCollector.stop();
                    collector.stop();
                });

                itemCollector.on('end', () => {
                    // Disable components
                    useMessage.edit({ components: [] });
                });
            });

            collector.on('end', () => {
                useMessage.edit({ components: [] });
            });

            return;
        }

        const profile = await getEconomyProfile(userId);
        const itemInInventory = profile.inventory.find(i => i.name.toLowerCase() === itemName);

        if (!itemInInventory) {
            return message.reply(`You do not have a "${itemName}" in your inventory.`);
        }

        if (itemInInventory.type === 'lootbox') {
            return handleLootbox(message, userId, itemInInventory);
        }

        const itemToUse = useableItems[itemName];
        if (!itemToUse) {
            return message.reply(`The item "${itemName}" is not a usable item.`);
        }

        let updateData = {};
        let activeEffects = profile.activeEffects || [];

        if (itemToUse.permanent) {
            if (itemName === 'treasury expansion') {
                const currentBankLimit = profile.bankLimit || 50000;
                updateData.bankLimit = Math.floor(currentBankLimit * 1.25);
            } else if (itemName === 'hidden sanctuary') {
                updateData['upgrades.hasSafehouse'] = true;
            }
        } else {
            const now = Date.now();
            const existingEffectIndex = activeEffects.findIndex(e => e.name.toLowerCase() === itemName);
            if (existingEffectIndex !== -1) {
                activeEffects[existingEffectIndex].expiresAt = now + itemToUse.duration;
            } else {
                activeEffects.push({
                    name: itemInInventory.name,
                    expiresAt: now + itemToUse.duration,
                    description: itemToUse.description
                });
            }
            updateData.activeEffects = activeEffects;
        }
        
        await removeFromInventory(userId, itemInInventory.uniqueId); 
        await updateEconomyProfile(userId, updateData);

        const embed = new EmbedBuilder()
            .setTitle('✅ Item Used Successfully')
            .setDescription(`You have used **${itemInInventory.name}**.`) 
            .addFields({ name: 'Effect', value: itemToUse.description })
            .setColor('#2ECC71')
            .setFooter({ text: `Check your updated status with the /profile command.` });

        await message.reply({ embeds: [embed] });
    },
};

async function handleLootbox(interaction, userId, lootbox) {
    const reward = getRandomReward(lootbox.id);

    if (!reward) {
        return interaction.editReply({ content: 'Could not determine a reward for this lootbox. Please contact an admin.', components: [], embeds: [] });
    }

    let rewardDescription = '';
    if (reward.type === 'cash') {
        await updateWallet(userId, reward.reward.amount);
        rewardDescription = `${reward.reward.amount.toLocaleString()} embers`;
    } else if (reward.type === 'item') {
        const itemInfo = allItems.find(i => i.id === reward.reward.id);
        if (itemInfo) {
            await addToInventory(userId, { ...itemInfo, uniqueId: `${Date.now()}-${userId}` });
            rewardDescription = `1x ${itemInfo.name}`;
        } else {
            return interaction.editReply({ content: 'An error occurred while granting your item reward.', components: [], embeds: [] });
        }
    }

    await removeFromInventory(userId, lootbox.uniqueId);

    const embed = new EmbedBuilder()
        .setTitle(`🎁 You opened a ${lootbox.name}! 🎁`)
        .setDescription(`You received: **${rewardDescription}**`)
        .setColor('#FFD700');

    await interaction.editReply({ embeds: [embed], components: [] });
}

async function useItem(interaction, userId, itemInInventory) {
    const itemName = itemInInventory.name.toLowerCase();
    const itemToUse = useableItems[itemName];

    if (!itemToUse) {
        return interaction.editReply({ content: `The item "${itemInInventory.name}" is not a usable item.`, components: [], embeds: [] });
    }

    const profile = await getEconomyProfile(userId);
    let updateData = {};
    let activeEffects = profile.activeEffects || [];

    if (itemToUse.permanent) {
        if (itemName === 'treasury expansion') {
            const currentBankLimit = profile.bankLimit || 50000;
            updateData.bankLimit = Math.floor(currentBankLimit * 1.25);
        } else if (itemName === 'hidden sanctuary') {
            updateData['upgrades.hasSafehouse'] = true;
        }
    } else {
        const now = Date.now();
        const existingEffectIndex = activeEffects.findIndex(e => e.name.toLowerCase() === itemName);
        if (existingEffectIndex !== -1) {
            activeEffects[existingEffectIndex].expiresAt = now + itemToUse.duration;
        } else {
            activeEffects.push({
                name: itemInInventory.name,
                expiresAt: now + itemToUse.duration,
                description: itemToUse.description
            });
        }
        updateData.activeEffects = activeEffects;
    }

    await removeFromInventory(userId, itemInInventory.uniqueId);
    await updateEconomyProfile(userId, updateData);

    const embed = new EmbedBuilder()
        .setTitle('✅ Item Used Successfully')
        .setDescription(`You have used **${itemInInventory.name}**.`)
        .addFields({ name: 'Effect', value: itemToUse.description })
        .setColor('#2ECC71')
        .setFooter({ text: `Check your updated status with the /profile command.` });

    await interaction.editReply({ embeds: [embed], components: [] });
}
