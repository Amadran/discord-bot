const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');

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

        await interaction.reply(`Kicking ${target.username} for reason: ${reason}`);
        await interaction.guild.members.kick(target);
    }
}
