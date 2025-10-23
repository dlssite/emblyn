const mongoose = require('mongoose');

const confessionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  messageId: { type: String },
  enabled: { type: Boolean, default: true },
  confessionCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('Confession', confessionSchema);