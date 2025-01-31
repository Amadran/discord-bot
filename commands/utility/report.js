const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const CONFIG = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Report a user using a modal form.'),
    async execute(interaction) {
        console.log(interaction.user);

        const modal = new ModalBuilder()
            .setCustomId('report')
            .setTitle('Report');

        const userInput = new TextInputBuilder()
            .setCustomId('userInput')
            .setLabel('User to report:')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reasonInput')
            .setLabel('Reason for report:')
            .setStyle(TextInputStyle.Paragraph);

        const actionrows = [
            new ActionRowBuilder().addComponents(userInput),
            new ActionRowBuilder().addComponents(reasonInput)
        ];

        modal.addComponents(actionrows);
        await interaction.showModal(modal);

        // ModalSubmitInteraction
        try {
            const modalFilter = (i) => i.user.id === interaction.user.id;
            const submission = await interaction.awaitModalSubmit({ filter: modalFilter, time: 10000 });

            // TODO: use username to find User in guild
            const username = submission.fields.getTextInputValue('userInput');
            const reason = submission.fields.getTextInputValue('reasonInput');

            const guild = await interaction.client.guilds.fetch(CONFIG.GUILD_ID);
            const guildMembers = await guild.members.fetch();

            for (const [memberId, member] of guildMembers) {
                if (member.nickname === username || member.user.username === username || member.user.globalName === username) {
                    await submission.reply({ content: `User supplied: ${member.user}\nReason supplied: ${reason}`});
                    return;
                }
            }

            await submission.reply({ content: `Username supplied: ${username}\nReason supplied: ${reason}`});
        } catch (error) {
            console.error(error);
            await interaction.followUp({ content: 'Error when trying to submit modal form (took too long or something else)', ephemeral: true });
        }
    }
};