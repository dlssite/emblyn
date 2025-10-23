const { Pet } = require('../../models/pets/pets');
const { addToInventory } = require('../../models/economy');
const allItems = require('../../data/petShopItems');
const allPets = require('../../data/pets');
const { v4: uuidv4 } = require('uuid');

const allPossibleItems = [...Object.values(allItems).flat(), ...Object.values(allPets).flat()];

module.exports = {
    name: 'give',
    description: 'Give a pet, egg, or supply to a user.',
    permissions: 'ADMINISTRATOR',
    async execute(message, args) {
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('You need to mention a user to give an item to.');
        }

        let quantity = 1;
        let level = 1;
        let itemName = args.slice(1).join(' ');

        if (args.includes('-q') || args.includes('--quantity')) {
            const flagIndex = args.includes('-q') ? args.indexOf('-q') : args.indexOf('--quantity');
            quantity = parseInt(args[flagIndex + 1]);
            args.splice(flagIndex, 2);
            itemName = args.slice(1).join(' ');
        }

        if (args.includes('-l') || args.includes('--level')) {
            const flagIndex = args.includes('-l') ? args.indexOf('-l') : args.indexOf('--level');
            level = parseInt(args[flagIndex + 1]);
            args.splice(flagIndex, 2);
            itemName = args.slice(1).join(' ');
        }

        const item = allPossibleItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        if (!item) {
            return message.reply({ content: `Could not find an item named "${itemName}".`, ephemeral: true });
        }

        if (item.type === 'pet') {
            for (let i = 0; i < quantity; i++) {
                const newPet = new Pet({
                    petId: uuidv4(),
                    ownerId: targetUser.id,
                    name: item.name,
                    species: item.species,
                    rarity: item.rarity,
                    image: item.image,
                    level: level,
                    xp: 0,
                    stats: {
                        hp: 100 + (level * 10),
                        maxHealth: 100 + (level * 10),
                        attack: item.stats.attack + (level * 2),
                        defense: item.stats.defense + (level * 2),
                        speed: item.stats.speed + (level * 2),
                        hunger: 100,
                        happiness: 50,
                        energy: 100,
                    },
                    abilities: item.abilities,
                    specialAbilities: item.specialAbilities,
                });
                await newPet.save();
            }
            return message.reply(`You have given ${quantity}x **${item.name}** (Level ${level}) to **${targetUser.username}**.`);
        } else {
            const itemData = {
                id: item.id,
                name: item.name,
                type: item.type,
                rarity: item.rarity,
                image: item.image,
                purchaseDate: new Date(),
                purchasePrice: 0,
                uniqueId: uuidv4()
            };
            await addToInventory(targetUser.id, itemData, quantity);
            return message.reply(`You have given **${quantity}x ${item.name}** to **${targetUser.username}**.`);
        }
    }
};