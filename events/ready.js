const { Events, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createSimpleTimestampString } = require('../util.js');
const { dbUsersAccepted } = require('../usersAccepted.js');
const CONFIG = require('../config.json');

const ACCEPT_RULES_MESSAGE_CONTENT = 'Please read the following rules and click the button below to accept them:';

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag} (on branch new-test)`);

        // get logging channel and the whole guild (server)
        try {
            logChannel = await client.channels.fetch(CONFIG.TEST_CHANNEL_ID);
            await logChannel.send(`Bot is ready! (${createSimpleTimestampString()})`);

            // connect to redis instance
            await dbUsersAccepted.connect();
            console.log('connected to usersAccepted database (redis)');

            // permanent button interaction test
            const acceptRulesChannel = await client.channels.fetch(CONFIG.ACCEPT_RULES_CHANNEL_ID);
            const acceptRulesChannelMessages = await acceptRulesChannel.messages.fetch();
            if (acceptRulesChannelMessages.size === 0) {
                const acceptButton = new ButtonBuilder()
                    .setCustomId('accept')
                    .setLabel('Accept Rules')
                    .setStyle(ButtonStyle.Primary);

                return await acceptRulesChannel.send({
                    content: ACCEPT_RULES_MESSAGE_CONTENT,
                    components: [new ActionRowBuilder().addComponents(acceptButton)]
                });
            }

            const acceptRulesMessage = acceptRulesChannelMessages.values().toArray()[0];
            if (acceptRulesMessage.content !== ACCEPT_RULES_MESSAGE_CONTENT) {
                await logChannel.send('ERROR: accept-rules channel button message not found or malformed');
                throw new Error('accept-rules channel button message not found or malformed');
            }
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    }
};