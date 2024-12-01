const { SlashCommandBuilder } = require('discord.js');
const queryChoices = ['info', 'mykick', 'ping', 'reload', 'server', 'user']; // TODO: this should be dynamically populated
const queryResponses = [
    'Info about all of the commands this bot has to offer.',
    'Kicks a user.',
    'Send a ping to the bot.',
    'Reload a given command if its execution functions have been updated live.',
    'Returns information about the server.',
    'Returns information about the user who used this command.'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Info about this bot.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Query made on a specific command of this bot.')
                .setAutocomplete(true)
        ),
        async autocomplete(interaction) {
            const focusedOption = interaction.options.getFocused(true);
            let choices;

            if (focusedOption.name === 'query') {
                choices = queryChoices;
            }

            const filtered = choices.filter(choice => choice.startsWith(focusedOption.value));
            await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })));
        },
        async execute(interaction) {
            const query = interaction.options.getString('query');
            const queryResponse = queryResponses[queryChoices.indexOf(query)];
            
            try {
                await interaction.reply({ content: `**Info query response:** \n${queryResponse}`, ephemeral: true });
            } catch (error) {
                console.error(error);
            }
        }
};