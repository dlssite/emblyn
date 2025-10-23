const pets = require('./pets');
const allPets = Object.values(pets).flat();

module.exports = {
    "Pets": allPets,
    "Pet Eggs": [
        {
            id: 'common_egg',
            name: 'Common Egg',
            price: 5,
            currency: 'gold',
            rarity: 'Common',
            description: 'A plain-looking egg that seems to be quite common. Who knows what might hatch from it?',
            image: 'https://i.ibb.co/JRxNwMfD/cegg.png',
            category: 'Pet Eggs',
            type: 'egg',
            stackable: true
        },
        {
            id: 'rare_egg',
            name: 'Rare Egg',
            price: 10,
            currency: 'gold',
            rarity: 'Rare',
            description: 'A beautifully patterned egg that glows with a faint light. It feels special to the touch.',
            image: 'https://i.ibb.co/zTBSM8F2/eegg.png',
            category: 'Pet Eggs',
            type: 'egg',
            stackable: true
        },
        {
            id: 'epic_egg',
            name: 'Epic Egg',
            price: 15,
            currency: 'gold',
            rarity: 'Epic',
            description: 'An egg that seems to hum with a powerful energy. It is adorned with intricate, glowing patterns.',
            image: 'https://i.ibb.co/8LCMVmYp/epic-egg.png',
            category: 'Pet Eggs',
            type: 'egg',
            stackable: true
        },
        {
            id: 'legendary_egg',
            name: 'Legendary Egg',
            price: 20,
            currency: 'gold',
            rarity: 'Legendary',
            description: 'A magnificent egg that radiates a powerful aura. Holding it fills you with a sense of awe and wonder.',
            image: 'https://i.ibb.co/8LRHhrDG/legegg.png',
            category: 'Pet Eggs',
            type: 'egg',
            stackable: true
        },
        {
            id: 'mythic_egg',
            name: 'Mythic Egg',
            price: 25,
            currency: 'gold',
            rarity: 'Mythic',
            description: 'A powerful and extremely rare egg. Only the luckiest adventurers will ever see one.',
            image: 'https://i.ibb.co/LXNdBrtH/mythegg.png',
            category: 'Pet Eggs',
            type: 'egg',
            stackable: true
        },
        {
            id: 'exclusive_egg',
            name: 'Exclusive Egg',
            price: null,
            currency: 'gold',
            rarity: 'Exclusive',
            description: 'An egg of unbelievable rarity. It is said to contain a pet found nowhere else.',
            image: 'https://i.ibb.co/JZz128M/exeggg.png',
            category: 'Pet Eggs',
            type: 'egg',
            stackable: true
        }
    ],
    "Pet Supplies": [
        {
            id: 'pet_food_pack',
            name: 'Pet Food',
            price: 1,
            currency: 'gold',
            description: 'A pack of 10 nutritious pet food bags.',
            image: 'https://i.ibb.co/HTNsNsN5/food.png',
            category: 'Pet Supplies',
            type: 'consumable',
            stackable: true,
            quantity: 10
        },
        {
            id: 'pet_medicine_pack',
            name: 'Pet Medicine',
            price: 1,
            currency: 'gold',
            description: 'A pack of 5 doses of medicine to heal your pet.',
            image: 'https://i.ibb.co/zWyVSFnR/med.png',
            category: 'Pet Supplies',
            type: 'consumable',
            stackable: true,
            quantity: 5
        }
    ],
    "Pet Toys": [
        {
            id: 'pet_toy_pack',
            name: 'Pet Toy',
            price: 1,
            currency: 'gold',
            description: 'A pack of 10 assorted pet toys.',
            image: 'https://i.ibb.co/zTLx6PxK/toy.png',
            category: 'Pet Toys',
            type: 'consumable',
            stackable: true,
            quantity: 10
        }
    ]
};