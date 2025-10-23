const items = {
    // Hunting loot
    "deer": { name: "Deer Pelt", description: "A common deer pelt, worth a small amount.", price: 15, type: 'sellable' },
    "boar": { name: "Boar Tusk", description: "A sharp tusk from a wild boar.", price: 25, type: 'sellable' },
    "bear": { name: "Bear Claw", description: "A large claw from a fearsome bear.", price: 50, type: 'sellable' },
    "rabbit": { name: "Rabbit's Foot", description: "A lucky rabbit's foot. Maybe it will bring you good fortune?", price: 75, type: 'collectible' },

    // Fishing loot
    "trout": { name: "Trout", description: "A common freshwater fish.", price: 10, type: 'sellable' },
    "salmon": { name: "Salmon", description: "A large, tasty salmon.", price: 20, type: 'sellable' },
    "catfish": { name: "Catfish", description: "A bottom-dwelling fish with whiskers.", price: 30, type: 'sellable' },
    "goldfish": { name: "Goldfish", description: "A small, shiny goldfish. It's said to be lucky.", price: 100, type: 'collectible' },

    // Shop items
    "xp_boost": { name: "XP Boost", description: "Doubles your XP gain for 1 hour.", price: 500, type: 'usable' },
    "lootbox_common": { name: "Common Lootbox", description: "Contains common items and a small amount of cash.", price: 250, type: 'lootbox' },
    "lootbox_rare": { name: "Rare Lootbox", description: "Contains rare items and a moderate amount of cash.", price: 1000, type: 'lootbox' },
};

module.exports = { items };