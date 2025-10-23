const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const { getEconomyProfile, removeFromInventory } = require('../../models/economy');

const COOLDOWN_MINUTES = 5;

async function feedPet(source, pet, foodItem) {
    const userId = source.user?.id || source.author.id;
    const isInteraction = source.isMessageComponent && typeof source.isMessageComponent === 'function';

    const now = new Date();
    if (pet.cooldowns.feed) {
        const lastFeed = new Date(pet.cooldowns.feed);
        const diffMinutes = Math.floor((now - lastFeed) / (1000 * 60));

        if (diffMinutes < COOLDOWN_MINUTES) {
            const remainingTime = COOLDOWN_MINUTES - diffMinutes;
            const content = `${pet.name} is not hungry yet. You can feed it again in **${remainingTime} more minute(s)**.`;
            return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
        }
    }

    if (pet.isDead) {
        const content = `You cannot feed a defeated pet. Please revive it first.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    if (pet.stats.hunger >= 100) {
        const content = `${pet.name} is already full.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    pet.stats.hunger = Math.min(100, pet.stats.hunger + 40);
    pet.cooldowns.feed = now;
    await pet.save();

    await removeFromInventory(userId, foodItem.uniqueId);

    const embed = new EmbedBuilder()
        .setTitle(`${pet.name} has been fed!`)
        .setDescription(`${pet.name}'s hunger has been restored.`)
        .addFields({ name: 'Hunger', value: `+40 (Current: ${pet.stats.hunger})`, inline: true })
        .setColor('#FF8C00');

    if (isInteraction) {
        await source.update({ content: ' ', embeds: [embed], components: [] });
    } else {
        await source.reply({ embeds: [embed] });
    }
}

module.exports = {
    name: 'feed',
    description: 'Feed a pet to restore its hunger. If no pet is specified, a selection menu will appear.',
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ').trim();

        const profile = await getEconomyProfile(userId);
        const foodItem = profile.inventory.find(item => item.id === 'pet_food_pack');

        if (!foodItem) {
            return message.reply('You don\'t have any pet food. You can buy some from the pet shop.');
        }

        if (petName) {
            const pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });
            if (!pet) {
                return message.reply(`You don\'t have a pet named \"${petName}\".`);
            }
            return feedPet(message, pet, foodItem);
        } else {
            const userPets = await Pet.find({ ownerId: userId });

            if (userPets.length === 0) {
                return message.reply('You don\'t have any pets to feed.');
            }

            if (userPets.length === 1) {
                return feedPet(message, userPets[0], foodItem);
            }

            const options = userPets.map(pet => ({
                label: pet.name,
                description: `Hunger: ${pet.stats.hunger}/100 - ${pet.isDead ? 'Defeated' : 'Alive'}`,
                value: pet._id.toString(),
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('feed_pet_select')
                    .setPlaceholder('Select a pet to feed...')
                    .addOptions(options)
            );

            const selectMessage = await message.reply({ content: 'You have multiple pets. Please select one to feed:', components: [row] });

            const collector = selectMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: i => i.user.id === userId && i.customId === 'feed_pet_select'
            });

            collector.on('collect', async i => {
                const selectedPetId = i.values[0];
                const selectedPet = userPets.find(p => p._id.toString() === selectedPetId);
                if (selectedPet) {
                    const currentProfile = await getEconomyProfile(userId);
                    const currentFood = currentProfile.inventory.find(item => item.id === 'pet_food_pack');
                    if (!currentFood) {
                         return i.reply({ content: 'You ran out of pet food while deciding!', ephemeral: true });
                    }
                    await feedPet(i, selectedPet, currentFood);
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