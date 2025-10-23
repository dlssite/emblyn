const ffmpeg = require('ffmpeg-static');

module.exports = {
    distubeOptions: {
        emitAddListWhenCreatingQueue: true,
        emitAddSongWhenCreatingQueue: true, // Enable to debug song additions
        emitNewSongOnly: false, // Enable to see all song events
        joinNewVoiceChannel: true,
        nsfw: true,
        savePreviousSongs: true,
        ffmpeg: {
            path: ffmpeg,
        },
    }
};
