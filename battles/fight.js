
const { EmbedBuilder } = require('discord.js');

async function startBattle(thread, boss, participants, interaction) {
    const participantPets = [];
    for (const userId of participants) {
        const pets = await Pet.find({ ownerId: userId, hp: { $gt: 0 } });
        participantPets.push(...pets.map(pet => ({ ...pet.toObject(), ownerId: userId })));
    }

    if (participantPets.length === 0) {
        thread.send('None of the participants have any conscious pets to fight the boss!');
        return;
    }

    let battleLog = '';
    const battleEmbed = new EmbedBuilder()
        .setTitle(`Battle against ${boss.name}`)
        .setDescription('The fight begins!')
        .setColor('#ff0000');

    const battleMessage = await thread.send({ embeds: [battleEmbed] });

    while (boss.bossHp > 0 && participantPets.some(pet => pet.hp > 0)) {
        let turnLog = '';

        // Pets' turn
        for (const pet of participantPets) {
            if (pet.hp > 0) {
                const damage = Math.max(1, pet.attack - boss.defense || 5);
                boss.bossHp -= damage;
                turnLog += `${pet.name} attacks ${boss.name} for ${damage} damage!\n`;
            }
        }

        // Boss's turn
        if (boss.bossHp > 0) {
            const randomPet = participantPets[Math.floor(Math.random() * participantPets.length)];
            if (randomPet.hp > 0) {
                const damage = Math.max(1, boss.attack - randomPet.defense || 5);
                randomPet.hp -= damage;
                turnLog += `${boss.name} attacks ${randomPet.name} for ${damage} damage!\n`;
            }
        }

        battleLog += turnLog + '\n';
        const updatedEmbed = new EmbedBuilder()
            .setTitle(`Battle against ${boss.name}`)
            .setDescription(battleLog)
            .setColor('#ff0000')
            .addFields(
                { name: 'Boss HP', value: `${boss.bossHp > 0 ? boss.bossHp : 0}` },
                { name: 'Pets HP', value: participantPets.map(p => `${p.name}: ${p.hp > 0 ? p.hp : 0}`).join('\n') }
            );
        await battleMessage.edit({ embeds: [updatedEmbed] });

        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const goldReward = 100 / participants.length;
    const xpReward = 100 / participants.length;

    if (boss.bossHp <= 0) {
        for (const userId of participants) {
            await updateGold(userId, goldReward);
            const userPets = await Pet.find({ ownerId: userId });
            for (const pet of userPets) {
                pet.xp += xpReward;
                await pet.save();
            }
        }

        const victoryEmbed = new EmbedBuilder()
            .setTitle(`Victory against ${boss.name}!`)
            .setDescription(`The boss has been defeated! Everyone who participated has earned ${goldReward.toFixed(2)} gold and their pets have earned ${xpReward.toFixed(2)} XP.`)
            .setColor('#00ff00');
        await thread.send({ embeds: [victoryEmbed] });
        interaction.channel.send(`The boss has been defeated! The battle thread has been archived.`);

    } else {
        const defeatEmbed = new EmbedBuilder()
            .setTitle(`Defeat against ${boss.name}!`)
            .setDescription('All pets have been defeated. The boss has won.')
            .setColor('#ff0000');
        await thread.send({ embeds: [defeatEmbed] });
        interaction.channel.send(`The boss has won! The battle thread has been archived.`);
    }

    await thread.setArchived(true);
}

module.exports = { startBattle };
