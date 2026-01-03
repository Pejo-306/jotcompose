const { createClient } = require("redis");

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisUri = `redis://${redisHost}:${redisPort}`;

async function openRedisClient() {
    const redisClient = createClient({ url: redisUri });
    redisClient.on("error", (err) => {
        console.error("Redis Client Error", err);
    });
    await redisClient.connect();
    await redisClient.ping();
    return redisClient;
}

async function closeRedisClient(redisClient) {
    await redisClient.quit();
}

module.exports = { openRedisClient, closeRedisClient };
