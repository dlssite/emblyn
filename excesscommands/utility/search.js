const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    name: 'search',
    description: 'Search the web with DuckDuckGo and get a preview of the top results.',
    async execute(message, args) {
        const query = args.join(' ');
        if (!query) {
            return message.reply('Please provide a search query.');
        }

        try {
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const { data } = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(data);
            const results = [];
            $('div.result').each((i, elem) => {
                const title = $(elem).find('h2.result__title a').text().trim();
                const rawLink = $(elem).find('h2.result__title a').attr('href');
                const snippet = $(elem).find('a.result__snippet').text().trim();

                if (title && rawLink && snippet) {
                    let finalLink = rawLink;
                    if (rawLink.startsWith('/l/')) {
                        const urlParams = new URLSearchParams(rawLink.substring(rawLink.indexOf('?')));
                        finalLink = urlParams.get('uddg');
                    }
                    
                    if (finalLink && finalLink.startsWith('http')) {
                        results.push({ title, link: finalLink, snippet });
                    }
                }
            });

            if (results.length === 0) {
                return message.reply('No results found for your query.');
            }

            const resultsPerPage = 3;
            const numPages = Math.ceil(results.length / resultsPerPage);
            let currentPage = 0;

            const generateEmbed = (page) => {
                const start = page * resultsPerPage;
                const end = start + resultsPerPage;
                const currentResults = results.slice(start, end);

                const embed = new EmbedBuilder()
                    .setTitle(`Search Results for "${query}"`)
                    .setColor('#0099ff')
                    .setFooter({ text: `Page ${page + 1} of ${numPages} | Powered by DuckDuckGo` });

                const description = currentResults.map(res => {
                    // Escape markdown characters in the title.
                    const cleanTitle = res.title.replace(/([*_`~[\]()])/g, '\\$1');
                    // **The Fix:** Wrap the link in angle brackets to ensure Discord handles special characters (like parentheses) correctly.
                    return `**[${cleanTitle}](<${res.link}>)**\n${res.snippet}`;
                }).join('\n\n');

                embed.setDescription(description);
                return embed;
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev_search').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('next_search').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(numPages <= 1)
            );

            const sentMessage = await message.channel.send({ embeds: [generateEmbed(currentPage)], components: [row] });
            const collector = sentMessage.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) {
                    return i.reply({ content: 'You cannot use these buttons.', ephemeral: true });
                }
                if (i.customId === 'next_search') currentPage++;
                else if (i.customId === 'prev_search') currentPage--;
                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage >= numPages - 1);
                await i.update({ embeds: [generateEmbed(currentPage)], components: [row] });
            });
            collector.on('end', () => sentMessage.edit({ components: [] }));
        } catch (error) {
            console.error('Error fetching search results:', error);
            message.reply('Sorry, I was unable to fetch search results at this time.');
        }
    },
};