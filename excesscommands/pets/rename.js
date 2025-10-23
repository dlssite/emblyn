const { EmbedBuilder } = require('discord.js');
const { Pet } = require('../../models/pets/pets');

module.exports = {
    name: 'rename',
    description: 'Change the name of your pet.',
    aliases: ['name'],
    async execute(message, args) {
        // The arguments are expected to be in the format: <current-name> <new-name>
        // We need to find the split point between the current name and the new name.
        let splitIndex = -1;
        for (let i = 1; i < args.length; i++) {
            const potentialCurrentName = args.slice(0, i).join(' ');
            const pet = await Pet.findOne({ ownerId: message.author.id, name: { $regex: new RegExp(`^${potentialCurrentName}$`, 'i') } });
            if (pet) {
                splitIndex = i;
                break;
            }
        }

        if (splitIndex === -1) {
            return message.reply('Could not find a pet with the specified current name. Usage: `$pet rename <current-name> <new-name>`');
        }

        const petName = args.slice(0, splitIndex).join(' ');
        const newName = args.slice(splitIndex).join(' ');

        if (!petName || !newName) {
            return message.reply('Please provide the current name of your pet and its new name. Usage: `$pet rename <current-name> <new-name>`');
        }

        const pet = await Pet.findOne({ ownerId: message.author.id, name: { $regex: new RegExp(`^${petName}$`, 'i') } });

        if (!pet) {
            // This case should theoretically not be reached due to the check above, but it's good practice to keep it.
            return message.reply(`You don\'t own a pet named \"${petName}\".`);
        }

        const oldName = pet.name;
        pet.name = newName;
        await pet.save();

        const embed = new EmbedBuilder()
            .setTitle('Pet Renamed!')
            .setDescription(`You have renamed **${oldName}** to **${newName}**.`)
            .setColor('#00FF00');

        message.reply({ embeds: [embed] });
    },
};