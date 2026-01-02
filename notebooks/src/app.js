const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const { healthRouter } = require("./routes/health");
const { notebooksRouter } = require("./routes/notebooks");

const app = express();
const port = process.env.PORT || 3000;
const mongoHost = process.env.MONGODB_HOST;
const mongoPort = process.env.MONGODB_PORT;
const notebookUser = process.env.NOTEBOOKS_USER;
const notebookPass = process.env.NOTEBOOKS_PASS;
const notebookDb = process.env.NOTEBOOKS_DB;
const mongoUri = `mongodb://${mongoHost}:${mongoPort}/${notebookDb}`;

app.use(bodyParser.json());
app.use(morgan("combined"));
app.get("/", (_, res) => res.status(200).send("Hello from notebooks service!"));
app.use("/health", healthRouter);
app.use("/api/notebooks", notebooksRouter);

mongoose.connect(mongoUri, {
    auth: {
        username: notebookUser,
        password: notebookPass,
    },
    connectTimeoutMS: 1000,
})
.then(() => {
    app.listen(port, () => {
        console.log(`Notebooks service is running on port ${port}`);
    });
    console.log(`Connected to MongoDB at ${mongoUri}`);
})
.catch((err) => {
    console.error("Error connecting to MongoDB", err);
    process.exit(1);
});
