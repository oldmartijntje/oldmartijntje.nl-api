const cors = require("cors");
const path = require('path');
const express = require("express");
const expressStatic = require('express').static;
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

        // Global error handler for Express
        app.use(async (err, req, res, next) => {
            console.error('[EXPRESS ERROR]', err);
            
            // Create security flag for Express errors
            await createCrashSecurityFlag('expressError', err, {
                url: req.originalUrl || req.url,
                method: req.method,
                userAgent: req.get('User-Agent'),
                ipAddress: SecurityFlagHandler.extractIpAddress(req),
                headers: SecurityFlagHandler.sanitizeHeaders(req.headers)
            }).catch(console.error);

            // Send error response
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        });

        // start the Express server
        const server = app.listen(port, async () => {
            console.log(`Server running at http://localhost:${port}...`);
            
            // Create security flag for server startup (skip if running with nodemon/dev mode)
            const isDevMode = process.env.NODE_ENV === 'development' || 
                             process.argv.some(arg => arg.includes('nodemon')) ||
                             process.env.npm_lifecycle_event === 'dev';
                             
            if (!isDevMode) {
                await createCrashSecurityFlag('serverStartup', null, {
                    port: port,
                    startupTime: new Date().toISOString(),
                    environment: process.env.NODE_ENV || 'development',
                    startupReason: 'server initialization'
                }).catch(console.error);
            }
            
        }).on('error', async (err) => {
            console.error('Server startup error:', err);
            await createCrashSecurityFlag('serverStartupError', err);
            exit(1);
        });

        // Handle server close events
        server.on('close', async () => {
            console.log('[INFO] Server closing');
            await createCrashSecurityFlag('serverClose', null, {
                shutdownReason: 'server close event'
            });
        });

    })
    .catch(error => console.error(error));

// Crash detection and security flag creation
async function createCrashSecurityFlag(crashType, error, additionalData = {}) {
    try {
        // Adjust risk level for server startup
        const riskLevel = crashType === 'serverStartup' ? 3 : 4;
        
        await SecurityFlagHandler.createSecurityFlag({
            ipAddress: 'server',
            riskLevel: riskLevel,
            description: crashType === 'serverStartup' ? 
                'Server started - could indicate update or restart after crash' : 
                `Server crash detected: ${crashType}`,
            fileName: 'server.js',
            additionalData: {
                crashType,
                error: error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                } : null,
                timestamp: new Date().toISOString(),
                processId: process.pid,
                nodeVersion: process.version,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                ...additionalData
            }
        });
        console.log(`[SECURITY] Created security flag for ${crashType}`);
    } catch (flagError) {
        console.error(`[ERROR] Failed to create security flag for crash: ${flagError.message}`);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    await createCrashSecurityFlag('uncaughtException', error);
    
    // Give some time for the security flag to be saved before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    await createCrashSecurityFlag('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)), {
        promise: promise.toString()
    });
    
    // Give some time for the security flag to be saved before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Handle SIGTERM (graceful shutdown)
process.on('SIGTERM', async () => {
    console.log('[INFO] SIGTERM received, shutting down gracefully');
    await createCrashSecurityFlag('SIGTERM', null, {
        shutdownType: 'graceful'
    });
    process.exit(0);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
    console.log('[INFO] SIGINT received, shutting down gracefully');
    await createCrashSecurityFlag('SIGINT', null, {
        shutdownType: 'manual'
    });
    process.exit(0);
});

// Handle other termination signals
process.on('SIGHUP', async () => {
    console.log('[INFO] SIGHUP received');
    await createCrashSecurityFlag('SIGHUP', null);
});

process.on('SIGQUIT', async () => {
    console.log('[INFO] SIGQUIT received');
    await createCrashSecurityFlag('SIGQUIT', null);
    process.exit(0);
});