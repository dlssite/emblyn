const { EmbedBuilder } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const allSpeciesData = require('../../data/pets');

// Create a flat array of all species from all rarities
const allSpecies = Object.values(allSpeciesData).flat();

module.exports = {
    name: 'evolve',
    description: 'Evolve your pet to its next stage.',
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ');

        if (!petName) {
            return message.reply('Please specify which pet you want to evolve.');
        }

        const pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });

        if (!pet) {
            return message.reply(`You don\'t own a pet named \"${petName}\".`);
        }

        const currentSpeciesData = allSpecies.find(s => s.species === pet.species);

        if (!currentSpeciesData) {
            console.error(`Could not find species data for: ${pet.species}`);
            return message.reply('An error occurred. Could not find data for your pet\'s species.');
        }

        if (!currentSpeciesData.evolvesTo || !currentSpeciesData.evolvesTo.species) {
            return message.reply(`${pet.name} cannot evolve any further.`);
        }

        const evolutionInfo = currentSpeciesData.evolvesTo;
        const requirements = evolutionInfo.requirements;

        if (pet.level < requirements.level) {
            return message.reply(`${pet.name} needs to be level ${requirements.level} to evolve.`);
        }
        if (pet.stats.happiness < requirements.happiness) {
            return message.reply(`${pet.name} needs to have ${requirements.happiness} happiness to evolve.`);
        }
        if (pet.battleRecord.wins < requirements.battlesWon) {
            return message.reply(`${pet.name} needs to win ${requirements.battlesWon} battles to evolve.`);
        }

        const newSpeciesData = allSpecies.find(s => s.species === evolutionInfo.species);
        if (!newSpeciesData) {
            console.error(`Evolution target species not found: ${evolutionInfo.species}`);
            return message.reply('An error occurred during evolution. The new species data could not be found.');
        }

        const originalSpeciesName = pet.species;

        // Update pet details
        pet.species = newSpeciesData.species;
        pet.rarity = newSpeciesData.rarity;
        pet.image = newSpeciesData.image;
        pet.evolutionStage++;

        // Update stats and restore HP
        pet.stats.maxHealth = newSpeciesData.stats.hp;
        pet.stats.hp = newSpeciesData.stats.hp;
        pet.stats.attack = newSpeciesData.stats.attack;
        pet.stats.defense = newSpeciesData.stats.defense;
        pet.stats.speed = newSpeciesData.stats.speed;

        // Replace abilities with the new ones
        pet.abilities = newSpeciesData.abilities || [];
        pet.specialAbilities = newSpeciesData.specialAbilities || [];

        await pet.save();

        const embed = new EmbedBuilder()
            .setTitle(`🌟 Your ${originalSpeciesName} evolved into a ${newSpeciesData.species}! 🌟`)
            .setDescription(`${pet.name} is now a ${newSpeciesData.rarity} ${newSpeciesData.species}.`)
            .setImage(pet.image)
            .setColor('#FFD700');

        message.reply({ embeds: [embed] });
    },
};