///////////////////////////MODULES AND OTHER SETUP///////////////////////////////

const { Client, Collection, Events, GatewayIntentBits, Partials, ChannelType, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const CONFIG = require("./config.json");

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
    messageCacheMaxSize: 500,
    messageEditHistoryMaxSize: 50
});

// load in all bot commands into 'commands' collection
const commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (let file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.name, command);
}

// load in bot's edit and delete logger
const autologFile = fs.readdirSync('./auto').filter(file => file.endsWith('.js'));
const autoLogger = require(`./auto/${autologFile}`);
// const prevAuditIDFilename = './auto/previousAuditID.txt';
// let prevAuditID = fs.readFileSync(prevAuditIDFilename, {encoding: 'utf8'});

// would be const if they could be declared here (may just hard-code in the ID's though)
let logChannel;
let guildBitterrfly;

// collection to keep track of whether or not the 'count' property has changed in an audit log entry
const numLogsToFetch = 10;
let auditLogCounts;


///////////////////////////EVENT HANDLERS///////////////////////////////

// additional bot client setup
client.once(Events.ClientReady, async () => {
    // get logging channel and the whole guild (server)
    try {
        logChannel = await client.channels.fetch(CONFIG.TEST_CHANNEL_ID);
        guildBitterrfly = await client.guilds.fetch(CONFIG.GUILD_ID);
        let initialFetchedLogs = await guildBitterrfly.fetchAuditLogs({limit: numLogsToFetch, type: AuditLogEvent.MessageDelete});
        auditLogCounts = collapseToCounts(initialFetchedLogs);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    // fill messages cache for each channel
    // NOTE: this is done so that message deletions can be logged, because the data no longer exists to
    // be fetched once the MessageDelete event has fired
    try {
        for (let channelEntry of client.channels.cache) {
            if (channelEntry[1].type === ChannelType.GuildText) {
                let numFetched = 100;
                let messagesFetched = await channelEntry[1].messages.fetch({limit: 100});
                let lastID = messagesFetched.lastKey();

                while (numFetched < client.options.messageCacheMaxSize) {
                    messagesFetched = await channelEntry[1].messages.fetch({limit: 100, before: lastID});
                    lastID = messagesFetched.lastKey();
                    numFetched += 100;
                }

                // channelEntry[1].messages.cache.each(msg => console.log(msg.content));
                // console.log('size: ' + channelEntry[1].messages.cache.size);
            }
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    console.log('Ready!');
    logChannel.send(`I has been revived! (${new Date()})`);
});

// to handle incoming messages as commands
// performs multiple checks (form of command, roles, etc.) before executing the command
client.on(Events.MessageCreate, message => {
    // checks if message is a user-issued command
    if (!message.content.startsWith(CONFIG.PREFIX) || message.author.bot) {
        return;
    }

    // extract command from message
    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName)
        || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) {
        return message.reply("that command doesn't seem to exist");
    }

    // checks if user has the appropriate roles to use the command
    if (!checkRoles(command.roleIDs, message)) {
        return message.reply(`you don't have the permissions to use this command`);
    }

    // checks if proper number of non-tag arguments were supplied
    if (command.argsRequired && !args.length) {
        return message.reply(`you need to provide arguments\nUsage: ${command.usage}`);
    }

    // checks if proper number of tags/mentions were supplied
    if (command.tagsRequired && !args.length) {
        return message.reply(`you need to mention at least one user or role\nUsage: ${command.usage}`);
    }

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        return message.reply('there was an error processing your command, try again');
    }
});

// to log edited messages
client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    // ignore anything from the bot and ignore automatic embeds for links
    if (newMessage.author.bot || oldMessage.content.match(/^https?:\/\//)) {
        return;
    }

    if (newMessage.content.startsWith(CONFIG.PREFIX)) {
        newMessage.reply("editing an already sent command doesn't do anything");
    } else {
        autoLogger.log(oldMessage, newMessage, logChannel, null);
    }
});

// to log deleted messages (also attempts to determine who deleted it through audit logs)
client.on(Events.MessageDelete, async (message) => {
    try {
        if (!message.guild || message.partial) {
            return logChannel.send(`A message with ID ${message.id} that was a DM or partial was just deleted.`);
        }
        console.log('delete single');

        // grab a message near the one deleted
        const nearbyMessages = await message.channel.messages.fetch({limit: 1, around: message.id});

        // fetching audit log is delayed to increase certainty that the log just created is retrieved
        const fetchWaitTime = 1000;
        setTimeout(async (nearbyMessages) => {
            try {
                const fetchedLogs = await message.guild.fetchAuditLogs({limit: numLogsToFetch, type: AuditLogEvent.MessageDelete});
                let deleter;
                if (auditLogCounts.firstKey() === fetchedLogs.entries.firstKey()) {
                    console.log('first log ID same');
                    for (let oldLog of auditLogCounts.entries()) {
                        if (fetchedLogs.entries.get(oldLog[0]).extra.count > oldLog[1]) {
                            console.log('certain log count increased');
                            deleter = fetchedLogs.entries.get(oldLog[0]).executor;
                            break;
                        } else {
                            console.log('no log counts changed');
                            deleter = message.author;
                        }
                    }
                } else {
                    console.log('new log added');
                    deleter = fetchedLogs.entries.get(fetchedLogs.entries.firstKey()).executor;
                }

                autoLogger.log(message, null, logChannel, nearbyMessages.first(), deleter);
                auditLogCounts = collapseToCounts(fetchedLogs);
                deleter === message.author ? console.log('author delete') : console.log('mod delete');
            } catch (error) {
                console.error(error);
                return autoLogger.log(message, null, logChannel, null, null);
            }
        }, fetchWaitTime, nearbyMessages);
    } catch (error) {
        return console.error(error);
    }
});

client.on(Events.MessageBulkDelete, async (messages) => {
    console.log('delete bulk');

    const lastDeleted = messages.last();
    let prevMessage;
    try {
        prevMessage = await lastDeleted.channel.messages.fetch({limit: 1, before: lastDeleted.id});
    } catch (error) {
        return console.error(error);
    }

    logEachDelete(prevMessage.first(), messages);
});

// assign roles on reacting with specific emoji to certain (pinned) message
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error(error);
            return logChannel.send('Something went wrong when fetching reactions!');
        }
    }

    if (reaction.message.id === CONFIG.PINNED_MSG_ID && reaction.emoji.id === CONFIG.REACTION_EMOJI_ID) {
        const member = await guildBitterrfly.members.fetch(user.id);
        member.roles.add(CONFIG.REACTION_ROLE_ID);
    }
});

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

function collapseToCounts(auditLogCollection) {
    let counts = new Collection();
    for (let log of auditLogCollection.entries.entries()) {
        counts.set(log[1].id, log[1].extra.count);
    }
    return counts;
}