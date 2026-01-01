const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from notes!");
});

app.listen(3000, () => {
  console.log("Notes service is running on port 3002");
});
