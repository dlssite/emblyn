const { ActivityType } = require('discord.js');

module.exports = {
  ownerId: '838092589344489532',
  status: {
    rotateDefault: [
      // Streaming & Watching
      { name: 'Netflix & not replying', type: ActivityType.Watching },
      { name: 'chaos on TikTok', type: ActivityType.Watching },
      { name: 'live fails on YouTube', type: ActivityType.Streaming, url: 'https://www.youtube.com/@Katsumi_Studio' },
      { name: 'clips on Twitch', type: ActivityType.Streaming, url: 'https://www.twitch.tv/mommykhorne' },
  
      // Playing
      { name: 'GTA VI (finally)', type: ActivityType.Playing },
      { name: 'Genshin... again.', type: ActivityType.Playing },
      { name: 'with my sanity in Valorant', type: ActivityType.Playing },
      { name: 'solo queue regrets', type: ActivityType.Playing },
      { name: 'keyboard ASMR', type: ActivityType.Playing },
  
      // Listening
      { name: 'lofi beats to zone out to', type: ActivityType.Listening },
      { name: 'Spotify playlists I never finish', type: ActivityType.Listening },
      { name: 'people overshare on Twitter/X', type: ActivityType.Listening },
      { name: 'my Discord notifications', type: ActivityType.Listening },
  
      // Watching / Misc
      { name: 'you type... and delete', type: ActivityType.Watching },
      { name: 'my mental health bar drop', type: ActivityType.Watching },
      { name: 'for pings I’ll ignore', type: ActivityType.Watching },
      { name: 'bad takes online', type: ActivityType.Watching }
    ],
    songStatus: true
  },  
  spotifyClientId: "f71a3da30e254962965ca2a89d6f74b9",
  spotifyClientSecret: "199a619d22dd4e55a4a2c1a7a3d70e63",
}
