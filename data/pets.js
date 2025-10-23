module.exports = {
    common: [
        {
            id: 'sprite',
            name: 'Sprite',
            species: 'Sprite',
            rarity: 'Common',
            description: 'A small, playful fairy-like creature that flits through the air.',
            price: 2,
            currency: 'gold',
            stats: { attack: 5, defense: 8, speed: 15 },
            image: 'https://i.ibb.co/F4NhRGnD/sprite.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Flutter', type: 'utility', effect: { evadeChance: 10 } },
                { name: 'Dust Toss', type: 'attack', effect: { damage: 4 } }
            ],
            specialAbilities: null
        },
        {
            id: 'slime',
            name: 'Slime',
            species: 'Slime',
            rarity: 'Common',
            description: 'A wobbly blob that’s weak but surprisingly loyal.',
            price: 2,
            currency: 'gold',
            stats: { attack: 4, defense: 5, speed: 6 },
            image: 'https://i.ibb.co/tMKg3rzW/slime.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Body Slam', type: 'attack', effect: { damage: 5 } },
                { name: 'Absorb', type: 'utility', effect: { heal: 3 } }
            ],
            specialAbilities: null
        },
        {
            id: 'bat',
            name: 'Bat',
            species: 'Bat',
            rarity: 'Common',
            description: 'A nocturnal creature that relies on quick strikes.',
            price: 3,
            currency: 'gold',
            stats: { attack: 6, defense: 4, speed: 12 },
            image: 'https://i.ibb.co/8D0gkGZL/bat.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Bite', type: 'attack', effect: { damage: 6 } },
                { name: 'Screech', type: 'utility', effect: { enemyAttackDown: 3 } }
            ],
            specialAbilities: null
        },
        {
            id: 'cat',
            name: 'Cat',
            species: 'Cat',
            rarity: 'Common',
            description: 'A curious feline companion.',
            price: 3,
            currency: 'gold',
            stats: { attack: 5, defense: 5, speed: 10 },
            image: 'https://i.ibb.co/wFMw8TBm/cat.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Scratch', type: 'attack', effect: { damage: 5 } },
                { name: 'Purr', type: 'care', effect: { happiness: +10 } }
            ],
            specialAbilities: null
        },
        {
            id: 'dog',
            name: 'Dog',
            species: 'Dog',
            rarity: 'Common',
            description: 'A loyal and friendly companion.',
            price: 3,
            currency: 'gold',
            stats: { attack: 6, defense: 7, speed: 9 },
            image: 'https://i.ibb.co/XfgJDp6D/dog.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Bark', type: 'utility', effect: { enemySpeedDown: 3 } },
                { name: 'Bite', type: 'attack', effect: { damage: 6 } }
            ],
            specialAbilities: null
        },
    ],
    rare: [
        {
            id: 'wolf',
            name: 'Wolf',
            species: 'Wolf',
            rarity: 'Rare',
            description: 'A fierce predator with strong instincts.',
            price: 7,
            currency: 'gold',
            stats: { attack: 12, defense: 10, speed: 14 },
            image: 'https://i.ibb.co/xtt8Hw8V/wolf.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Howl', type: 'utility', effect: { allyAttackUp: 5 } },
                { name: 'Bite', type: 'attack', effect: { damage: 12 } }
            ],
            specialAbilities: null
        },
        {
            id: 'owl',
            name: 'Owl',
            species: 'Owl',
            rarity: 'Rare',
            description: 'A wise bird that watches over its allies.',
            price: 7,
            currency: 'gold',
            stats: { attack: 8, defense: 10, speed: 15 },
            image: 'https://i.ibb.co/39XVmFQ7/owl.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Peck', type: 'attack', effect: { damage: 8 } },
                { name: 'Keen Sight', type: 'utility', effect: { accuracyBoost: 10 } }
            ],
            specialAbilities: null
        },
        {
            id: 'fox',
            name: 'Fox',
            species: 'Fox',
            rarity: 'Rare',
            description: 'A clever trickster with swift movements.',
            price: 8,
            currency: 'gold',
            stats: { attack: 10, defense: 8, speed: 16 },
            image: 'https://i.ibb.co/QF84fBCk/fox.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Quick Bite', type: 'attack', effect: { damage: 10 } },
                { name: 'Feint', type: 'utility', effect: { dodgeChance: 15 } }
            ],
            specialAbilities: null
        },
        {
            id: 'raven',
            name: 'Raven',
            species: 'Raven',
            rarity: 'Rare',
            description: 'A dark bird often seen as an omen.',
            price: 7,
            currency: 'gold',
            stats: { attack: 9, defense: 9, speed: 14 },
            image: 'https://i.ibb.co/kgmn6d2L/raven.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Peck', type: 'attack', effect: { damage: 9 } },
                { name: 'Caw', type: 'utility', effect: { enemyDefenseDown: 4 } }
            ],
            specialAbilities: null
        },
        {
            id: 'boar',
            name: 'Boar',
            species: 'Boar',
            rarity: 'Rare',
            description: 'A sturdy animal with strong tusks.',
            price: 8,
            currency: 'gold',
            stats: { attack: 13, defense: 12, speed: 8 },
            image: 'https://i.ibb.co/FqfFkWjc/boar.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Tusk Charge', type: 'attack', effect: { damage: 13 } },
                { name: 'Stomp', type: 'utility', effect: { enemySpeedDown: 4 } }
            ],
            specialAbilities: null
        },
    ],
    epic: [
        {
            id: 'gryphon',
            name: 'Gryphon',
            species: 'Gryphon',
            rarity: 'Epic',
            description: 'A majestic creature with the body of a lion and the head and wings of an eagle.',
            price: 15,
            currency: 'gold',
            stats: { attack: 18, defense: 15, speed: 20 },
            image: 'https://i.ibb.co/mrR2V8kZ/gry.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Claw Strike', type: 'attack', effect: { damage: 18 } },
                { name: 'Wing Buffet', type: 'utility', effect: { enemyAccuracyDown: 10 } }
            ],
            specialAbilities: null
        },
        {
            id: 'unicorn',
            name: 'Unicorn',
            species: 'Unicorn',
            rarity: 'Epic',
            description: 'A pure and mystical creature of legend.',
            price: 16,
            currency: 'gold',
            stats: { attack: 15, defense: 18, speed: 16 },
            image: 'https://i.ibb.co/nMZ5VdyK/unicorn.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Horn Strike', type: 'attack', effect: { damage: 15 } },
                { name: 'Healing Light', type: 'utility', effect: { heal: 10 } }
            ],
            specialAbilities: null
        },
        {
            id: 'manticore',
            name: 'Manticore',
            species: 'Manticore',
            rarity: 'Epic',
            description: 'A dangerous beast with a venomous tail.',
            price: 16,
            currency: 'gold',
            stats: { attack: 20, defense: 14, speed: 18 },
            image: 'https://i.ibb.co/KxkkQYyw/manticon.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Tail Sting', type: 'attack', effect: { damage: 20, poison: true } },
                { name: 'Pounce', type: 'attack', effect: { damage: 16 } }
            ],
            specialAbilities: null
        },
        {
            id: 'pegasus',
            name: 'Pegasus',
            species: 'Pegasus',
            rarity: 'Epic',
            description: 'A winged horse that soars the skies.',
            price: 15,
            currency: 'gold',
            stats: { attack: 16, defense: 14, speed: 22 },
            image: 'https://i.ibb.co/Qj9zYVkh/pagasus.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Hoof Kick', type: 'attack', effect: { damage: 16 } },
                { name: 'Sky Dash', type: 'utility', effect: { dodgeChance: 20 } }
            ],
            specialAbilities: null
        },
        {
            id: 'basilisk',
            name: 'Basilisk',
            species: 'Basilisk',
            rarity: 'Epic',
            description: 'A serpent-like creature with a deadly gaze.',
            price: 17,
            currency: 'gold',
            stats: { attack: 19, defense: 16, speed: 15 },
            image: 'https://i.ibb.co/zWht0Xh0/basilisk.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Venom Fang', type: 'attack', effect: { damage: 19, poison: true } },
                { name: 'Petrify Gaze', type: 'utility', effect: { stun: true } }
            ],
            specialAbilities: null
        },
    ],
    legendary: [
        {
            id: 'phoenix',
            name: 'Phoenix',
            species: 'Phoenix',
            rarity: 'Legendary',
            description: 'A fiery bird that rises from ashes.',
            price: 20,
            currency: 'gold',
            stats: { attack: 22, defense: 17, speed: 20 },
            image: 'https://i.ibb.co/v4kd2g2x/phonix.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Flame Burst', type: 'attack', effect: { damage: 22, burn: true } },
                { name: 'Rebirth', type: 'utility', effect: { revive: true, heal: 20 } }
            ],
            specialAbilities: null
        },
        {
            id: 'dragon',
            name: 'Dragon',
            species: 'Dragon',
            rarity: 'Legendary',
            description: 'A mighty dragon with destructive power.',
            price: 21,
            currency: 'gold',
            stats: { attack: 25, defense: 20, speed: 18 },
            image: 'https://i.ibb.co/MxJD5wMp/dragon.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Fire Breath', type: 'attack', effect: { damage: 25, burn: true } },
                { name: 'Tail Smash', type: 'attack', effect: { damage: 18 } }
            ],
            specialAbilities: null
        },
        {
            id: 'leviathan',
            name: 'Leviathan',
            species: 'Leviathan',
            rarity: 'Legendary',
            description: 'A sea serpent that rules the ocean depths.',
            price: 20,
            currency: 'gold',
            stats: { attack: 23, defense: 22, speed: 15 },
            image: 'https://i.ibb.co/2YPMLX9w/levi.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Water Surge', type: 'attack', effect: { damage: 23 } },
                { name: 'Tsunami', type: 'attack', effect: { damage: 18, aoe: true } }
            ],
            specialAbilities: null
        },
        {
            id: 'kirin',
            name: 'Kirin',
            species: 'Kirin',
            rarity: 'Legendary',
            description: 'A mystical beast of prosperity and power.',
            price: 21,
            currency: 'gold',
            stats: { attack: 21, defense: 19, speed: 19 },
            image: 'https://i.ibb.co/chjmRPSK/kirin.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Lightning Hoof', type: 'attack', effect: { damage: 21, shock: true } },
                { name: 'Sacred Aura', type: 'utility', effect: { allyDefenseUp: 10 } }
            ],
            specialAbilities: null
        },
        {
            id: 'sphinx',
            name: 'Sphinx',
            species: 'Sphinx',
            rarity: 'Legendary',
            description: 'A guardian that tests mortals with riddles.',
            price: 20,
            currency: 'gold',
            stats: { attack: 19, defense: 21, speed: 18 },
            image: 'https://i.ibb.co/0jCZ12dv/spinx.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Claw Slash', type: 'attack', effect: { damage: 19 } },
                { name: 'Mind Puzzle', type: 'utility', effect: { confuse: true } }
            ],
            specialAbilities: null
        },
    ],
    mythic: [
        {
            id: 'chimera',
            name: 'Chimera',
            species: 'Chimera',
            rarity: 'Mythic',
            description: 'A monstrous fire-breathing hybrid creature.',
            price: 25,
            currency: 'gold',
            stats: { attack: 30, defense: 22, speed: 20 },
            image: 'https://i.ibb.co/SDTD7qkt/chemera.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Bite', type: 'attack', effect: { damage: 10 } },
                { name: 'Claw', type: 'attack', effect: { damage: 12 } },
                { name: 'Roar', type: 'utility', effect: { enemyDefenseDown: 5 } }
            ],
            specialAbilities: [
                { name: 'Firestorm', type: 'active', effect: { damage: 40, aoe: true } },
                { name: 'Venomous Bite', type: 'active', effect: { damage: 20, poison: true } },
                { name: 'Lion’s Roar', type: 'active', effect: { enemyDefenseDown: 20 } }
            ]
        },
        {
            id: 'behemoth',
            name: 'Behemoth',
            species: 'Behemoth',
            rarity: 'Mythic',
            description: 'A colossal beast with unmatched raw strength.',
            price: 26,
            currency: 'gold',
            stats: { attack: 32, defense: 28, speed: 12 },
            image: 'https://i.ibb.co/xKQvk0W0/behemoth.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Stomp', type: 'attack', effect: { damage: 15 } },
                { name: 'Slam', type: 'attack', effect: { damage: 18 } }
            ],
            specialAbilities: [
                { name: 'Earthquake', type: 'active', effect: { damage: 35, aoe: true } },
                { name: 'Stone Skin', type: 'passive', effect: { defenseBoost: 30 } },
                { name: 'Crushing Blow', type: 'active', effect: { damage: 45, critChance: 50 } }
            ]
        },
        {
            id: 'seraph',
            name: 'Seraph',
            species: 'Seraph',
            rarity: 'Mythic',
            description: 'A celestial guardian with divine power.',
            price: 27,
            currency: 'gold',
            stats: { attack: 28, defense: 24, speed: 25 },
            image: 'https://i.ibb.co/q37txGWP/seraph.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Smite', type: 'attack', effect: { damage: 14 } },
                { name: 'Light Touch', type: 'utility', effect: { heal: 6 } }
            ],
            specialAbilities: [
                { name: 'Holy Light', type: 'active', effect: { heal: 20, aoe: true } },
                { name: 'Judgment', type: 'active', effect: { damage: 35 } },
                { name: 'Blessing', type: 'passive', effect: { allyAttackUp: 15 } }
            ]
        },
        {
            id: 'titan',
            name: 'Titan',
            species: 'Titan',
            rarity: 'Mythic',
            description: 'A primordial giant of immense power.',
            price: 28,
            currency: 'gold',
            stats: { attack: 35, defense: 30, speed: 10 },
            image: 'https://i.ibb.co/B2SW1LZt/titan.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Punch', type: 'attack', effect: { damage: 18 } },
                { name: 'Slam', type: 'attack', effect: { damage: 20 } }
            ],
            specialAbilities: [
                { name: 'Mountain Slam', type: 'active', effect: { damage: 40, aoe: true } },
                { name: 'Unstoppable', type: 'passive', effect: { immune: ['stun', 'slow'] } },
                { name: 'Titan’s Endurance', type: 'passive', effect: { regen: 5 } }
            ]
        },
        {
            id: 'wyrm',
            name: 'Elder Wyrm',
            species: 'Wyrm',
            rarity: 'Mythic',
            description: 'An ancient dragon wyrm feared by all.',
            price: 29,
            currency: 'gold',
            stats: { attack: 34, defense: 26, speed: 18 },
            image: 'https://i.ibb.co/VpSPMMz3/wym.png',
            category: 'Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Bite', type: 'attack', effect: { damage: 16 } },
                { name: 'Tail Whip', type: 'attack', effect: { damage: 14 } }
            ],
            specialAbilities: [
                { name: 'Ancient Flame', type: 'active', effect: { damage: 35, burn: true } },
                { name: 'Wing Gust', type: 'active', effect: { enemyAccuracyDown: 15 } },
                { name: 'Arcane Wisdom', type: 'passive', effect: { xpBoost: 20 } }
            ]
        },
    ],
    exclusive: [
        {
            id: 'eevee',
            name: 'Eevee',
            species: 'Eevee',
            rarity: 'Exclusive',
            description: 'A beloved creature capable of evolving into many forms.',
            price: null, // Priceless
            currency: null,
            stats: { attack: 12, defense: 10, speed: 14 },
            image: 'https://i.ibb.co/8nJZV1TK/evee.png',
            category: 'Exclusive Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Tackle', type: 'attack', effect: { damage: 8 } },
                { name: 'Growl', type: 'utility', effect: { enemyAttackDown: 4 } }
            ],
            specialAbilities: [
                { name: 'Hug', type: 'care', effect: { happiness: +20 } },
                { name: 'Adaptability', type: 'passive', effect: { randomBuff: ['attack', 'defense', 'speed'] } },
                { name: 'Friendship Bond', type: 'passive', effect: { rewardBoost: 10 } }
            ]
        },
        {
            id: 'shadowfox',
            name: 'Shadow Fox',
            species: 'Shadow Fox',
            rarity: 'Exclusive',
            description: 'A mystical fox cloaked in shadows.',
            price: null,
            currency: null,
            stats: { attack: 18, defense: 12, speed: 20 },
            image: 'https://i.ibb.co/3ycydJqh/shadow.png',
            category: 'Exclusive Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Scratch', type: 'attack', effect: { damage: 10 } },
                { name: 'Pounce', type: 'attack', effect: { damage: 12 } }
            ],
            specialAbilities: [
                { name: 'Shadowstep', type: 'active', effect: { dodge: true } },
                { name: 'Night Prowl', type: 'passive', effect: { critBoost: 20, condition: 'night' } },
                { name: 'Illusion Veil', type: 'active', effect: { enemyAccuracyDown: 20 } }
            ]
        },
        {
            id: 'shadowwolf',
            name: 'Shadow Wolf',
            species: 'Shadow Wolf',
            rarity: 'Exclusive',
            description: 'A spectral wolf bound to the night, cloaked in shadows and feared as a hunter of the moonlit wilds.',
            price: null, // Exclusive, cannot be bought with gold
            currency: null,
            stats: { attack: 20, defense: 15, speed: 22 },
            image: 'https://i.ibb.co/DTk9yYh/shadowwolf.png', // replace with final splash art link
            category: 'Exclusive Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Fang Bite', type: 'attack', effect: { damage: 14 } },
                { name: 'Moon Howl', type: 'utility', effect: { enemyDefenseDown: 5 } }
            ],
            specialAbilities: [
                { name: 'Shadowstep', type: 'active', effect: { dodge: true } },
                { name: 'Night Hunt', type: 'passive', effect: { critBoost: 25, condition: 'night' } },
                { name: 'Eclipse Veil', type: 'active', effect: { enemyAccuracyDown: 25 } }
            ]
        },        
        {
            id: 'celestialdragon',
            name: 'Celestial Dragon',
            species: 'Celestial Dragon',
            rarity: 'Exclusive',
            description: 'A legendary dragon said to guard the heavens.',
            price: null,
            currency: null,
            stats: { attack: 30, defense: 25, speed: 22 },
            image: 'https://i.ibb.co/hRJhDwbx/celedrag.png',
            category: 'Exclusive Pets',
            type: 'pet',
            stackable: false,
            abilities: [
                { name: 'Claw Slash', type: 'attack', effect: { damage: 15 } },
                { name: 'Tail Strike', type: 'attack', effect: { damage: 17 } }
            ],
            specialAbilities: [
                { name: 'Starlight Burst', type: 'active', effect: { damage: 50 } },
                { name: 'Heaven’s Shield', type: 'active', effect: { shield: 20, duration: 3 } },
                { name: 'Eternal Radiance', type: 'passive', effect: { aoeHeal: 5 } }
            ]
        }
    ]
};