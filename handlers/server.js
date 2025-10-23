
const path = require('path');
const express = require("express");
const app = express();
const port = 3001;
app.get('/', (req, res) => {
    const imagePath = path.join(__dirname, 'index.html');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' https://emberlyn.onrender.com");
    res.sendFile(imagePath);
});
app.listen(port, () => {
    console.log(`🔗 Listening to Emberlyn D’Sanctus : http://localhost:${port}`);
});
