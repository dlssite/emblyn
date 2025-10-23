const stocks = {
    "DRGN": { name: "Dragon Hoard", price: 150 },
    "WIZT": { name: "Wizard's Tower", price: 40 },
    "ELIX": { name: "Elixir of Life", price: 700 },
    "CRYS": { name: "Crystal Mines", price: 150 },
    "FORG": { name: "Forge of the Ancients", price: 300 },
    "PORT": { name: "Portal Network", price: 3400 },
    "ENCH": { name: "Enchanted Forest", price: 2800 },
    "CAST": { name: "Castle Holdings", price: 350 },
    "MYTH": { name: "Mythical Beasts", price: 200 },
    "ARTF": { name: "Arcane Artifacts", price: 500 },
};

function updateStockPrices() {
    for (const stock in stocks) {
        const change = (Math.random() - 0.5) * 0.04; // -2% to +2% change
        stocks[stock].price *= (1 + change);
        if (stocks[stock].price < 1) {
            stocks[stock].price = 1;
        }
    }
}

// Update prices every 30 minutes
setInterval(updateStockPrices, 30 * 60 * 1000);

module.exports = { stocks, updateStockPrices };