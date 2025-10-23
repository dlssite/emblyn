const { Schema, model } = require('mongoose');

const eventConfigSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
});

module.exports = model('EventConfig', eventConfigSchema);