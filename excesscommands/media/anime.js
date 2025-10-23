const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const GENRE_MAP = {
    'action': 1,
    'adventure': 2,
    'comedy': 4,
    'drama': 8,
    'fantasy': 10,
    'horror': 14,
    'romance': 22,
    'sci-fi': 24,
};

const sendAnimeEmbed = (message, anime, isSearch = false, footerText = '') => {
    const embed = new EmbedBuilder()
        .setTitle(anime.title)
        .setURL(anime.link)
        .setColor('#0099ff')
        .setDescription(anime.description || 'No description available.');

    if (anime.image) {
        const imageUrl = anime.image.replace(/(\?s=.*)|(r\/\d+x\d+)/, '');
        embed.setImage(imageUrl);
    }

    if (anime.score && anime.score !== 'N/A') embed.addFields({ name: 'Score', value: anime.score, inline: true });
    if (anime.type) embed.addFields({ name: 'Type', value: anime.type, inline: true });
    if (anime.episodes) embed.addFields({ name: 'Episodes', value: anime.episodes, inline: true });
    if (footerText) embed.setFooter({ text: footerText });

    return embed;
};

async function fetchAnimeDetails(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        return $('p[itemprop="description"]').text().trim() || $('span[itemprop="description"]').text().trim();
    } catch (error) {
        console.error(`Failed to fetch details from ${url}:`, error);
        return 'Could not fetch description.';
    }
}

async function getTopAnime() {
    const page = Math.floor(Math.random() * 5);
    const url = `https://myanimelist.net/topanime.php?limit=${page * 50}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const animeList = [];
        $('tr.ranking-list').each((i, elem) => {
            const title = $(elem).find('.title a').text().trim();
            if (!title) return;
            const link = $(elem).find('.title a').attr('href');
            const image = $(elem).find('img').attr('data-src');
            const score = $(elem).find('.score span').text().trim();
            const [type, episodes] = $(elem).find('.information').text().trim().split('\n')[0].split('(');
            
            animeList.push({ title, link, image, score, type: type.trim(), episodes: episodes ? episodes.replace(' eps)', '').trim() : 'N/A' });
        });
        return animeList;
    } catch (err) {
        console.error('Error in getTopAnime:', err);
        return [];
    }
}

async function getAnimeByGenre(genreId) {
    const url = `https://myanimelist.net/anime/genre/${genreId}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const animeList = [];
        $('.seasonal-anime.js-seasonal-anime').each((i, elem) => {
            const title = $(elem).find('.link-title').text().trim();
            if (!title) return;
            const link = $(elem).find('.link-title').attr('href');
            const image = $(elem).find('img').attr('src') || $(elem).find('img').attr('data-src');
            const description = $(elem).find('.synopsis .preline').text().trim();
            const score = $(elem).find('.score').text().trim().replace('N/A', '').trim() || 'N/A';
            const [type, episodes] = $(elem).find('.info').text().trim().split(', ');
            animeList.push({ title, link, image, description, score, type: type ? type.trim() : 'N/A', episodes: episodes ? episodes.replace('eps', '').trim() : 'N/A' });
        });
        return animeList;
    } catch (err) {
        console.error('Error in getAnimeByGenre:', err);
        return [];
    }
}

async function searchAnime(query) {
    const url = `https://myanimelist.net/anime.php?q=${encodeURIComponent(query)}&cat=anime`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const results = [];
        $('table tr').slice(1).each((i, elem) => {
            const tds = $(elem).find('td');
            const title = $(tds[1]).find('a strong').text().trim();
            if (!title) return;
            const link = $(tds[1]).find('a').attr('href');
            const image = $(tds[0]).find('img').attr('data-src');
            const description = $(tds[1]).find('div.pt4').text().trim();
            const type = $(tds[2]).text().trim();
            const episodes = $(tds[3]).text().trim();
            const score = $(tds[4]).text().trim();
            results.push({ title, link, image, description, type, episodes, score });
        });
        return results;
    } catch (err) {
        console.error("Error in searchAnime:", err);
        return [];
    }
}

module.exports = {
    name: 'anime',
    description: 'Search for anime, or get recommendations by genre or at random.',
    async execute(message, args) {
        let subCommand = 'search'; // Default to search
        if (args.length === 0 || ['random', 'genre'].includes(args[0].toLowerCase())) {
            subCommand = args.length > 0 ? args.shift().toLowerCase() : 'random';
        }

        if (subCommand === 'search') {
            const name = args.join(' ');
            if (!name) return message.reply('Please provide an anime name to search for.');
            const results = await searchAnime(name);
            if (!results || results.length === 0) return message.reply('No anime found with that name.');

            let currentPage = 0;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev_anime').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('next_anime').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(results.length <= 1)
            );

            const sentMessage = await message.channel.send({ 
                embeds: [sendAnimeEmbed(message, results[currentPage], true, `Result ${currentPage + 1} of ${results.length}`)], 
                components: [row] 
            });
            const collector = sentMessage.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) return i.reply({ content: 'You cannot use these buttons.', ephemeral: true });
                if (i.customId === 'next_anime') currentPage++;
                else if (i.customId === 'prev_anime') currentPage--;
                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === results.length - 1);
                await i.update({ embeds: [sendAnimeEmbed(message, results[currentPage], true, `Result ${currentPage + 1} of ${results.length}`)], components: [row] });
            });
            collector.on('end', () => sentMessage.edit({ components: [] }));

        } else if (subCommand === 'random') {
            const animeList = await getTopAnime();
            if (animeList.length === 0) return message.reply('Failed to fetch random anime.');
            const randomAnime = animeList[Math.floor(Math.random() * animeList.length)];
            randomAnime.description = await fetchAnimeDetails(randomAnime.link);
            message.channel.send({ embeds: [sendAnimeEmbed(message, randomAnime)] });

        } else if (subCommand === 'genre') {
            const genreName = args.join(' ').toLowerCase();
            const genreId = GENRE_MAP[genreName];
            if (!genreId) return message.reply('Invalid genre. Available: ' + Object.keys(GENRE_MAP).join(', '));

            const animeList = await getAnimeByGenre(genreId);
            if (animeList.length === 0) return message.reply(`No anime found for the genre '${genreName}'.`);
            const randomAnime = animeList[Math.floor(Math.random() * animeList.length)];
            if (randomAnime.link && !randomAnime.description) {
                 randomAnime.description = await fetchAnimeDetails(randomAnime.link);
            }
            message.channel.send({ embeds: [sendAnimeEmbed(message, randomAnime)] });
        }
    },
};