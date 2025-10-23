const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');

const COOLDOWN_MINUTES = 30;

async function restWithPet(source, pet) {
    const isInteraction = source.isMessageComponent && typeof source.isMessageComponent === 'function';

    const now = new Date();
    if (pet.cooldowns.rest) {
        const lastRest = new Date(pet.cooldowns.rest);
        const diffMinutes = Math.floor((now - lastRest) / (1000 * 60));

        if (diffMinutes < COOLDOWN_MINUTES) {
            const remainingTime = COOLDOWN_MINUTES - diffMinutes;
            const content = `${pet.name} is not ready to rest yet. It needs **${remainingTime} more minute(s)**.`;
            return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
        }
    }

    if (pet.isDead) {
        const content = `You cannot let a defeated pet rest. Please revive it first.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    if (pet.stats.energy >= 100) {
        const content = `${pet.name} is already fully rested.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    pet.stats.energy = Math.min(100, pet.stats.energy + 30);
    pet.cooldowns.rest = now;
    await pet.save();

    const embed = new EmbedBuilder()
        .setTitle(`${pet.name} is resting!`)
        .setDescription(`${pet.name} regained some energy.`)
        .addFields(
            { name: 'Energy', value: `+30 (Current: ${pet.stats.energy})`, inline: true }
        )
        .setColor('#87CEEB');

    if (isInteraction) {
        await source.update({ content: ' ', embeds: [embed], components: [] });
    } else {
        await source.reply({ embeds: [embed] });
    }
}

module.exports = {
    name: 'rest',
    description: 'Let a pet rest to regain energy. If no pet is specified, a selection menu will appear.',
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ').trim();

        if (petName) {
            const pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });
            if (!pet) {
                return message.reply(`You don\'t have a pet named "${petName}".`);
            }
            return restWithPet(message, pet);
        } else {
            const userPets = await Pet.find({ ownerId: userId });

            if (userPets.length === 0) {
                return message.reply('You don\'t have any pets to let rest.');
            }

            if (userPets.length === 1) {
                return restWithPet(message, userPets[0]);
            }

            const options = userPets.map(pet => ({
                label: pet.name,
                description: `Energy: ${pet.stats.energy}/100 - ${pet.isDead ? 'Defeated' : 'Alive'}`,
                value: pet._id.toString(),
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('rest_pet_select')
                    .setPlaceholder('Select a pet to let rest...')
                    .addOptions(options)
            );

            const selectMessage = await message.reply({ content: 'You have multiple pets. Please select one to let rest:', components: [row] });

            const collector = selectMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: i => i.user.id === userId && i.customId === 'rest_pet_select'
            });

            collector.on('collect', async i => {
                const selectedPetId = i.values[0];
                const selectedPet = userPets.find(p => p._id.toString() === selectedPetId);
                if (selectedPet) {
                    await restWithPet(i, selectedPet);
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