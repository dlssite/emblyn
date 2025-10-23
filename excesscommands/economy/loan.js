const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateEconomyProfile, updateWallet } = require('../../models/economy');

const DEFAULT_BANK_LIMIT = 50000;
const LOAN_INTEREST_RATE = 0.1; // 10%
const LOAN_DURATION_DAYS = 7;

module.exports = {
    name: 'loan',
    description: 'Take out or repay a loan.',
    aliases: ['borrow'],
    async execute(message, args) {
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);
        const subCommand = args[0]?.toLowerCase();

        if (subCommand === 'take') {
            return handleTakeLoan(message, profile, args);
        } else if (subCommand === 'repay') {
            return handleRepayLoan(message, profile, args);
        } else {
            return displayLoanInfo(message, profile);
        }
    },
};

async function handleTakeLoan(message, profile, args) {
    const userId = message.author.id;
    if (profile.loan && profile.loan.amount > 0) {
        return message.reply('You already have an outstanding loan. You must repay it before taking another.');
    }

    const loanAmount = parseInt(args[1]);
    if (isNaN(loanAmount) || loanAmount <= 0) {
        return message.reply('Please provide a valid amount for the loan. `loan take <amount>`');
    }

    const bankLimit = profile.bankLimit || DEFAULT_BANK_LIMIT;
    const maxLoanAmount = Math.floor(bankLimit * 0.5);

    if (loanAmount > maxLoanAmount) {
        return message.reply(`You can only borrow up to 50% of your bank limit. Your maximum loan amount is **${maxLoanAmount.toLocaleString()} embers**.`);
    }

    const amountToRepay = Math.floor(loanAmount * (1 + LOAN_INTEREST_RATE));
    const dueDate = new Date(Date.now() + LOAN_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await updateEconomyProfile(userId, {
        wallet: profile.wallet + loanAmount,
        loan: { amount: amountToRepay, dueDate: dueDate.getTime() }
    });

    const embed = new EmbedBuilder()
        .setTitle('✅ Loan Successful')
        .setDescription(`You have taken out a loan of **${loanAmount.toLocaleString()} embers**. The money has been added to your wallet.`)
        .addFields({
            name: 'Repayment Details',
            value: `You must repay **${amountToRepay.toLocaleString()} embers** by ${dueDate.toDateString()}.`
        })
        .setColor('#2ECC71');

    return message.reply({ embeds: [embed] });
}

async function handleRepayLoan(message, profile, args) {
    const userId = message.author.id;
    const loan = profile.loan || { amount: 0 };

    if (loan.amount <= 0) {
        return message.reply("You don't have an outstanding loan to repay.");
    }

    const repaymentAmount = parseInt(args[1]);
    if (isNaN(repaymentAmount) || repaymentAmount <= 0) {
        return message.reply('Please provide a valid amount to repay. `loan repay <amount>`');
    }

    if (profile.wallet < repaymentAmount) {
        return message.reply('You do not have enough money in your wallet to make this repayment.');
    }

    if (repaymentAmount >= loan.amount) {
        const refund = repaymentAmount - loan.amount;
        await updateEconomyProfile(userId, {
            wallet: profile.wallet - loan.amount, // Pay off the exact loan amount
            loan: { amount: 0, dueDate: null }
        });

        let replyMessage = 'You have successfully paid off your loan!';
        if (refund > 0) {
            await updateWallet(userId, refund); // Refund the overpaid amount
            replyMessage += ` You overpaid and have been refunded **${refund.toLocaleString()} embers**.`;
        }

        return message.reply(replyMessage);

    } else {
        const newLoanAmount = loan.amount - repaymentAmount;
        await updateEconomyProfile(userId, {
            wallet: profile.wallet - repaymentAmount,
            loan: { amount: newLoanAmount, dueDate: loan.dueDate }
        });

        return message.reply(`You have paid **${repaymentAmount.toLocaleString()} embers** towards your loan. The remaining amount is **${newLoanAmount.toLocaleString()} embers**.`);
    }
}

function displayLoanInfo(message, profile) {
    const embed = new EmbedBuilder()
        .setTitle('💰 Loan Information')
        .setDescription('Use `loan take <amount>` or `loan repay <amount>`.')
        .setColor('#3498DB');

    const loanAmount = profile.loan?.amount || 0;

    if (loanAmount > 0) {
        embed.addFields({
            name: 'Current Loan Status',
            value: `Amount to repay: **${loanAmount.toLocaleString()} embers**\nDue Date: **${new Date(profile.loan.dueDate).toDateString()}**`
        });
    } else {
        embed.addFields({ name: 'Current Loan Status', value: 'You have no outstanding loans.' });
    }

    const bankLimit = profile.bankLimit || DEFAULT_BANK_LIMIT;
    const maxLoanAmount = Math.floor(bankLimit * 0.5);
    embed.addFields({ name: 'Maximum Loan', value: `You can borrow up to **${maxLoanAmount.toLocaleString()} embers**.` });

    return message.reply({ embeds: [embed] });
}