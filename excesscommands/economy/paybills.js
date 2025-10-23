// commands/economy/paybills.js
const { getEconomyProfile, updateBills, updateWallet } = require('../../models/economy');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'paybills',
    description: 'View and pay your outstanding property upkeep bills.',
    async execute(message) {
        await message.channel.sendTyping();
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        const totalDue = profile.bills.unpaidAmount || 0;

        if (totalDue === 0) {
            return message.reply("You have no outstanding bills to pay. Your next property upkeep bill is scheduled for <t:" + Math.floor(profile.bills.nextBillDate / 1000) + ":D>");
        }

        const embed = new EmbedBuilder()
            .setTitle('Property Upkeep Bill')
            .setColor('#E67E22')
            .setDescription(`You have an outstanding bill of **${totalDue.toLocaleString()} embers**.`);

        if (profile.wallet < totalDue) {
            embed.setColor('#E74C3C');
            embed.addFields({ name: 'Insufficient Funds', value: `You don't have enough money in your wallet to pay this bill. You need ${totalDue.toLocaleString()} embers, but you only have ${profile.wallet.toLocaleString()} embers.` });
            return message.reply({ embeds: [embed] });
        }

        // Sufficient funds, proceed with payment
        await updateWallet(userId, -totalDue);

        // Reset the bill tracking
        await updateBills(userId, {
            unpaidAmount: 0,
            billIssueDate: null, // Reset the grace period trigger
            nextBillDate: profile.bills.nextBillDate // The next due date doesn't change
        });

        embed.setTitle('✅ Bills Paid')
            .setColor('#2ECC71')
            .setDescription(`You have successfully paid your outstanding bill of **${totalDue.toLocaleString()} embers**.`);

        message.reply({ embeds: [embed] });
    },
};
