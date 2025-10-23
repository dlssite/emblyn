const { economyCollection } = require('../mongodb');

// Checks for a profile and creates a default one if it doesn't exist.
async function createEconomyProfileIfNotExists(userId) {
    const existingProfile = await economyCollection.findOne({ userId });
    if (!existingProfile) {
        const newProfile = {
            userId,
            wallet: 1,
            bank: 0,
            bankLimit: 50000,
            gold: 0,
            xp: 0,
            dailyStreak: 0,
            cooldowns: {},
            inventory: [],
            activeEffects: [],
            bills: {
                unpaidAmount: 0,
                billIssueDate: null,
                nextBillDate: Date.now() + 30 * 24 * 60 * 60 * 1000
            },
            loan: {
                amount: 0,
                dueDate: null
            },
            investments: []
        };
        await economyCollection.insertOne(newProfile);
    } else {
        const updates = {};
        if (typeof existingProfile.wallet !== 'number' || isNaN(existingProfile.wallet)) {
            updates.wallet = 0;
        }
        if (typeof existingProfile.bank !== 'number' || isNaN(existingProfile.bank)) {
            updates.bank = 0;
        }
        if (typeof existingProfile.bankLimit !== 'number') {
            updates.bankLimit = 10000;
        }
        if (typeof existingProfile.gold !== 'number') { 
            updates.gold = 0;
        }
        if (!existingProfile.bills || existingProfile.bills.unpaidRent !== undefined) {
            updates.bills = {
                unpaidAmount: 0,
                billIssueDate: null,
                nextBillDate: Date.now() + 30 * 24 * 60 * 60 * 1000
            };
        }
        if (Object.keys(updates).length > 0) {
            await economyCollection.updateOne({ userId }, { $set: updates });
        }
    }
}

async function getAllEconomyProfiles() {
    return await economyCollection.find({}).toArray();
}

async function getEconomyProfile(userId) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.findOne({ userId });
}

async function updateWallet(userId, amount) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.updateOne({ userId }, { $inc: { wallet: amount } });
}

async function updateGold(userId, amount) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.updateOne({ userId }, { $inc: { gold: amount } });
}

async function updateXP(userId, amount) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.updateOne({ userId }, { $inc: { xp: amount } });
}

async function updateEconomyProfile(userId, updateData) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.updateOne({ userId }, { $set: updateData });
}

async function updateCooldown(userId, commandName, timestamp) {
    await createEconomyProfileIfNotExists(userId);
    const cooldownUpdate = {};
    cooldownUpdate[`cooldowns.${commandName}`] = timestamp;
    return await economyCollection.updateOne({ userId }, { $set: cooldownUpdate });
}

async function takeLoan(userId, loanAmount, dueDate) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.updateOne({ userId }, {
        $set: { loan: { amount: loanAmount, dueDate: dueDate } },
        $inc: { bank: loanAmount }
    });
}

async function addInvestment(userId, investment) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.updateOne({ userId }, { $push: { investments: investment } });
}

async function updateInvestment(userId, investmentId, updatedInvestment) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.updateOne(
        { userId: userId, "investments.id": investmentId },
        { $set: { "investments.$": updatedInvestment } }
    );
}

async function updateBills(userId, billsUpdate) {
    await createEconomyProfileIfNotExists(userId);
    const updatePayload = {};
    for (const key in billsUpdate) {
        updatePayload[`bills.${key}`] = billsUpdate[key];
    }
    return await economyCollection.updateOne({ userId }, { $set: updatePayload });
}

async function handleEviction(userId) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.updateOne({ userId }, {
        $pull: { inventory: { type: 'house' } }
    });
}

async function addToInventory(userId, item) {
    await createEconomyProfileIfNotExists(userId);
    const itemDetails = Object.values(require('../data/shopItems').shopItems).flat().find(i => i.id === item.id);
    if (itemDetails && itemDetails.type) {
        item.type = itemDetails.type;
    }
    return await economyCollection.updateOne({ userId }, { $push: { inventory: item } });
}

async function removeFromInventory(userId, uniqueId) {
    await createEconomyProfileIfNotExists(userId);
    return await economyCollection.updateOne({ userId }, { $pull: { inventory: { uniqueId: uniqueId } } });
}

async function deleteAllEconomyProfiles() {
    return await economyCollection.deleteMany({});
}

module.exports = {
    createEconomyProfileIfNotExists,
    getEconomyProfile,
    getAllEconomyProfiles,
    updateEconomyProfile,
    updateWallet,
    updateGold,
    updateXP,
    updateCooldown,
    takeLoan,
    addInvestment,
    updateInvestment,
    updateBills,
    handleEviction,
    addToInventory,
    removeFromInventory,
    deleteAllEconomyProfiles
};
