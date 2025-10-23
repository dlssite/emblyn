const { EmbedBuilder } = require('discord.js');
const { getEconomyProfile, updateWallet, updateCooldown, updateXP } = require('../../models/economy');
const ms = require('ms');

const CRIME_COOLDOWN = 10 * 60 * 1000; // 10 minutes

const scenarios = {
    success: [
        { message: "You infiltrated the dragon's lair and stole {amount} from its hoard! Your cunning grows stronger.", min: 50, max: 200, xp: [10, 25] },
        { message: "You assassinated a corrupt noble and claimed {amount} from their vault.", min: 100, max: 500, xp: [20, 50] },
        { message: "You looted a cursed tomb, securing {amount} in ancient gold.", min: 80, max: 350, xp: [15, 40] },
        { message: "You enchanted a rival's artifact and sold it for {amount}.", min: 40, max: 150, xp: [8, 20] },
    ],
    failure: [
        { message: "A witch cursed you, forcing you to pay {amount} to lift the hex.", min: 30, max: 150 },
        { message: "Undead guardians rose against you, costing you {amount} in the fray.", min: 50, max: 200 },
        { message: "A rival sorcerer outmaneuvered you, taking {amount} as tribute.", min: 75, max: 250 },
    ],
};

// Calculate level based on XP
const getLevel = (xp) => Math.floor(Math.pow(xp / 100, 0.5)) + 1;

module.exports = {
    name: 'crime',
    description: 'Commit a crime for a chance at a big payout, but be careful!',
    aliases: ['rob'],
    async execute(message, args) {
        await message.channel.sendTyping();
        const userId = message.author.id;
        const profile = await getEconomyProfile(userId);

        const lastCrime = profile.cooldowns.crime || 0;
        const timeSinceLastCrime = Date.now() - lastCrime;

        if (timeSinceLastCrime < CRIME_COOLDOWN) {
            const timeLeft = CRIME_COOLDOWN - timeSinceLastCrime;
            return message.reply(`The heat is still on. Wait **${ms(timeLeft, { long: true })}** before your next crime.`);
        }

        await updateCooldown(userId, 'crime', Date.now());

        const userLevel = getLevel(profile.xp);
        const riskFactor = 1 + (userLevel * 0.05); // Increase risk/reward by 5% per level

        const successChance = 0.65; // 65% chance of success

        if (Math.random() < successChance) {
            // Success
            const scenario = scenarios.success[Math.floor(Math.random() * scenarios.success.length)];
            const earnings = Math.floor((Math.random() * (scenario.max - scenario.min) + scenario.min) * riskFactor);
            const xpGained = Math.floor(Math.random() * (scenario.xp[1] - scenario.xp[0]) + scenario.xp[0]);

            // Check for XP Boost
            const xpBoost = profile.activeEffects.find(e => e.id === 'xp_boost' && e.expiresAt > Date.now());
            const finalXPGained = xpBoost ? xpGained * 2 : xpGained;

            await updateWallet(userId, earnings);
            await updateXP(userId, finalXPGained);

            const embed = new EmbedBuilder()
                .setTitle('Crime Successful!')
                .setDescription(scenario.message.replace('{amount}', `**${earnings.toLocaleString()} embers**`))
                .setColor('#2ECC71')
                .setFooter({ text: `+${finalXPGained} XP ${xpBoost ? ' (Boost Active!)' : ''}` });
            message.reply({ embeds: [embed] });

        } else {
            // Failure
            const scenario = scenarios.failure[Math.floor(Math.random() * scenarios.failure.length)];
            let fine = Math.floor((Math.random() * (scenario.max - scenario.min) + scenario.min) * riskFactor);
            const jailed = Math.random() < 0.2; // 20% chance to get jailed

            if (jailed) {
                fine *= 2; // Double the fine for jail
                await updateCooldown(userId, 'crime', Date.now() - CRIME_COOLDOWN + 30 * 60 * 1000); // 30 minute jail time
            }

            const amountToPay = Math.min(fine, profile.wallet);
            await updateWallet(userId, -amountToPay);

            const embed = new EmbedBuilder()
                .setTitle(jailed ? 'Crime Failed and Jailed!' : 'Crime Failed!')
                .setDescription(jailed ?
                    `${scenario.message.replace('{amount}', `**${(fine / 2).toLocaleString()} embers**`)}\n\nYou got caught and sent to jail! You lost an additional **${(fine / 2).toLocaleString()} embers** (total: **${amountToPay.toLocaleString()} embers**) and must wait **30 minutes** before your next crime.` :
                    scenario.message.replace('{amount}', `**${amountToPay.toLocaleString()} embers**`))
                .setColor('#E74C3C');

            if (!jailed && fine > profile.wallet && profile.wallet > 0) {
                embed.setFooter({ text: "You couldn't afford the full amount, so you lost all your cash." });
            }

            message.reply({ embeds: [embed] });
        }
    },
};