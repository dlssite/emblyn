const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const { getEconomyProfile, updateWallet, updateGold, addToInventory } = require('../../models/economy');
const { Pet } = require('../../models/pets/pets');
const petShopItems = require('../../data/petShopItems');
const { v4: uuidv4 } = require('uuid');

const allItems = Object.values(petShopItems).flat();

// Function to find an item by name (case-insensitive, multi-word)
const findItemByName = (name) => {
    const lowerCaseName = name.toLowerCase();
    return allItems.find(item => item.name.toLowerCase() === lowerCaseName);
};

async function handlePurchase(interaction, item) {
    const userId = interaction.user.id;
    const profile = await getEconomyProfile(userId);
    const purchaseQuantity = ['food', 'toy', 'medicine'].includes(item.type) ? 10 : 1;

    try {
        if (item.type === 'pet') {
            const userPets = await Pet.find({ ownerId: userId });
            if (userPets.length >= 10) { // MAX_PETS
                throw new Error('You have reached the maximum number of pets.');
            }
            await Pet.createPet(userId, item);
        } else {
            if (item.currency === 'gold') {
                if (profile.gold < item.price) {
                    throw new Error('You do not have enough gold for this item.');
                }
                await updateGold(userId, -item.price);
            } else {
                if (profile.wallet < item.price) {
                    throw new Error(`You need $${item.price.toLocaleString()}, but you only have $${profile.wallet.toLocaleString()}.`);
                }
                await updateWallet(userId, -item.price);
            }

            for (let i = 0; i < purchaseQuantity; i++) {
                const itemData = {
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    rarity: item.rarity,
                    image: item.image,
                    purchaseDate: new Date(),
                    purchasePrice: item.price,
                    uniqueId: uuidv4()
                };
                await addToInventory(userId, itemData);
            }
        }
        await interaction.reply({ content: `🎉 You have successfully purchased **${purchaseQuantity}x ${item.name}**!`, ephemeral: true });
    } catch (error) {
        await interaction.reply({ content: error.message, ephemeral: true });
    }
}

module.exports = {
    name: 'buy',
    description: 'Buy an item from the pet shop.',
    async execute(message, args) {
        const itemName = args.join(' ');
        if (!itemName) {
            return message.reply('Please specify the item you want to buy. Usage: `$pet buy <item-name>`');
        }

        const item = findItemByName(itemName);

        if (!item) {
            return message.reply(`Could not find an item named "${itemName}".`);
        }

        if (item.rarity === 'Exclusive' || item.price === null) {
            return message.reply('This item is exclusive and cannot be purchased.');
        }

        const priceString = item.currency === 'gold' ? `${item.price} gold` : `$${item.price.toLocaleString()}`;
        const purchaseQuantity = ['food', 'toy', 'medicine'].includes(item.type) ? 10 : 1;

        const embed = new EmbedBuilder()
            .setTitle('Confirm Purchase')
            .setDescription(`Are you sure you want to buy **${purchaseQuantity}x ${item.name}** for **${priceString}**?`)
            .setThumbnail(item.image)
            .setColor('#FFD700');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('confirm_buy').setLabel('Confirm').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cancel_buy').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        );

        const confirmationMessage = await message.reply({ embeds: [embed], components: [row] });

        const collector = confirmationMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "This isn't for you!", ephemeral: true });
            }

            if (interaction.customId === 'confirm_buy') {
                await handlePurchase(interaction, item);
                await confirmationMessage.delete();
            } else if (interaction.customId === 'cancel_buy') {
                await interaction.update({ content: 'Purchase cancelled.', embeds: [], components: [] });
            }
        });

        collector.on('end', () => {
            if (!confirmationMessage.deleted) {
                confirmationMessage.edit({ content: 'Purchase timed out.', embeds: [], components: [] }).catch(console.error);
            }
        });
    },
};