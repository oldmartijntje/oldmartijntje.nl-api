const cors = require("cors");
const path = require('path');
const express = require("express");
const expressStatic = require('express').static;
const { connect, users, sessionTokens } = require("./database.js");
const { exit } = require("process");
const settings = require("./settings");
require('dotenv').config();

const { loginRouter } = require("./authentication/login.routes.js");
const { jsonRouter } = require("./routing/json.routes.js");

const MONGO_URI = process.env.DB_URL;
const port = process.env.API_PORT
const staticHtmlPath = path.join(__dirname, './homepage');

var visit = 0;

const testRouter = express.Router();
testRouter.use(express.json());

testRouter.get("/isOnline", async (_req, res) => {
    visit++;
    console.log("Connection go brrr...")
    res.status(200).send({ "message": "The server is online." });
});

testRouter.get("/visits", async (_req, res) => {
    visit++;
    console.log("We have had " + visit + " visits since startup!")
    res.status(200).send({ "message": "We have had " + visit + " visits since startup!" });
});

if (!MONGO_URI) {
    console.error("No MONGO_URI environment variable has been defined");
    process.exit(1);
}
// console.log(encodeURIComponent(''))
connect(MONGO_URI)
    .then(async () => {

        const app = express();
        app.set('trust proxy', true);
        app.use(cors());
        app.use(expressStatic(staticHtmlPath));
        app.use("/login", loginRouter);
        app.use("/getData", jsonRouter);
        app.use("/test", testRouter);
        // start the Express server
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}...`);
        }).on('error', (err) => {
            console.error('Server startup error:', err);
            exit(1);
        });

    })
    .catch(error => console.error(error));