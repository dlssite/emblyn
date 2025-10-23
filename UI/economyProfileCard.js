const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { fontRegister } = require("./fonts/fontRegister");
const path = require("path");
const fs = require("fs");

const economyImagesPath = path.join(__dirname, "economyimages");
const fontPath = path.join(__dirname, "fonts", "inter-bold.ttf");

// Helper function to get level from XP
const getLevel = (xp) => Math.floor(Math.pow(xp / 100, 0.5)) + 1;

// Base card setup
async function setupCanvas(cardWidth = 1200, cardHeight = 800) {
    const canvas = createCanvas(cardWidth, cardHeight);
    const ctx = canvas.getContext("2d");

    // Register font
    if (fs.existsSync(fontPath)) {
        await fontRegister(fontPath, "InterBold");
    }

    // Load EcoKingdom background image
    const backgroundImage = await loadImage(path.join(economyImagesPath, "EcoKingdom.png"));

    // Draw background
    ctx.drawImage(backgroundImage, 0, 0, cardWidth, cardHeight);

    // Add semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    return { canvas, ctx, backgroundImage };
}

// Draw user avatar and basic info
async function drawUserHeader(ctx, user, userRank, totalUsers, xp, cardWidth, cardHeight) {
    // Load user avatar
    let avatarImage;
    try {
        avatarImage = await loadImage(user.displayAvatarURL({ format: 'png', size: 128 }));
    } catch (error) {
        // Fallback to a default avatar if loading fails
        avatarImage = await loadImage('https://cdn.discordapp.com/embed/avatars/0.png');
    }

    // Draw avatar (square frame)
    const avatarSize = 120;
    const avatarX = (cardWidth - avatarSize) / 2;
    const avatarY = 50;
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);

    // Draw border around avatar
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 4;
    ctx.strokeRect(avatarX - 2, avatarY - 2, avatarSize + 4, avatarSize + 4);

    // Username
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText(user.username, cardWidth / 2, avatarY + avatarSize + 50);

    // Rank and Level
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 24px 'InterBold', Arial";
    ctx.fillText(`Rank: #${userRank} / ${totalUsers} | Level: ${getLevel(xp)}`, cardWidth / 2, avatarY + avatarSize + 90);

    return avatarY + avatarSize + 120;
}

// Generate overview card (default)
async function generateProfileCard({
    user,
    profile,
    userRank,
    totalUsers,
    netWorth,
    wallet,
    bank,
    gold,
    bankLimit,
    loanAmount,
    inventoryValue,
    investmentsValue,
    xp,
    activeEffects,
    investments,
    inventory,
}) {
    const cardWidth = 1200;
    const cardHeight = 800;
    const { canvas, ctx } = await setupCanvas(cardWidth, cardHeight);

    const yOffset = await drawUserHeader(ctx, user, userRank, totalUsers, xp, cardWidth, cardHeight);

    // Sections
    const sections = [
        { title: "Liquid Assets", data: [
            `Wallet: ${wallet.toLocaleString()} embers`,
            `Bank: ${bank.toLocaleString()} / ${bankLimit.toLocaleString()} embers`,
            `Gold: ${gold.toLocaleString()}`
        ]},
        { title: "Investments", data: [
            `Total Value: ${investmentsValue.toLocaleString()} embers`,
            ...(investments.slice(0, 3).map(inv => `${inv.symbol}: ${inv.shares} shares`))
        ]},
        { title: "Inventory", data: [
            `Total Value: ${inventoryValue.toLocaleString()} embers`,
            ...(inventory.slice(0, 3).map(item => item.name))
        ]},
        { title: "Liabilities", data: [
            `Loan: ${loanAmount.toLocaleString()} embers`
        ]},
        { title: "Net Worth", data: [
            `Total: ${netWorth.toLocaleString()} embers`
        ]}
    ];

    const sectionWidth = (cardWidth - 100) / 2;
    let currentColumn = 0;
    let currentYOffset = yOffset;

    sections.forEach(section => {
        const x = 50 + currentColumn * (sectionWidth + 50);
        const sectionHeight = 150;

        // Section background
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(x, currentYOffset, sectionWidth, sectionHeight);

        // Section title
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 22px 'InterBold', Arial";
        ctx.fillText(section.title, x + 10, currentYOffset + 30);

        // Section data
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "16px 'InterBold', Arial";
        section.data.forEach((line, index) => {
            ctx.fillText(line, x + 10, currentYOffset + 60 + index * 25);
        });

        currentColumn++;
        if (currentColumn > 1) {
            currentColumn = 0;
            currentYOffset += sectionHeight + 20;
        }
    });

    // Active Effects
    if (activeEffects.length > 0) {
        ctx.fillStyle = "#FF6B6B";
        ctx.font = "bold 18px 'InterBold', Arial";
        ctx.fillText("Active Effects:", 50, currentYOffset + 30);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "16px 'InterBold', Arial";
        activeEffects.slice(0, 3).forEach((effect, index) => {
            const remaining = Math.ceil((effect.expiresAt - Date.now()) / (60 * 1000));
            ctx.fillText(`${effect.name}: ${remaining} min`, 50, currentYOffset + 60 + index * 25);
        });
    }

    return canvas.toBuffer("image/png");
}

