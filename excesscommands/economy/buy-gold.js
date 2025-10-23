const { getEconomyProfile, updateWallet, updateGold } = require('../../models/economy');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    name: 'buy-gold',
    description: 'Convert your embers into gold coins.',
    usage: 'buy-gold <amount>',

    async execute(message, args) {
        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please provide a valid amount of gold to buy.');
        }

        const cost = amount * 200;
        const economyProfile = await getEconomyProfile(message.author.id);

        if (economyProfile.wallet < cost) {
            return message.reply('You do not have enough embers to buy this much gold.');
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_buy')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('decline_buy')
                    .setLabel('Decline')
                    .setStyle(ButtonStyle.Danger)
            );

        const confirmationMessage = await message.reply({
            content: `Are you sure you want to buy **${amount}** gold for **${cost}** embers?`,
            components: [row]
        });

        const collector = confirmationMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000 // 1 minute
        });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "This isn't for you!", ephemeral: true });
            }

            // Disable buttons after interaction
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    ButtonBuilder.from(row.components[0]).setDisabled(true),
                    ButtonBuilder.from(row.components[1]).setDisabled(true)
                );
            await interaction.update({ components: [disabledRow] });


            if (interaction.customId === 'confirm_buy') {
                // Re-fetch profile to ensure they still have enough money
                const currentProfile = await getEconomyProfile(message.author.id);
                if (currentProfile.wallet < cost) {
                    return interaction.followUp('You no longer have enough embers to make this purchase.');
                }

                await updateWallet(message.author.id, -cost);
                await updateGold(message.author.id, amount);

                return interaction.followUp(`You have successfully bought **${amount}** gold coins for **${cost}** embers!`);
            } else if (interaction.customId === 'decline_buy') {
                return interaction.followUp('Gold purchase cancelled.');
            }
        });

        collector.on('end', collected => {
            // If no interaction was collected, disable the buttons
            if (collected.size === 0) {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        ButtonBuilder.from(row.components[0]).setDisabled(true),
                        ButtonBuilder.from(row.components[1]).setDisabled(true)
                    );
                confirmationMessage.edit({ components: [disabledRow] });
            }
        });
    },
};