const CONFIG = require('../config.json');

const stealAvatarCommand = {
    name: "stealavatar",
    description: "shows URL of given user's avatar",
    aliases: ["teamrocket"],
    argsRequired: false,
    tagsRequired: true,
    execute(message, args) {
        if (!message.mentions.users.size) {
            message.reply(`you need to mention at least one user!\nUsage: ${this.usage}`);
        } else {
            const avatarList = message.mentions.users.map(user => {
                return `${user.username}'s avatar:\n${user.displayAvatarURL({format: 'png', dynamic: true})}`;
            });
            message.channel.send(avatarList);
        }
    }
}

stealAvatarCommand.usage = CONFIG.PREFIX + stealAvatarCommand.name + " <@user>";
module.exports = stealAvatarCommand;