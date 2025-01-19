const { createClient } = require('redis');

const redisClient = createClient({
    socket: {
        host: '127.0.0.1',  // default
        port: 6379,         // default
        reconnectStrategy: false
    }
});

redisClient.on('error', err => console.log('Redis Client Error', err));

module.exports = {
    dbUsersAccepted: redisClient
};