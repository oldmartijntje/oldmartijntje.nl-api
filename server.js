const cors = require("cors");
const express = require("express");
const { connect, users, sessionTokens } = require("./database.js");
const { exit } = require("process");
const settings = require("./settings");
const env = require("./env");
const { loginRouter } = require("./authentication/login.routes.js");

const MONGO_URI = env["MONGO_URI"];
const port = settings["apiPort"];

if (!MONGO_URI) {
    console.error("No MONGO_URI environment variable has been defined");
    process.exit(1);
}
// console.log(encodeURIComponent(''))
connect(MONGO_URI)
    .then(async () => {

        const app = express();
        app.use(cors());
        app.use("/login", loginRouter);
        // start the Express server
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}...`);
        }).on('error', (err) => {
            console.error('Server startup error:', err);
            exit(1);
        });

    })
    .catch(error => console.error(error));