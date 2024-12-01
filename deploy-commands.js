const { REST, Routes } = require('discord.js');
const CONFIG = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];

// get all command dirs
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(file => !file.endsWith('.js'));
for (const folder of commandFolders) {
    // for each command dir, get all command files
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    // get each serialized SlashCommandBuilder to deploy to API
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// prepare REST instance, deploy commands
const rest = new REST().setToken(CONFIG.TOKEN);

// TODO: can this be redesigned to be invoke-able from the bot?
const scriptArg = process.argv[2];
(async () => {
    try {
        switch (scriptArg) {
            case 'refresh': {
                console.log(`Started refreshing ${commands.length} application slash commands.`);

                // the put method is used to fully refresh all commands in the guild with the current set
                const data = await rest.put(
                    Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID),
                    { body: commands }
                );

                console.log(`Successfully reloaded ${data.length} application slash commands.`);
            }
                break;
            case 'delete': {
                const commandId = process.argv[3];
                
                // for guild-based commands only
                console.log(`Started deleting command with ID ${commandId}.`);
                await rest.delete(Routes.applicationGuildCommand(CONFIG.CLIENT_ID, CONFIG.GUILD_ID, commandId));
                console.log(`Successfully deleted command with ID ${commandId}.`);
            }
                break;
            case 'delete-all': {
                // for guild-based commands only
                console.log(`Started deleting all commands.`);
                await rest.put(Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID), { body: [] });
                console.log('Successfully deleted all guild commands.');
            }
                break;
            default:
                console.error('Error: accepted arguments are "refresh", "delete", and "delete-all".');
                break;
        }
    } catch (error) {
        console.error(error);
    }
})();