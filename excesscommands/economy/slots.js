const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateWallet } = require('../../models/economy');

const symbols = [
    { emoji: '🍒', payout: 2, weight: 10 },
    { emoji: '🍊', payout: 2, weight: 10 },
    { emoji: '🍋', payout: 2, weight: 10 },
    { emoji: '🍇', payout: 5, weight: 8 },
    { emoji: '🍉', payout: 5, weight: 8 },
    { emoji: '🔔', payout: 10, weight: 6 },
    { emoji: '⭐', payout: 15, weight: 4 },
    { emoji: '💎', payout: 25, weight: 2 },
    { emoji: '🍀', payout: 50, weight: 1 }, // Lucky symbol
];

const weightedSymbols = [];
for (const symbol of symbols) {
    for (let i = 0; i < symbol.weight; i++) {
        weightedSymbols.push(symbol);
    }
}

module.exports = {
    name: 'slots',
    description: 'Play the slot machine!',
    async execute(message, args) {
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        const bet = parseInt(args[0]);

        if (isNaN(bet) || bet <= 0) {
            return message.reply('Please place a valid bet.');
        }

        if (profile.wallet < bet) {
            return message.reply('You don\'t have enough money in your wallet for that bet.');
        }

        await updateWallet(userId, -bet);

        const reels = [[], [], []];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                reels[i][j] = weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('Slot Machine')
            .setDescription(`You bet **${bet} embers**. Good luck!\n\n${reels.map(row => row.map(s => s.emoji).join(' ')).join('\n')}`)
            .setColor('#F1C40F');

        let winnings = 0;
        let winningLines = 0;

        // Check horizontal lines
        for (let i = 0; i < 3; i++) {
            if (reels[i][0].emoji === reels[i][1].emoji && reels[i][1].emoji === reels[i][2].emoji) {
                winnings += bet * reels[i][0].payout;
                winningLines++;
            }
        }

        // Check vertical lines
        for (let i = 0; i < 3; i++) {
            if (reels[0][i].emoji === reels[1][i].emoji && reels[1][i].emoji === reels[2][i].emoji) {
                winnings += bet * reels[0][i].payout;
                winningLines++;
            }
        }

        // Check diagonals
        if (reels[0][0].emoji === reels[1][1].emoji && reels[1][1].emoji === reels[2][2].emoji) {
            winnings += bet * reels[1][1].payout;
            winningLines++;
        }
        if (reels[0][2].emoji === reels[1][1].emoji && reels[1][1].emoji === reels[2][0].emoji) {
            winnings += bet * reels[1][1].payout;
            winningLines++;
        }

        if (winnings > 0) {
            await updateWallet(userId, winnings);
            embed.addFields({ name: 'Congratulations!', value: `You won **${winnings} embers** on ${winningLines} line(s)!` });
            embed.setColor('#2ECC71');
        } else {
            embed.addFields({ name: 'Better Luck Next Time!', value: 'You didn\'t win anything.' });
            embed.setColor('#E74C3C');
        }

        message.reply({ embeds: [embed] });
    },
};