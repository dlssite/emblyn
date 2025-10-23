const { EmbedBuilder } = require('discord.js');
const { getAllEconomyProfiles } = require('../../models/economy');
const { shopItems } = require('../../data/shopItems');
const { stocks } = require('../../data/stocks');

const allItems = Object.values(shopItems).flat();
const itemPrices = allItems.reduce((acc, item) => {
    acc[item.id] = item.price;
    return acc;
}, {});

const calculateNetWorth = (profile) => {
    if (!profile) return 0;

    const wallet = profile.wallet || 0;
    const bank = profile.bank || 0;
    const loan = profile.loan || 0;
    const loanAmount = (typeof loan === 'object' && typeof loan.amount === 'number') ? loan.amount : (typeof loan === 'number' ? loan : 0);

    const inventoryValue = (profile.inventory || []).reduce((total, item) => {
        const price = item.purchasePrice || itemPrices[item.id] || 0;
        return total + price;
    }, 0);

    const investmentsValue = (profile.investments || []).reduce((total, investment) => {
        if (!investment || typeof investment.shares !== 'number' || !investment.symbol) return total;
        const stockInfo = stocks[investment.symbol];
        const currentPrice = stockInfo ? stockInfo.price : investment.purchasePrice;
        const priceToUse = typeof currentPrice === 'number' ? currentPrice : 0;
        return total + (investment.shares * priceToUse);
    }, 0);

    return wallet + bank + inventoryValue + investmentsValue - loanAmount;
};

module.exports = {
    name: 'profile',
    description: "Displays a user's complete economic profile and wealth rank.",
    aliases: ['moneyprofile', 'wealth'],
    calculateNetWorth,
    async execute(message, args) {
        await message.channel.sendTyping();
        const targetUser = (message.mentions && message.mentions.users.first()) || message.author;
        const userId = targetUser.id;

        const allProfiles = await getAllEconomyProfiles();
        const profile = allProfiles.find(p => p.userId === userId);

        if (!profile) {
            return message.reply("This user doesn't have an economy profile yet.");
        }

        const rankedUsers = allProfiles
            .map(p => ({ userId: p.userId, netWorth: calculateNetWorth(p) }))
            .sort((a, b) => b.netWorth - a.netWorth);

        const userRank = rankedUsers.findIndex(u => u.userId === userId) + 1;
        const totalUsers = rankedUsers.length;

        const netWorth = rankedUsers[userRank - 1].netWorth;
        const wallet = profile.wallet || 0;
        const bank = profile.bank || 0;
        const gold = profile.gold || 0;
        const bankLimit = profile.bankLimit || 10000;
        const loanAmount = (typeof profile.loan === 'object' && typeof profile.loan.amount === 'number') ? profile.loan.amount : (typeof profile.loan === 'number' ? profile.loan : 0);
        const inventoryValue = (profile.inventory || []).reduce((total, item) => total + (item.purchasePrice || itemPrices[item.id] || 0), 0);
        const investmentsValue = (profile.investments || []).reduce((total, inv) => {
            if (!inv || !inv.symbol || typeof inv.shares !== 'number') return total;
            const stockInfo = stocks[inv.symbol];
            const currentPrice = stockInfo ? stockInfo.price : inv.purchasePrice;
            return total + (inv.shares * (typeof currentPrice === 'number' ? currentPrice : 0));
        }, 0);
        const xp = profile.xp || 0;

        const now = Date.now();
        const activeEffects = profile.activeEffects?.filter(e => e.expiresAt > now) || [];

        // Create a beautiful text-based embed
        const embed = new EmbedBuilder()
            .setTitle(`💰 ${targetUser.username}'s Economic Profile`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor('#FFD700')
            .addFields(
                {
                    name: '🏆 Rank & Level',
                    value: `**Rank:** #${userRank} of ${totalUsers}\n**XP:** ${xp.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '💵 Net Worth',
                    value: `**${netWorth.toLocaleString()} embers**`,
                    inline: true
                },
                {
                    name: '💰 Assets',
                    value: `**Wallet:** ${wallet.toLocaleString()} embers\n**Bank:** ${bank.toLocaleString()}/${bankLimit.toLocaleString()} embers\n**Gold:** ${gold.toLocaleString()} coins`,
                    inline: false
                }
            )
            .setFooter({
                text: `Requested by ${message.author.username}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        // Add liabilities if any
        if (loanAmount > 0) {
            embed.addFields({
                name: '💸 Liabilities',
                value: `**Loan:** ${loanAmount.toLocaleString()} embers`,
                inline: true
            });
        }

        // Add investments value if any
        if (investmentsValue > 0) {
            embed.addFields({
                name: '📈 Investments Value',
                value: `**${investmentsValue.toLocaleString()} embers**`,
                inline: true
            });
        }

        // Add active effects if any
        if (activeEffects.length > 0) {
            const effectsList = activeEffects.map(effect => {
                const remainingTime = Math.max(0, effect.expiresAt - now);
                const hours = Math.floor(remainingTime / (1000 * 60 * 60));
                const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
                return `${effect.name} (${hours}h ${minutes}m)`;
            }).join('\n');

            embed.addFields({
                name: '✨ Active Effects',
                value: effectsList,
                inline: false
            });
        }

        // Add investment details if any
        if (profile.investments && profile.investments.length > 0) {
            const investmentDetails = profile.investments.map(inv => {
                const stockInfo = stocks[inv.symbol];
                const currentPrice = stockInfo ? stockInfo.price : inv.purchasePrice;
                const totalValue = inv.shares * currentPrice;
                const profit = totalValue - (inv.purchasePrice * inv.shares);
                return `${inv.symbol}: ${inv.shares} shares (${totalValue.toFixed(2)} embers) ${profit >= 0 ? '📈' : '📉'}`;
            }).join('\n');

            embed.addFields({
                name: '📈 Investment Details',
                value: investmentDetails.length > 1024 ? investmentDetails.substring(0, 1021) + '...' : investmentDetails,
                inline: false
            });
        }

        await message.reply({ embeds: [embed] });
    },
};