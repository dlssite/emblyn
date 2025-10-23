const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'ad-ecom',
    description: 'Admin economy management command with buttons for seamless actions.',
    async execute(message) {
        await message.channel.sendTyping();
        // Check for admin permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('❌ You do not have permission to use this command.');
            return message.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('Admin Economy Management')
            .setDescription('Select an action to manage user balances.')
            .setColor('#FF00FF')
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ad_ecom_give_money')
                .setLabel('Give Embers')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ad_ecom_take_money')
                .setLabel('Take Embers')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ad_ecom_give_gold')
                .setLabel('Give Gold')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ad_ecom_take_gold')
                .setLabel('Take Gold')
                .setStyle(ButtonStyle.Secondary)
        );

        message.reply({ embeds: [embed], components: [row] });
    },
};
