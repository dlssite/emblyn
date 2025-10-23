const cron = require('node-cron');
const Pet = require('../models/pets/pets');

module.exports = (client) => {
    // Schedule a task to run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log('Running stat decay task...');

        const pets = await Pet.find({ isDead: false });

        for (const pet of pets) {
            pet.stats.hunger -= 10;
            pet.stats.happiness -= 5;

            if (pet.stats.hunger < 0) pet.stats.hunger = 0;
            if (pet.stats.happiness < 0) pet.stats.happiness = 0;

            if (pet.stats.hunger === 0 || pet.stats.happiness === 0) {
                pet.stats.hp -= 5;
            }

            if (pet.stats.hp <= 0) {
                pet.isDead = true;
                console.log(`${pet.name} has died.`);
            }

            await pet.save();
        }

        console.log('Stat decay task finished.');
    });
};
