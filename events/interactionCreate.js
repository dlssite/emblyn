const fs = require('fs');
const path = require('path');
const lang = require('./loadLanguage');
const client = require('../main');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const VerificationConfig = require('../models/gateVerification/verificationConfig');
const verificationCodes = new Map();
const SuggestionVote = require('../models/suggestions/SuggestionVote');
const truths = require('../data/truthordare/truth.json');
const dares = require('../data/truthordare/dare.json');
const nsfwTruths = require('../data/truthordare/nsfw_truth.json');
const nsfwDares = require('../data/truthordare/nsfw_dare.json');
const DisabledCommand = require('../models/commands/DisabledCommands');
const PartnerConfig = require('../models/partnership/partnerConfig');
const EventConfig = require('../models/events/eventConfig');
const AiChat = require('../models/aichat/aiModel');
const embersMessages = new Map();

// Helpers to avoid double-acknowledging interactions
async function safeDeferUpdate(interaction) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
    } catch (err) {
        // log at debug level; ignore already-acknowledged errors
        // console.debug('safeDeferUpdate skipped:', err.message);
    }
}

async function safeDeferReply(interaction) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        }
    } catch (err) {
        // console.debug('safeDeferReply skipped:', err.message);
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        // 🟣 Button Logic
        if (interaction.isButton()) {
             // If the interaction is part of the new boss system, ignore it.
            if (interaction.customId && interaction.customId.startsWith('boss-')) {
                return;
            }
            const { customId, user } = interaction;

            // Handle Button Interactions (Verification Button)
            if (interaction.customId === 'verify_button') {
                const verificationCode = Math.random().toString(36).slice(2, 8).toUpperCase();
                verificationCodes.set(interaction.user.id, verificationCode);

                const modal = new ModalBuilder().setCustomId('verify_modal').setTitle('Verification');
                const input = new TextInputBuilder().setCustomId('verify_input').setLabel(`Enter this code: ${verificationCode}`).setStyle(TextInputStyle.Short).setRequired(true);
                const row = new ActionRowBuilder().addComponents(input);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }
            if (customId.startsWith('tod_')) {
                await safeDeferUpdate(interaction);

                let result;
                if (customId === 'tod_truth') {
                    result = `🧠 **Truth:** ${truths[Math.floor(Math.random() * truths.length)]}`;
                } else if (customId === 'tod_dare') {
                    result = `🔥 **Dare:** ${dares[Math.floor(Math.random() * dares.length)]}`;
                } else if (customId === 'tod_random') {
                    const pool = Math.random() < 0.5 ? truths : dares;
                    const label = pool === truths ? '🧠 **Truth:**' : '🔥 **Dare:**';
                    result = `${label} ${pool[Math.floor(Math.random() * pool.length)]}`;
                }

                const embed = new EmbedBuilder().setTitle('🎲 Your Truth or Dare!').setDescription(result).setColor('#00ccff').setFooter({ text: `${user.username} picked this`, iconURL: user.displayAvatarURL() }).setTimestamp();
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('tod_truth').setLabel('Truth 🧠').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('tod_dare').setLabel('Dare 🔥').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('tod_random').setLabel('Random 🎲').setStyle(ButtonStyle.Secondary)
                );
                return interaction.channel.send({ embeds: [embed], components: [buttons] });
            }
            if (customId.startsWith('nsfw_tod_')) {
                if (!interaction.channel.nsfw) {
                    return interaction.reply({ content: 'This command can only be used in NSFW channels.', flags: [MessageFlags.Ephemeral] });
                }
                await safeDeferUpdate(interaction);

                let result;
                if (customId === 'nsfw_tod_truth') {
                    result = `🧠 **Truth:** ${nsfwTruths[Math.floor(Math.random() * nsfwTruths.length)]}`;
                } else if (customId === 'nsfw_tod_dare') {
                    result = `🔥 **Dare:** ${nsfwDares[Math.floor(Math.random() * nsfwDares.length)]}`;
                } else if (customId === 'nsfw_tod_random') {
                    const pool = Math.random() < 0.5 ? nsfwTruths : nsfwDares;
                    const label = pool === nsfwTruths ? '🧠 **Truth:**' : '🔥 **Dare:**';
                    result = `${label} ${pool[Math.floor(Math.random() * pool.length)]}`;
                }

                const embed = new EmbedBuilder().setTitle('🔥 NSFW Truth or Dare! 🔥').setDescription(result).setColor('#ff0000').setFooter({ text: `${user.username} picked this`, iconURL: user.displayAvatarURL() }).setTimestamp();
                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('nsfw_tod_truth').setLabel('Truth 🧠').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('nsfw_tod_dare').setLabel('Dare 🔥').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('nsfw_tod_random').setLabel('Random 🎲').setStyle(ButtonStyle.Secondary)
                );
                return interaction.channel.send({ embeds: [embed], components: [buttons] });
            }
            if (['suggestion_yes', 'suggestion_no'].includes(customId)) {
                const messageId = interaction.message.id;
                const voteType = customId === 'suggestion_yes' ? 'yes' : 'no';

                try {
                    await SuggestionVote.findOneAndUpdate({ messageId, userId: user.id }, { vote: voteType, votedAt: new Date() }, { upsert: true });

                    const allVotes = await SuggestionVote.find({ messageId });
                    const yesVotes = allVotes.filter(v => v.vote === 'yes').length;
                    const noVotes = allVotes.filter(v => v.vote === 'no').length;

                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setFields(
                            { name: 'Submitted by', value: interaction.message.embeds[0].fields[0].value, inline: true },
                            { name: '👍 Yes Votes', value: `${yesVotes}`, inline: true },
                            { name: '👎 No Votes', value: `${noVotes}`, inline: true }
                        );
                    await interaction.update({ embeds: [embed] });
                } catch (err) {
                    console.error('❌ Error handling suggestion vote:', err);
                    await interaction.reply({ content: '⚠️ Could not register your vote. Please try again later.', flags: [MessageFlags.Ephemeral] });
                }
            }
            if (customId === 'invest_list') {
                await safeDeferUpdate(interaction);
                const { stocks, updateStockPrices } = require('../data/stocks');
                updateStockPrices();
                const embed = new EmbedBuilder()
                    .setTitle('Available Kingdom Assets')
                    .setColor('#0099FF');

                for (const symbol in stocks) {
                    const stock = stocks[symbol];
                    embed.addFields({ name: `${stock.name} (${symbol})`, value: `Price: **${stock.price.toFixed(2)} embers**` });
                }

                await interaction.editReply({ embeds: [embed] });
            }
            if (customId === 'invest_view') {
                await safeDeferUpdate(interaction);
                const { getEconomyProfile } = require('../models/economy');
                const { stocks } = require('../data/stocks');
                const userId = interaction.user.id;
                const profile = await getEconomyProfile(userId);
                const investments = profile.investments;

                if (!investments || investments.length === 0) {
                    return interaction.editReply('You do not have any active investments.');
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

                await interaction.editReply({ embeds: [embed] });
            }
            if (customId === 'invest_buy') {
                await safeDeferUpdate(interaction);
                const { stocks, updateStockPrices } = require('../data/stocks');
                updateStockPrices();
                const embed = new EmbedBuilder()
                    .setTitle('Buy Kingdom Assets')
                    .setDescription('Select an asset to buy and enter the amount.')
                    .setColor('#00FF00');

                const options = Object.keys(stocks).map(symbol => ({
                    label: `${stocks[symbol].name} (${symbol})`,
                    description: `Price: ${stocks[symbol].price.toFixed(2)} embers`,
                    value: `buy_${symbol}`,
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('invest_buy_select')
                    .setPlaceholder('Choose an asset to buy')
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await interaction.editReply({ embeds: [embed], components: [row] });
            }
            if (customId === 'invest_sell') {
                await safeDeferUpdate(interaction);
                const { getEconomyProfile } = require('../models/economy');
                const { stocks } = require('../data/stocks');
                const userId = interaction.user.id;
                const profile = await getEconomyProfile(userId);
                const investments = profile.investments;

                if (!investments || investments.length === 0) {
                    return interaction.editReply('You do not have any active investments to sell.');
                }

                const embed = new EmbedBuilder()
                    .setTitle('Sell Kingdom Assets')
                    .setDescription('Select an investment to sell and enter the amount.')
                    .setColor('#FF0000');

                const options = investments.map(investment => ({
                    label: `${stocks[investment.symbol].name} (${investment.symbol}) - ${investment.shares} shares`,
                    description: `Current Value: ${(stocks[investment.symbol].price * investment.shares).toFixed(2)} embers`,
                    value: `sell_${investment.id}`,
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('invest_sell_select')
                    .setPlaceholder('Choose an investment to sell')
                    .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await interaction.editReply({ embeds: [embed], components: [row] });
            }
            if (customId === 'bank_deposit') {
                const modal = new ModalBuilder()
                    .setCustomId('bank_deposit_modal')
                    .setTitle('Deposit');

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Amount to deposit (or "all")')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Enter amount or "all"');

                const row = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }
            if (customId === 'bank_withdraw') {
                const modal = new ModalBuilder()
                    .setCustomId('bank_withdraw_modal')
                    .setTitle('Withdraw');

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Amount to withdraw')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Enter amount');

                const row = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }
            if (customId === 'bank_transfer') {
                const modal = new ModalBuilder()
                    .setCustomId('bank_transfer_modal')
                    .setTitle('Transfer');

                const recipientInput = new TextInputBuilder()
                    .setCustomId('recipient')
                    .setLabel('Recipient (mention or ID)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('@user or user ID');

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Amount to transfer')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Enter amount');

                const row1 = new ActionRowBuilder().addComponents(recipientInput);
                const row2 = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row1, row2);

                await interaction.showModal(modal);
            }
            if (customId === 'bank_buy_gold') {
                const modal = new ModalBuilder()
                    .setCustomId('bank_buy_gold_modal')
                    .setTitle('Buy Gold');

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Amount of gold to buy (200 embers per gold)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Enter amount');

                const row = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }
            if (customId === 'bank_update') {
                await safeDeferUpdate(interaction);
                const userId = interaction.user.id;
                const profile = await require('../models/economy').getEconomyProfile(userId);

                const wallet = Number(profile.wallet ?? 1);
                const bank = Number(profile.bank ?? 0);
                const gold = Number(profile.gold ?? 0);
                const bankLimit = profile.bankLimit || 50000;

                const attachment = new AttachmentBuilder('./UI/economyimages/EcoKingdom.png');
                const embed = new EmbedBuilder()
                    .setTitle('Bank Balance')
                    .setDescription(`**Wallet:** ${wallet} embers\n**Bank:** ${bank}/${bankLimit} embers\n**Gold:** ${gold}`)
                    .setColor('#FF00FF')
                    .setImage('attachment://EcoKingdom.png')
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('bank_deposit')
                        .setLabel('Deposit')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('bank_withdraw')
                        .setLabel('Withdraw')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('bank_transfer')
                        .setLabel('Transfer')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('bank_buy_gold')
                        .setLabel('Buy Gold')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('bank_update')
                        .setLabel('Update')
                        .setStyle(ButtonStyle.Secondary)
                );

                await interaction.editReply({ embeds: [embed], components: [row], files: [attachment] });
            }
            if (customId === 'ad_ecom_give_money') {
                const modal = new ModalBuilder()
                    .setCustomId('ad_ecom_give_money_modal')
                    .setTitle('Give Money');

                const userInput = new TextInputBuilder()
                    .setCustomId('user')
                    .setLabel('User (mention or ID)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('@user or user ID');

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Amount to give')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Enter amount');

                const row1 = new ActionRowBuilder().addComponents(userInput);
                const row2 = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row1, row2);

                await interaction.showModal(modal);
            }
            if (customId === 'ad_ecom_take_money') {
                const modal = new ModalBuilder()
                    .setCustomId('ad_ecom_take_money_modal')
                    .setTitle('Take Money');

                const userInput = new TextInputBuilder()
                    .setCustomId('user')
                    .setLabel('User (mention or ID)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('@user or user ID');

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Amount to take')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Enter amount');

                const row1 = new ActionRowBuilder().addComponents(userInput);
                const row2 = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row1, row2);

                await interaction.showModal(modal);
            }
            if (customId === 'ad_ecom_give_gold') {
                const modal = new ModalBuilder()
                    .setCustomId('ad_ecom_give_gold_modal')
                    .setTitle('Give Gold');

                const userInput = new TextInputBuilder()
                    .setCustomId('user')
                    .setLabel('User (mention or ID)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('@user or user ID');

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Amount to give')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Enter amount');

                const row1 = new ActionRowBuilder().addComponents(userInput);
                const row2 = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row1, row2);

                await interaction.showModal(modal);
            }
            if (customId === 'ad_ecom_take_gold') {
                const modal = new ModalBuilder()
                    .setCustomId('ad_ecom_take_gold_modal')
                    .setTitle('Take Gold');

                const userInput = new TextInputBuilder()
                    .setCustomId('user')
                    .setLabel('User (mention or ID)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('@user or user ID');

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Amount to take')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Enter amount');

                const row1 = new ActionRowBuilder().addComponents(userInput);
                const row2 = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row1, row2);

                await interaction.showModal(modal);
            }
        }
        // Handle String Select Menus
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId && interaction.customId.startsWith('boss-')) {
                return;
            }



            if (interaction.customId === 'embers_select') {
                const selectedValue = interaction.values[0];
                const commandName = selectedValue.replace('embers_', '');
                const userId = interaction.user.id;

                // Keep the previous embers command response (do not delete it) to avoid timing issues with modals.
                // Only clear our local reference so we don't attempt to delete it later.
                if (embersMessages.has(userId)) {
                    embersMessages.delete(userId);
                }

                // Show modal based on command
                if (commandName === 'rob') {
                    const modal = new ModalBuilder()
                        .setCustomId('embers_rob_modal')
                        .setTitle('Rob Command');

                    const targetInput = new TextInputBuilder()
                        .setCustomId('target')
                        .setLabel('Target User (mention or ID)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('@user or user ID');

                    const row = new ActionRowBuilder().addComponents(targetInput);
                    modal.addComponents(row);

                    try {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.showModal(modal);
                        } else {
                            await interaction.followUp({ content: 'Could not open the modal because this interaction was already acknowledged. Please try again.', flags: [MessageFlags.Ephemeral] });
                        }
                    } catch (err) {
                        console.error('Error showing modal (rob):', err);
                        try { await interaction.followUp({ content: 'Could not open the modal. The interaction may have expired — please try again.', flags: [MessageFlags.Ephemeral] }); } catch (e) {}
                    }
                } else if (commandName === 'slots') {
                    const modal = new ModalBuilder()
                        .setCustomId('embers_slots_modal')
                        .setTitle('Slots Command');

                    const betInput = new TextInputBuilder()
                        .setCustomId('bet')
                        .setLabel('Bet Amount')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Enter bet amount');

                    const row = new ActionRowBuilder().addComponents(betInput);
                    modal.addComponents(row);

                    try {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.showModal(modal);
                        } else {
                            await interaction.followUp({ content: 'Could not open the modal because this interaction was already acknowledged. Please try again.', flags: [MessageFlags.Ephemeral] });
                        }
                    } catch (err) {
                        console.error('Error showing modal (slots):', err);
                        try { await interaction.followUp({ content: 'Could not open the modal. The interaction may have expired — please try again.', flags: [MessageFlags.Ephemeral] }); } catch (e) {}
                    }
                } else if (commandName === 'gamble') {
                    const modal = new ModalBuilder()
                        .setCustomId('embers_gamble_modal')
                        .setTitle('Gamble Command');

                    const amountInput = new TextInputBuilder()
                        .setCustomId('amount')
                        .setLabel('Amount to Gamble (or "all")')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Enter amount or "all"');

                    const row = new ActionRowBuilder().addComponents(amountInput);
                    modal.addComponents(row);

                    try {
                        console.log('[debug] gamble: attempting showModal', { interactionId: interaction.id, userId: interaction.user?.id, deferred: interaction.deferred, replied: interaction.replied, messageId: interaction.message?.id });
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.showModal(modal);
                        } else {
                            console.log('[debug] gamble: interaction already acknowledged, sending fallback');
                            await interaction.followUp({ content: 'Could not open the modal because this interaction was already acknowledged. Please try again.', flags: [MessageFlags.Ephemeral] });
                        }
                    } catch (err) {
                        console.error('Error showing modal (gamble):', err);
                        try { await interaction.followUp({ content: 'Could not open the modal. The interaction may have expired — please try again.', flags: [MessageFlags.Ephemeral] }); } catch (e) {}
                    }
                } else if (commandName === 'roulette') {
                    const modal = new ModalBuilder()
                        .setCustomId('embers_roulette_modal')
                        .setTitle('Roulette Command');

                    const betInput = new TextInputBuilder()
                        .setCustomId('bet')
                        .setLabel('Bet Amount')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Enter bet amount');

                    const colorInput = new TextInputBuilder()
                        .setCustomId('color')
                        .setLabel('Color (red or black)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('red or black');

                    const row1 = new ActionRowBuilder().addComponents(betInput);
                    const row2 = new ActionRowBuilder().addComponents(colorInput);
                    modal.addComponents(row1, row2);

                    try {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.showModal(modal);
                        } else {
                            await interaction.followUp({ content: 'Could not open the modal because this interaction was already acknowledged. Please try again.', flags: [MessageFlags.Ephemeral] });
                        }
                    } catch (err) {
                        console.error('Error showing modal (roulette):', err);
                        try { await interaction.followUp({ content: 'Could not open the modal. The interaction may have expired — please try again.', flags: [MessageFlags.Ephemeral] }); } catch (e) {}
                    }
                } else {
                    // For other commands, use the old method
                        await safeDeferUpdate(interaction);
                    const mockMessage = {
                        author: interaction.user,
                        channel: interaction.channel,
                        guild: interaction.guild,
                        reply: async (content) => {
                            let responseMessage;
                            if (typeof content === 'string') {
                                responseMessage = await interaction.followUp({ content });
                            } else {
                                responseMessage = await interaction.followUp(content);
                            }
                            // Store the new message for potential deletion on next selection
                            embersMessages.set(userId, responseMessage);
                            return responseMessage;
                        },
                        channel: {
                            sendTyping: async () => {} // Mock sendTyping
                        }
                    };

                    try {
                        const command = require(`../excesscommands/economy/${commandName}.js`);
                        await command.execute(mockMessage, []);
                    } catch (error) {
                        console.error(`Error executing command ${commandName}:`, error);
                        const errorMessage = await interaction.followUp({ content: `An error occurred while running the ${commandName} command.`, flags: [MessageFlags.Ephemeral] });
                        embersMessages.set(userId, errorMessage);
                    }
                }
            }
            if (interaction.customId === 'invest_buy_select') {
                const selectedValue = interaction.values[0];
                const symbol = selectedValue.replace('buy_', '');
                const { stocks } = require('../data/stocks');

                if (!stocks[symbol]) {
                    return interaction.reply({ content: 'Invalid asset selected.', flags: [MessageFlags.Ephemeral] });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`invest_buy_modal_${symbol}`)
                    .setTitle(`Buy ${stocks[symbol].name} (${symbol})`);

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Number of shares to buy')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Enter amount (e.g., 10)');

                const row = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }

            if (interaction.customId === 'invest_sell_select') {
                const selectedValue = interaction.values[0];
                const investmentId = selectedValue.replace('sell_', '');
                const { getEconomyProfile } = require('../models/economy');
                const { stocks } = require('../data/stocks');
                const userId = interaction.user.id;
                const profile = await getEconomyProfile(userId);
                const investment = profile.investments.find(inv => inv.id === investmentId);

                if (!investment) {
                    return interaction.reply({ content: 'Invalid investment selected.', flags: [MessageFlags.Ephemeral] });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`invest_sell_modal_${investmentId}`)
                    .setTitle(`Sell ${stocks[investment.symbol].name} (${investment.symbol})`);

                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel(`Number of shares to sell (Max: ${investment.shares})`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder(`Enter amount (1-${investment.shares})`);

                const row = new ActionRowBuilder().addComponents(amountInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }

        }
        // Handle Modal Submissions
        else if (interaction.isModalSubmit()) {
             if (interaction.customId && interaction.customId.startsWith('boss-')) {
                return;
            }

            if (interaction.customId === 'verify_modal') {
                const userId = interaction.user.id;
                const userInput = interaction.fields.getTextInputValue('verify_input');
                const correctCode = verificationCodes.get(userId);

                if (!correctCode || userInput !== correctCode) {
                    return interaction.reply({ content: 'Verification failed! Try again.', flags: [MessageFlags.Ephemeral] });
                }

                const config = await VerificationConfig.findOne({ guildId: interaction.guild.id });
                if (!config) return;

                const member = interaction.guild.members.cache.get(userId);
                const verifiedRole = interaction.guild.roles.cache.get(config.verifiedRoleId);
                if (!verifiedRole) return interaction.reply({ content: '⚠️ Verified role not found.', flags: [MessageFlags.Ephemeral] });

                const unverifiedRole = interaction.guild.roles.cache.get(config.unverifiedRoleId);
                if (unverifiedRole) {
                    await member.roles.remove(unverifiedRole);
                }
                await member.roles.add(verifiedRole);
                verificationCodes.delete(userId);

                await interaction.reply({ content: '✅ Verification successful! You now have access to the server.', flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.customId === 'partner_modal') {
                const config = await PartnerConfig.findOne({ guildId: interaction.guild.id });
                if (!config) {
                    return interaction.reply({ content: 'The partnership system has not been configured yet. Use `/setup-partner set` to set a channel first.', flags: [MessageFlags.Ephemeral] });
                }
                
                const channel = await client.channels.fetch(config.channelId);
                if (!channel) {
                    return interaction.reply({ content: 'The configured partner channel could not be found.', flags: [MessageFlags.Ephemeral] });
                }

                const serverName = interaction.fields.getTextInputValue('partner_server_name');
                const description = interaction.fields.getTextInputValue('partner_description');
                const inviteLink = interaction.fields.getTextInputValue('partner_invite_link');
                const tags = interaction.fields.getTextInputValue('partner_tags');
                const imageLink = interaction.fields.getTextInputValue('partner_image_link');

                const embed = new EmbedBuilder()
                    .setTitle(serverName)
                    .setDescription(description)
                    .setColor('#6366f1')
                    .addFields(
                        { name: '🔗 Invite Link', value: `[Click here to join!](${inviteLink})`, inline: true },
                        { name: '🏷️ Tags', value: tags, inline: true }
                    )
                    .setFooter({ text: `Partnered with ${interaction.guild.name}`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setTimestamp();

                if (imageLink) {
                    embed.setImage(imageLink);
                }

                try {
                    await channel.send({ embeds: [embed] });
                    await interaction.reply({ content: `✅ Partner embed has been successfully sent to <#${channel.id}>!`, flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error sending partner embed:', error);
                    await interaction.reply({ content: 'There was an error sending the partner embed. Please check my permissions in that channel.', flags: [MessageFlags.Ephemeral] });
                }
            }

            if (interaction.customId === 'event_modal') {
                const config = await EventConfig.findOne({ guildId: interaction.guild.id });
                if (!config) {
                    return interaction.reply({ content: 'The event system has not been configured yet. Use `/setup-event set` to set a channel first.', flags: [MessageFlags.Ephemeral] });
                }

                const channel = await client.channels.fetch(config.channelId);
                if (!channel) {
                    return interaction.reply({ content: 'The configured event channel could not be found.', flags: [MessageFlags.Ephemeral] });
                }

                const title = interaction.fields.getTextInputValue('event_title');
                const description = interaction.fields.getTextInputValue('event_description');
                const tags = interaction.fields.getTextInputValue('event_tags');
                const image = interaction.fields.getTextInputValue('event_image');
                const link = interaction.fields.getTextInputValue('event_link');

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor('#ffea00')
                    .addFields({ name: '🏷️ Tags', value: tags, inline: true })
                    .setFooter({ text: `Event announced by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

                if (image) {
                    embed.setImage(image);
                }

                const components = [];
                if (link) {
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Learn More')
                            .setStyle(ButtonStyle.Link)
                            .setURL(link)
                    );
                    components.push(row);
                }

                try {
                    await channel.send({ embeds: [embed], components });
                    await interaction.reply({ content: `✅ Event announcement has been successfully sent to <#${channel.id}>!`, flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error sending event embed:', error);
                    await interaction.reply({ content: 'There was an an error sending the event announcement. Please check my permissions in that channel.', flags: [MessageFlags.Ephemeral] });
                }
            }

            if (interaction.customId === 'edit_lore_modal') {
                await interaction.deferReply({ ephemeral: true });
                
                const guildId = interaction.guild.id;
                const bio = interaction.fields.getTextInputValue('bio_input');
                const lore = interaction.fields.getTextInputValue('lore_input');
                const hierarchy = interaction.fields.getTextInputValue('hierarchy_input');

                try {
                    await AiChat.updateLore(guildId, bio, lore, hierarchy, interaction.user.id);
                    await interaction.editReply({
                        content: '✅ AI lore and personality have been successfully updated!'
                    });
                } catch (error) {
                    console.error(`Error updating lore for guild ${guildId}:`, error);
                    await interaction.editReply({
                        content: '❌ There was an error saving your changes. Please try again later.'
                    });
                }
            }

            if (interaction.customId.startsWith('invest_buy_modal_')) {
                const symbol = interaction.customId.replace('invest_buy_modal_', '');
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseInt(amountStr);

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: 'Please enter a valid number of shares to buy.', flags: [MessageFlags.Ephemeral] });
                }

                const { getEconomyProfile, addInvestment, updateWallet } = require('../models/economy');
                const { stocks, updateStockPrices } = require('../data/stocks');
                updateStockPrices();

                if (!stocks[symbol]) {
                    return interaction.reply({ content: 'Invalid asset selected.', flags: [MessageFlags.Ephemeral] });
                }

                const userId = interaction.user.id;
                const profile = await getEconomyProfile(userId);
                const stockPrice = stocks[symbol].price;
                const totalCost = stockPrice * amount;

                if (profile.wallet < totalCost) {
                    return interaction.reply({ content: 'You do not have enough money in your wallet to make this purchase.', flags: [MessageFlags.Ephemeral] });
                }

                const crypto = require('crypto');
                const investmentId = crypto.randomBytes(16).toString('hex');
                const investment = {
                    id: investmentId,
                    symbol: symbol,
                    shares: amount,
                    purchasePrice: stockPrice,
                    purchaseDate: new Date(),
                };

                await addInvestment(userId, investment);
                await updateWallet(userId, -totalCost);

                const embed = new EmbedBuilder()
                    .setTitle('Purchase Successful')
                    .setDescription(`You have purchased **${amount}** shares of **${stocks[symbol].name}** (${symbol}) for a total of **${totalCost.toFixed(2)} embers**.`)
                    .setColor('#00FF00');

                await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.customId.startsWith('invest_sell_modal_')) {
                const investmentId = interaction.customId.replace('invest_sell_modal_', '');
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amountToSell = parseInt(amountStr);

                if (isNaN(amountToSell) || amountToSell <= 0) {
                    return interaction.reply({ content: 'Please enter a valid number of shares to sell.', flags: [MessageFlags.Ephemeral] });
                }

                const { getEconomyProfile, updateEconomyProfile, updateWallet } = require('../models/economy');
                const { stocks } = require('../data/stocks');
                const userId = interaction.user.id;
                const profile = await getEconomyProfile(userId);
                const investment = profile.investments.find(inv => inv.id === investmentId);

                if (!investment) {
                    return interaction.reply({ content: 'Invalid investment selected.', flags: [MessageFlags.Ephemeral] });
                }

                const totalSharesOwned = investment.shares;

                if (amountToSell > totalSharesOwned) {
                    return interaction.reply({ content: `You only own ${totalSharesOwned} shares of ${stocks[investment.symbol].name}. You cannot sell ${amountToSell}.`, flags: [MessageFlags.Ephemeral] });
                }

                const currentPrice = stocks[investment.symbol].price;
                const totalSaleValue = amountToSell * currentPrice;
                const totalCostBasis = amountToSell * investment.purchasePrice;

                const remainingInvestments = [...profile.investments];
                const investmentIndex = remainingInvestments.findIndex(inv => inv.id === investmentId);
                if (amountToSell === totalSharesOwned) {
                    remainingInvestments.splice(investmentIndex, 1);
                } else {
                    remainingInvestments[investmentIndex].shares -= amountToSell;
                }

                await updateWallet(userId, totalSaleValue);
                await updateEconomyProfile(userId, { investments: remainingInvestments });

                const profit = totalSaleValue - totalCostBasis;

                const embed = new EmbedBuilder()
                    .setTitle('Sale Successful')
                    .setDescription(`You have sold **${amountToSell}** shares of **${stocks[investment.symbol].name}** (${investment.symbol}) for **${totalSaleValue.toFixed(2)} embers**.`)
                    .setColor(profit >= 0 ? '#00FF00' : '#FF0000');

                if (profit !== 0) {
                    embed.addFields({ name: 'Profit/Loss', value: `${profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)} embers` });
                }

                await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.customId === 'bank_deposit_modal') {
                const amountStr = interaction.fields.getTextInputValue('amount');
                const userId = interaction.user.id;
                const profile = await require('../models/economy').getEconomyProfile(userId);

                let amount;
                if (amountStr.toLowerCase() === 'all') {
                    amount = profile.wallet;
                } else {
                    amount = parseInt(amountStr);
                }

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: 'Please enter a valid amount to deposit.', flags: [MessageFlags.Ephemeral] });
                }

                if (profile.wallet < amount) {
                    return interaction.reply({ content: "You don't have that much money in your wallet.", flags: [MessageFlags.Ephemeral] });
                }

                const bankLimit = profile.bankLimit || 50000;
                const availableSpace = bankLimit - profile.bank;

                if (availableSpace <= 0) {
                    return interaction.reply({ content: 'Your bank is full! Consider upgrading your vault.', flags: [MessageFlags.Ephemeral] });
                }

                const depositAmount = Math.min(amount, availableSpace);

                await require('../models/economy').updateEconomyProfile(userId, {
                    wallet: profile.wallet - depositAmount,
                    bank: profile.bank + depositAmount
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ Deposit Successful')
                    .setDescription(`You have deposited **${depositAmount.toLocaleString()} embers** into your bank.`)
                    .setColor('#2ECC71');

                if (amount > depositAmount) {
                    embed.setFooter({ text: `Your bank was too full to deposit the full amount.` });
                }

                await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.customId === 'bank_withdraw_modal') {
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseInt(amountStr);
                const userId = interaction.user.id;
                const profile = await require('../models/economy').getEconomyProfile(userId);

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: 'Please provide a valid amount to withdraw.', flags: [MessageFlags.Ephemeral] });
                }

                if (profile.bank < amount) {
                    return interaction.reply({ content: 'You don\'t have enough money in your bank to make this withdrawal.', flags: [MessageFlags.Ephemeral] });
                }

                await require('../models/economy').updateEconomyProfile(userId, {
                    wallet: profile.wallet + amount,
                    bank: profile.bank - amount
                });

                const embed = new EmbedBuilder()
                    .setTitle('Withdrawal Successful')
                    .setDescription(`You have withdrawn **${amount} embers** from your bank.`)
                    .setColor('#00FF00');

                await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.customId === 'bank_transfer_modal') {
                const recipientStr = interaction.fields.getTextInputValue('recipient');
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseInt(amountStr);
                const userId = interaction.user.id;
                const profile = await require('../models/economy').getEconomyProfile(userId);

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: 'Please provide a valid amount to transfer.', flags: [MessageFlags.Ephemeral] });
                }

                if (profile.wallet < amount) {
                    return interaction.reply({ content: 'You don\'t have enough money in your wallet to transfer.', flags: [MessageFlags.Ephemeral] });
                }

                let recipientId;
                const mentionMatch = recipientStr.match(/^<@!?(\d+)>$/);
                if (mentionMatch) {
                    recipientId = mentionMatch[1];
                } else if (/^\d+$/.test(recipientStr)) {
                    recipientId = recipientStr;
                } else {
                    return interaction.reply({ content: 'Please provide a valid user mention or ID.', flags: [MessageFlags.Ephemeral] });
                }

                if (recipientId === userId) {
                    return interaction.reply({ content: 'You cannot transfer money to yourself.', flags: [MessageFlags.Ephemeral] });
                }

                const recipientProfile = await require('../models/economy').getEconomyProfile(recipientId);
                if (!recipientProfile) {
                    return interaction.reply({ content: 'Recipient not found.', flags: [MessageFlags.Ephemeral] });
                }

                await require('../models/economy').updateWallet(userId, -amount);
                await require('../models/economy').updateWallet(recipientId, amount);

                const embed = new EmbedBuilder()
                    .setTitle('Transfer Successful')
                    .setDescription(`You have transferred **${amount} embers** to <@${recipientId}>.`)
                    .setColor('#FFFF00');

                await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (interaction.customId === 'bank_buy_gold_modal') {
                await safeDeferReply(interaction);

                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseInt(amountStr);
                const userId = interaction.user.id;
                const profile = await require('../models/economy').getEconomyProfile(userId);

                if (isNaN(amount) || amount <= 0) {
                    return interaction.editReply({ content: 'Please enter a valid amount of gold to buy.' });
                }

                const cost = amount * 200;

                if (profile.wallet < cost) {
                    return interaction.editReply({ content: 'You do not have enough embers to buy this much gold.' });
                }

                await require('../models/economy').updateWallet(userId, -cost);
                await require('../models/economy').updateGold(userId, amount);

                const embed = new EmbedBuilder()
                    .setTitle('Gold Purchase Successful')
                    .setDescription(`You have successfully bought **${amount}** gold coins for **${cost} embers**.`)
                    .setColor('#FFD700');

                await interaction.editReply({ embeds: [embed] });
            }

            if (interaction.customId === 'ad_ecom_give_money_modal') {
                const userStr = interaction.fields.getTextInputValue('user');
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseInt(amountStr);

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: 'Please provide a valid amount to give.', flags: [MessageFlags.Ephemeral] });
                }

                let targetId;
                const mentionMatch = userStr.match(/^<@!?(\d+)>$/);
                if (mentionMatch) {
                    targetId = mentionMatch[1];
                } else if (/^\d+$/.test(userStr)) {
                    targetId = userStr;
                } else {
                    return interaction.reply({ content: 'Please provide a valid user mention or ID.', flags: [MessageFlags.Ephemeral] });
                }

                try {
                    await require('../models/economy').updateWallet(targetId, amount);
                    const embed = new EmbedBuilder()
                        .setTitle('💰 Money Added 💰')
                        .setDescription(`Successfully gave **${amount.toLocaleString()} embers** to **<@${targetId}>**.`)
                        .setColor('#00FF00')
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error giving money:', error);
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('An error occurred while giving money. Please try again later.');
                    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }
            }

            if (interaction.customId === 'ad_ecom_take_money_modal') {
                const userStr = interaction.fields.getTextInputValue('user');
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseInt(amountStr);

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: 'Please provide a valid amount to take.', flags: [MessageFlags.Ephemeral] });
                }

                let targetId;
                const mentionMatch = userStr.match(/^<@!?(\d+)>$/);
                if (mentionMatch) {
                    targetId = mentionMatch[1];
                } else if (/^\d+$/.test(userStr)) {
                    targetId = userStr;
                } else {
                    return interaction.reply({ content: 'Please provide a valid user mention or ID.', flags: [MessageFlags.Ephemeral] });
                }

                const userData = await require('../models/economy').getEconomyProfile(targetId);
                const amountToTake = Math.min(amount, userData.wallet);

                try {
                    await require('../models/economy').updateWallet(targetId, -amountToTake);
                    const embed = new EmbedBuilder()
                        .setTitle('💰 Money Taken 💰')
                        .setDescription(`Successfully took **${amountToTake.toLocaleString()} embers** from **<@${targetId}>**.`)
                        .setColor('#FF0000')
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error taking money:', error);
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('An error occurred while taking money. Please try again later.');
                    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }
            }

            if (interaction.customId === 'ad_ecom_give_gold_modal') {
                const userStr = interaction.fields.getTextInputValue('user');
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseInt(amountStr);

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: 'Please provide a valid amount to give.', flags: [MessageFlags.Ephemeral] });
                }

                let targetId;
                const mentionMatch = userStr.match(/^<@!?(\d+)>$/);
                if (mentionMatch) {
                    targetId = mentionMatch[1];
                } else if (/^\d+$/.test(userStr)) {
                    targetId = userStr;
                } else {
                    return interaction.reply({ content: 'Please provide a valid user mention or ID.', flags: [MessageFlags.Ephemeral] });
                }

                try {
                    await require('../models/economy').updateGold(targetId, amount);
                    const embed = new EmbedBuilder()
                        .setTitle('💰 Gold Added 💰')
                        .setDescription(`Successfully gave **${amount.toLocaleString()} gold** to **<@${targetId}>**.`)
                        .setColor('#FFD700')
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error giving gold:', error);
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('An error occurred while giving gold. Please try again later.');
                    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }
            }

            if (interaction.customId === 'ad_ecom_take_gold_modal') {
                const userStr = interaction.fields.getTextInputValue('user');
                const amountStr = interaction.fields.getTextInputValue('amount');
                const amount = parseInt(amountStr);

                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: 'Please provide a valid amount to take.', flags: [MessageFlags.Ephemeral] });
                }

                let targetId;
                const mentionMatch = userStr.match(/^<@!?(\d+)>$/);
                if (mentionMatch) {
                    targetId = mentionMatch[1];
                } else if (/^\d+$/.test(userStr)) {
                    targetId = userStr;
                } else {
                    return interaction.reply({ content: 'Please provide a valid user mention or ID.', flags: [MessageFlags.Ephemeral] });
                }

                const userData = await require('../models/economy').getEconomyProfile(targetId);
                const amountToTake = Math.min(amount, userData.gold);

                try {
                    await require('../models/economy').updateGold(targetId, -amountToTake);
                    const embed = new EmbedBuilder()
                        .setTitle('💰 Gold Taken 💰')
                        .setDescription(`Successfully took **${amountToTake.toLocaleString()} gold** from **<@${targetId}>**.`)
                        .setColor('#FF0000')
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                } catch (error) {
                    console.error('Error taking gold:', error);
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('An error occurred while taking gold. Please try again later.');
                    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }
            }

            if (interaction.customId === 'embers_rob_modal') {
                await safeDeferReply(interaction);
                const targetStr = interaction.fields.getTextInputValue('target');
                const userId = interaction.user.id;

                let targetId;
                const mentionMatch = targetStr.match(/^<@!?(\d+)>$/);
                if (mentionMatch) {
                    targetId = mentionMatch[1];
                } else if (/^\d+$/.test(targetStr)) {
                    targetId = targetStr;
                } else {
                    return interaction.editReply({ content: 'Please provide a valid user mention or ID.' });
                }

                const target = await interaction.guild.members.fetch(targetId).catch(() => null);
                if (!target) {
                    return interaction.editReply({ content: 'User not found in this server.' });
                }

                const mockMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    guild: interaction.guild,
                    reply: async (content) => {
                        let responseMessage;
                        if (typeof content === 'string') {
                            responseMessage = await interaction.editReply({ content });
                        } else {
                            responseMessage = await interaction.editReply(content);
                        }
                        embersMessages.set(userId, responseMessage);
                        return responseMessage;
                    },
                    channel: { sendTyping: async () => {} }
                };

                const args = [targetStr];
                const command = require('../excesscommands/economy/rob.js');
                await command.execute(mockMessage, args);
            }

            if (interaction.customId === 'embers_slots_modal') {
                await safeDeferReply(interaction);
                const betStr = interaction.fields.getTextInputValue('bet');
                const bet = parseInt(betStr);
                const userId = interaction.user.id;

                if (isNaN(bet) || bet <= 0) {
                    return interaction.editReply({ content: 'Please provide a valid bet amount.' });
                }

                const mockMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    guild: interaction.guild,
                    reply: async (content) => {
                        let responseMessage;
                        if (typeof content === 'string') {
                            responseMessage = await interaction.editReply({ content });
                        } else {
                            responseMessage = await interaction.editReply(content);
                        }
                        embersMessages.set(userId, responseMessage);
                        return responseMessage;
                    },
                    channel: { sendTyping: async () => {} }
                };

                const args = [betStr];
                const command = require('../excesscommands/economy/slots.js');
                await command.execute(mockMessage, args);
            }

            if (interaction.customId === 'embers_gamble_modal') {
                await safeDeferReply(interaction);
                const amountStr = interaction.fields.getTextInputValue('amount');
                const userId = interaction.user.id;

                const mockMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    guild: interaction.guild,
                    reply: async (content) => {
                        let responseMessage;
                        if (typeof content === 'string') {
                            responseMessage = await interaction.editReply({ content });
                        } else {
                            responseMessage = await interaction.editReply(content);
                        }
                        embersMessages.set(userId, responseMessage);
                        return responseMessage;
                    },
                    channel: { sendTyping: async () => {} }
                };

                const args = [amountStr];
                const command = require('../excesscommands/economy/gamble.js');
                await command.execute(mockMessage, args);
            }

            if (interaction.customId === 'embers_roulette_modal') {
                await safeDeferReply(interaction);
                const betStr = interaction.fields.getTextInputValue('bet');
                const color = interaction.fields.getTextInputValue('color').toLowerCase();
                const bet = parseInt(betStr);
                const userId = interaction.user.id;

                if (isNaN(bet) || bet <= 0) {
                    return interaction.editReply({ content: 'Please provide a valid bet amount.' });
                }

                if (color !== 'red' && color !== 'black') {
                    return interaction.editReply({ content: 'Please choose either "red" or "black".' });
                }

                const mockMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    guild: interaction.guild,
                    reply: async (content) => {
                        let responseMessage;
                        if (typeof content === 'string') {
                            responseMessage = await interaction.editReply({ content });
                        } else {
                            responseMessage = await interaction.editReply(content);
                        }
                        embersMessages.set(userId, responseMessage);
                        return responseMessage;
                    },
                    channel: { sendTyping: async () => {} }
                };

                const args = [betStr, color];
                const command = require('../excesscommands/economy/roulette.js');
                await command.execute(mockMessage, args);
            }
        }
        // Handle Slash Commands
        else if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            const subcommandName = interaction.options.getSubcommand(false);

            const isDisabled = await DisabledCommand.findOne({
                guildId: interaction.guild.id,
                commandName: interaction.commandName,
                ...(subcommandName ? { subcommandName } : {})
            });

            if (isDisabled) {
                return interaction.reply({ content: `❌ This command is disabled in this server.`, flags: [MessageFlags.Ephemeral] });
            }

            try {
                // Check if this is a modal command
                const isModalCommand = interaction.commandName === 'setup-aichat' && subcommandName === 'edit-lore';

                if (!isModalCommand) {
                    // Only defer non-modal commands
                    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                }

                await command.execute(interaction, client);
            } catch (error) {
                console.error('Command execution error:', error);
                if (error.code === 'InteractionAlreadyReplied' || error.code === 10062) {
                    return; // Ignore already replied or expired errors
                }
                const errorMessage = { content: 'There was an error while executing this command!', flags: [MessageFlags.Ephemeral] };
                if (!interaction.deferred && !interaction.replied) {
                    try {
                        await interaction.reply(errorMessage);
                    } catch (e) {
                        if (e.code !== 10062) {
                            console.error('Error sending error message:', e);
                        }
                    }
                } else {
                    try {
                        await interaction.followUp(errorMessage);
                    } catch (e) {
                        if (e.code !== 10062) {
                            console.error('Error sending error message:', e);
                        }
                    }
                }
            }
        }
    },
};

// --- FIXED COMMAND LOADER ---
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).reduce((files, folder) => {
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
        const fileNames = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of fileNames) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            command.category = folder;

            // Load slash command
            if (command.data && command.data.name) {
                files.set(command.data.name, command);
            }
            // Load prefix command and its aliases
            else if (command.name) {
                files.set(command.name, command);
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => files.set(alias, command));
                }
            }
        }
    }
    return files;
}, new Map());

client.commands = commandFiles;
