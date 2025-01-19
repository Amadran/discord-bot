const { Events, Collection } = require('discord.js');
const { dbUsersAccepted } = require('../usersAccepted.js');
const CONFIG = require('../config.json');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching '${interaction.commandName}' was found.`);
                return;
            }

            const { cooldowns } = interaction.client;

            // create a timestamps collection if command does not yet have one
            // TODO: maybe move this into some setup location instead?
            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }

            // get time now and cooldown amount
            const now = Date.now();
            const defaultCooldownDuration = 3;
            const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;
        
            // get cooldown timestamps of this command
            // (timestamp = when command was successfully run by user, NOT last time command was attempted)
            const timestamps = cooldowns.get(command.data.name);
            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                if (now < expirationTime) {
                    const timeLeft = Math.round((expirationTime - now) / 1000);
                    return interaction.reply({
                        content: `You cannot use the \`${command.data.name}\` command yet, please wait another ${timeLeft} seconds`,
                        ephemeral: true
                    });
                }
            }
            
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: 'There was an error while executing this command!',
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: 'There was an error while executing this command!',
                        ephemeral: true
                    });
                }
            }
        } else if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(error);
            }
        } else if (interaction.isButton()) {
            // permanent button interaction test
            const logChannel = await interaction.client.channels.fetch(CONFIG.TEST_CHANNEL_ID);
            const acceptRulesChannel = await interaction.client.channels.fetch(CONFIG.ACCEPT_RULES_CHANNEL_ID);
            
            const isAccepted = await dbUsersAccepted.get(interaction.user.id);
            if (!isAccepted) {
                dbUsersAccepted.set(interaction.user.id, 1);
                await interaction.reply({ content: 'You accepted the rules.', ephemeral: true});
                await logChannel.send(`${interaction.user} has accepted the rules.`);
            } else {
                await interaction.reply({ content: 'You\'ve already accepted the rules!', ephemeral: true });
            }
        }
    }
};