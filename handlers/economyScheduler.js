const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { updateBills, handleEviction, updateWallet, getAllEconomyProfiles, getEconomyProfile } = require('../models/economy');
const { shopItems } = require('../data/shopItems');

const allItemsById = Object.values(shopItems).flat().reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

function calculateTotalUpkeep(inventory) {
    if (!inventory || inventory.length === 0) {
        return 0;
    }
    return inventory.reduce((total, item) => {
        const itemDetails = allItemsById[item.id];
        if (itemDetails && itemDetails.type === 'house' && itemDetails.monthlyUpkeep) {
            return total + itemDetails.monthlyUpkeep;
        }
        return total;
    }, 0);
}

module.exports = (client) => {
    async function checkAndProcessBills() {
        const allProfiles = await getAllEconomyProfiles();
        const now = Date.now();
        const gracePeriod = 7 * 24 * 60 * 60 * 1000;

        for (const rawProfile of allProfiles) {
            // Ensure we have a fully initialized profile
            const profile = await getEconomyProfile(rawProfile.userId);
            const userId = profile.userId;
            const bills = profile.bills;

            // --- 1. Bill Generation ---
            if (now >= bills.nextBillDate) {
                const totalUpkeep = calculateTotalUpkeep(profile.inventory);
                let newNextBillDate = bills.nextBillDate;

                // Loop to catch up on any missed bill cycles (e.g., if bot was offline)
                while (now >= newNextBillDate) {
                    newNextBillDate += 30 * 24 * 60 * 60 * 1000;
                }

                if (totalUpkeep > 0) {
                    const wasPaidOff = bills.unpaidAmount === 0;
                    const newUnpaidAmount = bills.unpaidAmount + totalUpkeep;
                    const newBillIssueDate = wasPaidOff ? now : bills.billIssueDate;

                    await updateBills(userId, { 
                        unpaidAmount: newUnpaidAmount, 
                        billIssueDate: newBillIssueDate, 
                        nextBillDate: newNextBillDate 
                    });

                    // Update the local profile object for the next step
                    bills.unpaidAmount = newUnpaidAmount;
                    bills.billIssueDate = newBillIssueDate;

                    try {
                        const user = await client.users.fetch(userId);
                        const billEmbed = new EmbedBuilder()
                            .setTitle('🏠 Property Upkeep Bill')
                            .setDescription(`A new upkeep charge of **$${totalUpkeep.toLocaleString()}** has been added to your bills. Your total amount due is now **$${newUnpaidAmount.toLocaleString()}**.`)
                            .setColor('#E67E22');
                        await user.send({ embeds: [billEmbed] });
                    } catch { /* Ignore DM errors */ }
                } else {
                    // No properties, just push the next bill date forward.
                    await updateBills(userId, { ...bills, nextBillDate: newNextBillDate });
                }
            }

            // --- 2. Overdue Bill Enforcement ---
            if (bills.unpaidAmount > 0 && bills.billIssueDate && now > bills.billIssueDate + gracePeriod) {
                const totalDue = bills.unpaidAmount;
                let user;
                try {
                    user = await client.users.fetch(userId);
                } catch { continue; } // Skip if user can't be fetched

                if (profile.wallet >= totalDue) {
                    await updateWallet(userId, -totalDue);
                    await updateBills(userId, { unpaidAmount: 0, billIssueDate: null, nextBillDate: bills.nextBillDate });

                    try {
                        const paymentEmbed = new EmbedBuilder()
                            .setTitle('✅ Bills Paid Automatically')
                            .setDescription(`**$${totalDue.toLocaleString()}** was automatically deducted from your wallet to cover your overdue property upkeep.`)
                            .setColor('#2ECC71');
                        await user.send({ embeds: [paymentEmbed] });
                    } catch { /* Ignore DM errors */ }
                } else {
                    // FORECLOSURE
                    await handleEviction(userId); // Removes all 'house' type items
                    await updateBills(userId, { unpaidAmount: 0, billIssueDate: null, nextBillDate: bills.nextBillDate });

                    try {
                        const evictionEmbed = new EmbedBuilder()
                            .setTitle('‼️ PROPERTY FORECLOSURE ‼️')
                            .setDescription(`You failed to pay your property upkeep of **$${totalDue.toLocaleString()}**. As a result, all your real estate properties have been repossessed.`)
                            .setColor('#E74C3C');
                        await user.send({ embeds: [evictionEmbed] });
                    } catch { /* Ignore DM errors */ }
                }
            }
        }
    }

    // Schedule to run daily at 4:00 AM.
    cron.schedule('4 0 * * *', () => {
        console.log('📆 Running daily property upkeep and bill check...');
        checkAndProcessBills();
    });
};