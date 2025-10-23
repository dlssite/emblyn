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

const sendMangaEmbed = (message, manga, isSearch = false, footerText = '') => {
    const embed = new EmbedBuilder()
        .setTitle(manga.title)
        .setURL(manga.link)
        .setColor('#0099ff')
        .setDescription(manga.description || 'No description available.');

    if (manga.image) {
        const imageUrl = manga.image.replace(/(\?s=.*)|(r\/\d+x\d+)/, '');
        embed.setImage(imageUrl);
    }

    if (manga.score && manga.score !== 'N/A') embed.addFields({ name: 'Score', value: manga.score, inline: true });
    if (manga.type) embed.addFields({ name: 'Type', value: manga.type, inline: true });
    if (manga.volumes) embed.addFields({ name: 'Volumes', value: manga.volumes, inline: true });
    if (footerText) embed.setFooter({ text: footerText });

    return embed;
};

async function fetchMangaDetails(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        return $('span[itemprop="description"]').text().trim();
    } catch (error) {
        console.error(`Failed to fetch details from ${url}:`, error);
        return 'Could not fetch description.';
    }
}

async function getTopManga() {
    const page = Math.floor(Math.random() * 5);
    const url = `https://myanimelist.net/topmanga.php?limit=${page * 50}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const mangaList = [];
        $('tr.ranking-list').each((i, elem) => {
            const title = $(elem).find('.title a').text().trim();
            if (!title) return;
            const link = $(elem).find('.title a').attr('href');
            const image = $(elem).find('img').attr('data-src');
            const score = $(elem).find('.score span').text().trim();
            const [type, volumes] = $(elem).find('.information').text().trim().split('\n')[0].split('(');
            
            mangaList.push({ title, link, image, score, type: type.trim(), volumes: volumes ? volumes.replace(/vols?\.?/i, '').trim() : 'N/A' });
        });
        return mangaList;
    } catch (err) {
        console.error('Error in getTopManga:', err);
        return [];
    }
}

async function getMangaByGenre(genreId) {
    const url = `https://myanimelist.net/manga/genre/${genreId}`;
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const mangaList = [];
        $('.seasonal-anime.js-seasonal-anime').each((i, elem) => {
            const title = $(elem).find('.link-title').text().trim();
            if (!title) return;
            const link = $(elem).find('.link-title').attr('href');
            const image = $(elem).find('img').attr('src') || $(elem).find('img').attr('data-src');
            const description = $(elem).find('.synopsis .preline').text().trim();
            const score = $(elem).find('.score').text().trim().replace('N/A', '').trim() || 'N/A';
            const [type, volumes] = $(elem).find('.info').text().trim().split(', ');
            mangaList.push({ title, link, image, description, score, type: type ? type.trim() : 'N/A', volumes: volumes ? volumes.replace(/Vols?\.?/i, '').trim() : 'N/A' });
        });
        return mangaList;
    } catch (err) {
        console.error('Error in getMangaByGenre:', err);
        return [];
    }
}

async function searchManga(query) {
    const url = `https://myanimelist.net/manga.php?q=${encodeURIComponent(query)}&cat=manga`;
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
            const volumes = $(tds[3]).text().trim();
            const score = $(tds[4]).text().trim();
            results.push({ title, link, image, description, type, volumes, score });
        });
        return results;
    } catch (err) {
        console.error("Error in searchManga:", err);
        return [];
    }
}

module.exports = {
    name: 'manga',
    description: 'Search for manga, or get recommendations by genre or at random.',
    async execute(message, args) {
        let subCommand = 'search'; // Default to search
        if (args.length === 0 || ['random', 'genre'].includes(args[0].toLowerCase())) {
            subCommand = args.length > 0 ? args.shift().toLowerCase() : 'random';
        }

        if (subCommand === 'search') {
            const name = args.join(' ');
            if (!name) return message.reply('Please provide a manga name to search for.');
            const results = await searchManga(name);
            if (!results || results.length === 0) return message.reply('No manga found with that name.');

            let currentPage = 0;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev_manga').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('next_manga').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(results.length <= 1)
            );

            const sentMessage = await message.channel.send({ 
                embeds: [sendMangaEmbed(message, results[currentPage], true, `Result ${currentPage + 1} of ${results.length}`)], 
                components: [row] 
            });
            const collector = sentMessage.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) return i.reply({ content: 'You cannot use these buttons.', ephemeral: true });
                if (i.customId === 'next_manga') currentPage++;
                else if (i.customId === 'prev_manga') currentPage--;
                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === results.length - 1);
                await i.update({ embeds: [sendMangaEmbed(message, results[currentPage], true, `Result ${currentPage + 1} of ${results.length}`)], components: [row] });
            });
            collector.on('end', () => sentMessage.edit({ components: [] }));

        } else if (subCommand === 'random') {
            const mangaList = await getTopManga();
            if (mangaList.length === 0) return message.reply('Failed to fetch random manga.');
            const randomManga = mangaList[Math.floor(Math.random() * mangaList.length)];
            randomManga.description = await fetchMangaDetails(randomManga.link);
            message.channel.send({ embeds: [sendMangaEmbed(message, randomManga)] });

        } else if (subCommand === 'genre') {
            const genreName = args.join(' ').toLowerCase();
            const genreId = GENRE_MAP[genreName];
            if (!genreId) return message.reply('Invalid genre. Available: ' + Object.keys(GENRE_MAP).join(', '));

            const mangaList = await getMangaByGenre(genreId);
            if (mangaList.length === 0) return message.reply(`No manga found for the genre '${genreName}'.`);
            const randomManga = mangaList[Math.floor(Math.random() * mangaList.length)];
            if (randomManga.link && !randomManga.description) {
                 randomManga.description = await fetchMangaDetails(randomManga.link);
            }
            message.channel.send({ embeds: [sendMangaEmbed(message, randomManga)] });
        }
    },
};