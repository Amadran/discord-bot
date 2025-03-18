const CONFIG = require('../config.json');

async function getGeneralChannel(client) {
    return client.channels.fetch(CONFIG.GENERAL_CHANNEL_ID);
}

async function getLogChannel(client) {
    return client.channels.fetch(CONFIG.LOG_CHANNEL_ID);
}

async function getGuild(client) {
    return client.guilds.fetch(CONFIG.GUILD_ID);
}

module.exports = {
    getGeneralChannel,
    getLogChannel,
    getGuild
};