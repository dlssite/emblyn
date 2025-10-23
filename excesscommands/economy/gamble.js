const { getEconomyProfile, updateWallet, updateEconomyProfile } = require('../../models/economy');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'gamble',
    description: 'Gamble your money for a chance to win or lose!',
    async execute(message, args) {
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        const now = Date.now();
        const cooldown = 10 * 1000; // 10 seconds
        if (profile.cooldowns && profile.cooldowns.gamble && now - profile.cooldowns.gamble < cooldown) {
            const remaining = cooldown - (now - profile.cooldowns.gamble);
            return message.reply(`You are on cooldown. Try again in ${Math.ceil(remaining / 1000)} seconds.`);
        }

        const amountArg = args[0]?.toLowerCase();
        let amount;

        if (!amountArg) {
             return message.reply('Please specify an amount to gamble. Usage: `gamble <amount|all>`');
        }

        if (amountArg === 'all') {
            amount = profile.wallet;
        } else {
            amount = parseInt(amountArg);
        }

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please provide a valid amount to gamble.');
        }

        if (profile.wallet < amount) {
            return message.reply("You don't have that much money in your wallet.");
        }

        // --- Apply Potion of Luck ---
        let winChance = 0.5; // 50% base chance
        const luckPotion = profile.activeEffects?.find(e => e.name === 'Potion of Luck' && e.expiresAt > now);
        if (luckPotion) {
            winChance = 0.6; // 60% chance with luck potion
        }

        await updateEconomyProfile(userId, { [`cooldowns.gamble`]: now });

        const win = Math.random() < winChance;
        let resultMessage;
        let embedColor;

        if (win) {
            const winnings = amount * 2;
            await updateWallet(userId, winnings);
            resultMessage = `You gambled **${amount.toLocaleString()} embers** and won **${winnings.toLocaleString()} embers**! Congratulations!`;
            embedColor = '#2ECC71'; // Green
        } else {
            await updateWallet(userId, -amount);
            resultMessage = `You gambled **${amount.toLocaleString()} embers** and lost it all. Better luck next time.`;
            embedColor = '#E74C3C'; // Red
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🎰 Gamble Result 🎰')
            .setDescription(resultMessage)
            .setColor(embedColor)

        if (luckPotion) {
            embed.setFooter({ text: 'Your Potion of Luck was active!' });
        }

        message.reply({ embeds: [embed] });
    },
};