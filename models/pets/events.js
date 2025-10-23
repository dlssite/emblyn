const { Schema, model } = require('mongoose');

// Define a schema for the data stored in the participants map
const participantDataSchema = new Schema({
    petId: { type: String, required: true },
    name: { type: String, required: true },
    attack: { type: Number, required: true },
    hp: { type: Number, required: true },
    abilities: { type: [String], required: true },
}, { _id: false });


const eventSchema = new Schema({
  eventId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  image: { type: String },
  type: { type: String, required: true, default: 'boss' },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  bossHp: { type: Number, required: true },
  maxHp: { type: Number, required: true },
  participants: {
    type: Map,
    of: participantDataSchema,
    default: {}
  },
  rewards: {
    gold: { type: Number },
    item: { type: String },
    xp: { type: Number },
  },
});

const Event = model('Event', eventSchema);

module.exports = { Event };