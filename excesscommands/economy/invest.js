const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEconomyProfile, updateEconomyProfile, addInvestment, updateWallet } = require('../../models/economy');
const { stocks, updateStockPrices } = require('../../data/stocks');
const crypto = require('crypto');

module.exports = {
    name: 'invest',
    description: 'Invest in kingdom assets.',
    async execute(message, args) {
        const subCommand = args[0] ? args[0].toLowerCase() : 'help';
        const userId = message.author.id;
        
        // Ensure stock prices are fresh for any investment action
        updateStockPrices();

        switch (subCommand) {
            case 'buy':
                await buyStock(message, args, userId);
                break;
            case 'sell':
                await sellStock(message, args, userId);
                break;
            case 'list':
                await listStocks(message);
                break;
            case 'view':
                await viewInvestments(message, userId);
                break;
            default:
                await showHelp(message);
                break;
        }
    },
};

async function buyStock(message, args, userId) {
    const stockSymbol = args[1] ? args[1].toUpperCase() : null;
    const amount = parseInt(args[2]);

    if (!stockSymbol || !stocks[stockSymbol]) {
        return message.reply('Please provide a valid stock symbol to buy.');
    }

    if (isNaN(amount) || amount <= 0) {
        return message.reply('Please provide a valid amount of shares to buy.');
    }

    const profile = await getEconomyProfile(userId);
    const stockPrice = stocks[stockSymbol].price;
    const totalCost = stockPrice * amount;

    if (profile.wallet < totalCost) {
        return message.reply('You do not have enough money in your wallet to make this purchase.');
    }

    const investmentId = crypto.randomBytes(16).toString('hex');
    const investment = {
        id: investmentId,
        symbol: stockSymbol,
        shares: amount,
        purchasePrice: stockPrice,
        purchaseDate: new Date(),
    };

    await addInvestment(userId, investment);
    await updateWallet(userId, -totalCost);

    const embed = new EmbedBuilder()
        .setTitle('Purchase Successful')
        .setDescription(`You have purchased **${amount}** shares of **${stockSymbol}** for a total of **${totalCost.toFixed(2)} embers**.`)
        .setColor('#00FF00');
    message.reply({ embeds: [embed] });
}

async function sellStock(message, args, userId) {
    const stockSymbol = args[1] ? args[1].toUpperCase() : null;
    const amountToSell = parseInt(args[2]);

    if (!stockSymbol || !stocks[stockSymbol]) {
        return message.reply('Please provide a valid stock symbol to sell.');
    }

    if (isNaN(amountToSell) || amountToSell <= 0) {
        return message.reply('Please provide a valid number of shares to sell.');
    }

    const profile = await getEconomyProfile(userId);
    const userInvestmentsForSymbol = profile.investments.filter(inv => inv.symbol === stockSymbol);

    if (userInvestmentsForSymbol.length === 0) {
        return message.reply(`You do not own any shares of ${stockSymbol}.`);
    }

    const totalSharesOwned = userInvestmentsForSymbol.reduce((sum, inv) => sum + inv.shares, 0);

    if (amountToSell > totalSharesOwned) {
        return message.reply(`You only own ${totalSharesOwned} shares of ${stockSymbol}. You cannot sell ${amountToSell}.`);
    }

    // FIFO - First-In, First-Out
    userInvestmentsForSymbol.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

    const currentPrice = stocks[stockSymbol].price;
    let remainingAmountToSell = amountToSell;
    let totalSaleValue = 0;
    let totalCostBasis = 0;

    const remainingInvestments = [...profile.investments];

    for (const investment of userInvestmentsForSymbol) {
        if (remainingAmountToSell <= 0) break;

        const sharesToSellFromThisChunk = Math.min(remainingAmountToSell, investment.shares);
        
        totalSaleValue += sharesToSellFromThisChunk * currentPrice;
        totalCostBasis += sharesToSellFromThisChunk * investment.purchasePrice;
        remainingAmountToSell -= sharesToSellFromThisChunk;

        const investmentIndex = remainingInvestments.findIndex(inv => inv.id === investment.id);
        if (sharesToSellFromThisChunk === investment.shares) {
            remainingInvestments.splice(investmentIndex, 1);
        } else {
            remainingInvestments[investmentIndex].shares -= sharesToSellFromThisChunk;
        }
    }

    await updateWallet(userId, totalSaleValue);
    await updateEconomyProfile(userId, { investments: remainingInvestments });
    
    const profit = totalSaleValue - totalCostBasis;

    const embed = new EmbedBuilder()
        .setTitle('Sale Successful')
        .setDescription(`You have sold **${amountToSell}** shares of **${stockSymbol}** for **${totalSaleValue.toFixed(2)} embers**.`)
        .setColor(profit >= 0 ? '#00FF00' : '#FF0000');

    if (profit !== 0) {
        embed.addFields({ name: 'Profit/Loss', value: `${profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)} embers` });
    }
    
    message.reply({ embeds: [embed] });
}

async function listStocks(message) {
    const embed = new EmbedBuilder()
        .setTitle('Available Kingdom Assets')
        .setColor('#0099FF');

    for (const symbol in stocks) {
        const stock = stocks[symbol];
        embed.addFields({ name: `${stock.name} (${symbol})`, value: `Price: **${stock.price.toFixed(2)} embers**` });
    }

    message.reply({ embeds: [embed] });
}

async function viewInvestments(message, userId) {
    const profile = await getEconomyProfile(userId);
    const investments = profile.investments;

    if (!investments || investments.length === 0) {
        return message.reply('You do not have any active investments.');
    }

    const embed = new EmbedBuilder()
        .setTitle('Your Investments')
        .setColor('#0099FF');

    investments.forEach(investment => {
        const currentPrice = stocks[investment.symbol].price;
        const currentValue = currentPrice * investment.shares;
        const purchaseValue = investment.purchasePrice * investment.shares;
        const profit = currentValue - purchaseValue;
        embed.addFields({
            name: `**${investment.symbol}** - ${investment.shares} shares`,
            value: `ID: ${investment.id}\nPurchase Price: ${investment.purchasePrice.toFixed(2)} embers\nCurrent Value: ${currentValue.toFixed(2)} embers\nProfit/Loss: ${profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)} embers`,
            inline: true,
        });
    });

    message.reply({ embeds: [embed] });
}

async function showHelp(message) {
    const embed = new EmbedBuilder()
        .setTitle('Invest Command Help')
        .setDescription('Invest in kingdom assets to grow your wealth in the dark-fantasy realm!')
        .addFields(
            { name: '`invest list`', value: 'View available kingdom assets and their current prices.' },
            { name: '`invest buy <symbol> <amount>`', value: 'Buy a specific amount of shares of a kingdom asset.' },
            { name: '`invest sell <symbol> <amount>`', value: 'Sell a specific number of shares you own.' },
            { name: '`invest view`', value: 'View your current investments.' },
        )
        .setColor('#0099FF');

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('invest_list')
                .setLabel('List Assets')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('invest_view')
                .setLabel('View Investments')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('invest_buy')
                .setLabel('Buy Assets')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('invest_sell')
                .setLabel('Sell Assets')
                .setStyle(ButtonStyle.Danger)
        );

    message.reply({ embeds: [embed], components: [buttons] });
}
