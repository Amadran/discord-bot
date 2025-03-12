const {
    Client, Options, Collection, GatewayIntentBits, Partials,
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const CONFIG = require('./config.json');

// create a new client instance and custom properties on it
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
    //      -> could use sweeper to periodically delete "expired" cache items
    makeCache: Options.cacheEverything(),
	// makeCache: Options.cacheWithLimits({
	// 	...Options.DefaultMakeCacheSettings,
	// 	MessageManager: 0,
	// }),
});

client.commands = new Collection();
client.cooldowns = new Collection();

// load commands, store in client instance
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(file => !file.endsWith('.js'));
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// load events, set event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(CONFIG.TOKEN);