const { Events, AuditLogEvent, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createSimpleTimestampString } = require('../util/misc.js');
const { dbUsersAccepted } = require('../usersAccepted.js');
const CONFIG = require('../config.json');
const { getLogChannel, getGuild } = require('../util/guild.js');
const { auditLogCache } = require('../auditLogCache.js');

const ACCEPT_RULES_MESSAGE_CONTENT = 'Please read the following rules and click the button below to accept them:';

// How many messages to fetch and cache, starting from the latest, in each channel.
// Set this to -1 to fetch all messages.
const NUM_MESSAGES_TO_FETCH = -1;

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        try {
            // get guild and important channel objects
            logChannel = await getLogChannel(client);
            guild = await getGuild(client);

            // fill messages cache for each channel
            // NOTE: this is done so that message deletions can be logged, because the data no longer exists to
            // be fetched once the MessageDelete event has fired from Discord's API
            const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete });
            auditLogCache.populate(auditLogs.entries);
            await cacheMessages(client, NUM_MESSAGES_TO_FETCH);

            // connect to redis instance
            await dbUsersAccepted.connect();
            console.log('Connected to usersAccepted redis database');

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

            console.log(`Bot is ready! (${createSimpleTimestampString()})`);
            await logChannel.send(`Bot is ready! (${createSimpleTimestampString()})`);
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.error('You likely forgot to start the redis container');
            }
            console.error(error);
            process.exit(1);
        }
    }
};

// TODO: this could probably be abstracted into a "cacheX" function
async function cacheMessages(client, num_msg_to_fetch = NUM_MESSAGES_TO_FETCH) {
    console.log('Caching all text channel messages...');

    for (let [channelEntryId, channelEntry] of client.channels.cache) {
        if (channelEntry.type === ChannelType.GuildText) {
            let numFetched = 100;

            // API fetch limit is 100 messages at a time
            let messagesFetched = await channelEntry.messages.fetch({ limit: 100 });
            let lastID = messagesFetched.lastKey();

            while (num_msg_to_fetch === -1 || numFetched < num_msg_to_fetch) {
                messagesFetched = await channelEntry.messages.fetch({ limit: 100, before: lastID });
                if (messagesFetched.size === 0) {
                    break;
                }

                lastID = messagesFetched.lastKey();
                numFetched += messagesFetched.size;
            }

            process.stdout.write(`${channelEntry.name} (${channelEntry.constructor.name}): ${channelEntry.messages.cache.size}\n`);
        }
    }

    console.log('Done caching text channel messages');
}