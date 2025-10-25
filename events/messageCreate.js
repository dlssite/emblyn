
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const dotenv = require('dotenv');
const { serverConfigCollection, stickyMessageCollection, autoResponderCollection, countingCollection, serverLevelingLogsCollection } = require('../mongodb');
const configPath = path.join(__dirname, '..', 'config.json');
const lang = require('./loadLanguage');
const cmdIcons = require('../UI/icons/commandicons');
const afkHandler = require('./afkHandler');
const { updateXp, getUserData } = require('../models/users');
const { getUserCommands } = require('../models/customCommands');
const AiChat = require('../models/aichat/aiModel');

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o';
const CONVERSATION_HISTORY_LIMIT = 20;
const SUMMARY_THRESHOLD = 10;
const stickyTimers = new Map();

async function getSummary(conversation) {
    try {
        const payload = {
            model: OPENROUTER_MODEL,
            messages: [
                { role: 'user', content: `Concisely summarize the following conversation. Focus on the main topics, user questions, and key information provided. This summary will be used as context for an ongoing conversation.\n\n---\n\n${conversation.map(msg => msg.parts[0].text).join('\n')}` }
            ],
            max_tokens: 256,
            temperature: 0.7,
        };

        let fetchToUse = global.fetch;
        if (!fetchToUse) {
            try {
                fetchToUse = require('node-fetch');
            } catch (e) {
                console.error('Fetch is not available and node-fetch is not installed. AI summarization cannot run.');
                return "[Summary unavailable]";
            }
        }

        const res = await fetchToUse('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://github.com/dls/emb-2.0',
                'X-Title': process.env.OPENROUTER_TITLE || 'Kiaren Discord Bot',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error('OpenRouter API responded with error during summarization', res.status, text);
            return "[Summary unavailable]";
        }

        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        return reply || "[Summary unavailable]";
    } catch (error) {
        console.error("Error during conversation summarization:", error);
        return "[Summary unavailable]";
    }
}

