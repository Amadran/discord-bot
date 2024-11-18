const { Events } = require('discord.js');
const CONFIG = require('../config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag} (on branch new-test)`);

        // get logging channel and the whole guild (server)
        try {
            logChannel = await client.channels.fetch(CONFIG.TEST_CHANNEL_ID);
            await logChannel.send('READY');
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    }
};