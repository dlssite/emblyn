const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Pet } = require('../../models/pets/pets');

module.exports = {
    name: 'trade',
    description: 'Trade a pet with another user.',
    async execute(message, args) {
        const [targetUserMention, ...petNameArray] = args;
        const petName = petNameArray.join(' ');
        const targetUser = message.mentions.users.first();

        if (!targetUser) {
            return message.reply('Please mention the user you want to trade with.');
        }

        if (targetUser.id === message.author.id) {
            return message.reply("You can't trade with yourself!");
        }

        if (!petName) {
            return message.reply('Please specify the pet you want to trade.');
        }

        const petToTrade = await Pet.findOne({ ownerId: message.author.id, name: { $regex: new RegExp(`^${petName}$`, 'i') } });

        if (!petToTrade) {
            return message.reply(`You don't own a pet named "${petName}".`);
        }

        const embed = new EmbedBuilder()
            .setTitle('Pet Trade Offer')
            .setDescription(`${message.author.username} wants to trade their pet, **${petToTrade.name}**, with you.`)
            .setThumbnail(petToTrade.image)
            .setColor('#FFD700');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept_trade').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('decline_trade').setLabel('Decline').setStyle(ButtonStyle.Danger)
        );

        const tradeMessage = await message.channel.send({ content: `${targetUser}`, embeds: [embed], components: [row] });

        const collector = tradeMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== targetUser.id) {
                return interaction.reply({ content: "This isn't for you!", ephemeral: true });
            }

            if (interaction.customId === 'accept_trade') {
                const targetPets = await Pet.find({ ownerId: targetUser.id });
                if (targetPets.length >= 10) {
                    return interaction.update({ content: 'The other user has reached the maximum number of pets.', embeds: [], components: [] });
                }

                petToTrade.ownerId = targetUser.id;
                await petToTrade.save();

                await interaction.update({ content: `Trade successful! **${petToTrade.name}** now belongs to ${targetUser.username}.`, embeds: [], components: [] });
            } else if (interaction.customId === 'decline_trade') {
                await interaction.update({ content: 'Trade declined.', embeds: [], components: [] });
            }
        });

        collector.on('end', () => {
            tradeMessage.edit({ content: 'Trade offer expired.', embeds: [], components: [] }).catch(console.error);
        });
    },
};