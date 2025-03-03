///////////////////////////MODULES AND OTHER SETUP///////////////////////////////

const {
    Client, Options, Collection, Events, GatewayIntentBits, Partials, ChannelType, AuditLogEvent,
    bold, messageLink
} = require('discord.js');
const fs = require('fs');
const CONFIG = require("./config.json");
const { createSimpleTimestampString } = require('./util.js');

// establish bot client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ],
    // TODO: decide how we want to cache messages, for now just cache everything
    makeCache: Options.cacheEverything(),
    // makeCache: Options.cacheWithLimits({
    // 	...Options.DefaultMakeCacheSettings,
    // 	MessageManager: 0,
    // }),
});

// How many messages to fetch and cache, starting from the latest, in each channel.
// Set this to -1 to fetch all messages.
const NUM_MESSAGES_TO_FETCH = 300;

// // load in all bot commands into 'commands' collection
// const commands = new Collection();
// const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
// for (let file of commandFiles) {
//     const command = require(`./commands/${file}`);
//     commands.set(command.name, command);
// }

// // load in bot's edit and delete logger
// const autologFile = fs.readdirSync('./auto').filter(file => file.endsWith('.js'));
// const autoLogger = require(`./auto/${autologFile}`);
// // const prevAuditIDFilename = './auto/previousAuditID.txt';
// // let prevAuditID = fs.readFileSync(prevAuditIDFilename, {encoding: 'utf8'});

// would be const if they could be declared here (may just hard-code in the ID's though)
let logChannel;
let generalChannel;
let guildBitterrfly;

// cache audit log entry counts (AuditLogEntry.extra.count), to keep track of which ones have updated
const AUDIT_LOG_COUNT_CACHE_SIZE = 50; // do we want to limit audit log cache size?
const auditLogCountCache = new Collection();

///////////////////////////EVENT HANDLERS///////////////////////////////

