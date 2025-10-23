const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Pet } = require('../../models/pets/pets');
const { GuildSettings } = require('../../models/guild/GuildSettings');
const { activeBattles } = require('./battleState');
const { resolveAttack } = require('../../utils/battleUtils');

// Embedded rarityColors object
const rarityColors = {
    common: '#BFC9CA',
    rare: '#5DADE2',
    epic: '#AF7AC5',
    legendary: '#F4D03F',
    mythic: '#E74C3C',
    exclusive: '#F39C12'
};

// Function to apply status effects at the start of a turn
const applyStatusEffects = (pet) => {
    const messages = [];
    let damageFromEffects = 0;

    if (!Array.isArray(pet.statusEffects)) {
        pet.statusEffects = [];
    }

    pet.statusEffects = pet.statusEffects.filter(effect => {
        if (effect.type === 'poison') {
            const poisonDamage = Math.round(pet.stats.maxHealth * 0.05); // 5% of max health
            damageFromEffects += poisonDamage;
            messages.push(`${pet.name} takes ${poisonDamage} damage from poison.`);
        }
        
        effect.turns -= 1;
        return effect.turns > 0;
    });

    return { damageFromEffects, messages };
};

async function executeMove(source, battle, moveName) {
    const isInteraction = source.isMessageComponent && typeof source.isMessageComponent === 'function';
    const userId = source.user?.id || source.author.id;
    const player = battle.participants.get(userId);
    const opponentId = [...battle.participants.keys()].find(id => id !== userId);
    const opponent = battle.participants.get(opponentId);

    // Apply status effects to the current player
    const { damageFromEffects, messages: effectMessages } = applyStatusEffects(player.pet);
    player.pet.stats.hp -= damageFromEffects;

    if (effectMessages.length > 0) {
        await source.channel.send(effectMessages.join('\n'));
    }
    
    if (player.pet.stats.hp <= 0) {
      // Handle player defeat due to status effects
      // (This logic will be similar to the end-of-battle logic)
      return; 
    }

    const ability =
        [...(player.pet.abilities || []), ...(player.pet.specialAbilities || [])]
            .find(a => a.name.toLowerCase() === moveName.toLowerCase() && ['attack', 'active'].includes(a.type));

    if (!ability) {
        const replyContent = `'${moveName}' is not a valid battle move.`;
        return isInteraction ? source.reply({ content: replyContent, ephemeral: true }) : source.reply(replyContent);
    }
    
    const { newDefenderHealth, message: attackMessage } = resolveAttack(player.pet, opponent.pet, ability);
    opponent.pet.stats.hp = newDefenderHealth > 0 ? newDefenderHealth : 0;

    const embed = new EmbedBuilder()
        .setColor(rarityColors[player.pet.rarity.toLowerCase()] || '#888888')
        .setTitle('Battle Turn')
        .setDescription(attackMessage)
        .addFields(
            { name: `${player.pet.name} (HP: ${player.pet.stats.hp})`, value: 'Your Turn', inline: true },
            { name: `${opponent.pet.name} (HP: ${opponent.pet.stats.hp})`, value: 'Opponent', inline: true }
        );

    if (isInteraction) {
        await source.update({ embeds: [embed], components: [] });
    } else {
        await source.channel.send({ embeds: [embed] });
    }

    if (opponent.pet.stats.hp <= 0) {
        const winnerDoc = await Pet.findById(player.originalPetId);
        const loserDoc = await Pet.findById(opponent.originalPetId);

        winnerDoc.battleRecord.wins += 1;
        loserDoc.battleRecord.losses += 1;
        loserDoc.isDead = true;

        await winnerDoc.save();
        await loserDoc.save();

        activeBattles.delete(battle.id);

        const winEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 Battle Over! 🎉')
            .setDescription(`**${winnerDoc.name}** is victorious! ${loserDoc.name} has been defeated.`);
        return source.channel.send({ embeds: [winEmbed] });
    }

    battle.turn = opponentId;
    source.channel.send(`It is now ${opponent.user.username}'s turn!`);
}

module.exports = {
    name: 'move',
    description: 'Makes a move in an ongoing battle.',
    async execute(message, args) {
        const userId = message.author.id;
        const battle = [...activeBattles.values()].find(b => b.participants.has(userId));

        if (!battle) {
            return message.reply('You are not currently in a battle.');
        }

        const guildSettings = await GuildSettings.findOne({ guildId: message.guild.id });
        const battleChannelId = guildSettings ? guildSettings.battleChannelId : null;

        if (battleChannelId && message.channel.id !== battleChannelId) {
            return message.reply(`Battles can only take place in <#${battleChannelId}>.`);
        }

        if (battle.turn !== userId) {
            return message.reply('It is not your turn!');
        }
        
        const moveName = args.join(' ').trim();
        const player = battle.participants.get(userId);

        if (moveName) {
            return executeMove(message, battle, moveName);
        } else {
            const playerPet = player.pet;
            const abilities = [...(playerPet.abilities || []), ...(playerPet.specialAbilities || [])]
                .filter(a => ['attack', 'active'].includes(a.type));

            if (abilities.length === 0) {
                return message.reply('Your pet has no available moves.');
            }

            const options = abilities.map(ability => ({
                label: ability.name,
                description: `Type: ${ability.type}, Power: ${ability.effect?.damage || 'N/A'}`,
                value: ability.name,
            }));

            const selectRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('move_select')
                    .setPlaceholder('Select a move...')
                    .addOptions(options)
            );

            const forfeitButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('forfeit_battle')
                    .setLabel('Forfeit')
                    .setStyle(ButtonStyle.Danger)
            );

            const selectMessage = await message.reply({ 
                content: 'Please select a move for your turn or forfeit:', 
                components: [selectRow, forfeitButton] 
            });

            const collector = selectMessage.createMessageComponentCollector({
                filter: i => i.user.id === userId && (i.customId === 'move_select' || i.customId === 'forfeit_battle'),
                time: 60000,
            });

            collector.on('collect', async i => {
                if (i.isStringSelectMenu()) {
                    const selectedMoveName = i.values[0];
                    await executeMove(i, battle, selectedMoveName);
                } else if (i.isButton() && i.customId === 'forfeit_battle') {
                    const loserId = i.user.id;
                    const winnerId = [...battle.participants.keys()].find(id => id !== loserId);
                    
                    const winnerParticipant = battle.participants.get(winnerId);
                    const loserParticipant = battle.participants.get(loserId);

                    const winnerDoc = await Pet.findById(winnerParticipant.originalPetId);
                    const loserDoc = await Pet.findById(loserParticipant.originalPetId);

                    winnerDoc.battleRecord.wins += 1;
                    loserDoc.battleRecord.losses += 1;
                    loserDoc.isDead = true;

                    await winnerDoc.save();
                    await loserDoc.save();

                    activeBattles.delete(battle.id);

                    const forfeitEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🏳️ Battle Over! 🏳️')
                        .setDescription(`**${loserParticipant.user.username}** has forfeited the battle! **${winnerParticipant.user.username}** is victorious!`);
                    
                    await i.update({ embeds: [forfeitEmbed], components: [] });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    selectMessage.edit({ content: 'Move selection timed out.', components: [] });
                }
            });
        }
    },
};