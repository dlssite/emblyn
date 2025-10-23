const getXPForNextLevel = (level) => {
    return 100 * Math.pow(level, 2);
};

module.exports = {
    getXPForNextLevel,
};