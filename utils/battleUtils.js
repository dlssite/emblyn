const resolveAttack = (attacker, defender, ability) => {
    const attackMessage = [];

    // Check for miss
    const hitChance = ability.accuracy || 95; // Default 95% accuracy
    if (Math.random() * 100 > hitChance) {
        attackMessage.push(`${attacker.name} used **${ability.name}**, but it missed!`);
        return { damage: 0, newDefenderHealth: defender.stats.hp, message: attackMessage.join('\n') };
    }

    // Calculate base damage
    const baseDamage = ability.effect.damage || (attacker.stats.attack / 2);

    // Check for critical hit
    const criticalChance = 5; // 5% chance
    const isCritical = Math.random() * 100 < criticalChance;
    const rawDamage = isCritical ? baseDamage * 1.5 : baseDamage;

    // Apply defense
    const defenseMitigation = Math.round(defender.stats.defense * 0.5);
    let finalDamage = Math.round(rawDamage) - defenseMitigation;
    if (finalDamage < 1 && ability.effect.damage > 0) {
        finalDamage = 1;
    } else if (finalDamage < 0) {
        finalDamage = 0;
    }
    
    // Apply status effects from the move
    if (ability.effect.status) {
        const status = ability.effect.status;
        if (!defender.statusEffects.some(e => e.type === status.type)) {
            defender.statusEffects.push({ ...status, turns: status.duration });
            attackMessage.push(`${defender.name} is now **${status.type}**!`);
        }
    }

    // Final damage calculation and message
    const newDefenderHealth = defender.stats.hp - finalDamage;
    attackMessage.unshift(
        `${attacker.name} uses **${ability.name}**.${isCritical ? ' It was a critical hit!' : ''}\n` +
        `Raw Damage: **${Math.round(rawDamage)}**. ${defender.name}'s Defense Blocked: **${defenseMitigation}**.\n`+
        `Final Damage: **${finalDamage}**.`
    );

    return { damage: finalDamage, newDefenderHealth, message: attackMessage.join('\n') };
};

module.exports = { resolveAttack };