const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateWallet, updateXP, updateCooldown } = require('../../models/economy');

const jobs = [
    { name: 'Blacksmith', min: 80, max: 160, baseXp: 12 },
    { name: 'Alchemist', min: 120, max: 250, baseXp: 18 },
    { name: 'Knight', min: 150, max: 300, baseXp: 22 },
    { name: 'Sorcerer', min: 200, max: 400, baseXp: 30 },
    { name: 'Merchant', min: 100, max: 220, baseXp: 16 },
    { name: 'Royal Guard', min: 130, max: 260, baseXp: 19 },
    { name: 'Herbalist', min: 90, max: 180, baseXp: 14 },
    { name: 'Enchanter', min: 180, max: 350, baseXp: 26 },
    { name: 'Tavern Keeper', min: 70, max: 150, baseXp: 11 },
    { name: 'Assassin', min: 250, max: 500, baseXp: 35 },
    { name: 'Necromancer', min: 300, max: 600, baseXp: 42 },
    { name: 'Dragon Keeper', min: 350, max: 700, baseXp: 48 },
    { name: 'Court Jester', min: 60, max: 120, baseXp: 9 },
    { name: 'Scribe', min: 100, max: 200, baseXp: 15 },
    { name: 'Bard', min: 110, max: 230, baseXp: 17 },
    { name: 'Archer', min: 140, max: 280, baseXp: 20 },
    { name: 'Healer', min: 160, max: 320, baseXp: 24 },
    { name: 'Rune Carver', min: 190, max: 380, baseXp: 28 },
    { name: 'Shadow Weaver', min: 220, max: 450, baseXp: 32 },
    { name: 'Crystal Miner', min: 170, max: 340, baseXp: 25 },
    { name: 'Beast Tamer', min: 200, max: 400, baseXp: 30 },
    { name: 'Oracle', min: 280, max: 550, baseXp: 38 },
    { name: 'Warlock', min: 320, max: 650, baseXp: 45 },
    { name: 'Treasure Hunter', min: 150, max: 600, baseXp: 36 },
    { name: 'Dark Merchant', min: 180, max: 800, baseXp: 50 },
    { name: 'Blood Mage', min: 400, max: 1000, baseXp: 60 },
];

module.exports = {
    name: 'work',
    description: 'Work a job to earn money and experience.',
    async execute(message) {
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);
        const now = Date.now();

        // --- Cooldown Logic ---
        let cooldown = 1 * 60 * 60 * 1000; // 1 hour default
        const energyDrink = profile.activeEffects?.find(e => e.name === 'Energy Drink' && e.expiresAt > now);
        if (energyDrink) {
            cooldown /= 2; // Halve the cooldown
        }

        if (profile.cooldowns && profile.cooldowns.work && now - profile.cooldowns.work < cooldown) {
            const remaining = (profile.cooldowns.work + cooldown) - now;
            const remainingMinutes = Math.ceil(remaining / (60 * 1000));
            return message.reply(`You are on cooldown. Please try again in ${remainingMinutes} minute(s).`);
        }

        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const earnings = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

        // --- XP Logic ---
        let xpGained = job.baseXp;
        const xpBoost = profile.activeEffects?.find(e => e.name === 'XP Boost' && e.expiresAt > now);
        if (xpBoost) {
            xpGained *= 2;
        }

        // **CORRECTED DATABASE OPERATIONS**
        // Use dedicated functions to avoid the MongoServerError
        await updateWallet(userId, earnings);
        await updateXP(userId, xpGained);
        await updateCooldown(userId, 'work', now);

        const embed = new EmbedBuilder()
            .setTitle('💼 Work Complete 💼')
            .setDescription(`You worked as a **${job.name}** and earned **${earnings.toLocaleString()} embers** and **${xpGained} XP**!`)
            .setColor('#2ECC71');

        let footerText = [];
        if (energyDrink) {
            footerText.push('Your Energy Drink reduced the cooldown!');
        }
        if (xpBoost) {
            footerText.push('Your XP Boost doubled your XP gain!');
        }
        if (footerText.length > 0) {
            embed.setFooter({ text: footerText.join(' ') });
        }

        message.reply({ embeds: [embed] });
    },
};
