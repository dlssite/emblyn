const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');

const COOLDOWN_MINUTES = 5;

async function playWithPet(source, pet) {
    const isInteraction = source.isMessageComponent && typeof source.isMessageComponent === 'function';

    const now = new Date();
    if (pet.cooldowns.play) {
        const lastPlay = new Date(pet.cooldowns.play);
        const diffMinutes = Math.floor((now - lastPlay) / (1000 * 60));

        if (diffMinutes < COOLDOWN_MINUTES) {
            const remainingTime = COOLDOWN_MINUTES - diffMinutes;
            const content = `${pet.name} is tired. It needs to rest for **${remainingTime} more minute(s)** before it can play again.`;
            return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
        }
    }

    if (pet.isDead) {
        const content = `You cannot play with a defeated pet. Please revive it first.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    if (pet.stats.energy < 20) {
        const content = `${pet.name} is too tired to play.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    pet.stats.happiness = Math.min(100, pet.stats.happiness + 15);
    pet.stats.energy = Math.max(0, pet.stats.energy - 20);
    pet.cooldowns.play = now;
    await pet.save();

    const embed = new EmbedBuilder()
        .setTitle(`You played with ${pet.name}!`)
        .setDescription(`${pet.name}'s happiness increased, but it lost some energy.`)
        .addFields(
            { name: 'Happiness', value: `+15 (Current: ${pet.stats.happiness})`, inline: true },
            { name: 'Energy', value: `-20 (Current: ${pet.stats.energy})`, inline: true }
        )
        .setColor('#FFC0CB');

    if (isInteraction) {
        await source.update({ content: ' ', embeds: [embed], components: [] });
    } else {
        await source.reply({ embeds: [embed] });
    }
}

module.exports = {
    name: 'play',
    description: 'Play with a pet to increase its happiness. If no pet is specified, a selection menu will appear.',
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ').trim();

        if (petName) {
            const pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });
            if (!pet) {
                return message.reply(`You don\'t have a pet named \"${petName}\".`);
            }
            return playWithPet(message, pet);
        } else {
            const userPets = await Pet.find({ ownerId: userId });

            if (userPets.length === 0) {
                return message.reply('You don\'t have any pets to play with.');
            }

            if (userPets.length === 1) {
                return playWithPet(message, userPets[0]);
            }

            const options = userPets.map(pet => ({
                label: pet.name,
                description: `Happiness: ${pet.stats.happiness}/100, Energy: ${pet.stats.energy}/100 - ${pet.isDead ? 'Defeated' : 'Alive'}`,
                value: pet._id.toString(),
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('play_pet_select')
                    .setPlaceholder('Select a pet to play with...')
                    .addOptions(options)
            );

            const selectMessage = await message.reply({ content: 'You have multiple pets. Please select one to play with:', components: [row] });

            const collector = selectMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: i => i.user.id === userId && i.customId === 'play_pet_select'
            });

            collector.on('collect', async i => {
                const selectedPetId = i.values[0];
                const selectedPet = userPets.find(p => p._id.toString() === selectedPetId);
                if (selectedPet) {
                    await playWithPet(i, selectedPet);
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