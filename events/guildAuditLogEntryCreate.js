const { Events, AuditLogEvent, bold } = require('discord.js');
const { createSimpleTimestampString } = require('../util/misc.js');

module.exports = {
    name: Events.GuildAuditLogEntryCreate,
    once: false,
    async execute(auditLog) {
        const timestamp = Date.now();
        console.log('Audit log entry created');
    
        if (auditLog.action === AuditLogEvent.MessageBulkDelete) {
            return console.log('TODO: handling audit logs for bulk deletes');
        } else if (auditLog.action !== AuditLogEvent.MessageDelete) {
            return;
        }
    
        await logAuditLogCreateMessageDelete(auditLog, timestamp);
    }
};

// TODO: can make this an embed instead, or use old autologger?
async function logAuditLogCreateMessageDelete(auditLog, timestamp) {
    return logChannel.send(
        `${bold('Message delete audit log entry created:')}\n` + 
        `ID: ${auditLog.id}\n` + 
        `Author: ${auditLog.target}\n` + 
        `Deleter: ${auditLog.executor}\n` + 
        `Timestamp: ${createSimpleTimestampString(Math.floor(timestamp / 1000))}`
    );
}