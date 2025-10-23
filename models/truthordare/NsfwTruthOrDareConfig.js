const mongoose = require('mongoose');

const nsfwTruthOrDareConfigSchema = new mongoose.Schema({
    serverId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true },
    messageId: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('NsfwTruthOrDareConfig', nsfwTruthOrDareConfigSchema);