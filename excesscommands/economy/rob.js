const { getEconomyProfile, updateEconomyProfile, updateWallet, removeFromInventory } = require('../../models/economy');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'rob',
    description: 'Attempt to rob another user.',
    async execute(message, args) {
        const userId = message.author.id;
        let target;

        if (args && args.length > 0) {
            const targetStr = args[0];
            let targetId;
            const mentionMatch = targetStr.match(/^<@!?(\d+)>$/);
            if (mentionMatch) {
                targetId = mentionMatch[1];
            } else if (/^\d+$/.test(targetStr)) {
                targetId = targetStr;
            } else {
                return message.reply('Please provide a valid user mention or ID.');
            }

            const member = await message.guild.members.fetch(targetId).catch(() => null);
            if (!member) {
                return message.reply('User not found in this server.');
            }
            target = member.user;
        } else {
            target = message.mentions.users.first();
            if (!target) {
                return message.reply('Please mention a user to rob.');
            }
        }

        if (target.id === userId) {
            return message.reply('You cannot rob yourself!');
        }

        const profile = await getEconomyProfile(userId);
        const targetProfile = await getEconomyProfile(target.id);

        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        if (profile.cooldowns && profile.cooldowns.rob && now - profile.cooldowns.rob < cooldown) {
            const remaining = cooldown - (now - profile.cooldowns.rob);
            return message.reply(`You are on cooldown. Try again in ${Math.ceil(remaining / 3600000)} hours.`);
        }

        if (targetProfile.wallet < 100) {
            return message.reply(`${target.username} does not have enough money to be worth robbing.`);
        }

        // --- Check for Anti-Rob Shield ---
        const antiRobShield = targetProfile.activeEffects?.find(e => e.name === 'Anti-Rob Shield' && e.expiresAt > now);
        if (antiRobShield) {
            // The shield protects them, but it gets used up.
            const newEffects = targetProfile.activeEffects.filter(e => e.name !== 'Anti-Rob Shield');
            await updateEconomyProfile(target.id, { activeEffects: newEffects });
            await updateEconomyProfile(userId, { [`cooldowns.rob`]: now });

            return message.reply(`Your robbery attempt failed! ${target.username} was protected by an Anti-Rob Shield, which has now been consumed.`);
        }

        // --- Calculate Success Rate ---
        let successRate = 0.5; // Base success rate
        if (targetProfile.upgrades?.hasSafehouse) {
            successRate -= 0.2; // Safe House reduces success rate
        }
        const luckPotion = profile.activeEffects?.find(e => e.name === 'Potion of Luck' && e.expiresAt > now);
        if (luckPotion) {
            successRate += 0.1; // Potion of Luck increases success rate
        }

        const success = Math.random() < successRate;

        await updateEconomyProfile(userId, { [`cooldowns.rob`]: now });

        if (success) {
            const amount = Math.floor(Math.random() * Math.min(500, targetProfile.wallet * 0.3)) + 1;
            const stolen = Math.min(amount, targetProfile.wallet);

            await updateWallet(userId, stolen);
            await updateWallet(target.id, -stolen);

            const embed = new EmbedBuilder()
                .setTitle('✅ Robbery Successful!')
                .setDescription(`You successfully robbed **${stolen.toLocaleString()} embers** from ${target.username}!`)
                .setColor('#2ECC71');
            message.reply({ embeds: [embed] });
        } else {
            const penalty = Math.floor(profile.wallet * 0.1);
            await updateWallet(userId, -penalty);

            const embed = new EmbedBuilder()
                .setTitle('❌ Robbery Failed')
                .setDescription(`You failed to rob ${target.username} and lost **${penalty.toLocaleString()} embers** as a penalty.`)
                .setColor('#E74C3C');
            message.reply({ embeds: [embed] });
        }
    },
};
