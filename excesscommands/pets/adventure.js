const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const { getEconomyProfile, addToInventory } = require('../../models/economy');
const petShopItems = require('../../data/petShopItems');
const { v4: uuidv4 } = require('uuid');

const adventureItems = [...petShopItems['Pet Supplies'], ...petShopItems['Pet Toys']];
const COOLDOWN_MINUTES = 60;

async function goOnAdventure(source, pet) {
    const userId = source.user?.id || source.author.id;
    const isInteraction = source.isMessageComponent && typeof source.isMessageComponent === 'function';

    const now = new Date();
    if (pet.cooldowns.adventure) {
        const lastAdventure = new Date(pet.cooldowns.adventure);
        const diffMinutes = Math.floor((now - lastAdventure) / (1000 * 60));

        if (diffMinutes < COOLDOWN_MINUTES) {
            const remainingTime = COOLDOWN_MINUTES - diffMinutes;
            const content = `${pet.name} is tired. It needs to rest for **${remainingTime} more minute(s)** before it can go on an adventure again.`;
            return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
        }
    }

    if (pet.stats.energy < 40) {
        const content = `${pet.name} is too tired for an adventure. Let it rest first.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    // Decrease energy and add XP
    pet.stats.energy -= 40;
    pet.cooldowns.adventure = now;
    const xpGained = Math.floor(Math.random() * 40) + 20; // Gain 20-60 XP
    const leveledUp = await pet.addXP(xpGained);

    let itemFound = null;
    if (Math.random() < 0.2) { // 20% chance to find an item
        itemFound = adventureItems[Math.floor(Math.random() * adventureItems.length)];
        const itemData = { ...itemFound, uniqueId: uuidv4() };
        await addToInventory(userId, itemData);
    }

    await pet.save();

    const embed = new EmbedBuilder()
        .setTitle(`${pet.name} returned from its adventure!`)
        .setDescription(`${pet.name} gained **${xpGained} XP**.`)
        .setColor('#00FF00');

    if (leveledUp) {
        embed.addFields({ name: 'Level Up!', value: `${pet.name} is now level ${pet.level}!` });
    }

    if (itemFound) {
        embed.addFields({ name: 'Item Found!', value: `${pet.name} found a ${itemFound.name}!` });
    }

    if (isInteraction) {
        await source.update({ content: ' ', embeds: [embed], components: [] });
    } else {
        await source.reply({ embeds: [embed] });
    }
}

module.exports = {
    name: 'adventure',
    description: 'Send a pet on an adventure to gain XP and find items. If no pet is specified, a selection menu will appear.',
    aliases: ['a'],
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ').trim();

        if (petName) {
            const pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });
            if (!pet) {
                return message.reply(`You don\'t have a pet named \"${petName}\".`);
            }
            return goOnAdventure(message, pet);
        } else {
            const userPets = await Pet.find({ ownerId: userId });

            if (userPets.length === 0) {
                return message.reply('You don\'t have any pets to send on an adventure.');
            }

            if (userPets.length === 1) {
                return goOnAdventure(message, userPets[0]);
            }

            const options = userPets.map(pet => ({
                label: pet.name,
                description: `Level: ${pet.level} - Energy: ${pet.stats.energy}/100 - ${pet.isDead ? 'Defeated' : 'Alive'}`,
                value: pet._id.toString(),
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('adventure_pet_select')
                    .setPlaceholder('Select a pet for an adventure...')
                    .addOptions(options)
            );

            const selectMessage = await message.reply({ content: 'You have multiple pets. Please select one to send on an adventure:', components: [row] });

            const collector = selectMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: i => i.user.id === userId && i.customId === 'adventure_pet_select'
            });

            collector.on('collect', async i => {
                const selectedPetId = i.values[0];
                const selectedPet = userPets.find(p => p._id.toString() === selectedPetId);
                if (selectedPet) {
                    await goOnAdventure(i, selectedPet);
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    selectMessage.edit({ content: 'Pet selection timed out.', components: [] });
                }
            });
        }
    },
};