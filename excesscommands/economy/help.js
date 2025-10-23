const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    name: 'help',
    description: 'Displays a list of all available economy commands.',
    execute(message) {
        const imagePath = path.join(__dirname, '../../UI/economyimages/EcoKingdom.png');
        const attachment = new AttachmentBuilder(imagePath, { name: 'EcoKingdom.png' });

        const embed = new EmbedBuilder()
            .setTitle('💰 Economy Command Help')
            .setDescription('**🚀 Quick Start:** Use the `$embers` command for an interactive menu to run economy commands instantly!\n\nHere is a summarized list of available economy commands. Use `$economy <command>` to run them.')
            .addFields(
                { name: '💰 Earning', value: '• `$beg`, `$crime`, `$daily`, `$fish`, `$heist`, `$hunt`, `$loot`, `$rob`, `$weekly`, `$work`' },
                { name: '💸 Finances', value: '• `$bank`, `$deposit`, `$invest`, `$loan`, `$paybills`, `$transfer`, `$withdraw`' },
                { name: '🛍️ Shop & Items', value: '• `$buy`, `$buy-gold`, `$inventory`, `$sell`, `$shop`, `$use`' },
                { name: '🎲 Gambling', value: '• `$gamble`, `$roulette`, `$slots`' },
                { name: '🏆 Social', value: '• `$leaderboard`, `$myhome`, `$profile`, `$trade`' }
            )
            .setImage('attachment://EcoKingdom.png')
            .setColor('#E67E22');

        message.reply({ embeds: [embed], files: [attachment] });
    },
};
