const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with pong.'),
    cooldown: 5,
    async execute(interaction) {
        await interaction.reply('PONG');
    }
};