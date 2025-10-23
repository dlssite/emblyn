const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { getEconomyProfile, updateEconomyProfile } = require('../../models/economy.js');
const { Pet } = require('../../models/pets/pets.js');
const petShopItems = require('../../data/petShopItems.js');
const petsByRarity = require('../../data/pets.js');
const { v4: uuidv4 } = require('uuid');

const rarityColors = {
    common: '#BFC9CA',
    rare: '#5DADE2',
    epic: '#AF7AC5',
    legendary: '#F4D03F',
    mythic: '#E74C3C',
    exclusive: '#F39C12'
};

const hatchChances = {
    common: { common: 100 },
    rare: { common: 70, rare: 30 },
    epic: { common: 50, rare: 35, epic: 15 },
    legendary: { rare: 50, epic: 40, legendary: 10 },
    mythic: { epic: 50, legendary: 40, mythic: 10 },
    exclusive: { exclusive: 100 }
};

const allEggs = petShopItems['Pet Eggs'];

function getBaseEggData(eggName) {
    return allEggs.find(egg => egg.name.toLowerCase() === eggName.toLowerCase());
}

function determinePetRarity(eggRarity) {
    const chances = hatchChances[eggRarity.toLowerCase()];
    if (!chances) return 'common';

    const total = Object.values(chances).reduce((t, c) => t + c, 0);
    const randomNumber = Math.random() * total;
    let cumulative = 0;

    for (const [rarity, chance] of Object.entries(chances)) {
        cumulative += chance;
        if (randomNumber < cumulative) {
            return rarity;
        }
    }
    return 'common';
}

async function initiateHatching(source, egg) {
    const userId = source.user?.id || source.author.id;
    const isInteraction = typeof source.update === 'function';

    const baseEggData = getBaseEggData(egg.name);
    if (!egg.rarity && baseEggData) {
        egg.rarity = baseEggData.rarity;
        egg.image = baseEggData.image;
    }

    if (!baseEggData) {
        const errorEmbed = new EmbedBuilder().setColor('#ff0000').setDescription(`The egg named "${egg.name}" is corrupted or its data is missing. It cannot be hatched.`);
        const replyOptions = { embeds: [errorEmbed], components: [] };
        if (isInteraction) {
            return source.reply({ ...replyOptions, ephemeral: true });
        }
        return source.reply(replyOptions);
    }

    const hatchButton = new ButtonBuilder().setCustomId(`hatch_egg_${egg.uniqueId}`).setLabel('Hatch').setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(hatchButton);

    const embed = new EmbedBuilder()
        .setColor(rarityColors[egg.rarity.toLowerCase()] || rarityColors.common)
        .setTitle(`You are about to hatch a ${egg.name}`)
        .setImage(egg.image)
        .setDescription('Click the button below to hatch your egg.');

    const replyOptions = { embeds: [embed], components: [row], fetchReply: true };
    const reply = await (isInteraction ? source.update(replyOptions) : source.reply(replyOptions));

    const filter = i => i.customId === `hatch_egg_${egg.uniqueId}` && i.user.id === userId;
    const collector = reply.createMessageComponentCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async buttonInteraction => {
        await buttonInteraction.deferUpdate();
        const currentProfile = await getEconomyProfile(userId);
        const finalEggIndex = currentProfile.inventory.findIndex(item => item.uniqueId === egg.uniqueId);

        if (finalEggIndex === -1) {
            return buttonInteraction.editReply({ content: 'It seems you no longer have this egg.', embeds: [], components: [] });
        }

        const petRarity = determinePetRarity(egg.rarity);
        const possiblePets = petsByRarity[petRarity];
        const chosenPet = possiblePets[Math.floor(Math.random() * possiblePets.length)];

        const newPet = new Pet({
            petId: chosenPet.id, ownerId: userId, name: chosenPet.name, species: chosenPet.species, rarity: petRarity, image: chosenPet.image, level: 1, xp: 0,
            xpToNextLevel: 100, happiness: 100, hunger: 100, lastInteraction: Date.now(), abilities: chosenPet.abilities || [], specialAbilities: chosenPet.specialAbilities || [],
        });
        await newPet.save();

        currentProfile.inventory.splice(finalEggIndex, 1);
        await updateEconomyProfile(userId, { inventory: currentProfile.inventory });

        const successEmbed = new EmbedBuilder().setColor(rarityColors[petRarity.toLowerCase()]).setTitle('Congratulations!').setDescription(`You hatched a **${petRarity}** ${chosenPet.name}!`).setImage(chosenPet.image);
        await buttonInteraction.editReply({ embeds: [successEmbed], components: [] });
    });

    collector.on('end', collected => {
        if (collected.size === 0) reply.edit({ content: 'Hatching timed out.', components: [] });
    });
}

module.exports = {
    name: 'hatch',
    description: 'Hatch an egg from your inventory. If no egg is specified, a selection menu will appear.',
    async execute(message, args) {
        const userId = message.author.id;
        const eggName = args.join(' ').trim().toLowerCase();

        try {
            const profile = await getEconomyProfile(userId);
            const userEggs = profile.inventory.filter(item => item.type === 'egg');

            if (userEggs.length === 0) {
                return message.reply('You don\'t have any eggs to hatch.');
            }

            let profileUpdateNeeded = false;
            userEggs.forEach(egg => { if (!egg.uniqueId) { egg.uniqueId = uuidv4(); profileUpdateNeeded = true; } });
            if (profileUpdateNeeded) await updateEconomyProfile(userId, { inventory: profile.inventory });

            if (eggName) {
                const egg = userEggs.find(e => e.name.toLowerCase() === eggName);
                if (!egg) return message.reply(`You don\'t own an egg named "${args.join(' ')}".`);
                return initiateHatching(message, egg);
            } else {
                if (userEggs.length === 1) return initiateHatching(message, userEggs[0]);

                const options = userEggs.map(egg => ({ label: egg.name, description: `Rarity: ${egg.rarity || getBaseEggData(egg.name)?.rarity || 'Unknown'}`, value: egg.uniqueId }));
                const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('hatch_egg_select').setPlaceholder('Select an egg to hatch...').addOptions(options));
                const selectMessage = await message.reply({ content: 'You have multiple eggs. Please select one to hatch:', components: [row] });

                const collector = selectMessage.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000, filter: i => i.user.id === userId && i.customId === 'hatch_egg_select' });

                collector.on('collect', async i => {
                    const selectedEgg = userEggs.find(e => e.uniqueId === i.values[0]);
                    if (selectedEgg) await initiateHatching(i, selectedEgg);
                });

                collector.on('end', c => { if (c.size === 0) selectMessage.edit({ content: 'Egg selection timed out.', components: [] }); });
            }
        } catch (error) {
            console.error('Hatch command error:', error);
            message.reply('An error occurred while trying to hatch your egg.');
        }
    },
};