const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getEconomyProfile, updateEconomyProfile, updateWallet } = require('../../models/economy');

module.exports = {
    name: 'trade',
    description: 'Sell an item to another user.',
    aliases: ['p2p', 'deal'],
    async execute(message, args) {
        const initiator = message.author;
        const targetUser = message.mentions.users.first();
        
        if (!targetUser) {
            return message.reply('Please mention the user you want to trade with. Usage: `trade <@user> <item name> <price>`');
        }

        const price = parseInt(args[args.length - 1]);
        const itemName = args.slice(1, -1).join(' ');

        if (isNaN(price) || price <= 0 || !itemName) {
            return message.reply('Invalid format. Usage: `trade <@user> <item name> <price>`');
        }

        if (targetUser.id === initiator.id) {
            return message.reply("You can't trade with yourself!");
        }

        const initiatorProfile = await getEconomyProfile(initiator.id);
        const itemToTrade = initiatorProfile.inventory.find(item => item.name.toLowerCase() === itemName.toLowerCase());

        if (!itemToTrade) {
            return message.reply(`You don't have a **${itemName}** in your inventory to trade.`);
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_trade')
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('decline_trade')
                    .setLabel('Decline')
                    .setStyle(ButtonStyle.Danger)
            );

        const tradeOfferEmbed = new EmbedBuilder()
            .setTitle('🤝 Player Trade Offer')
            .setDescription(`${initiator.username} is offering to sell you a **${itemToTrade.name}** for **${price.toLocaleString()} embers**. Do you accept?`)
            .setColor('#3498DB');

        const confirmationMsg = await message.channel.send({ content: `${targetUser}`, embeds: [tradeOfferEmbed], components: [row] });

        const collector = confirmationMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== targetUser.id) {
                return interaction.reply({ content: "This trade offer is not for you.", ephemeral: true });
            }

            if (interaction.customId === 'accept_trade') {
                const currentInitiatorProfile = await getEconomyProfile(initiator.id);
                const currentTargetProfile = await getEconomyProfile(targetUser.id);

                const itemIndexInInitiatorInv = currentInitiatorProfile.inventory.findIndex(i => i.name.toLowerCase() === itemName.toLowerCase());

                if (itemIndexInInitiatorInv === -1) {
                    return interaction.update({ content: `${initiator.username} no longer has this item.`, components: [], embeds: [] });
                }
                if (currentTargetProfile.wallet < price) {
                    return interaction.update({ content: "You don't have enough money to make this purchase.", components: [], embeds: [] });
                }

                // Perform the trade
                const tradedItem = currentInitiatorProfile.inventory.splice(itemIndexInInitiatorInv, 1)[0];
                currentTargetProfile.inventory.push(tradedItem);

                await updateEconomyProfile(initiator.id, { inventory: currentInitiatorProfile.inventory });
                await updateEconomyProfile(targetUser.id, { inventory: currentTargetProfile.inventory });
                await updateWallet(initiator.id, price);
                await updateWallet(targetUser.id, -price);

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Trade Successful!')
                    .setDescription(`**${targetUser.username}** has purchased **${tradedItem.name}** from **${initiator.username}** for **${price.toLocaleString()} embers**. `)
                    .setColor('#2ECC71');

                await interaction.update({ embeds: [successEmbed], components: [] });

            } else if (interaction.customId === 'decline_trade') {
                const declineEmbed = new EmbedBuilder()
                    .setTitle('❌ Trade Declined')
                    .setDescription(`${targetUser.username} has declined the trade offer.`)
                    .setColor('#E74C3C');
                await interaction.update({ embeds: [declineEmbed], components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⌛ Trade Timed Out')
                    .setDescription('The trade offer has expired as there was no response.')
                    .setColor('#95A5A6');
                confirmationMsg.edit({ embeds: [timeoutEmbed], components: [] });
            }
        });
    }
};