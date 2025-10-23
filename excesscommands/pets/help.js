const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Displays a list of all available pet commands.',
    aliases: ['h'],
    execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('🐾 Pet Command Help')
            .setDescription('Here is a list of all available commands for managing your pets. You can use `$p` as an alias for `$pet`.')
            .setColor('#4E4EC8')
            .addFields(
                {
                    name: 'General Commands',
                    value: '`$pet help ` - Displays the list of available commands.\n' +
                           '`$pet info  <pet_name>` - Shows detailed information about a specific pet.\n' +
                           '`$pet list ` - Lists all the pets you currently own.\n' +
                           '`$pet inventory ` - Displays your inventory of pet-related items.\n' +
                           '`$pet set <pet_name>` - Sets a pet as your active battle companion.',
                    inline: false
                },
                {
                    name: 'Pet Care',
                    value: '`$pet feed` - Feeds your active pet to restore hunger.\n' +
                           '`$pet play` - Plays with your pet to boost happiness.\n' +
                           '`$pet rest` - Allows your pet to rest and regain energy.\n' +
                           '`$pet heal` - Heals your pet using medicine.\n' +
                           '`$pet train` - Trains your pet to improve its stats.',
                    inline: false
                },
                {
                    name: 'Adventure & Evolution',
                    value: '`$pet adventure  <pet_name>` - Sends your pet on an adventure to find items and XP.\n' +
                           '`$pet evolve  <pet_name>` - Evolves your pet to its next stage.',
                    inline: false
                },
                {
                    name: 'Item & Trading',
                    value: '`$pet shop ` - Opens the pet shop to browse and purchase pets, eggs, and supplies.\n' +
                           '`$pet buy  <item_id> [quantity]` - Buys a specified quantity of an item from the shop.\n' +
                           '`$pet use <item_name>` - Uses an item from your inventory.\n' +
                           '`$pet hatch <egg_name>` - Hatches an egg to reveal a new pet.\n' +
                           '`$pet gift <@user> <item_name>` - Gifts an item or pet to another user.\n' +
                           '`$pet trade <@user> <your_pet> <their_pet>` - Initiates a trade with another user to exchange pets.',
                    inline: false
                },
                {
                    name: 'Battle Commands',
                    value: '`$pet battle <@user> <pet_name>` - Challenges another user to a pet battle.\n' +
                           '`$pet move <move_name>` - Executes a specific move during a battle.',
                    inline: false
                },
                {
                    name: 'World Events',
                    value: '`$pet event` - Displays information about the current world event.\n' +
                           '`$pet boss` - Joins the ongoing boss battle.',
                    inline: false
                },
                {
                    name: 'Admin Commands',
                    value: '`$pet spawnboss` - Spawns a world boss for players to battle.\n' +
                           '`$pet give <@user> <item_name> [quantity]` - Gives a specified item or pet to a user.\n' +
                           '`$pet fixinventory` - Scans and repairs any corrupted or invalid items in user inventories.\n' +
                           '`$pet clearcorrupted` - Removes all glitched or broken pets from the database.\n' +
                           '`$pet clear` - **[DANGEROUS]** Deletes all pet-related data for a user.',
                    inline: false
                }
            );

        message.channel.send({ embeds: [embed] });
    },
};