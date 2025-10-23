const { Schema, model } = require('mongoose');

const speciesSchema = new Schema({
  species: { type: String, required: true, unique: true },
  rarity: { type: String, required: true },
  baseStats: {
    hp: { type: Number, required: true },
    attack: { type: Number, required: true },
    defense: { type: Number, required: true },
    speed: { type: Number, required: true },
  },
  abilities: [String],
  evolvesTo: {
    species: { type: String },
    rarity: { type: String },
    requirements: {
      level: { type: Number },
      happiness: { type: Number },
      battlesWon: { type: Number },
    },
  },
});

module.exports = model('Species', speciesSchema);
