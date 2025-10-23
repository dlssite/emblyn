const { EmbedBuilder } = require('discord.js');
const { Pet } = require('../../models/pets/pets');

module.exports = {
    name: 'set',
    description: 'Sets a pet as your active pet.',
    aliases: ['active'],
    async execute(message, args) {
        const petName = args.join(' ');
        if (!petName) {
            return message.reply('Please specify which pet you want to set as active. Usage: `$pet set <pet-name>`');
        }

        const petToSet = await Pet.findOne({ ownerId: message.author.id, name: { $regex: new RegExp(`^${petName}$`, 'i') } });

        if (!petToSet) {
            return message.reply(`You don\'t own a pet named \"${petName}\".`);
        }

        if (petToSet.isDead) {
            return message.reply(`You cannot set a defeated pet as active. Please revive it first.`);
        }

        // Set all other pets to inactive
        await Pet.updateMany({ ownerId: message.author.id, _id: { $ne: petToSet._id } }, { $set: { isActive: false } });

        // Set the chosen pet to active
        petToSet.isActive = true;
        await petToSet.save();

        const embed = new EmbedBuilder()
            .setTitle('Active Pet Set!')
            .setDescription(`**${petToSet.name}** is now your active pet.`)
            .setColor('#00FF00');

        message.reply({ embeds: [embed] });
    },
};