const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from notebooks!");
});

app.listen(3000, () => {
  console.log("Notebooks service is running on port 3001");
});
