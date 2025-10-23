const { getEconomyProfile } = require('../../models/economy');
const { EmbedBuilder } = require('discord.js');
const { shopItems } = require('../../data/shopItems');

// Create a map for quick lookup of item details by ID
const allItemsById = Object.values(shopItems).flat().reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
}, {});

module.exports = {
    name: 'myhome',
    aliases: ['myhouse', 'myproperties'],
    description: 'View the properties you own and your current bill status.',
    async execute(message) {
        await message.channel.sendTyping();
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        const ownedHouses = profile.inventory.filter(item => {
            const itemDetails = allItemsById[item.id];
            return itemDetails && itemDetails.type === 'house';
        });

        const embed = new EmbedBuilder()
            .setTitle('🏡 Your Properties & Bills')
            .setColor('#0099FF')
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() });

        if (ownedHouses.length === 0) {
            embed.setColor('#E74C3C');
            embed.setDescription("You currently don't own any real estate. Use the `/shop` command to browse available properties.");
        } else {
            let totalUpkeep = 0;
            ownedHouses.forEach(house => {
                const houseDetails = allItemsById[house.id];
                const upkeep = houseDetails.monthlyUpkeep || 0;
                totalUpkeep += upkeep;
                embed.addFields({
                    name: `**${house.name}**`,
                    value: `*Monthly Upkeep: ${upkeep.toLocaleString()} embers*`,
                    inline: false
                });
            });
            embed.setFooter({ text: `Total Monthly Upkeep: ${totalUpkeep.toLocaleString()} embers` });
        }

        // Add billing information
        const bills = profile.bills;
        const totalDue = bills.unpaidAmount || 0;

        if (totalDue > 0) {
            embed.addFields({
                name: '\n💰 Billing Status',
                value: `**Amount Due:** **${totalDue.toLocaleString()} embers**\n` +
                       `*Bill issued on: <t:${Math.floor(bills.billIssueDate / 1000)}:D>*\n` +
                       `*Pay within 7 days to avoid foreclosure!*`,
                inline: false
            });
            embed.setColor('#E67E22'); // Orange color to indicate a pending bill
        } else {
             embed.addFields({
                name: '\n💰 Billing Status',
                value: `You have no outstanding bills.\n` +
                       `Next bill is scheduled for <t:${Math.floor(bills.nextBillDate / 1000)}:D>.`,
                inline: false
            });
        }

        message.reply({ embeds: [embed] });
    },
};
