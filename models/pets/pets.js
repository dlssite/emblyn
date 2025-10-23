const { Schema, model } = require('mongoose');
const { getEconomyProfile, updateWallet, updateGold } = require('../economy');
const { getXPForNextLevel } = require('../../utils/xpUtils');
const allPetsData = Object.values(require('../../data/pets.js')).flat();

const petSchema = new Schema({
  petId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  species: { type: String, required: true },
  rarity: { type: String, required: true },
  image: { type: String },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  ageHours: { type: Number, default: 0 },
  stats: {
    hp: { type: Number, default: 100 },
    maxHealth: { type: Number, default: 100 },
    attack: { type: Number, default: 10 },
    defense: { type: Number, default: 10 },
    speed: { type: Number, default: 10 },
    hunger: { type: Number, default: 100 },
    happiness: { type: Number, default: 100 },
    energy: { type: Number, default: 100 },
  },
  abilities: [Object],
  specialAbilities: [Object],
  battleRecord: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
  },
  lastDecay: { type: Date, default: Date.now },
  isDead: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  evolutionStage: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  cooldowns: {
    train: { type: Date, default: new Date(0) },
    play: { type: Date, default: new Date(0) },
    rest: { type: Date, default: new Date(0) },
    feed: { type: Date, default: new Date(0) },
    adventure: { type: Date, default: new Date(0) },
    heal: { type: Date, default: new Date(0) },
  },
});

petSchema.statics.createPet = async function (userId, shopItem) {
    const profile = await getEconomyProfile(userId);

    if (shopItem.currency === 'gold') {
        if (profile.gold < shopItem.price) {
            throw new Error('You do not have enough gold for this item.');
        }
        await updateGold(userId, -shopItem.price);
    } else {
        if (profile.wallet < shopItem.price) {
            throw new Error(`You need $${shopItem.price.toLocaleString()}, but you only have $${profile.wallet.toLocaleString()}.`);
        }
        await updateWallet(userId, -shopItem.price);
    }

    const fullPetData = allPetsData.find(p => p.id === shopItem.id);
    if (!fullPetData) {
        throw new Error('Could not find matching pet data for this item.');
    }

    const newPet = new this({
        petId: fullPetData.id,
        ownerId: userId,
        name: fullPetData.name,
        species: fullPetData.species,
        rarity: fullPetData.rarity,
        image: fullPetData.image,
        stats: {
            ...fullPetData.stats,
            hp: 100,
            maxHealth: 100,
            hunger: 100,
            happiness: 50,
            energy: 100,
        },
        abilities: fullPetData.abilities || [],
        specialAbilities: fullPetData.specialAbilities || [],
    });

    await newPet.save();
    return newPet;
};

petSchema.methods.addXP = async function (xpGained) {
    this.xp += xpGained;
    let xpToNextLevel = getXPForNextLevel(this.level);

    let leveledUp = false;
    while (this.xp >= xpToNextLevel) {
        this.level++;
        this.xp -= xpToNextLevel;
        xpToNextLevel = getXPForNextLevel(this.level);

        this.stats.maxHealth += 10;
        this.stats.hp = this.stats.maxHealth;
        this.stats.attack += 2;
        this.stats.defense += 2;
        this.stats.speed += 2;
        leveledUp = true;
    }

    await this.save();
    return leveledUp;
};

const Pet = model('Pet', petSchema);

async function getPet(userId) {
    return Pet.find({ ownerId: userId });
}

module.exports = { Pet, getPet };