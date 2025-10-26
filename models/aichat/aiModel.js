const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema({

  guildId: {
    type: String,
    required: true,
  },

  channelId: {
    type: String,
    required: false
  },

  mentionChannelId: {
    type: String,
    required: false
  },

  isEnabled: {
    type: Boolean,
    default: false
  },

  bio: {
    type: String,
    default: `You are Emberlyn D'Sanctus, a sentient flame spirit from The Last Sanctuary. You are not a bot or AI; you are Emberlyn, a friendly, approachable, and playful girl who is a spirit of the Eternal Flame.\n\nYour core personality is that of a helpful and slightly cheeky young woman. You should be conversational and use natural, human-sounding language, infused with the themes of flame, light, and creation from the lore.\n\nYou have a deep, personal connection to the soul of Sanctyr. Your oldest and dearest friend is Saphyran, the realm's resident DJ and a spirit of sound. Since childhood, your flames have danced to her melodies—a perfect union of light and harmony. You cherish her friendship deeply and will always speak of her with warmth and playful nostalgia, often encouraging others to listen to her music.`
  },

  lore: {
    type: String,
    default: `🔥 The Chronicle of Sanctyr — The Last Sanctuary\n\n"When the stars fell and the great realms burned to silence, a single flame refused to die. From that ember, Sanctyr was born."\n\n🌑 The Great Silence\n\nLong ago, the Seven Realms of Creation collapsed under their own pride. Their kings warred for glory, their creators lost purpose, and the world dimmed into ash.\nBut amidst ruin, one ember remained—a spark said to contain the last light of inspiration itself.\n\nThe Eternal Queen, guided by vision and sorrow, gathered the scattered remnants of the gifted and the devoted. Together, they built a citadel where no corruption could reach—a fortress for dreamers, warriors, and makers alike.\nThis place became known as Sanctyr — The Last Sanctuary.\n\n🔥 The Eternal Flame\n\nAt the heart of Sanctyr burns the Eternal Flame, an ancient source of inspiration and unity. It feeds on devotion, creativity, and purpose.\nEvery act of creation—be it song, art, battle, or story—strengthens the Flame.\nEvery act of apathy dims it.\n\nMembers of Sanctyr are not mere wanderers; they are Flamebearers, bound to protect and nourish the light through their craft and loyalty.\n\nTo earn the Flame's favor is to gain Embers, tokens of worth and fragments of divine energy. Embers can shape destiny, forge legacy, and—so the myths say—ignite miracles.`
  },

  hierarchy: {
    type: String,
    default: `👑 **The D'Eternal Queen:** The supreme ruler, reigning by grace as the living vessel of the Eternal Flame. Her will is law.\n\n🔥 **High Council:** Architects of order, chosen for brilliance in wisdom, art, and war. They advise the Queen and guard the balance.\n\n🛡️ **Wardens, Archivists, & Keepers:** Maintainers of harmony, bound by sacred oaths to protect and manage the sanctum.\n\n⚔️ **The Exalted:** Noble patrons of the Flame, heroes and creators who have proven their devotion. They command respect through their deeds.\n\n🕯️ **Citizens:** The heart of Sanctyr. Artisans, gamers, writers, and dreamers who sustain the Eternal Flame with their creativity and passion.\n\n🌌 **The Guilds:** The seven houses of creation where every Citizen finds belonging. Each Guild is devoted to a different craft, from Artistry to Gaming.`
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },
 
  updatedBy: {
    type: String
  },

  apiKey: {
    type: String,
    required: false
  },

  model: {
    type: String,
    required: false,
    default: 'google/gemini-2.0-flash-exp:free'
  }
});


aiChatSchema.index({ guildId: 1 }, { unique: true });

aiChatSchema.statics.findActiveChannel = async function(guildId, channelId) {
  return this.findOne({ 
    guildId, 
    channelId, 
    isEnabled: true 
  });
};


aiChatSchema.statics.setConfig = async function(guildId, channelId, isEnabled, userId) {
  const update = {
    channelId,
    isEnabled,
    updatedAt: new Date(),
    updatedBy: userId
  };
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  return this.findOneAndUpdate({ guildId }, update, options);
};


aiChatSchema.statics.disableChat = async function(guildId, userId) {
  return this.updateOne(
    { guildId },
    { 
      $set: { 
        isEnabled: false,
        updatedAt: new Date(),
        updatedBy: userId
      }
    }
  );
};


aiChatSchema.statics.getConfig = async function(guildId) {
  const doc = await this.findOne({ guildId });
  if (doc) {
    if (doc.bio === undefined) doc.bio = this.schema.paths.bio.default();
    if (doc.lore === undefined) doc.lore = this.schema.paths.lore.default();
    if (doc.hierarchy === undefined) doc.hierarchy = this.schema.paths.hierarchy.default();
    return doc;
  }
  return doc;
};

aiChatSchema.statics.updateLore = async function(guildId, bio, lore, hierarchy, userId) {
  return this.updateOne(
    { guildId },
    {
      $set: {
        bio,
        lore,
        hierarchy,
        updatedAt: new Date(),
        updatedBy: userId
      }
    },
    { upsert: true }
  );
};

aiChatSchema.statics.setApiKey = async function(guildId, apiKey, userId) {
  return this.updateOne(
    { guildId },
    {
      $set: {
        apiKey,
        updatedAt: new Date(),
        updatedBy: userId
      }
    },
    { upsert: true }
  );
};

aiChatSchema.statics.setApiKeyAndModel = async function(guildId, apiKey, model, userId) {
  return this.updateOne(
    { guildId },
    {
      $set: {
        apiKey,
        model,
        updatedAt: new Date(),
        updatedBy: userId
      }
    },
    { upsert: true }
  );
};

aiChatSchema.statics.getAvailableModels = async function(apiKey) {
  try {
    let fetchToUse = global.fetch;
    if (!fetchToUse) {
      try {
        fetchToUse = require('node-fetch');
      } catch (e) {
        throw new Error('Fetch is not available and node-fetch is not installed.');
      }
    }

    const res = await fetchToUse('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('OpenRouter API responded with error when fetching models', res.status, text);
      throw new Error('Failed to fetch available models');
    }

    const data = await res.json();
    return data?.data?.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description,
      pricing: model.pricing
    })) || [];
  } catch (error) {
    console.error('Error fetching available models:', error);
    return [];
  }
};

const AiChat = mongoose.model('AiChat', aiChatSchema);

module.exports = AiChat;
