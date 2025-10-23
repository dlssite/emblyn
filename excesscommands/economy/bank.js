const { getEconomyProfile } = require('../../models/economy');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'bank',
    description: 'Check your bank balance.',
    async execute(message) {
        await message.channel.sendTyping();
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        const wallet = Number(profile.wallet ?? 1);
        const bank = Number(profile.bank ?? 0);
        const gold = Number(profile.gold ?? 0);
        const bankLimit = profile.bankLimit || 50000;

        const attachment = new AttachmentBuilder('./UI/economyimages/EcoKingdom.png', { name: 'EcoKingdom.png' });

        const embed = new EmbedBuilder()
            .setTitle('Bank Balance')
            .setDescription(`**Wallet:** ${wallet} embers\n**Bank:** ${bank}/${bankLimit} embers\n**Gold:** ${gold}`)
            .setColor('#FF00FF')
            .setImage('attachment://EcoKingdom.png')
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
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
                .setStyle(ButtonStyle.Success)
        );

        message.reply({ embeds: [embed], components: [row], files: [attachment] });
    },
};
