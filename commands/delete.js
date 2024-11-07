const CONFIG = require('../config.json');

const deleteCommand = {
    name: "delete",
    description: "Deletes certain number of messages from channel",
    argsRequired: true,
    tagsRequired: false,
    aliases: [],
    usage: "",
    roleIDs: [CONFIG.ROLE_UPPER_ID],
    execute(message, args) {
        message.channel.bulkDelete(args[0], true);
    }
}

deleteCommand.usage = CONFIG.PREFIX + deleteCommand.name + " <number>";
module.exports = deleteCommand;