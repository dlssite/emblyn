const { EmbedBuilder } = require('discord.js');
const { Event } = require('../../models/pets/events');

module.exports = {
    name: 'event',
    description: 'View the current world boss event.',
    async execute(message) {
        const event = await Event.findOne({ type: 'boss', endAt: { $gt: new Date() } });

        if (!event) {
            return message.reply('There is no active boss event right now.');
        }

        const now = Math.floor(Date.now() / 1000);
        const endsIn = `<t:${Math.floor(event.endAt.getTime() / 1000)}:R>`;

        const embed = new EmbedBuilder()
            .setTitle(`Boss Event: ${event.name}`)
            .setDescription(`A fearsome boss has appeared! Join the fight before it disappears.`)
            .setThumbnail(event.image || null)
            .addFields(
                { name: 'Current HP', value: `${event.bossHp}/${event.maxHp}`, inline: true },
                { name: 'Ends In', value: endsIn, inline: true },
            )
            .setColor('#8B0000')
            .setFooter({ text: 'Use `$pet boss` to join the fight!' });

        message.reply({ embeds: [embed] });
    },
};