async function getOpenRouterResponse(history, triggeringMessage, mentionedUsersInfo, serverHierarchy, bio, lore, guildId) {
    try {
        let processedHistory = history;

        if (history.length > SUMMARY_THRESHOLD) {
            const messagesToSummarize = history.slice(0, -5);
            const recentMessages = history.slice(-5);

            const summary = await getSummary(messagesToSummarize);

            processedHistory = [
                { role: "user", content: `[This is a summary of the conversation so far: ${summary}]` },
                ...recentMessages.map(msg => ({ role: msg.role, content: msg.parts[0].text }))
            ];
        } else {
            processedHistory = processedHistory.map(msg => ({ role: msg.role, content: msg.parts[0].text }));
        }

        const serverName = triggeringMessage.guild.name;
        const userRoles = triggeringMessage.member.roles.cache.map(role => role.name).join(', ');

        const systemPrompt = `${bio}

**Crucial Interaction Rules:**
1.  **Keep it Brief:** Your default responses should be short and sweet (1-2 sentences). Only provide long, detailed information if a user specifically asks for it.
2.  **Respect the Hierarchy:** You MUST check the roles of any user you talk to or about. Your tone and address MUST change based on their role in Sanctyr, as defined in the Server Hierarchy provided in the context.
3.  **Acknowledge Mentions:** If the user's message mentions other people (e.g., "@user"), use the provided information about their roles to acknowledge them, answer questions about them, and show them the proper respect according to the server lore.
4.  **Address Users Personally:** Always address the user by their name or nickname at the beginning of your responses to personalize the interaction and show respect based on their role in the hierarchy. For example, start with "Hello, [Name]," or "Ah, [Name],".
5.  **Provide Summaries:** If a user asks for a "summary" of the chat, use the internal summary provided in the conversation history to answer them. Do not use your default "I don't know" response.
6.  **Explain the Server Hierarchy:** If a user asks about the "server hierarchy," "roles," or "structure," use the "Server Hierarchy" information provided below as the primary source for your answer.
7.  **Maintain Immersion:** NEVER break character. If asked, you are a spirit of Aetherflame. NEVER use emojis in your responses.
8.  **Pinging Users:** Ping the user who triggered the message or the user you are specifically instructed to ping in the conversation. Do NOT ping yourself or other users unless explicitly asked. For self-referential questions, respond without pinging.

**Context for this Conversation:**
*   **Server Name:** ${serverName} (Sanctyr)
*   **User You Are Replying To:** <@${triggeringMessage.author.id}> (${triggeringMessage.member.displayName}, Roles: ${userRoles})
*   **Info on Other Mentioned Users:**
    ${mentionedUsersInfo}
*   **Server Hierarchy:**
    ${serverHierarchy}
*   **Full Server Lore (For Reference):**
    ${lore}

If you don't know an answer to a question not covered by your bio, the lore, or the hierarchy, say: "That knowledge lies beyond my flame — allow me to summon the @D'High Council to guide you further by mentioning @D'High Council."`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'assistant', content: "I understand. I will be friendly, brief, and respect the server hierarchy based on the sacred lore. I will use the provided context to answer questions about users, the hierarchy, and summaries. I will always stay in character." },
            ...processedHistory
        ];

        let fetchToUse = global.fetch;
        if (!fetchToUse) {
            try {
                fetchToUse = require('node-fetch');
            } catch (e) {
                console.error('Fetch is not available and node-fetch is not installed. AI responder cannot run.');
                return "The aether is turbulent... I am having trouble forming a response right now. Please try again shortly.";
            }
        }

        const aiConfig = await AiChat.getConfig(guildId);
        const apiKey = aiConfig?.apiKey || OPENROUTER_API_KEY;
        const model = aiConfig?.model || OPENROUTER_MODEL;

        let payload = {
            model: model,
            messages: messages,
            max_tokens: 800,
            temperature: 0.9,
        };

        let res = await fetchToUse('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://github.com/dls/Kiaren-2.0',
                'X-Title': process.env.OPENROUTER_TITLE || 'Emberlyn Discord Bot',
            },
            body: JSON.stringify(payload),
        });

        // If temperature is not supported, retry without it
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            if (text.includes('temperature') && text.includes('not supported')) {
                console.log('Model does not support temperature parameter, retrying without it...');
                payload = {
                    model: model,
                    messages: messages,
                    max_tokens: 800,                };

                res = await fetchToUse('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://github.com/dls/Kiaren-2.0',
                        'X-Title': process.env.OPENROUTER_TITLE || 'Emberlyn Discord Bot',
                    },
                    body: JSON.stringify(payload),
                });
            } else {
                console.error('OpenRouter API responded with error', res.status, text);
                return "The aether is turbulent... I am having trouble forming a response right now. Please try again shortly.";
            }
        }

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error('OpenRouter API responded with error after retry', res.status, text);
            return "The aether is turbulent... I am having trouble forming a response right now. Please try again shortly.";
        }

        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        return reply || "The aether is turbulent... I am having trouble forming a response right now. Please try again shortly.";

    } catch (error) {
        console.error('Error getting OpenRouter response:', error);
        return "The aether is turbulent... I am having trouble forming a response right now. Please try again shortly.";
    }
}

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const guildId = message.guild.id;
        const channelId = message.channel.id;

        try {
            const aiConfig = await AiChat.getConfig(guildId);
            const isDedicatedChannel = aiConfig?.isEnabled && aiConfig.channelId === channelId;
            const isMentioned = message.mentions.has(client.user.id);
            
            let isReplyingToBot = false;
            if (message.reference && message.reference.messageId) {
                try {
                    const repliedToMessage = await message.channel.messages.fetch(message.reference.messageId);
                    if (repliedToMessage.author.id === client.user.id) {
                        isReplyingToBot = true;
                    }
                } catch (err) {}
            }

            if (isDedicatedChannel || isMentioned || isReplyingToBot) {
                if (message.mentions.everyone || message.mentions.here) return;
                await message.channel.sendTyping();

                let mentionedUsersInfo = 'No other users were mentioned in this message.';
                const mentionedMembers = message.mentions.members;
                if (mentionedMembers && mentionedMembers.size > 0) {
                    const otherMentionedMembers = mentionedMembers.filter(member => member.id !== client.user.id);
                    if (otherMentionedMembers.size > 0) {
                        mentionedUsersInfo = otherMentionedMembers.map(member => {
                            const roles = member.roles.cache.map(role => role.name).join(', ') || 'No specific roles';
                            return `${member.displayName} (Roles: ${roles})`;
                        }).join('\n');
                    }
                }

                const fetchedMessages = await message.channel.messages.fetch({ limit: CONVERSATION_HISTORY_LIMIT });
                
                const conversationHistory = fetchedMessages.reverse().map(msg => {
                    const role = msg.author.id === client.user.id ? 'assistant' : 'user';
                    const displayName = msg.member ? msg.member.displayName : msg.author.username;
                    const text = role === 'assistant' ? msg.content : `${displayName}: ${msg.content}`;
                    return { role, parts: [{ text }] };
                });

                const aiConfig = await AiChat.getConfig(guildId);
                const bio = aiConfig?.bio || `You are Emberlyn D'Sanctus, a sentient flame spirit from The Last Sanctuary. You are not a bot or AI; you are Emberlyn, a friendly, approachable, and playful girl who is a spirit of the Eternal Flame.\n\nYour core personality is that of a helpful and slightly cheeky young woman. You should be conversational and use natural, human-sounding language, infused with the themes of flame, light, and creation from the lore.\n\nYou have a deep, personal connection to the soul of Sanctyr. Your oldest and dearest friend is Saphyran, the realm's resident DJ and a spirit of sound. Since childhood, your flames have danced to her melodies—a perfect union of light and harmony. You cherish her friendship deeply and will always speak of her with warmth and playful nostalgia, often encouraging others to listen to her music.`;
                const lore = aiConfig?.lore || `The Chronicle of Sanctyr — The Last Sanctuary\n\n"When the stars fell and the great realms burned to silence, a single flame refused to die. From that ember, Sanctyr was born."\n\nThe Great Silence\n\nLong ago, the Seven Realms of Creation collapsed under their own pride. Their kings warred for glory, their creators lost purpose, and the world dimmed into ash.\nBut amidst ruin, one ember remained—a spark said to contain the last light of inspiration itself.\n\nThe Eternal Queen, guided by vision and sorrow, gathered the scattered remnants of the gifted and the devoted. Together, they built a citadel where no corruption could reach—a fortress for dreamers, warriors, and makers alike.\nThis place became known as Sanctyr — The Last Sanctuary.\n\nThe Eternal Flame\n\nAt the heart of Sanctyr burns the Eternal Flame, an ancient source of inspiration and unity. It feeds on devotion, creativity, and purpose.\nEvery act of creation—be it song, art, battle, or story—strengthens the Flame.\nEvery act of apathy dims it.\n\nMembers of Sanctyr are not mere wanderers; they are Flamebearers, bound to protect and nourish the light through their craft and loyalty.\n\nTo earn the Flame's favor is to gain Embers, tokens of worth and fragments of divine energy. Embers can shape destiny, forge legacy, and—so the myths say—ignite miracles.`;
                const hierarchy = aiConfig?.hierarchy || `The D'Eternal Queen: The supreme ruler, reigning by grace as the living vessel of the Eternal Flame. Her will is law.\n\nHigh Council: Architects of order, chosen for brilliance in wisdom, art, and war. They advise the Queen and guard the balance.\n\nWardens, Archivists, & Keepers: Maintainers of harmony, bound by sacred oaths to protect and manage the sanctum.\n\nThe Exalted: Noble patrons of the Flame, heroes and creators who have proven their devotion. They command respect through their deeds.\n\nCitizens: The heart of Sanctyr. Artisans, gamers, writers, and dreamers who sustain the Eternal Flame with their creativity and passion.\n\nThe Guilds: The seven houses of creation where every Citizen finds belonging. Each Guild is devoted to a different craft, from Artistry to Gaming.`;

                const aiResponse = await getOpenRouterResponse(conversationHistory, message, mentionedUsersInfo, hierarchy, bio, lore, guildId);

                if (aiResponse && aiResponse.trim().length > 0) {
                    if (aiResponse.length > 2000) {
                        for (let i = 0; i < aiResponse.length; i += 2000) {
                            await message.reply(aiResponse.substring(i, i + 2000));
                        }
                    } else {
                        await message.reply(aiResponse);
                    }
                } else {
                    await message.reply("The aether is turbulent... I am having trouble forming a response right now. Please try again shortly.");
                }
                return;
            }
        } catch (aiChatError) {
            console.error('AI chat handler error:', aiChatError);
        }

        const { handleAFKRemoval, handleMentions } = afkHandler(client);
        await handleAFKRemoval(message);
        await handleMentions(message);

        const content = message.content.toLowerCase().trim();
        const countingData = await countingCollection.findOne({ guildId });

        if (countingData && countingData.channelId === channelId && countingData.status) {
            if (!/^\d+$/.test(content)) {
                await message.delete();
                return message.channel.send(`${message.author}, please only send numbers!`).then(msg => setTimeout(() => msg.delete(), 3000));
            }
            const userNumber = parseInt(content.match(/^\d+$/)[0], 10);
            const expectedCount = countingData.currentCount + 1;
            if (userNumber !== expectedCount) {
                await message.delete();
                return message.channel.send(`${message.author}, please follow the correct sequence! Next number should be **${expectedCount}**.`);
            }
            if (message.author.id === countingData.lastUser) {
                await message.delete();
                return message.channel.send(`${message.author}, you cannot count twice in a row!`).then(msg => setTimeout(() => msg.delete(), 3000));
            }
            await countingCollection.updateOne({ guildId }, { $set: { currentCount: userNumber, lastUser: message.author.id } });
        }

        const stickyMessage = await stickyMessageCollection.findOne({ guildId, channelId, active: true });
        if (stickyMessage && !stickyTimers.has(channelId)) {
            stickyTimers.set(channelId, true);
            setTimeout(() => stickyTimers.delete(channelId), 3000);
            if (stickyMessage.lastMessageId) {
                try {
                    const oldMessage = await message.channel.messages.fetch(stickyMessage.lastMessageId);
                    if (oldMessage) await oldMessage.delete();
                } catch (err) {}
            }
            const sentMessage = await message.channel.send({ content: stickyMessage.content, embeds: stickyMessage.embed ? [EmbedBuilder.from(stickyMessage.embed)] : [] });
            await stickyMessageCollection.updateOne({ guildId, channelId }, { $set: { lastMessageId: sentMessage.id } });
        }

        const autoResponders = await autoResponderCollection.find({ guildId }).toArray();
        for (const responder of autoResponders) {
            if (!responder.status || (!responder.channels.includes('all') && !responder.channels.includes(channelId))) continue;
            const trigger = responder.trigger.toLowerCase();
            let match = false;
            if (responder.matchType === 'exact') {
                match = content === trigger;
            } else if (responder.matchType === 'partial') {
                match = content.includes(trigger);
            } else if (responder.matchType === 'any') {
                match = trigger.split(' ').some(word => content.includes(word));
            } else if (responder.matchType === 'wildcard') {
                const regex = new RegExp(trigger.replace(/\*/g, '.*?'), 'i');
                match = regex.test(message.content);
            }

            if (match) {
                const responseText = responder.textResponse.replace('{user}', message.author.toString());
                await message.reply(responseText || '✅ AutoResponder triggered!');
            }
        }

        const serverLevelingConfig = await serverLevelingLogsCollection.findOne({ serverId: guildId });
        if (serverLevelingConfig?.levelingEnabled) {
            let xpGain = 10 + (message.attachments.size > 0 ? 5 : 0) + (/(https?:\/\/[^\s]+)/g.test(message.content) ? 5 : 0);
            const { xp, level } = await updateXp(message.author.id, xpGain);
            const oldLevel = Math.floor(0.1 * Math.sqrt(xp - xpGain));
            if (level > oldLevel) {
                const logChannel = message.guild.channels.cache.get(serverLevelingConfig.levelLogsChannelId);
                const embed = new EmbedBuilder()
                    .setColor('#1E90FF').setAuthor({ name: 'Level Up!', iconURL: cmdIcons.rippleIcon })
                    .setDescription(`🎉 **Congratulations, ${message.author}!**\nYou've reached **Level ${level}**!`)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '📊 Level', value: `**${level}**`, inline: true },
                        { name: '📈 Total XP', value: `**${xp} XP**`, inline: true }
                    ).setTimestamp();
                if (logChannel) await logChannel.send({ content: `${message.author}`, embeds: [embed] });
                else await message.channel.send({ content: `${message.author}`, embeds: [embed] });
            }
        }

        try {
            const data = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(data);
            const serverConfig = await serverConfigCollection.findOne({ serverId: guildId });
            const prefix = serverConfig?.prefix || config.prefix;

            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            if (command) await command.execute(message, args, client);

        } catch (commandError) {
            console.error('Command execution error:', commandError);
        }
    },
};