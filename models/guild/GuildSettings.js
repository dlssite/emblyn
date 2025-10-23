const { Schema, model } = require('mongoose');

const guildSettingsSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    battleChannelId: { type: String, default: null },
    bossFightChannelId: { type: String, default: null },
    minBossParticipants: { type: Number, default: 4 },
    // ... other guild-specific settings can be added here
});

const GuildSettings = model('GuildSettings', guildSettingsSchema);

module.exports = { GuildSettings };