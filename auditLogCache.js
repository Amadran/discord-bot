const { Collection } = require('discord.js');

// Cache for audit log "counts" (the AuditLogEntry.extra.count field)
class AuditLogCache extends Collection {
    constructor(...args) {
        super(...args);
    }

    // TODO: use this (do we want to limit audit log cache size?)
    get SIZE() { // const
        return 50;
    }

    populate(auditLogs) {
        for (const [logId, log] of auditLogs.entries()) {
            this.set(logId, log.extra.count);
        }
    }
}

module.exports = {
    auditLogCache: new AuditLogCache()
};