const axios = require('axios');
const dotenv = require('dotenv');
const client = require('./main');
dotenv.config();
const BACKEND = 'https://server-backend-tdpa.onrender.com';

client.once('ready', async () => {
    const payload = {
        name:     client.user.tag,
        avatar:   client.user.displayAvatarURL({ format: 'png', size: 128 }),
        timestamp: new Date().toISOString(),
    };

    try {
        await axios.post(`${BACKEND}/api/bot-info`, payload);
    } catch (err) {
        //console.error('❌ Failed to connect:', err.message);
    }
    
    console.log(`🤖 ${client.user.tag} is online with AI chat capabilities!`);
});

let serverOnline = true;

module.exports = {
    isServerOnline: function() {
        return serverOnline;
    }
};