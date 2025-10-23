const { petShopItems } = require('./petShopItems');

const shopItems = {
    "Kingdom Properties": [
        {
            id: "apartment",
            name: "Humble Cottage",
            description: "A modest cottage in the village outskirts, offering basic shelter.",
            price: 150000,
            monthlyUpkeep: 1500, // Taxes and upkeep
            type: "house",
            stackable: false,
            category: "Kingdom Properties"
        },
        {
            id: "house",
            name: "Noble Manor",
            description: "A grand manor with gardens, fit for a lord or lady.",
            price: 300000,
            monthlyUpkeep: 3000,
            type: "house",
            stackable: false,
            category: "Kingdom Properties"
        },
        {
            id: "mansion",
            name: "Royal Castle",
            description: "A towering castle with dungeons and towers, a symbol of power.",
            price: 1000000,
            monthlyUpkeep: 10000,
            type: "house",
            stackable: false,
            category: "Kingdom Properties"
        },
        {
            id: "studio_loft",
            name: "Wizard's Tower",
            description: "A spiraling tower for arcane studies, with mystical views.",
            price: 90000,
            monthlyUpkeep: 900,
            type: "house",
            stackable: false,
            category: "Kingdom Properties"
        },
        {
            id: "beach_villa",
            name: "Enchanted Palace",
            description: "A palace by the enchanted lake, perfect for royal displays.",
            price: 2000000,
            monthlyUpkeep: 20000,
            type: "house",
            stackable: false,
            category: "Kingdom Properties"
        }
    ],
    "Mounts & Conveyances": [
        {
            id: "sedan",
            name: "Sturdy Warhorse",
            description: "A loyal steed for reliable journeys across the realm.",
            price: 20000,
            type: "vehicle",
            stackable: false,
            category: "Mounts & Conveyances"
        },
        {
            id: "sports_car",
            name: "Swift Pegasus",
            description: "A majestic winged horse that commands attention and speed.",
            price: 80000,
            type: "vehicle",
            stackable: false,
            category: "Mounts & Conveyances"
        },
        {
            id: "private_jet",
            name: "Ancient Dragon",
            description: "Ride the skies in ultimate power and majesty.",
            price: 5000000,
            type: "vehicle",
            stackable: false,
            category: "Mounts & Conveyances"
        },
        {
            id: "motorcycle",
            name: "Griffin Mount",
            description: "A fierce beast for thrilling quests and daring escapes.",
            price: 15000,
            type: "vehicle",
            stackable: false,
            category: "Mounts & Conveyances"
        },
        {
            id: "yacht",
            name: "Enchanted Galleon",
            description: "Sail the mystical seas. Boosts prestige by 100%.",
            price: 2500000,
            type: "vehicle",
            stackable: false,
            category: "Mounts & Conveyances"
        }
    ],
    "Potions & Elixirs": [
        {
            id: "xp_boost",
            name: "Elixir of Wisdom",
            description: "Doubles your XP gain for 1 hour.",
            price: 5000,
            type: "consumable",
            stackable: true,
            category: "Potions & Elixirs"
        },
        {
            id: "luck_potion",
            name: "Potion of Luck",
            description: "Increases your chances in gamble and lootbox by 10% for 1 hour.",
            price: 7500,
            type: "consumable",
            stackable: true,
            category: "Potions & Elixirs"
        },
        {
            id: "energy_drink",
            name: "Stamina Elixir",
            description: "Reduces work cooldown by 50% for 30 minutes.",
            price: 3000,
            type: "consumable",
            stackable: true,
            category: "Potions & Elixirs"
        },
        {
            id: "anti_rob_shield",
            name: "Ward of Protection",
            description: "Prevents one robbery attempt for 24 hours.",
            price: 10000,
            type: "consumable",
            stackable: true,
            category: "Potions & Elixirs"
        }
    ],
    "Treasure Chests": [
        {
            id: "common",
            name: "Common Treasure Chest",
            description: "A common chest with a chance for embers or items.",
            price: 1000,
            type: "lootbox",
            stackable: true,
            category: "Treasure Chests"
        },
        {
            id: "rare",
            name: "Rare Treasure Chest",
            description: "A rare chest with a higher chance for valuable rewards.",
            price: 5000,
            type: "lootbox",
            stackable: true,
            category: "Treasure Chests"
        },
        {
            id: "epic",
            name: "Epic Treasure Chest",
            description: "Contains rare items, high ember rewards, or XP boosts.",
            price: 15000,
            type: "lootbox",
            stackable: true,
            category: "Treasure Chests"
        },
        {
            id: "legendary",
            name: "Legendary Treasure Chest",
            description: "Big embers, rare items, or maybe even a property!",
            price: 50000,
            type: "lootbox",
            stackable: true,
            category: "Treasure Chests"
        }
    ],
    "Kingdom Upgrades": [
        {
            id: "vault_upgrade",
            name: "Treasury Expansion",
            description: "Increases your bank limit by 25%.",
            price: 20000,
            type: "upgrade",
            stackable: false,
            category: "Kingdom Upgrades"
        },
        {
            id: "safehouse",
            name: "Hidden Sanctuary",
            description: "Decreases chances of being robbed.",
            price: 100000,
            type: "upgrade",
            stackable: false,
            category: "Kingdom Upgrades"
        }
    ],
    ...petShopItems
};

module.exports = { shopItems };