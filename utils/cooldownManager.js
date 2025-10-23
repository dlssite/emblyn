const { getEconomyProfile, updateEconomyProfile } = require('../models/economy');

async function checkCooldown(userId, commandName, cooldownMillis) {
    const profile = await getEconomyProfile(userId);
    
    const now = Date.now();
    const lastUsed = profile.cooldowns[commandName] || profile[`last${commandName.charAt(0).toUpperCase() + commandName.slice(1)}`];

    if (lastUsed && now - lastUsed < cooldownMillis) {
        return cooldownMillis - (now - lastUsed);
    } else {
        return 0;
    }
}

async function setCooldown(userId, commandName) {
    const update = { [`cooldowns.${commandName}`]: Date.now() };
    await updateEconomyProfile(userId, update);
}

module.exports = {
    checkCooldown,
    setCooldown,
};