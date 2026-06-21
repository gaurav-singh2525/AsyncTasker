const express = require("express");
const jobRoutes = require("./routes/jobRoutes");

const app = express();

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(express.json());
app.use("/jobs", jobRoutes);



module.exports = app;