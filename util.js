module.exports = {
    isSnowflake(val) {
        return typeof val === 'string' && !isNaN(parseInt(val))
    },

    // returns a Discord-formatted timestamp string (timestamp must be
    // an epoch time in seconds)
    createSimpleTimestampString(timestamp = -1) {
        let t = 0;
        if (timestamp < 0) {
            t = Math.floor(Date.now() / 1000);
        } else {
            t = timestamp;
        }

        return `<t:${t}:d> <t:${t}:T>`;
    }
};