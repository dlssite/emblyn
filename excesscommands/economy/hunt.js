const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateWallet, updateCooldown, addToInventory } = require('../../models/economy');
const { randomUUID } = require('crypto');
const ms = require('ms');

const HUNT_COOLDOWN = 5 * 60 * 1000; // 5 minutes

const huntRewards = [
    { name: 'Shadow Rabbit', min: 20, max: 50, emoji: '🐰', description: 'A rabbit with fur as dark as midnight, swift as the wind.' },
    { name: 'Cursed Stag', min: 50, max: 120, emoji: '🦌', description: 'A majestic stag with antlers that glow with eerie light.' },
    { name: 'Blood Boar', min: 80, max: 200, emoji: '🐗', description: 'A ferocious boar with tusks stained crimson.' },
    { name: 'Phantom Fox', min: 40, max: 100, emoji: '🦊', description: 'A cunning fox that seems to flicker in and out of existence.' },
    { name: 'Void Bear', min: 150, max: 350, emoji: '🐻', description: 'A massive bear whose eyes hold the darkness of the abyss.' },
    { name: 'Crystal Wolf', min: 100, max: 250, emoji: '🐺', description: 'A wolf with fur that sparkles like shattered diamonds.' },
    { name: 'Dragonhawk', min: 200, max: 500, emoji: '🦅', description: 'A majestic bird with wings that shimmer like dragon scales.' }
];

const itemFinds = [
    { id: 'lootbox_common', name: 'Ancient Relic', type: 'lootbox', chance: 0.05, description: 'A mysterious artifact pulsing with ancient power.' },
    { id: 'xp_boost', name: 'Elixir of Wisdom', type: 'consumable', chance: 0.02, description: 'A glowing potion that enhances knowledge.' },
    { id: 'beast_hide', name: 'Beast Hide', type: 'material', chance: 0.03, description: 'Tough hide from a mythical creature.' },
    { id: 'enchanted_arrow', name: 'Enchanted Arrow', type: 'weapon', chance: 0.025, description: 'An arrow that seeks its target unerringly.' }
];

module.exports = {
    name: 'hunt',
    description: 'Hunt for animals to earn money and find items.',
    async execute(message, args) {
        await message.channel.sendTyping();
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        const lastHunt = profile.cooldowns.hunt || 0;
        const timeSinceLastHunt = Date.now() - lastHunt;

        if (timeSinceLastHunt < HUNT_COOLDOWN) {
            const timeLeft = HUNT_COOLDOWN - timeSinceLastHunt;
            return message.reply(`You need to rest. You can go hunting again in **${ms(timeLeft, { long: true })}**.`);
        }

        await updateCooldown(userId, 'hunt', Date.now());

        const huntResult = huntRewards[Math.floor(Math.random() * huntRewards.length)];
        const earnings = Math.floor(Math.random() * (huntResult.max - huntResult.min + 1)) + huntResult.min;

        let foundItem = null;
        const randomNumber = Math.random();
        let cumulativeChance = 0;

        for (const item of itemFinds) {
            cumulativeChance += item.chance;
            if (randomNumber < cumulativeChance) {
                foundItem = item;
                break;
            }
        }

        await updateWallet(userId, earnings);
        let itemMessage = '';

        if (foundItem) {
            await addToInventory(userId, {
                id: foundItem.id,
                name: foundItem.name,
                type: foundItem.type,
                purchaseDate: new Date(),
                uniqueId: randomUUID() // Add a unique ID for proper stacking
            });
            itemMessage = `\nIn your hunt, you also stumbled upon a **${foundItem.name}**!`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🏹 Successful Hunt!')
            .setDescription(`You ventured into the shadowed forests and tracked down a ${huntResult.emoji} **${huntResult.name}**!\n*${huntResult.description}*\n\nYou sold this prized trophy for **${earnings.toLocaleString()} embers**.${itemMessage}`)
            .setColor('#2ECC71')
            .setFooter({ text: 'The wilds are full of danger and treasure...' });

        message.reply({ embeds: [embed] });
    },
};