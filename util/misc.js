

module.exports = {
    isSnowflake(val) {
        return typeof val === 'string' && !isNaN(parseInt(val))
    },

    // returns a Discord-formatted timestamp string (timestamp must be
    // an epoch time in seconds)
    createSimpleTimestampString(timestamp = -1) {
        if (timestamp < 0) {
            return `<t:${Math.floor(Date.now() / 1000)}>`;
        } else {
            return `<t:${timestamp}>`;
        }
    }
};