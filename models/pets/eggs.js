const { Schema, model } = require('mongoose');

const eggSchema = new Schema({
  eggType: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  hatchTime: { type: Number, required: true },
  rarityChances: {
    common: { type: Number, required: true },
    rare: { type: Number, required: true },
    epic: { type: Number, required: true },
    legendary: { type: Number, required: true },
  },
});

module.exports = model('Egg', eggSchema);
