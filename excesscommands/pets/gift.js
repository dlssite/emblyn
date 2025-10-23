const { EmbedBuilder } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const { getEconomyProfile, addToInventory, removeFromInventory } = require('../../models/economy');

module.exports = {
    name: 'gift',
    description: 'Gift a pet, egg, or supply to another user.',
    async execute(message, args) {
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('You need to mention a user to gift an item to.');
        }

        if (targetUser.id === message.author.id) {
            return message.reply('You cannot gift an item to yourself.');
        }

        const itemName = args.slice(1).join(' ').toLowerCase();
        if (!itemName) {
            return message.reply('You need to specify the item you want to gift.');
        }

        const senderId = message.author.id;
        const receiverId = targetUser.id;

        if (itemName === 'best pet') {
            const userPets = await Pet.find({ ownerId: senderId });
            if (userPets.length === 0) {
                return message.reply("You don't have any pets to gift!");
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

            const petToGift = userPets[0];
            petToGift.ownerId = receiverId;
            await petToGift.save();

            const embed = new EmbedBuilder()
                .setTitle('Pet Gifted!')
                .setDescription(`You have gifted your best pet, **${petToGift.name}**, to **${targetUser.username}**!`)
                .setColor('#00FF00');
            return message.reply({ embeds: [embed] });
        }

        // Check for pet by name
        const pet = await Pet.findOne({ ownerId: senderId, name: new RegExp(`^${itemName}$`, 'i') });

        if (pet) {
            pet.ownerId = receiverId;
            await pet.save();
            return message.reply(`You have gifted your pet, **${pet.name}**, to **${targetUser.username}**.`);
        }

        // Check for inventory item (egg or supply)
        const senderProfile = await getEconomyProfile(senderId);
        const itemIndex = senderProfile.inventory.findIndex(item => item.name.toLowerCase() === itemName);

        if (itemIndex > -1) {
            const item = senderProfile.inventory[itemIndex];
            await removeFromInventory(senderId, item.uniqueId, 1);
            await addToInventory(receiverId, item, 1);

            return message.reply(`You have gifted **1x ${item.name}** to **${targetUser.username}**.`);
        }

        return message.reply("You don\'t own a pet or item with that name.");
    }
};