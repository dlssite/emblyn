const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateWallet, updateCooldown, addToInventory } = require('../../models/economy');
const ms = require('ms');

const FISH_COOLDOWN = 5 * 60 * 1000; // 5 minutes

const fishRewards = [
    { name: 'Silverfin Trout', min: 15, max: 40, emoji: '🐟', description: 'A shimmering trout with scales like molten silver.' },
    { name: 'Crimson Salmon', min: 40, max: 100, emoji: '🐠', description: 'A salmon with blood-red fins, said to swim in cursed waters.' },
    { name: 'Void Tuna', min: 70, max: 180, emoji: '🐡', description: 'A massive tuna that seems to absorb light around it.' },
    { name: 'Shadow Shark', min: 120, max: 300, emoji: '🦈', description: 'A shark with eyes that glow like dying embers.' },
    { name: 'Crystal Carp', min: 50, max: 120, emoji: '🐠', description: 'A carp with scales that refract light like precious gems.' },
    { name: 'Phantom Eel', min: 80, max: 200, emoji: '🐍', description: 'An eel that phases in and out of reality.' },
    { name: 'Dragon Scale Fish', min: 200, max: 500, emoji: '🐉', description: 'A legendary fish with scales resembling dragon hide.' }
];

const itemFinds = [
    { id: 'lootbox_common', name: 'Ancient Chest', chance: 0.04, type: 'lootbox', description: 'A weathered chest that hums with forgotten magic.' },
    { id: 'old_boot', name: 'Cursed Boot', chance: 0.1, type: 'junk', description: 'An old boot that whispers dark secrets.' },
    { id: 'enchanted_hook', name: 'Enchanted Fishing Hook', chance: 0.02, type: 'tool', description: 'A hook that glows with arcane energy.' },
    { id: 'mermaid_scale', name: 'Mermaid Scale', chance: 0.03, type: 'material', description: 'A shimmering scale that sings softly.' }
];

module.exports = {
    name: 'fish',
    description: 'Go fishing to earn money and maybe find items.',
    async execute(message, args) {
        await message.channel.sendTyping();
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        const lastFish = profile.cooldowns.fish || 0;
        const timeSinceLastFish = Date.now() - lastFish;

        if (timeSinceLastFish < FISH_COOLDOWN) {
            const timeLeft = FISH_COOLDOWN - timeSinceLastFish;
            return message.reply(`The fish aren't biting. You can fish again in **${ms(timeLeft, { long: true })}**.`);
        }

        await updateCooldown(userId, 'fish', Date.now());

        const fishResult = fishRewards[Math.floor(Math.random() * fishRewards.length)];
        const earnings = Math.floor(Math.random() * (fishResult.max - fishResult.min + 1)) + fishResult.min;
        await updateWallet(userId, earnings);

        let itemMessage = '';
        const randomNumber = Math.random();
        let cumulativeChance = 0;

        for (const item of itemFinds) {
            cumulativeChance += item.chance;
            if (randomNumber < cumulativeChance) {
                if (item.type === 'junk') {
                    itemMessage = `\nAs you were reeling it in, you also snagged an **${item.name}**. It's worthless.`;
                } else {
                    await addToInventory(userId, {
                        id: item.id,
                        name: item.name,
                        type: item.type,
                        purchaseDate: new Date()
                    });
                    itemMessage = `\nYou also found a **${item.name}**!`;
                }
                break; // Stop after finding one item
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🎣 Successful Fishing Expedition!')
            .setDescription(`You cast your line into the misty waters and reeled in a ${fishResult.emoji} **${fishResult.name}**!\n*${fishResult.description}*\n\nYou sold this magnificent catch for **${earnings.toLocaleString()} embers**.${itemMessage}`)
            .setColor('#3498DB')
            .setFooter({ text: 'The waters hold many secrets...' });

        message.reply({ embeds: [embed] });
    },
};