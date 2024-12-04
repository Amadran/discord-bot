const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    InteractionContextType,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ActionRow
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mykick')
        .setDescription('Kick a member (custom).')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to kick.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for kicking this member.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setContexts(InteractionContextType.Guild),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided.';

        const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm Kick')
            .setStyle(ButtonStyle.Danger);
        
        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(cancel, confirm);

        const response = await interaction.reply({
            content: `Are you sure you want to kick ${target} for reason ${reason}?`,
            components: [row]
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 });

            if (confirmation.customId === 'confirm') {
                await interaction.guild.members.kick(target);
                await confirmation.update({ content: `${target.username} has been kicked for reason ${reason}`, components: [] });
            } else if (confirmation.customId === 'cancel') {
                await confirmation.update({ content: `Action cancelled`, components: [] });
            }
        } catch (error) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
        }

        // await interaction.reply(`Kicking ${target.username} for reason: ${reason}`);
        // await interaction.guild.members.kick(target);
    }
}
