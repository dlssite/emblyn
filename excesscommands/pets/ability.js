const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const rarityColors = require('../../utils/rarityColors');

/**
 * Formats a single ability object into a user-friendly string.
 * @param {object} ability - The ability object from the pet model.
 * @returns {string} - A formatted string describing the ability.
 */
const formatAbility = (ability) => {
    const typeEmoji = {
        attack: '⚔️',
        active: '💥',
        passive: '🛡️',
        care: '💖',
    };

    let description = `${typeEmoji[ability.type] || '✨'} **${ability.name}** (${ability.type})\n`;
    let effectDescription = 'Effect not specified.';

    if (ability.effect) {
        const effects = [];
        for (const [key, value] of Object.entries(ability.effect)) {
            switch (key) {
                case 'damage':
                    effects.push(`Deals ${value} damage.`);
                    break;
                case 'happiness':
                    effects.push(`Increases happiness by ${value}.`);
                    break;
                case 'defenseBoost':
                    effects.push(`Boosts defense by ${value} at the start of a battle.`);
                    break;
                case 'allyAttackUp':
                    effects.push(`Boosts attack by ${value} at the start of a battle.`);
                    break;
                case 'randomBuff':
                    effects.push(`Randomly boosts one of the following stats: ${value.join(', ')}.`);
                    break;
                default:
                    effects.push(`${key}: ${value}`);
            }
        }
        if (effects.length > 0) {
            effectDescription = effects.map(e => `• ${e}`).join('\n');
        }
    }

    return `${description}*${effectDescription}*`;
};

async function displayAbilities(source, pet) {
    const isInteraction = source.isMessageComponent && typeof source.isMessageComponent === 'function';

    const embed = new EmbedBuilder()
        .setTitle(`✨ Abilities for ${pet.name} ✨`)
        .setColor(rarityColors[pet.rarity.toLowerCase()] || '#0099ff')
        .setThumbnail(pet.image || null);

    const hasStandardAbilities = pet.abilities && pet.abilities.length > 0;
    const hasSpecialAbilities = pet.specialAbilities && pet.specialAbilities.length > 0;

    if (hasStandardAbilities) {
        const regularAbilities = pet.abilities.map(formatAbility).join('\n\n');
        embed.addFields({ name: 'Standard Abilities', value: regularAbilities });
    }

    if (hasSpecialAbilities) {
        const specialAbilities = pet.specialAbilities.map(formatAbility).join('\n\n');
        embed.addFields({ name: '🌟 Special Abilities', value: specialAbilities });
    }

    if (!hasStandardAbilities && !hasSpecialAbilities) {
        embed.setDescription('This pet has not learned any abilities yet.');
    }

    if (isInteraction) {
        await source.update({ embeds: [embed], components: [] });
    } else {
        await source.reply({ embeds: [embed] });
    }
}

module.exports = {
    name: 'ability',
    description: "Displays detailed information about a pet's abilities.",
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ').trim();

        if (petName) {
            const pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });
            if (!pet) {
                return message.reply(`You do not own a pet named \"${petName}\".`);
            }
            return displayAbilities(message, pet);
        } else {
            const userPets = await Pet.find({ ownerId: userId });

            if (userPets.length === 0) {
                return message.reply('You don\'t have any pets.');
            }

            if (userPets.length === 1) {
                return displayAbilities(message, userPets[0]);
            }

            const options = userPets.map(pet => ({
                label: pet.name,
                description: `Rarity: ${pet.rarity}`,
                value: pet._id.toString(),
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ability_pet_select')
                    .setPlaceholder('Select a pet to view its abilities...')
                    .addOptions(options)
            );

            const selectMessage = await message.reply({ content: 'You have multiple pets. Please select one to view its abilities:', components: [row] });

            const collector = selectMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: i => i.user.id === userId && i.customId === 'ability_pet_select'
            });

            collector.on('collect', async i => {
                const selectedPetId = i.values[0];
                const selectedPet = userPets.find(p => p._id.toString() === selectedPetId);
                if (selectedPet) {
                    await displayAbilities(i, selectedPet);
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