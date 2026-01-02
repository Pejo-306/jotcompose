const express = require("express");
const { healthRouter } = require("./routes/health");

const app = express();
const port = process.env.PORT || 3000;

app.use("/health", healthRouter);

app.get("/", (req, res) => {
  res.send("Hello from notebooks!");
});

app.listen(port, () => {
  console.log(`Notebooks service is running on port ${port}`);
});
