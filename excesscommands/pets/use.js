const Pet = require('../../models/pets/pets');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'use',
    description: 'Use a special pet ability outside of battle.',
    async execute(message, args) {
        const combinedArgs = args.join(' ');
        const [petName, abilityName] = combinedArgs.split(',').map(name => name.trim());

        if (!petName || !abilityName) {
            return message.reply('Usage: `$pet use <pet-name>, <ability-name>`');
        }

        const pet = await Pet.findOne({ ownerId: message.author.id, name: { $regex: new RegExp(`^${petName}$`, 'i') } });

        if (!pet) {
            return message.reply(`You do not own a pet named \"${petName}\".`);
        }

        const ability = pet.specialAbilities.find(a => a.name.toLowerCase() === abilityName.toLowerCase());

        if (!ability) {
            return message.reply(`Your pet \"${pet.name}\" does not have the ability \"${abilityName}\".`);
        }

        if (ability.type !== 'care') {
            return message.reply(`The ability \"${ability.name}\" cannot be used this way. Some abilities are only for battle.`);
        }

        let effectMessage = 'Nothing happened.';

        // Handle effects
        if (ability.effect) {
            if (ability.effect.happiness) {
                const happinessBoost = parseInt(ability.effect.happiness);
                if (!isNaN(happinessBoost)) {
                    pet.stats.happiness = Math.min(100, (pet.stats.happiness || 0) + happinessBoost);
                    effectMessage = `${pet.name}\'s happiness increased by ${happinessBoost}!`;
                }
            }
            // ... other 'care' effects can be added here
        }

        await pet.save();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`✨ Ability Used! ✨`)
            .setDescription(`${message.author.username} used **${ability.name}** with ${pet.name}.\n${effectMessage}`)

        return message.reply({ embeds: [embed] });
    }
};