const lootboxRewards = {
    lootbox_common: {
        name: "Common Lootbox",
        description: "Contains common items and a small amount of cash.",
        rewards: [
            { type: 'cash', reward: { amount: 500 }, weight: 30 },
            { type: 'cash', reward: { amount: 1000 }, weight: 20 },
            { type: 'cash', reward: { amount: 1500 }, weight: 10 },
            { type: 'item', reward: { id: 'energy_drink' }, weight: 15 },
            { type: 'item', reward: { id: 'luck_potion' }, weight: 5 },
        ]
    },
    lootbox_rare: {
        name: "Rare Lootbox",
        description: "A rare lootbox with a higher chance for valuable rewards.",
        rewards: [
            { type: 'cash', reward: { amount: 2000 }, weight: 20 },
            { type: 'cash', reward: { amount: 5000 }, weight: 15 },
            { type: 'cash', reward: { amount: 10000 }, weight: 10 },
            { type: 'item', reward: { id: 'xp_boost' }, weight: 10 },
            { type: 'item', reward: { id: 'anti_rob_shield' }, weight: 5 },
            { type: 'item', reward: { id: 'common' }, weight: 10 }, // A common lootbox
            { type: 'item', reward: { id: 'sedan' }, weight: 2 },
        ]
    },
    lootbox_epic: {
        name: "Epic Lootbox",
        description: "Contains rare items, high cash rewards, or powerful boosts.",
        rewards: [
            { type: 'cash', reward: { amount: 10000 }, weight: 20 },
            { type: 'cash', reward: { amount: 25000 }, weight: 15 },
            { type: 'cash', reward: { amount: 50000 }, weight: 5 },
            { type: 'item', reward: { id: 'sports_car' }, weight: 5 },
            { type: 'item', reward: { id: 'vault_upgrade' }, weight: 3 },
            { type: 'item', reward: { id: 'rare' }, weight: 10 }, // A rare lootbox
            { type: 'item', reward: { id: 'motorcycle' }, weight: 4 },
        ]
    },
    lootbox_legendary: {
        name: "Legendary Lootbox",
        description: "Big money, rare items, or maybe even a property!",
        rewards: [
            { type: 'cash', reward: { amount: 50000 }, weight: 20 },
            { type: 'cash', reward: { amount: 100000 }, weight: 10 },
            { type: 'cash', reward: { amount: 250000 }, weight: 5 },
            { type: 'item', reward: { id: 'mansion' }, weight: 1 },
            { type: 'item', reward: { id: 'private_jet' }, weight: 1 },
            { type: 'item', reward: { id: 'epic' }, weight: 10 }, // An epic lootbox
            { type: 'item', reward: { id: 'safehouse' }, weight: 2 },
            { type: 'item', reward: { id: 'yacht' }, weight: 1 },
        ]
    }
};

/**
 * Selects a random, weighted reward from a list.
 * @param {Array<Object>} rewards - An array of reward objects, each with a 'weight' property.
 * @returns {Object} The selected reward object.
 */
function getWeightedRandom(rewards) {
    const totalWeight = rewards.reduce((acc, reward) => acc + reward.weight, 0);
    let random = Math.random() * totalWeight;

    for (const reward of rewards) {
        if (random < reward.weight) {
            return reward;
        }
        random -= reward.weight;
    }
}

/**
 * Gets a random reward for a given lootbox type.
 * @param {string} boxId - The ID of the lootbox (e.g., 'common', 'rare').
 * @returns {{type: string, reward: Object} | null} - The reward data or null if the box type is invalid.
 */
function getRandomReward(boxId) {
    const boxKey = `lootbox_${boxId}`;
    const boxData = lootboxRewards[boxKey];
    if (!boxData) return null;

    const chosenReward = getWeightedRandom(boxData.rewards);

    // The structure is already what we need, so we just return the chosen reward.
    return chosenReward;
}

module.exports = { lootboxRewards, getRandomReward };
