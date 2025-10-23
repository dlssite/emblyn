const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const rarityColors = require('../../utils/rarityColors');
const { getXPForNextLevel } = require('../../utils/xpUtils');

async function displayPetInfo(source, pet) {
    const rarityColor = rarityColors[pet.rarity.toLowerCase()] || '#FFFFFF';
    const xpForNextLevel = getXPForNextLevel(pet.level);

    const abilities = pet.abilities.map(a => a.name).join(', ') || 'None';
    const specialAbilities = pet.specialAbilities.map(a => a.name).join(', ') || 'None';
    
    const user = source.user || source.author;
    const displayName = source.member?.displayName || user.username;

    const embed = new EmbedBuilder()
        .setTitle(`${pet.name} - Level ${pet.level}`)
        .setColor(rarityColor)
        .setImage(pet.image)
        .addFields(
            { name: 'Rarity', value: pet.rarity, inline: true },
            { name: 'Experience', value: `${pet.xp}/${xpForNextLevel}`, inline: true },
            { name: 'Status', value: pet.isDead ? 'Defeated' : 'Ready', inline: true },
            { name: '\n❤️ Health', value: `${pet.stats.hp}/${pet.stats.maxHealth}`, inline: false },
            { name: '⚔️ Attack', value: `${pet.stats.attack}`, inline: true },
            { name: '🛡️ Defense', value: `${pet.stats.defense}`, inline: true },
            { name: '⚡ Speed', value: `${pet.stats.speed}`, inline: true },
            { name: '\n😊 Happiness', value: `${pet.stats.happiness}/100`, inline: true },
            { name: '🍖 Hunger', value: `${pet.stats.hunger}/100`, inline: true },
            { name: '⚡ Energy', value: `${pet.stats.energy}/100`, inline: true },
            { name: '\nAbilities', value: abilities, inline: false },
            { name: 'Special Abilities', value: specialAbilities, inline: false }
        )
        .setFooter({ text: `Owned by ${displayName}` });

    if (source.isMessageComponent && typeof source.isMessageComponent === 'function') {
        await source.update({ content: ' ', embeds: [embed], components: [] });
    } else {
        await source.reply({ embeds: [embed] });
    }
}

module.exports = {
    name: 'info',
    description: 'Get detailed information about a pet. If no pet is specified, a selection menu will appear.',
    aliases: ['i'],
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ').trim();

        if (petName) {
            const pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });
            if (!pet) {
                return message.reply(`You don\'t have a pet named \"${petName}\".`);
            }
            return displayPetInfo(message, pet);
        } else {
            const userPets = await Pet.find({ ownerId: userId });

            if (userPets.length === 0) {
                return message.reply('You don\'t have any pets to get info on.');
            }

            if (userPets.length === 1) {
                return displayPetInfo(message, userPets[0]);
            }

            const options = userPets.map(pet => ({
                label: pet.name,
                description: `Level: ${pet.level} - Rarity: ${pet.rarity} - ${pet.isDead ? 'Defeated' : 'Alive'}`,
                value: pet._id.toString(),
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('info_pet_select')
                    .setPlaceholder('Select a pet to view its info...')
                    .addOptions(options)
            );

            const selectMessage = await message.reply({ content: 'You have multiple pets. Please select one to view its information:', components: [row] });

            const collector = selectMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: i => i.user.id === userId && i.customId === 'info_pet_select'
            });

            collector.on('collect', async i => {
                const selectedPetId = i.values[0];
                const selectedPet = userPets.find(p => p._id.toString() === selectedPetId);
                if (selectedPet) {
                    await displayPetInfo(i, selectedPet);
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