const { EmbedBuilder } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const rarityColors = require('../../utils/rarityColors');

module.exports = {
    name: 'flex',
    description: 'Show off your best pet or a specific pet!',
    async execute(message, args) {
        const userId = message.author.id;
        const petName = args.join(' ');
        let pet;

        if (petName) {
            pet = await Pet.findOne({ ownerId: userId, name: { $regex: new RegExp(`^${petName}$`, 'i') } });
            if (!pet) {
                return message.reply(`You don\'t own a pet named \"${petName}\".`);
            }
        } else {
            const userPets = await Pet.find({ ownerId: userId });
            if (userPets.length === 0) {
                return message.reply("You don\'t have any pets to show off yet!");
            }
            userPets.sort((a, b) => {
                const rarityOrder = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Exclusive'];
                const rarityA = rarityOrder.indexOf(a.rarity);
                const rarityB = rarityOrder.indexOf(b.rarity);
                if (rarityB !== rarityA) return rarityB - rarityA;
                if (b.level !== a.level) return b.level - a.level;
                const totalStatsA = a.stats.attack + a.stats.defense + a.stats.speed;
                const totalStatsB = b.stats.attack + b.stats.defense + b.stats.speed;
                return totalStatsB - totalStatsA;
            });
            pet = userPets[0];
        }

        const rarityColor = rarityColors[pet.rarity.toLowerCase()] || '#FFFFFF';

        const embed = new EmbedBuilder()
            .setTitle(`${pet.name} - Level ${pet.level}`)
            .setColor(rarityColor)
            .setImage(pet.image)
            .addFields(
                { name: 'Rarity', value: pet.rarity, inline: true },
                { name: 'HP', value: `${pet.stats.hp}/${pet.stats.maxHealth}`, inline: true },
                { name: 'Attack', value: `${pet.stats.attack}`, inline: true },
                { name: 'Defense', value: `${pet.stats.defense}`, inline: true },
                { name: 'Speed', value: `${pet.stats.speed}`, inline: true },
                { name: 'Status', value: pet.isDead ? 'Defeated' : 'Ready', inline: true }
            )
            .setFooter({ text: `Owned by ${message.member.displayName}` });

        message.reply({ embeds: [embed] });
    },
};