// Generate investments card
async function generateInvestmentsCard({ user, userRank, totalUsers, xp, investments, investmentsValue }) {
    const cardWidth = 1200;
    const cardHeight = 800;
    const { canvas, ctx } = await setupCanvas(cardWidth, cardHeight);

    const yOffset = await drawUserHeader(ctx, user, userRank, totalUsers, xp, cardWidth, cardHeight);

    // Investments section
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 28px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText("Investments", cardWidth / 2, yOffset + 50);

    ctx.fillStyle = "#00FF00";
    ctx.font = "bold 24px 'InterBold', Arial";
    ctx.fillText(`Total Value: ${investmentsValue.toLocaleString()} embers`, cardWidth / 2, yOffset + 100);

    // List investments
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "18px 'InterBold', Arial";
    ctx.textAlign = "left";
    investments.forEach((inv, index) => {
        const y = yOffset + 150 + index * 40;
        ctx.fillText(`${inv.symbol}: ${inv.shares} shares @ ${inv.purchasePrice} each`, 100, y);
    });

    return canvas.toBuffer("image/png");
}

// Generate inventory card
async function generateInventoryCard({ user, userRank, totalUsers, xp, inventory, inventoryValue }) {
    const cardWidth = 1200;
    const cardHeight = 800;
    const { canvas, ctx } = await setupCanvas(cardWidth, cardHeight);

    const yOffset = await drawUserHeader(ctx, user, userRank, totalUsers, xp, cardWidth, cardHeight);

    // Inventory section
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 28px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText("Inventory", cardWidth / 2, yOffset + 50);

    ctx.fillStyle = "#00FF00";
    ctx.font = "bold 24px 'InterBold', Arial";
    ctx.fillText(`Total Value: ${inventoryValue.toLocaleString()} embers`, cardWidth / 2, yOffset + 100);

    // List inventory
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "18px 'InterBold', Arial";
    ctx.textAlign = "left";
    inventory.forEach((item, index) => {
        const y = yOffset + 150 + index * 40;
        ctx.fillText(`${item.name} (${item.purchasePrice || 'N/A'} embers)`, 100, y);
    });

    return canvas.toBuffer("image/png");
}

// Generate assets card
async function generateAssetsCard({ user, userRank, totalUsers, xp, wallet, bank, gold, bankLimit }) {
    const cardWidth = 1200;
    const cardHeight = 800;
    const { canvas, ctx } = await setupCanvas(cardWidth, cardHeight);

    const yOffset = await drawUserHeader(ctx, user, userRank, totalUsers, xp, cardWidth, cardHeight);

    // Assets section
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 28px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText("Assets", cardWidth / 2, yOffset + 50);

    // List assets
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "20px 'InterBold', Arial";
    const assets = [
        `Wallet: ${wallet.toLocaleString()} embers`,
        `Bank: ${bank.toLocaleString()} / ${bankLimit.toLocaleString()} embers`,
        `Gold: ${gold.toLocaleString()}`
    ];
    assets.forEach((asset, index) => {
        ctx.fillText(asset, cardWidth / 2, yOffset + 120 + index * 50);
    });

    return canvas.toBuffer("image/png");
}

// Generate liabilities card
async function generateLiabilitiesCard({ user, userRank, totalUsers, xp, loanAmount }) {
    const cardWidth = 1200;
    const cardHeight = 800;
    const { canvas, ctx } = await setupCanvas(cardWidth, cardHeight);

    const yOffset = await drawUserHeader(ctx, user, userRank, totalUsers, xp, cardWidth, cardHeight);

    // Liabilities section
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 28px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText("Liabilities", cardWidth / 2, yOffset + 50);

    // List liabilities
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "20px 'InterBold', Arial";
    ctx.fillText(`Loan: ${loanAmount.toLocaleString()} embers`, cardWidth / 2, yOffset + 120);

    return canvas.toBuffer("image/png");
}

// Generate basic profile card (avatar, name, rank, level)
async function generateBasicProfileCard({ user, userRank, totalUsers, xp }) {
    const cardWidth = 1200;
    const cardHeight = 400; // Smaller height since no sections
    const { canvas, ctx } = await setupCanvas(cardWidth, cardHeight);

    await drawUserHeader(ctx, user, userRank, totalUsers, xp, cardWidth, cardHeight);

    return canvas.toBuffer("image/png");
}

// Generate effects card
async function generateEffectsCard({ user, userRank, totalUsers, xp, activeEffects }) {
    const cardWidth = 1200;
    const cardHeight = 800;
    const { canvas, ctx } = await setupCanvas(cardWidth, cardHeight);

    const yOffset = await drawUserHeader(ctx, user, userRank, totalUsers, xp, cardWidth, cardHeight);

    // Effects section
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 28px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText("Active Effects", cardWidth / 2, yOffset + 50);

    if (activeEffects.length === 0) {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "20px 'InterBold', Arial";
        ctx.fillText("No active effects", cardWidth / 2, yOffset + 120);
    } else {
        // List effects
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "18px 'InterBold', Arial";
        ctx.textAlign = "left";
        activeEffects.forEach((effect, index) => {
            const remaining = Math.ceil((effect.expiresAt - Date.now()) / (60 * 1000));
            const y = yOffset + 120 + index * 60;
            ctx.fillText(`${effect.name}: ${effect.description || 'No description'} (${remaining} min remaining)`, 100, y);
        });
    }

    return canvas.toBuffer("image/png");
}

module.exports = {
    generateProfileCard,
    generateBasicProfileCard,
    generateInvestmentsCard,
    generateInventoryCard,
    generateAssetsCard,
    generateLiabilitiesCard,
    generateEffectsCard
};
