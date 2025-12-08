const cors = require("cors");
const path = require('path');
const express = require("express");
const expressStatic = require('express').static;
const { connect, users, sessionTokens, implementationKeys, quartzForumAccounts, quartzForumForums, quartzForumMessages } = require("./database.js");
const { exit } = require("process");
const settings = require("./settings");
const { requestLogger } = require("./helpers/requestLogger.js");
require('dotenv').config();

const { loginRouter } = require("./authentication/login.routes.js");
const { jsonRouter } = require("./routing/json.routes.js");
const { registerRouter } = require("./routing/register.routes.js");
const { projectDataRouter } = require("./routing/projectData.routes.js");
const { quartzforumsRouter } = require("./routing/quartzforums.routes.js");
const { securityFlagsRouter } = require("./routing/securityFlags.routes.js");

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

// Debug endpoint to test IP extraction
// testRouter.get("/debug-ip", async (req, res) => {
//     const { SecurityFlagHandler } = require("./helpers/securityFlag.handler.js");

//     const ipDebugInfo = {
//         extractedIP: SecurityFlagHandler.extractIpAddress(req),
//         sources: {
//             'req.ip': req.ip,
//             'x-forwarded-for': req.headers['x-forwarded-for'],
//             'x-real-ip': req.headers['x-real-ip'],
//             'x-client-ip': req.headers['x-client-ip'],
//             'cf-connecting-ip': req.headers['cf-connecting-ip'],
//             'connection.remoteAddress': req.connection?.remoteAddress,
//             'socket.remoteAddress': req.socket?.remoteAddress,
//         },
//         headers: req.headers,
//         userAgent: req.get('User-Agent')
//     };

//     console.log('[DEBUG] IP extraction test:', ipDebugInfo);
//     res.status(200).json(ipDebugInfo);
// });

if (!MONGO_URI) {
    console.error("No MONGO_URI environment variable has been defined");
    process.exit(1);
}
// console.log(encodeURIComponent(''))
connect(MONGO_URI)
    .then(async () => {
        const app = express();

        // Configure proxy trust for Docker and reverse proxy environments
        // Trust all proxies - adjust this in production for better security
        app.set('trust proxy', true);

        // Alternative: Trust specific proxy hops (uncomment and adjust as needed)
        // app.set('trust proxy', 1); // trust first proxy
        // app.set('trust proxy', 'loopback, linklocal, uniquelocal'); // trust local ranges

        // Add request logging middleware (before other middlewares)
        app.use(requestLogger.middleware());

        app.use(cors());
        app.use(expressStatic(staticHtmlPath));
        app.use("/login", loginRouter);
        app.use("/register", registerRouter);
        app.use("/getData", jsonRouter);
        app.use("/test", testRouter);
        app.use("/projectData", projectDataRouter);
        app.use("/forums", quartzforumsRouter);
        app.use("/security-flags", securityFlagsRouter);

        // Serve QuartzForums frontend
        app.use('/forums', express.static(path.join(__dirname, 'homepage/quartzforums')));

        // start the Express server
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}...`);
        }).on('error', (err) => {
            console.error('Server startup error:', err);
            exit(1);
        });

    })
    .catch(error => console.error(error));