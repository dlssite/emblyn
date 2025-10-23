const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { fontRegister } = require("./fonts/fontRegister");
const path = require("path");
const fs = require("fs");

const economyImagesPath = path.join(__dirname, "economyimages");
const fontPath = path.join(__dirname, "fonts", "inter-bold.ttf");

async function generateLeaderboardCard(topUsers) {
    const cardWidth = 1200;
    const cardHeight = 900;

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

    // Add gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, cardHeight);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.6)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // Title with glow effect
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 52px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText("🏆 Top 10 Richest Users 🏆", cardWidth / 2, 70);
    ctx.shadowBlur = 0;

    // Draw leaderboard
    const startY = 120;
    const lineHeight = 65;
    const avatarSize = 55;
    const padding = 30;

    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const y = startY + i * lineHeight;

        // Background for each entry
        const entryGradient = ctx.createLinearGradient(0, y - 10, 0, y + lineHeight - 10);
        entryGradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        entryGradient.addColorStop(1, "rgba(255, 255, 255, 0.05)");
        ctx.fillStyle = entryGradient;
        ctx.fillRect(padding, y - 10, cardWidth - 2 * padding, lineHeight);

        // Rank badge
        if (i < 3) {
            // Draw medal/badge
            ctx.fillStyle = i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : "#CD7F32";
            ctx.beginPath();
            ctx.arc(padding + 30, y + avatarSize / 2, 25, 0, Math.PI * 2);
            ctx.fill();

            // Rank number on badge
            ctx.fillStyle = "#000000";
            ctx.font = "bold 20px 'InterBold', Arial";
            ctx.textAlign = "center";
            ctx.fillText(`${i + 1}`, padding + 30, y + avatarSize / 2 + 7);
        } else {
            // Rank number for others
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 28px 'InterBold', Arial";
            ctx.textAlign = "left";
            ctx.fillText(`#${i + 1}`, padding + 10, y + 35);
        }

        // Avatar
        try {
            const avatarImage = await loadImage(user.avatarURL);
            ctx.save();
            ctx.beginPath();
            ctx.arc(padding + 90 + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImage, padding + 90, y, avatarSize, avatarSize);
            ctx.restore();

            // Avatar border
            ctx.strokeStyle = i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#FFFFFF";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(padding + 90 + avatarSize / 2, y + avatarSize / 2, avatarSize / 2 + 1, 0, Math.PI * 2);
            ctx.stroke();
        } catch (error) {
            // Fallback to default avatar
            ctx.fillStyle = "#666666";
            ctx.beginPath();
            ctx.arc(padding + 90 + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Username
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 30px 'InterBold', Arial";
        ctx.textAlign = "left";
        const usernameX = padding + 90 + avatarSize + 25;
        ctx.fillText(user.username, usernameX, y + 32);

        // Net worth with icon
        ctx.fillStyle = "#00FF00";
        ctx.font = "bold 26px 'InterBold', Arial";
        ctx.textAlign = "right";
        ctx.fillText(`💰 ${user.netWorth.toLocaleString()}`, cardWidth - padding, y + 35);
    }

    // Footer
    ctx.fillStyle = "#AAAAAA";
    ctx.font = "18px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText("Economy Leaderboard - Keep earning embers!", cardWidth / 2, cardHeight - 20);

    return canvas.toBuffer("image/png");
}

// Generate basic leaderboard card (top 10 with avatars, names, ranks, net worth)
async function generateBasicLeaderboardCard(topUsers) {
    const cardWidth = 1200;
    const cardHeight = 600; // Smaller height for basic version
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

    // Add gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, cardHeight);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.6)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // Title with glow effect
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 42px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText("🏆 Top 10 Richest Users 🏆", cardWidth / 2, 60);
    ctx.shadowBlur = 0;

    // Draw leaderboard (top 5 for basic version)
    const startY = 100;
    const lineHeight = 80;
    const avatarSize = 60;
    const padding = 30;

    const displayUsers = topUsers.slice(0, 5); // Show top 5 for basic

    for (let i = 0; i < displayUsers.length; i++) {
        const user = displayUsers[i];
        const y = startY + i * lineHeight;

        // Background for each entry
        const entryGradient = ctx.createLinearGradient(0, y - 10, 0, y + lineHeight - 10);
        entryGradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        entryGradient.addColorStop(1, "rgba(255, 255, 255, 0.05)");
        ctx.fillStyle = entryGradient;
        ctx.fillRect(padding, y - 10, cardWidth - 2 * padding, lineHeight);

        // Rank badge
        if (i < 3) {
            // Draw medal/badge
            ctx.fillStyle = i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : "#CD7F32";
            ctx.beginPath();
            ctx.arc(padding + 35, y + avatarSize / 2, 25, 0, Math.PI * 2);
            ctx.fill();

            // Rank number on badge
            ctx.fillStyle = "#000000";
            ctx.font = "bold 18px 'InterBold', Arial";
            ctx.textAlign = "center";
            ctx.fillText(`${i + 1}`, padding + 35, y + avatarSize / 2 + 7);
        } else {
            // Rank number for others
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 24px 'InterBold', Arial";
            ctx.textAlign = "left";
            ctx.fillText(`#${i + 1}`, padding + 10, y + 40);
        }

        // Avatar
        try {
            const avatarImage = await loadImage(user.avatarURL);
            ctx.save();
            ctx.beginPath();
            ctx.arc(padding + 100 + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImage, padding + 100, y, avatarSize, avatarSize);
            ctx.restore();

            // Avatar border
            ctx.strokeStyle = i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#FFFFFF";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(padding + 100 + avatarSize / 2, y + avatarSize / 2, avatarSize / 2 + 1, 0, Math.PI * 2);
            ctx.stroke();
        } catch (error) {
            // Fallback to default avatar
            ctx.fillStyle = "#666666";
            ctx.beginPath();
            ctx.arc(padding + 100 + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Username
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 26px 'InterBold', Arial";
        ctx.textAlign = "left";
        const usernameX = padding + 100 + avatarSize + 25;
        ctx.fillText(user.username, usernameX, y + 35);

        // Net worth with icon
        ctx.fillStyle = "#00FF00";
        ctx.font = "bold 22px 'InterBold', Arial";
        ctx.textAlign = "right";
        ctx.fillText(`💰 ${user.netWorth.toLocaleString()}`, cardWidth - padding, y + 38);
    }

    // Footer
    ctx.fillStyle = "#AAAAAA";
    ctx.font = "16px 'InterBold', Arial";
    ctx.textAlign = "center";
    ctx.fillText("Economy Leaderboard - Keep earning embers!", cardWidth / 2, cardHeight - 20);

    return canvas.toBuffer("image/png");
}

module.exports = { generateLeaderboardCard, generateBasicLeaderboardCard };
