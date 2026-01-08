const cors = require("cors");
const path = require('path');
const express = require("express");
const expressStatic = require('express').static;
const helmet = require("helmet");
const { connect, users, sessionTokens, implementationKeys, quartzForumAccounts, quartzForumForums, quartzForumMessages } = require("./database.js");
const { exit } = require("process");
const settings = require("./settings");
const { requestLogger } = require("./helpers/requestLogger.js");
const { SecurityFlagHandler } = require("./helpers/securityFlag.handler.js");
require('dotenv').config();

const { loginRouter } = require("./authentication/login.routes.js");
const { jsonRouter } = require("./routing/json.routes.js");
const { registerRouter } = require("./routing/register.routes.js");
const { projectDataRouter } = require("./routing/projectData.routes.js");
const { quartzforumsRouter } = require("./routing/quartzforums.routes.js");
const { securityFlagsRouter } = require("./routing/securityFlags.routes.js");
const { logsRouter } = require("./routing/logs.routes.js");

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
    requestLogger.logInternalString("ERROR", `No MONGO_URI environment variable has been defined`);
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
        app.use("/logs", logsRouter);

        // Serve QuartzForums frontend
        app.use('/forums', express.static(path.join(__dirname, 'homepage/quartzforums')));

        // In-memory buffer for 404 requests
        const notFoundBuffer = [];
        const BUFFER_LIMIT = 50; // Maximum number of entries before flushing
        const FLUSH_INTERVAL = 60000; // Flush every 60 seconds

        // Middleware to capture 404 requests
        app.use((req, res, next) => {
            res.status(404);

            // Collect request details
            const notFoundEntry = {
                url: req.originalUrl,
                ip: req.ip,
                method: req.method,
                headers: req.headers,
                timestamp: new Date().toISOString(),
            };

            // Add to buffer
            notFoundBuffer.push(notFoundEntry);

            // Respond to the client
            res.json({
                message: "Not Found",
                details: "This endpoint does not exist."
            });

            // Check if buffer needs to be flushed
            if (notFoundBuffer.length >= BUFFER_LIMIT) {
                flushNotFoundBuffer();
            }
        });

        // Periodic buffer flushing
        setInterval(flushNotFoundBuffer, FLUSH_INTERVAL);

        // Function to flush the buffer to the database
        async function flushNotFoundBuffer() {
            if (notFoundBuffer.length === 0) return;

            const entriesToFlush = notFoundBuffer.splice(0, notFoundBuffer.length);

            try {
                for (const entry of entriesToFlush) {
                    await SecurityFlagHandler.createSecurityFlag({
                        ipAddress: entry.ip,
                        riskLevel: 1, // Low risk for 404 tracking
                        description: `404 Not Found: ${entry.url}`,
                        fileName: 'server.js',
                        additionalData: {
                            method: entry.method,
                            headers: entry.headers,
                            timestamp: entry.timestamp,
                        }
                    });
                }
                console.log(`[INFO] Flushed ${entriesToFlush.length} 404 entries to the database.`);
            } catch (error) {
                requestLogger.logInternalString("ERROR", `Failted to flush 404 buffer: ${error}`);
            }
        }

        // start the Express server
        const server = app.listen(port, async () => {
            console.log(`Server running at http://localhost:${port}...`);

            // Create security flag for server startup (skip if running with nodemon/dev mode)
            const isDevMode = process.env.NODE_ENV === 'development' ||
                process.argv.some(arg => arg.includes('nodemon')) ||
                process.env.npm_lifecycle_event === 'dev';

            if (!isDevMode) {
                await SecurityFlagHandler.createSecurityFlag({
                    ipAddress: 'server',
                    riskLevel: 3,
                    description: 'Server started - could indicate update or restart after crash',
                    fileName: 'server.js',
                    additionalData: {
                        port: port,
                        startupTime: new Date().toISOString(),
                        environment: process.env.NODE_ENV || 'undefined',
                        startupReason: 'server initialization'
                    }
                }).catch(error => {
                    requestLogger.logInternalString("ERROR", `Error while writing to database: ${error}`);
                });
            }
        }).on('error', (err) => {
            requestLogger.logInternalString("ERROR", `Error while listenign on port ${port}: ${err}`);
            exit(1);
        });

    })
    .catch(error => {
        requestLogger.logInternalString("ERROR", `Error while connecting to database: ${error}`);
    });