// additional bot client setup
client.once(Events.ClientReady, async () => {
    // get logging channel and the whole guild (server)
    try {
        logChannel = await client.channels.fetch(CONFIG.TEST_CHANNEL_ID);
        generalChannel = await client.channels.fetch(CONFIG.GENERAL_CHANNEL_ID);
        guildBitterrfly = await client.guilds.fetch(CONFIG.GUILD_ID);
        const auditLogs = await guildBitterrfly.fetchAuditLogs({ type: AuditLogEvent.MessageDelete });

        // console.log(`NUM AUDIT LOGS: ${auditLogs.entries.size}`);
        // const auditLogsArray = auditLogs.entries.values().toArray();
        // for (const [entryId, entry] of auditLogs.entries) {
        // 	// console.log('ENTRY:');
        // 	// console.log(util.inspect(entry, { depth: 2, colors: true }));
        //     console.log(`ID: ${entryId}    count: ${entry.extra.count}`);
        // }

        populateAuditLogCountCache(auditLogs.entries, auditLogCountCache);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    // fill messages cache for each channel
    // NOTE: this is done so that message deletions can be logged, because the data no longer exists to
    // be fetched once the MessageDelete event has fired from Discord's API
    try {
        await cacheMessages(NUM_MESSAGES_TO_FETCH);
        console.log('1');
    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    console.log('Ready!');
    logChannel.send(`I has been revived! (${new Date()})`);
});

client.on(Events.GuildAuditLogEntryCreate, async (auditLog) => {
    const timestamp = Date.now();
    console.log(auditLog.id);

    if (auditLog.action === AuditLogEvent.MessageBulkDelete) {
        return console.log('TODO: handling audit logs for bulk deletes');
    } else if (auditLog.action !== AuditLogEvent.MessageDelete) {
        return;
    }

    auditLogCountCache.set(auditLog.id, auditLog.extra.count);
    await logAuditLogCreateMessageDelete(auditLog, timestamp);
});

// to log deleted messages (also attempts to determine who deleted it through audit logs)
client.on(Events.MessageDelete, async (message) => {
    // console.log(message);
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
});

// client.on(Events.MessageBulkDelete, async (messages) => {
//     console.log('delete bulk');

//     const lastDeleted = messages.last();
//     let prevMessage;
//     try {
//         prevMessage = await lastDeleted.channel.messages.fetch({limit: 1, before: lastDeleted.id});
//     } catch (error) {
//         return console.error(error);
//     }

//     logEachDelete(prevMessage.first(), messages);
// });

// // to handle incoming messages as commands
// // performs multiple checks (form of command, roles, etc.) before executing the command
// client.on(Events.MessageCreate, message => {
//     // checks if message is a user-issued command
//     if (!message.content.startsWith(CONFIG.PREFIX) || message.author.bot) {
//         return;
//     }

//     // extract command from message
//     const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
//     const commandName = args.shift().toLowerCase();
//     const command = commands.get(commandName)
//         || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

//     if (!command) {
//         return message.reply("that command doesn't seem to exist");
//     }

//     // checks if user has the appropriate roles to use the command
//     if (!checkRoles(command.roleIDs, message)) {
//         return message.reply(`you don't have the permissions to use this command`);
//     }

//     // checks if proper number of non-tag arguments were supplied
//     if (command.argsRequired && !args.length) {
//         return message.reply(`you need to provide arguments\nUsage: ${command.usage}`);
//     }

//     // checks if proper number of tags/mentions were supplied
//     if (command.tagsRequired && !args.length) {
//         return message.reply(`you need to mention at least one user or role\nUsage: ${command.usage}`);
//     }

//     try {
//         command.execute(message, args);
//     } catch (error) {
//         console.error(error);
//         return message.reply('there was an error processing your command, try again');
//     }
// });

// // to log edited messages
// client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
//     // ignore anything from the bot and ignore automatic embeds for links
//     if (newMessage.author.bot || oldMessage.content.match(/^https?:\/\//)) {
//         return;
//     }

//     if (newMessage.content.startsWith(CONFIG.PREFIX)) {
//         newMessage.reply("editing an already sent command doesn't do anything");
//     } else {
//         autoLogger.log(oldMessage, newMessage, logChannel, null);
//     }
// });

// // assign roles on reacting with specific emoji to certain (pinned) message
// client.on(Events.MessageReactionAdd, async (reaction, user) => {
//     if (reaction.partial) {
//         try {
//             await reaction.fetch();
//         } catch (error) {
//             console.error(error);
//             return logChannel.send('Something went wrong when fetching reactions!');
//         }
//     }

//     if (reaction.message.id === CONFIG.PINNED_MSG_ID && reaction.emoji.id === CONFIG.REACTION_EMOJI_ID) {
//         const member = await guildBitterrfly.members.fetch(user.id);
//         member.roles.add(CONFIG.REACTION_ROLE_ID);
//     }
// });

//client.on('debug', console.log);

client.login(CONFIG.TOKEN);



////////////////////////////////HELPER FUNCTIONS///////////////////////////////////

function logEachDelete(prevMessage, messages) {
    for (let msgEntry of messages) {
        if (!msgEntry[1].partial) {
            autoLogger.log(msgEntry[1], null, logChannel, prevMessage);
        }
    }
}

function checkRoles(roles, message) {
    let hasRole = false;
    for (let role of roles) {
        console.log('in loop');
        if (message.member.roles.cache.has(role)) {
            hasRole = true;
            break;
        }
    }

    return hasRole;
}

function populateAuditLogCountCache(auditLogs, countCache) {
    for (const [logId, log] of auditLogs.entries()) {
        countCache.set(logId, log.extra.count);
    }
}

// TODO: this could probably be abstracted into a "cacheX" function
async function cacheMessages(num_msg_to_fetch = NUM_MESSAGES_TO_FETCH) {
    for (let [channelEntryId, channelEntry] of client.channels.cache) {
        console.log('---------------------------------------------------------------------------');
        console.log(channelEntry.constructor.name);
        if (channelEntry.type === ChannelType.GuildText) {
            let numFetched = 100;

            // API fetch limit is 100 messages at a time
            let messagesFetched = await channelEntry.messages.fetch({limit: 100});
            let lastID = messagesFetched.lastKey();

            while (num_msg_to_fetch === -1 || numFetched < num_msg_to_fetch) {
                messagesFetched = await channelEntry.messages.fetch({limit: 100, before: lastID});
                if (messagesFetched.size === 0) {
                    break;
                }

                lastID = messagesFetched.lastKey();
                numFetched += messagesFetched.size;
                console.log(numFetched);
            }

            // channelEntry.messages.cache.each(msg => console.log(msg.createdAt + ': ' + msg.content));
            console.log('size: ' + channelEntry.messages.cache.size);
            console.log('---------------------------------------------------------------------------');
        }
    }
}

// schedule message delete handling for a set totalTime with a delay interval
async function messageDeleteHandle(message, timestamp, delay, totalTime) {
    const startTime = Date.now();
    let deleter = null;

    // grab a message near the one deleted
    const nearbyMessage = await message.channel.messages.fetch({ limit: 1, around: message.id });

    async function handler() {
        try {
            const auditLogs = await message.guild.fetchAuditLogs({
                limit: AUDIT_LOG_COUNT_CACHE_SIZE,
                type: AuditLogEvent.MessageDelete
            });
            const auditLogEntries = auditLogs.entries;

            // compare new audit logs with cached audit logs to determine who deleted this message
            if (auditLogEntries.first().id !== auditLogCountCache.firstKey()) {
                // new log created
                deleter = auditLogEntries.first().executor;
                populateAuditLogCountCache(auditLogEntries, auditLogCountCache); // TODO: can make this more efficient
            } else {
                // log potentially updated (if not, the author of the message likely* deleted it)
                //      * only "likely" because we still have to poll for a bit in case there's any delay
                const auditLogEntriesArray = auditLogEntries.values().toArray();
                const auditLogCountCacheArray = auditLogCountCache.values().toArray();
                for (let i = 0; i < auditLogEntriesArray.length; i++) {
                    if (auditLogEntriesArray[i].extra.count > auditLogCountCacheArray[i]) {
                        deleter = auditLogEntriesArray[i].executor;
                        populateAuditLogCountCache(auditLogEntries, auditLogCountCache); // TODO: can make this more efficient
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
        `Nearby message: ${messageLink(logChannel.id, nearbyMessage.id).replace('undefined', message.id)}\n` + 
        `${bold('Content:')}\n${message.content}`
    );
}

// TODO: can make this an embed instead, or use old autologger?
async function logAuditLogCreateMessageDelete(auditLog, timestamp) {
    return logChannel.send(
        `${bold('Message delete audit log entry created:')}\n` + 
        `ID: ${auditLog.id}\n` + 
        `Author: ${auditLog.target}\n` + 
        `Deleter: ${auditLog.executor}\n` + 
        `Timestamp: ${createSimpleTimestampString(Math.floor(timestamp / 1000))}`
    );
}