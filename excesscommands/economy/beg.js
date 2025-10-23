const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateEconomyProfile } = require('../../models/economy');
const { checkCooldown, setCooldown } = require('../../utils/cooldownManager');

module.exports = {
    name: 'beg',
    description: 'Beg for some money.',
    async execute(message) {
        const userId = message.author.id;
        const commandName = 'beg';
        const cooldown = 10 * 60 * 1000;

        const remaining = await checkCooldown(userId, commandName, cooldown);
        if (remaining > 0) {
            const remainingMinutes = Math.ceil(remaining / (60 * 1000));
            const embed = new EmbedBuilder()
                .setTitle('Begging Cooldown')
                .setDescription(`You have recently begged. Try again in ${remainingMinutes} minute(s).`)
                .setColor('#FF0000')
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();
                
            return message.reply({ embeds: [embed] });
        }

        const profile = await getEconomyProfile(userId);

        const earnings = Math.floor(Math.random() * (50 - 10 + 1)) + 10;

        await updateEconomyProfile(userId, { 
            wallet: profile.wallet + earnings, 
        });
        await setCooldown(userId, commandName);

        const embed = new EmbedBuilder()
            .setTitle('Begging Successful')
            .setDescription(`You begged and received ${earnings} embers!`)
            .setColor('#00FF00')
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },
};