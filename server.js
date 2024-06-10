const cors = require("cors");
const express = require("express");
const { connect, users, sessionTokens } = require("./database.js");
const { exit } = require("process");
const settings = require("./settings");
require('dotenv').config();

const { loginRouter } = require("./authentication/login.routes.js");

const MONGO_URI = process.env.DB_URL;
const port = settings["apiPort"];

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
        app.use(cors());
        app.use("/login", loginRouter);
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