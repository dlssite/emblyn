const express = require('express');
const path = require('path');
const { getEconomyProfile } = require('./models/economy');
const { api } = require('./config.json');

const economyCommands = new Map();

function extractMessageFromEmbed(embedData) {
    let message = '';
    if (embedData.title) message += embedData.title + '\n';
    if (embedData.description) message += embedData.description + '\n';
    if (embedData.fields) {
        embedData.fields.forEach(field => {
            message += `${field.name}: ${field.value}\n`;
        });
    }
    return message.trim();
}

function loadEconomyCommands() {
    const fs = require('fs');
    const commandFiles = fs.readdirSync(path.join(__dirname, 'excesscommands/economy')).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const command = require(`./excesscommands/economy/${file}`);
            if (command.name && command.execute) {
                economyCommands.set(command.name, command);
            }
        } catch (error) {
            console.error(`Error loading command from file ${file}:`, error);
        }
    }
}

function initializeApi(client) {
    loadEconomyCommands();

    const app = express();
    const PORT = process.env.PORT || api.port || 3000;
    const PROFILE_API_SECRET = process.env.API_SECRET || api.secret;
    const COMMAND_API_SECRET = 'ember';

    app.use(express.json());

    const checkProfileApiKey = (req, res, next) => {
        if (!PROFILE_API_SECRET) return next();
        if (req.header('X-API-Secret') !== PROFILE_API_SECRET) return res.status(401).json({ error: 'Unauthorized' });
        next();
    };

    const checkCommandApiKey = (req, res, next) => {
        if (req.header('X-API-Secret') !== COMMAND_API_SECRET) return res.status(401).json({ error: 'Unauthorized' });
        next();
    };

    app.get('/api/profile/:userId', checkProfileApiKey, async (req, res) => {
        try {
            const { userId } = req.params;
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const profileData = await getEconomyProfile(userId);
            res.json({
                userId: profileData.userId,
                username: user.username,
                avatar: user.displayAvatarURL(),
                wallet: profileData.wallet,
                bank: profileData.bank,
                gold: profileData.gold,
                inventory: profileData.inventory,
            });
        } catch (error) {
            console.error('Profile API Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/command', checkCommandApiKey, async (req, res) => {
        const { userId, command: commandName, args } = req.body;
        if (!userId || !commandName) return res.status(400).json({ error: 'userId and command are required' });

        const command = economyCommands.get(commandName.toLowerCase());
        if (!command) return res.status(404).json({ error: 'Command not found' });

        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) return res.status(404).json({ error: 'User not found in Discord' });

            let targetUser = null;
            if (args && args[0]) {
                const mentionMatch = args[0].match(/^<@!?(\d+)>$/);
                if (mentionMatch) {
                    const targetId = mentionMatch[1];
                    targetUser = await client.users.fetch(targetId).catch(() => null);
                }
            }

            const mockMessage = {
                author: user,
                client: client,
                mentions: {
                    users: {
                        first: () => targetUser,
                    },
                },
                reply: (response) => {
                    let messageText = 'The command executed, but the response was unreadable.';
                    if (typeof response === 'string') {
                        messageText = response;
                    } else if (response.embeds && response.embeds[0]) {
                        const embed = response.embeds[0];
                        const embedData = typeof embed.toJSON === 'function' ? embed.toJSON() : embed;
                        messageText = extractMessageFromEmbed(embedData);
                    }
                    res.json({ message: messageText });
                },
            };

            await command.execute(mockMessage, args || []);

        } catch (error) {
            console.error(`Error executing command '${commandName}' via API:`, error);
            res.status(500).json({ error: 'An error occurred while executing the command.' });
        }
    });

    app.listen(PORT, () => {
        console.log(`🚀 API Server is running on http://localhost:${PORT}`);
    });
}

module.exports = { initializeApi };
