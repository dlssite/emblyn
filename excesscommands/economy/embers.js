const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    name: 'embers',
    description: 'Display a menu to select and run economy commands.',
    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setTitle('Economy Commands')
            .setDescription('Select an economy command from the dropdown to run it instantly!')
            .setImage('attachment://EcoKingdom.png')
            .setColor('#FFD700')
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const options = [
            { label: 'Daily Reward', description: 'Claim your daily embers', value: 'embers_daily', emoji: '📅' },
            { label: 'Weekly Reward', description: 'Claim your weekly embers', value: 'embers_weekly', emoji: '📆' },
            { label: 'Hunt', description: 'Go hunting for embers and items', value: 'embers_hunt', emoji: '🏹' },
            { label: 'Fish', description: 'Go fishing for embers and items', value: 'embers_fish', emoji: '🎣' },
            { label: 'Work', description: 'Work a job for embers and XP', value: 'embers_work', emoji: '💼' },
            { label: 'Beg', description: 'Beg for some embers', value: 'embers_beg', emoji: '🙏' },
            { label: 'Crime', description: 'Commit a crime for embers (risky)', value: 'embers_crime', emoji: '🕵️' },
            { label: 'Rob', description: 'Attempt to rob someone', value: 'embers_rob', emoji: '🕵️' },
            { label: 'Gamble', description: 'Gamble your embers', value: 'embers_gamble', emoji: '🎰' },
            { label: 'Slots', description: 'Play the slot machine', value: 'embers_slots', emoji: '🎰' },
            { label: 'Roulette', description: 'Play roulette', value: 'embers_roulette', emoji: '🎡' },
        ];

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('embers_select')
            .setPlaceholder('Choose an economy command')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const imagePath = path.join(__dirname, '../../UI/economyimages/EcoKingdom.png');

        await message.reply({ embeds: [embed], components: [row], files: [{ attachment: imagePath, name: 'EcoKingdom.png' }] });
    },
};
