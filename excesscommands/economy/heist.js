const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEconomyProfile, updateWallet } = require('../../models/economy');

const heists = new Map();
const MIN_PARTICIPANTS = 4; // Must be 4 or more to start

module.exports = {
    name: 'heist',
    description: 'Start or join a bank heist.',
    async execute(message, args) {
        const subCommand = args[0] ? args[0].toLowerCase() : 'start';

        if (subCommand === 'start') {
            await startHeist(message);
        } else if (subCommand === 'join') {
            await joinHeist(message);
        } else {
            message.reply('Invalid subcommand. Use `heist start` or `heist join`.');
        }
    },
};

async function startHeist(message) {
    if (heists.has(message.channel.id)) {
        return message.reply('A heist is already in progress in this channel.');
    }

    const hostId = message.author.id;
    const heist = {
        host: hostId,
        participants: [hostId],
        startTime: Date.now(),
        channelId: message.channel.id,
    };
    heists.set(message.channel.id, heist);

    const embed = new EmbedBuilder()
        .setTitle('Bank Heist!')
        .setDescription(`A heist is starting! You need at least ${MIN_PARTICIPANTS} participants to start.\n\nClick the button to join.\n\n**Participants:**\n- ${message.author.username}`)
        .setColor('#FFA500');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('join_heist')
                .setLabel('Join Heist')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('start_heist_early')
                .setLabel('Start Heist Now')
                .setStyle(ButtonStyle.Success)
        );

    const heistMessage = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = heistMessage.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'join_heist') {
            await joinHeist(interaction, heistMessage);
        } else if (interaction.customId === 'start_heist_early') {
            if (interaction.user.id === heist.host) {
                const currentHeist = heists.get(interaction.channel.id);
                if (currentHeist && currentHeist.participants.length >= MIN_PARTICIPANTS) {
                    collector.stop('start_early');
                } else {
                    await interaction.reply({ content: `You need at least ${MIN_PARTICIPANTS} participants to start the heist.`, ephemeral: true });
                }
            } else {
                await interaction.reply({ content: 'Only the host can start the heist early.', ephemeral: true });
            }
        }
    });

    collector.on('end', (collected, reason) => {
        const currentHeist = heists.get(message.channel.id);
        if (currentHeist) {
            if (currentHeist.participants.length >= MIN_PARTICIPANTS) {
                runHeist(heistMessage, currentHeist);
            } else {
                heistMessage.edit({ embeds: [new EmbedBuilder().setTitle('Heist Cancelled').setDescription(`Not enough participants. A heist requires at least ${MIN_PARTICIPANTS} members.`).setColor('#FF0000')], components: [] });
            }
            heists.delete(message.channel.id);
        }
    });
}

async function joinHeist(interaction, heistMessage) {
    const heist = heists.get(interaction.channel.id);
    if (!heist) {
        return interaction.reply({ content: 'No heist to join.', ephemeral: true });
    }

    if (heist.participants.includes(interaction.user.id)) {
        return interaction.reply({ content: 'You have already joined the heist.', ephemeral: true });
    }

    heist.participants.push(interaction.user.id);
    heists.set(interaction.channel.id, heist);

    const participantNames = await Promise.all(heist.participants.map(async (id) => {
        const user = await interaction.client.users.fetch(id);
        return user.username;
    }));

    const embed = new EmbedBuilder()
        .setTitle('Bank Heist!')
        .setDescription(`A heist is starting! You need at least ${MIN_PARTICIPANTS} participants to start.\n\nClick the button to join.\n\n**Participants:**\n- ${participantNames.join('\n- ')}`)
        .setColor('#FFA500');

    await heistMessage.edit({ embeds: [embed] });
    await interaction.reply({ content: 'You have joined the heist!', ephemeral: true });
}

async function runHeist(heistMessage, heist) {
    const successChance = 0.5 + (heist.participants.length - 1) * 0.1;
    const isSuccess = Math.random() < successChance;

    let resultEmbed;
    if (isSuccess) {
        const totalStolen = Math.floor(Math.random() * 5000) + 1000 * heist.participants.length;
        const share = Math.floor(totalStolen / heist.participants.length);

        for (const userId of heist.participants) {
            await updateWallet(userId, share);
        }

        resultEmbed = new EmbedBuilder()
            .setTitle('Heist Successful!')
            .setDescription(`You and your crew successfully stole **${totalStolen} embers**! Each member gets **${share} embers**.`)
            .setColor('#00FF00');
    } else {
        let penalty = 0;
        for (const userId of heist.participants) {
            const profile = await getEconomyProfile(userId);
            const userPenalty = Math.floor(profile.wallet * 0.1);
            penalty += userPenalty;
            await updateWallet(userId, -userPenalty);
        }

        resultEmbed = new EmbedBuilder()
            .setTitle('Heist Failed!')
            .setDescription(`The heist failed! Your crew lost a total of **${penalty} embers**.`)
            .setColor('#FF0000');
    }

    await heistMessage.edit({ embeds: [resultEmbed], components: [] });
}
