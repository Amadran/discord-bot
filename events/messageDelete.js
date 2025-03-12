const { Events, AuditLogEvent, bold, messageLink } = require('discord.js');
const { createSimpleTimestampString } = require('../util.js');
const { auditLogCache } = require('../auditLogCache.js');

module.exports = {
    name: Events.MessageDelete,
    once: false,
    async execute(message) {
        const timestamp = Date.now();

        // TODO: log createdTimestamp of message

        try {
            if (!message.guild || message.partial) {
                return logChannel.send(`A message with ID ${message.id} that was a DM or partial was just deleted.`);
            }
            console.log('delete single');

            // fetching audit log is delayed to increase certainty that the log just created is retrieved
            const fetchDelayInterval = 0;
            const totalFetchDelayTime = 2000;
            await messageDeleteHandle(message, timestamp, fetchDelayInterval, totalFetchDelayTime);
        } catch (error) {
            return console.error(error);
        }
    }
};

// schedule message delete handling for a set totalTime with a delay interval
async function messageDeleteHandle(message, timestamp, delay, totalTime) {
    const startTime = Date.now();
    let deleter = null;

    // grab a message near the one deleted
    const nearbyMessage = await message.channel.messages.fetch({ limit: 1, around: message.id });

    async function handler() {
        try {
            const auditLogs = await message.guild.fetchAuditLogs({
                limit: auditLogCache.SIZE,
                type: AuditLogEvent.MessageDelete
            });
            const auditLogEntries = auditLogs.entries;

            // compare new audit logs with cached audit logs to determine who deleted this message
            if (auditLogEntries.first().id !== auditLogCache.firstKey()) {
                // new log created
                deleter = auditLogEntries.first().executor;
                auditLogCache.populate(auditLogEntries); // TODO: can make this more efficient
            } else {
                // log potentially updated (if not, the author of the message likely* deleted it)
                //      * only "likely" because we still have to poll for a bit in case there's any delay
                const auditLogEntriesArray = auditLogEntries.values().toArray();
                const auditLogCacheArray = auditLogCache.values().toArray();
                for (let i = 0; i < auditLogEntriesArray.length; i++) {
                    if (auditLogEntriesArray[i].extra.count > auditLogCacheArray[i]) {
                        deleter = auditLogEntriesArray[i].executor;
                        auditLogCache.populate(auditLogEntries); // TODO: can make this more efficient
                        break;
                    }
                }
            }

            // TODO: if deleter is not author, we could remove delete command cooldown immediately, otherwise
            // would only be as long as totalTime
            if (deleter !== null) {
                return logMessageDelete(message, deleter, nearbyMessage, timestamp);
            }

            const time = Date.now();
            if (time - startTime < totalTime) {
                setTimeout(handler, delay);
            } else {
                deleter = message.author;
                return logMessageDelete(message, deleter, nearbyMessage, timestamp);
            }
        } catch (error) {
            console.error(error);
        }
    }

    // start periodic handler, up to totalTime
    setTimeout(handler, delay);
}

// TODO: can make this an embed instead, or use old autologger?
async function logMessageDelete(message, deleter, nearbyMessage, deletedTimestamp) {
    return logChannel.send(
        `${bold('Message deleted:')}\n` +
        `Author: ${message.author}\n` +
        `Deleter: ${deleter}\n` +
        `Created at: ${createSimpleTimestampString(Math.floor(message.createdTimestamp / 1000))}\n` +
        `Deleted at: ${createSimpleTimestampString(Math.floor(deletedTimestamp / 1000))}\n\n` +
        // TODO: this appears to be a bug in the messageLink function, temporarily fixing it myself here
        `Nearby message: ${messageLink(logChannel.id, nearbyMessage.id).replace('undefined', message.id)}\n` + 
        `${bold('Content:')}\n${message.content}`
    );
}