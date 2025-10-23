const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { getEconomyProfile, updateWallet, updateGold, addToInventory } = require('../../models/economy');
const petShopItems = require('../../data/petShopItems');
const { Pet } = require('../../models/pets/pets');
const { v4: uuidv4 } = require('uuid');

const allItems = Object.values(petShopItems).flat();

const rarityColors = {
    'Common': '#FFFFFF',
    'Uncommon': '#2ECC71',
    'Rare': '#3498DB',
    'Epic': '#9B59B6',
    'Legendary': '#F1C40F',
    'Mythic': '#E67E22',
    'Exclusive': '#E74C3C'
};

const getItemsByCategory = (category) => {
    if (category === 'all') return allItems;
    if (category === 'pets') return allItems.filter(item => item.type === 'pet');
    return allItems.filter(item => item.category.toLowerCase().replace(/ /g, '') === category);
};

const generateEmbed = (item, page, totalPages) => {
    const priceString = item.rarity === 'Exclusive'
        ? 'Exclusive (Admin Give Only)'
        : item.price === null
            ? 'Not for sale'
            : item.currency === 'gold'
                ? `${item.price} gold`
                : `$${item.price.toLocaleString()}`;

    const embed = new EmbedBuilder()
        .setTitle(`🐾 Pet Shop - ${item.category}`)
        .setColor(rarityColors[item.rarity] || '#FFFFFF')
        .setImage(item.image)
        .setFooter({ text: `Item ${page + 1} of ${totalPages}` });

    let description = `**${item.name}**`;
    if (item.quantity) {
        description += ` (x${item.quantity})`;
    }
    description += `\n*${item.description}*\n\n**Rarity:** ${item.rarity}\n**Price:** ${priceString}`;
    if (item.stats) { // For pets
        description += `\n**Stats:** Atk: ${item.stats.attack}, Def: ${item.stats.defense}, Spd: ${item.stats.speed}`;
    }
    description += `\n**ID:** \`${item.id}\``

    embed.setDescription(description);
    return embed;
};

const createComponents = (page, totalPages, currentCategory, currentItem) => {
    const categoryOptions = [
        { label: 'All', value: 'all' },
        { label: 'Pets', value: 'pets' },
        { label: 'Pet Eggs', value: 'peteggs' },
        { label: 'Pet Supplies', value: 'petsupplies' },
    ].map(opt => ({ ...opt, default: opt.value === currentCategory }));

    const row1 = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('category_select')
            .setPlaceholder('Select a category...')
            .addOptions(categoryOptions)
    );

    const isBuyDisabled = currentItem.rarity === 'Exclusive';

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('previous').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('buy').setLabel('Buy').setStyle(ButtonStyle.Success).setDisabled(isBuyDisabled),
        new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
    );
    return [row1, row2];
};

async function handlePetPurchase(interaction, item) {
    if (item.rarity === 'Exclusive' || item.price === null) {
        return interaction.reply({ content: 'This item is exclusive and cannot be purchased.', ephemeral: true });
    }

    const userId = interaction.user.id;
    const userPets = await Pet.find({ ownerId: userId });
    if (userPets.length >= 10) { // MAX_PETS
        return interaction.reply({ content: 'You have reached the maximum number of pets.', ephemeral: true });
    }

    try {
        const newPet = await Pet.createPet(userId, item);
        await interaction.reply({ content: `🎉 You have successfully purchased a new pet: **${newPet.name}**!`, ephemeral: true });
    } catch (error) {
        console.error('Pet purchase failed:', error);
        await interaction.reply({ content: error.message, ephemeral: true });
    }
}

async function handlePurchase(interaction, item) {
    if (item.rarity === 'Exclusive' || item.price === null) {
        return interaction.reply({ content: 'This item is exclusive and cannot be purchased.', ephemeral: true });
    }

    if (item.type === 'pet') {
        return handlePetPurchase(interaction, item);
    }

    const userId = interaction.user.id;
    const profile = await getEconomyProfile(userId);

    // Check balance
    if (item.currency === 'gold') {
        if (profile.gold < item.price) {
            return interaction.reply({ content: 'You do not have enough gold for this item.', ephemeral: true });
        }
    } else {
        if (profile.wallet < item.price) {
            return interaction.reply({ content: `You need $${item.price.toLocaleString()}, but you only have $${profile.wallet.toLocaleString()}.`, ephemeral: true });
        }
    }
    
    const purchaseQuantity = item.quantity || 1;

    if (!item.stackable && profile.inventory.some(i => i.id === item.id)) {
        return interaction.reply({ content: `You can only own one **${item.name}**.`, ephemeral: true });
    }

    // Deduct currency
    if (item.currency === 'gold') {
        await updateGold(userId, -item.price);
    } else {
        await updateWallet(userId, -item.price);
    }

    // Add item(s) to inventory
    const itemData = {
        id: item.id,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        image: item.image,
        purchaseDate: new Date(),
        purchasePrice: item.price,
    };
    await addToInventory(userId, itemData, purchaseQuantity);

    await interaction.reply({ content: `🎉 You have successfully purchased **${item.name}** (x${purchaseQuantity})!`, ephemeral: true });
}


module.exports = {
    name: 'shop',
    description: 'Browse pets, eggs, and supplies.',
    aliases: ['s'],

    async execute(message, args) {
        let currentCategory = 'all';
        let items = getItemsByCategory(currentCategory);
        let page = 0;

        const embed = generateEmbed(items[page], page, items.length);
        const components = createComponents(page, items.length, currentCategory, items[page]);

        const shopMessage = await message.reply({ embeds: [embed], components: components });

        const collector = shopMessage.createMessageComponentCollector({ 
            time: 600000 // 10 minutes
        });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "This isn't for you!", ephemeral: true });
            }

            if (interaction.isStringSelectMenu()) {
                currentCategory = interaction.values[0];
                items = getItemsByCategory(currentCategory);
                page = 0; 
            } else if (interaction.isButton()) {
                switch (interaction.customId) {
                    case 'previous':
                        page = Math.max(0, page - 1);
                        break;
                    case 'next':
                        page = Math.min(items.length - 1, page + 1);
                        break;
                    case 'buy':
                        const itemToBuy = items[page];
                        await handlePurchase(interaction, itemToBuy);
                        return;
                }
            }
            
            const newEmbed = generateEmbed(items[page], page, items.length);
            const newComponents = createComponents(page, items.length, currentCategory, items[page]);
            await interaction.update({ embeds: [newEmbed], components: newComponents });
        });

        collector.on('end', () => {
            const finalComponents = createComponents(page, items.length, currentCategory, items[page]);
            finalComponents.forEach(row => row.components.forEach(component => component.setDisabled(true)));
            shopMessage.edit({ components: finalComponents }).catch(console.error);
        });
    },
};
