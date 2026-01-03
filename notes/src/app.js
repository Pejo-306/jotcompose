const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const { healthRouter } = require("./routes/health");
const { notesRouter } = require("./routes/notes");
const { openRedisClient, closeRedisClient } = require("./utils/redis");

const app = express();
const port = process.env.PORT || 3000;
const mongoHost = process.env.MONGODB_HOST;
const mongoPort = process.env.MONGODB_PORT;
const noteUser = process.env.NOTES_USER;
const notePass = process.env.NOTES_PASS;
const noteDb = process.env.NOTES_DB;
const mongoUri = `mongodb://${mongoHost}:${mongoPort}/${noteDb}`;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisUri = `redis://${redisHost}:${redisPort}`;

app.use(bodyParser.json());
app.use(morgan("combined"));
app.get("/", (_, res) => res.status(200).send("Hello from notes service!"));
app.use("/health", healthRouter);
app.use("/api/notes", notesRouter);

mongoose.connect(mongoUri, {
    auth: {
        username: noteUser,
        password: notePass,
    },
    connectTimeoutMS: 1000,
})
.then(async () => {
    const redisClient = await openRedisClient();
    console.log(`Connected to Redis at ${redisUri}`);
    await closeRedisClient(redisClient);
})
.then(() => {
    console.log(`Connected to MongoDB at ${mongoUri}`);
    app.listen(port, () => {
        console.log(`Notes service is running on port ${port}`);
    });
})
.catch((err) => {
    console.error("Error connecting to services", err);
    process.exit(1);
})
