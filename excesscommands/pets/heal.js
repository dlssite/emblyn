const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const { getEconomyProfile, removeFromInventory } = require('../../models/economy');

const COOLDOWN_MINUTES = 120;

async function healPet(source, pet, medicineItem) {
    const userId = source.user?.id || source.author.id;
    const isInteraction = source.isMessageComponent && typeof source.isMessageComponent === 'function';

    const now = new Date();
    if (pet.cooldowns.heal) {
        const lastHeal = new Date(pet.cooldowns.heal);
        const diffMinutes = Math.floor((now - lastHeal) / (1000 * 60));

        if (diffMinutes < COOLDOWN_MINUTES) {
            const remainingTime = COOLDOWN_MINUTES - diffMinutes;
            const content = `${pet.name} is not ready to be healed yet. You can heal it again in **${remainingTime} more minute(s)**.`;
            return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
        }
    }

    if (pet.isDead) {
        const content = `You cannot heal a defeated pet. Please revive it first.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    if (pet.stats.hp >= pet.stats.maxHealth) {
        const content = `${pet.name} already has full health.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    pet.stats.hp = Math.min(pet.stats.maxHealth, pet.stats.hp + 50);
    pet.cooldowns.heal = now;
    await pet.save();

    await removeFromInventory(userId, medicineItem.uniqueId);

    const embed = new EmbedBuilder()
        .setTitle(`${pet.name} has been healed!`)
        .setDescription(`${pet.name}'s health has been restored.`)
        .addFields({ name: 'HP', value: `+50 (Current: ${pet.stats.hp}/${pet.stats.maxHealth})`, inline: true })
        .setColor('#00FF00');

    if (isInteraction) {
        await source.update({ content: ' ', embeds: [embed], components: [] });
    } else {
        await source.reply({ embeds: [embed] });
    }
}

module.exports = {
    name: 'heal',
    description: 'Heal a pet with medicine. If no pet is specified, a selection menu will appear.',
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ').trim();

        const profile = await getEconomyProfile(userId);
        const medicineItem = profile.inventory.find(item => item.id === 'pet_medicine_pack');

        if (!medicineItem) {
            return message.reply('You don\'t have any pet medicine. You can buy some from the pet shop.');
        }

        if (petName) {
            const pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });
            if (!pet) {
                return message.reply(`You don\'t have a pet named "${petName}".`);
            }
            return healPet(message, pet, medicineItem);
        } else {
            const userPets = await Pet.find({ ownerId: userId });

            if (userPets.length === 0) {
                return message.reply('You don\'t have any pets to heal.');
            }

            if (userPets.length === 1) {
                return healPet(message, userPets[0], medicineItem);
            }

            const options = userPets.map(pet => ({
                label: pet.name,
                description: `HP: ${pet.stats.hp}/${pet.stats.maxHealth} - ${pet.isDead ? 'Defeated' : 'Alive'}`,
                value: pet._id.toString(),
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('heal_pet_select')
                    .setPlaceholder('Select a pet to heal...')
                    .addOptions(options)
            );

            const selectMessage = await message.reply({ content: 'You have multiple pets. Please select one to heal:', components: [row] });

            const collector = selectMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: i => i.user.id === userId && i.customId === 'heal_pet_select'
            });

            collector.on('collect', async i => {
                const selectedPetId = i.values[0];
                const selectedPet = userPets.find(p => p._id.toString() === selectedPetId);
                if (selectedPet) {
                    await healPet(i, selectedPet, medicineItem);
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