const express = require("express");
const bodyParser = require("body-parser");

const { healthRouter } = require("./routes/health");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.get("/", (_, res) => res.status(200).send("Hello from notes service!"));
app.use("/health", healthRouter);

app.listen(port, () => {
    console.log(`Notes service is running on port ${port}`);
});
