const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const rarityColors = require('../../utils/rarityColors');

module.exports = {
    name: 'list',
    description: 'Displays a visual list of all your pets.',
    aliases: ['l'],
    async execute(message, args) {
        const userId = message.author.id;
        const userPets = await Pet.find({ ownerId: userId }).sort({ name: 1 }); // Sort pets by name

        if (userPets.length === 0) {
            return message.reply('You do not have any pets yet. Use `$pet shop` to see available pets!');
        }

        const totalPages = userPets.length; // One pet per page
        let page = 0;

        const generateEmbed = (pageIndex) => {
            const currentPet = userPets[pageIndex];

            const rarityColor = rarityColors[currentPet.rarity.toLowerCase()] || '#FFFFFF';

            const embed = new EmbedBuilder()
                .setTitle(`🐾 ${currentPet.name} 🐾`)
                .setColor(rarityColor)
                .setImage(currentPet.image)
                .addFields(
                    { name: 'Species', value: currentPet.species, inline: true },
                    { name: 'Rarity', value: currentPet.rarity, inline: true },
                    { name: 'Level', value: `${currentPet.level}`, inline: true },
                    { name: 'HP', value: `${currentPet.stats.hp}/${currentPet.stats.maxHealth}`, inline: true },
                    { name: 'Attack', value: `${currentPet.stats.attack}`, inline: true },
                    { name: 'Status', value: currentPet.isDead ? 'Defeated' : 'Ready', inline: true }
                )
                .setFooter({ text: `Pet ${pageIndex + 1} of ${totalPages}` });

            return embed;
        };

        // Disable buttons if there's only one pet
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev_page').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('next_page').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(totalPages <= 1)
        );

        const reply = await message.reply({ embeds: [generateEmbed(page)], components: [row] });

        if (totalPages <= 1) return; // No need for a collector if only one page

        const filter = i => i.user.id === message.author.id;
        const collector = reply.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'prev_page') {
                page--;
            } else if (i.customId === 'next_page') {
                page++;
            }

            // Update button states
            row.components[0].setDisabled(page === 0);
            row.components[1].setDisabled(page === totalPages - 1);

            await i.update({ embeds: [generateEmbed(page)], components: [row] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                row.components[0].setDisabled(true),
                row.components[1].setDisabled(true)
            );
            reply.edit({ components: [disabledRow] });
        });
    }
};