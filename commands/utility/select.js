const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MentionableSelectMenuBuilder
} = require('discord.js');
const { isSnowflake } = require('../../util/misc.js');
const CONFIG = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('select')
        .setDescription('Allows you to make a selection.'),
    async execute(interaction) {
        const stringSel = new StringSelectMenuBuilder()
            .setCustomId('selection')
            .setPlaceholder('Make a selection!')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('selection 1')
                    .setDescription('This is selection 1')
                    .setValue('s1'),
                    // .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel('selection 2')
                    .setDescription('This is selection 2')
                    .setValue('s2'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('selection 3')
                    .setDescription('This is selection 3')
                    .setValue('s3'),
            );

        const mentionableSel = new MentionableSelectMenuBuilder()
            .setCustomId('mentionable')
            .setPlaceholder('Select a user');
        
        const rows = [
            new ActionRowBuilder().addComponents(stringSel),
            new ActionRowBuilder().addComponents(mentionableSel)
        ];

        const response = await interaction.reply({ 
            content: 'Choose a selection!',
            components: rows,
            ephemeral: true
        });

        // TODO: this should be the channel the slash command was invoked in
        const generalChannel = await interaction.client.channels.fetch(CONFIG.GENERAL_CHANNEL_ID);
        const collector = response.createMessageComponentCollector({ maxComponents: 2, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply(`${i.user} this select menu is not for you! Slash command was invoked by ${interaction.user}`);
            }

            // don't think there would ever be more than one value in a single interaction
            let selection = i.values[0];

            // basic test for snowflake
            // if snowflake, assume it's a user (TODO: fix this)
            if (isSnowflake(selection)) {
                selection = await interaction.client.users.fetch(selection);
            }

            await i.reply(`${i.user} selected: ${selection}`);
        });

        // collected === all collected interactions (type: Collection)
        // collected.values() returns a Collection (Map) iterator
        collector.on('end', async collected => {
            const collectedValues = collected.values().toArray();
            let replyString = `The interaction has completed. ${collectedValues[0].user} selected the following values:\n`;

            for (const [i, inter] of collectedValues.entries()) {
                let val = inter.values[0];
                if (isSnowflake(val)) {
                    val = await interaction.client.users.fetch(val);
                }
                replyString += `${i}: ${val}\n`;
            }

            generalChannel.send(replyString);
        });
    }
};