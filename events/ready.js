const { ActivityType } = require('discord.js');
const { botStatusCollection } = require('../mongodb');
const colors = require('../UI/colors/colors');
const config = require('../config');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log('\n' + '─'.repeat(40));
        console.log(`${colors.magenta}${colors.bright}🔗  ACTIVITY STATUS${colors.reset}`);
        console.log('─'.repeat(40));

        let currentInterval = 300000; // 5 minutes

        // 🔍 Get custom MongoDB-based status
        async function getCustomStatus() {
            const statusDoc = await botStatusCollection.findOne({});
            if (!statusDoc || !statusDoc.useCustom || !statusDoc.customRotation || statusDoc.customRotation.length === 0) {
                return null;
            }

            if (statusDoc.interval) {
                currentInterval = statusDoc.interval * 1000;
            }

            const customIndex = Math.floor(Math.random() * statusDoc.customRotation.length);
            const status = statusDoc.customRotation[customIndex];

            const placeholders = {
                '{members}': client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
                '{servers}': client.guilds.cache.size,
                '{channels}': client.channels.cache.size,
                '{uptime}': `${Math.floor(process.uptime() / 60)}m`
            };

            const resolvedActivity = Object.entries(placeholders).reduce(
                (text, [key, val]) => text.replace(new RegExp(key, 'g'), val),
                status.activity
            );

            const activity = {
                name: resolvedActivity,
                type: ActivityType[status.type],
            };

            if (status.type === 'Streaming' && status.url) {
                activity.url = status.url;
            }

            return { activity, status: status.status };
        }

        // 🎵 Get current song (if songStatus enabled)
        async function getCurrentSongActivity() {
            const activePlayers = Array.from(client.riffy?.players?.values() || []).filter(player => player.playing);

            if (!activePlayers.length) return null;

            const player = activePlayers[0];
            if (!player.current?.info?.title) return null;

            return {
                name: `🎸 ${player.current.info.title}`,
                type: ActivityType.Playing
            };
        }

        // 🌟 Update bot's status
        async function updateStatus() {
            const customStatus = await getCustomStatus();
            if (customStatus) {
                client.user.setPresence({
                    activities: [customStatus.activity],
                    status: customStatus.activity.type === ActivityType.Streaming ? undefined : customStatus.status
                });
                return;
            }

            if (config.status.songStatus) {
                const songActivity = await getCurrentSongActivity();
                if (songActivity) {
                    client.user.setActivity(songActivity);
                    return;
                }
            }

            // 🎲 Random default status
            const rawActivity = config.status.rotateDefault[Math.floor(Math.random() * config.status.rotateDefault.length)];

            // 🕒 Add time-based context
            const hour = new Date().getHours();
            let timeContext = '';
            if (hour >= 0 && hour < 6) timeContext = ' - Midnight Flame';
            else if (hour < 12) timeContext = ' - Morning Ember';
            else if (hour < 18) timeContext = ' - Afternoon Glow';
            else timeContext = ' - Twilight Watch';

            // 🔤 Replace placeholders
            const placeholders = {
                '{members}': client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
                '{servers}': client.guilds.cache.size,
                '{channels}': client.channels.cache.size,
                '{uptime}': `${Math.floor(process.uptime() / 60)}m`
            };

            let finalName = Object.entries(placeholders).reduce(
                (text, [key, val]) => text.replace(new RegExp(key, 'g'), val),
                rawActivity.name
            );

            finalName += timeContext;

            const finalActivity = {
                name: finalName,
                type: rawActivity.type
            };

            if (rawActivity.type === ActivityType.Streaming && rawActivity.url) {
                finalActivity.url = rawActivity.url;
            }

            client.user.setPresence({
                activities: [finalActivity],
                status: rawActivity.type === ActivityType.Streaming ? undefined : 'online'
            });

            console.log(`[STATUS] → ${finalName}`);
        }

        // 🧭 Invite cache (if needed)
        client.invites = new Map();
        for (const [guildId, guild] of client.guilds.cache) {
            try {
                await new Promise(res => setTimeout(res, 500));
                const invites = await guild.invites.fetch();
                client.invites.set(
                    guildId,
                    new Map(invites.map(inv => [
                        inv.code,
                        {
                            inviterId: inv.inviter?.id || null,
                            uses: inv.uses
                        }
                    ]))
                );
            } catch (err) {
                // console.warn(`❌ Failed to fetch invites for ${guild.name}: ${err.message}`);
            }
        }

        // ⏱️ Run the cycle
        updateStatus();

        async function checkAndUpdateInterval() {
            const statusDoc = await botStatusCollection.findOne({});
            const newInterval = statusDoc?.interval ? statusDoc.interval * 1000 : 300000;

            if (newInterval !== currentInterval) {
                currentInterval = newInterval;
            }

            setTimeout(() => {
                updateStatus().then(() => checkAndUpdateInterval());
            }, currentInterval);
        }

        checkAndUpdateInterval();

        console.log('\x1b[31m[ CORE ]\x1b[0m \x1b[32m%s\x1b[0m', 'Bot Activity Cycle Running ✅');
    }
};
