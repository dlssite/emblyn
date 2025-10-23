const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const { getEconomyProfile, updateEconomyProfile } = require('../../models/economy');

const REVIVAL_COST = 500;

async function revivePet(source, pet) {
    const userId = source.user?.id || source.author.id;
    const isInteraction = source.isMessageComponent && typeof source.isMessageComponent === 'function';

    if (!pet.isDead) {
        const content = `**${pet.name}** is not defeated.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    const economyProfile = await getEconomyProfile(userId);

    if (economyProfile.wallet < REVIVAL_COST) {
        const content = `You don\'t have enough money to revive **${pet.name}**. You need ${REVIVAL_COST} coins.`;
        return isInteraction ? source.reply({ content, ephemeral: true }) : source.reply({ content });
    }

    await updateEconomyProfile(userId, { wallet: economyProfile.wallet - REVIVAL_COST });

    pet.isDead = false;
    pet.stats.hp = pet.stats.maxHealth; // Restore to full health
    await pet.save();

    const embed = new EmbedBuilder()
        .setTitle('Pet Revived!')
        .setDescription(`You have revived **${pet.name}** for ${REVIVAL_COST} coins.`)
        .setColor('#00FF00');

    if (isInteraction) {
        await source.update({ content: ' ', embeds: [embed], components: [] });
    } else {
        await source.reply({ embeds: [embed] });
    }
}

module.exports = {
    name: 'revive',
    description: 'Revives a defeated pet. If no pet is specified, a selection menu will appear.',
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ').trim();

        if (petName) {
            const pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });
            if (!pet) {
                return message.reply(`You don\'t own a pet named \"${petName}\".`);
            }
            return revivePet(message, pet);
        } else {
            const defeatedPets = await Pet.find({ ownerId: userId, isDead: true });

            if (defeatedPets.length === 0) {
                return message.reply('You don\'t have any defeated pets to revive.');
            }

            if (defeatedPets.length === 1) {
                return revivePet(message, defeatedPets[0]);
            }

            const options = defeatedPets.map(pet => ({
                label: pet.name,
                description: `Level: ${pet.level} - Rarity: ${pet.rarity}`,
                value: pet._id.toString(),
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('revive_pet_select')
                    .setPlaceholder('Select a pet to revive...')
                    .addOptions(options)
            );

            const selectMessage = await message.reply({ content: 'You have multiple defeated pets. Please select one to revive:', components: [row] });

            const collector = selectMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: i => i.user.id === userId && i.customId === 'revive_pet_select'
            });

            collector.on('collect', async i => {
                const selectedPetId = i.values[0];
                const selectedPet = defeatedPets.find(p => p._id.toString() === selectedPetId);
                if (selectedPet) {
                    await revivePet(i, selectedPet);
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