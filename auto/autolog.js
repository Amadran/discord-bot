const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "autolog",
    description: "Automatically logs edits and deletes of messages to a certain channel",
    log(oldMessage, newMessage, channel, nearbyMessage, deletedBy) {
        const embed = new EmbedBuilder();

        if (oldMessage) console.log("oldMessage type: ", oldMessage.constructor.name);
        if (newMessage) console.log("newMessage type: ", newMessage.constructor.name, "\tnewMessage.partial: ", newMessage.partial);
        if (channel) console.log("channel type: ", channel.constructor.name);
        if (nearbyMessage) console.log("nearbyMessage type: ", nearbyMessage.constructor.name, "\tnearbyMessage.partial: ", nearbyMessage.partial);
        if (nearbyMessage) console.log("nearbyMessage content: ", nearbyMessage);
        if (deletedBy) console.log("deletedBy type: ", deletedBy.constructor.name);
        
        if (newMessage) { // edit
            embed.setColor('#ffe83b')
                 .setTitle('Edit')
                 .addFields(
                     {name: 'Original Message:', value: oldMessage.content, inline: true},
                     {name: 'New Message:',
                        value: newMessage.content + "\nJump to: " + newMessage.url,
                        inline: true}
                 )
                 .addField('\u200B','\u200B')
                 .addFields(
                     {name: 'Edited by:', value: newMessage.author, inline: true},
                     {name: 'Channel:', value: newMessage.channel.name, inline: true}
                 )
                 .setTimestamp();
        } else { // delete (cannot use partials)
            embed.setColor('#eb3636')
                 .setTitle('Delete')
                 .addFields(
                     {name: 'Deleted Message:',
                        value: oldMessage.content + '\n\nJump to message nearby: ' + nearbyMessage.url,
                        inline: true},
                     {name: 'Author:',
                        value: oldMessage.author,
                        inline: true},
                     {name: 'Deleted by:', value: deletedBy, inline: true}
                 )
                 .addField('\u200B','\u200B')
                 .addFields(
                     {name: 'Channel:', value: oldMessage.channel.name, inline: true},
                     {name: 'Original Timestamp:', value: oldMessage.createdAt, inline: true}
                 )
                 .setTimestamp();
        }

        channel.send(embed);
    }
}