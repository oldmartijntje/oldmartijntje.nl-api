const express = require('express');
const { UserAuthenticator } = require("../authentication/user.authenticator");
const { SessionHandler } = require("../authentication/sessionHandler");
const {
    getSecurityFlags,
    getSecurityStats,
    resolveSecurityFlag,
    createSecurityFlag
} = require('../controller/securityFlags.controller.js');

const securityFlagsRouter = express.Router();
securityFlagsRouter.use(express.json());

// Get security flags with filtering
// GET /security-flags?sessionToken=xxx&riskLevel=3&resolved=false&limit=20&skip=0
// Text filtering options:
// &descriptionFilter=xxx - Filter by description content
// &userFilter=xxx - Filter by user names (username/quartzforum name)
// &ipFilter=xxx - Filter by IP address content
// &fileFilter=xxx - Filter by filename content
// &additionalDataFilter=xxx - Filter by additional data content
// &dateTimeFilter=xxx - Filter by date/time content (format: YYYY-MM-DD HH:MM:SS)
securityFlagsRouter.get('/', async (req, res) => {
    try {
        const sessionTokenString = req.query.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            await getSecurityFlags(req, res);
        });
    } catch (error) {
        res.status(500).send({ "message": error.message });
    }
});

// Get security statistics
// GET /security-flags/stats?sessionToken=xxx&dateFrom=2024-01-01&dateTo=2024-12-31
// securityFlagsRouter.get('/stats', async (req, res) => {
//     try {
//         const sessionTokenString = req.query.sessionToken;
//         const sessionH = new SessionHandler();
//         sessionH.rateLimitMiddleware(req, res, async () => {
//             const auth = new UserAuthenticator();
//             const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
//             if (!authenticationSuccess) {
//                 return;
//             }
//             if (!auth.checkAuthorityLevel(5)) {
//                 res.status(403).send({ "message": "You do not have the required clearance level for this action." });
//                 return;
//             }
//             await getSecurityStats(req, res);
//         });
//     } catch (error) {
//         res.status(500).send({ "message": error.message });
//     }
// });

// Resolve a security flag
// PUT /security-flags/:flagId/resolve
securityFlagsRouter.put('/:flagId/resolve', async (req, res) => {
    try {
        const sessionTokenString = req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            // Pass the authenticated user's ID to the controller
            req.resolvedByUserId = auth.getUserData()._id;
            await resolveSecurityFlag(req, res);
        });
    } catch (error) {
        res.status(500).send({ "message": error.message });
    }
});

// Create a manual security flag (for testing/manual reporting)
// POST /security-flags
// securityFlagsRouter.post('/', async (req, res) => {
//     try {
//         const sessionTokenString = req.body.sessionToken;
//         const sessionH = new SessionHandler();
//         sessionH.rateLimitMiddleware(req, res, async () => {
//             const auth = new UserAuthenticator();
//             const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
//             if (!authenticationSuccess) {
//                 return;
//             }
//             if (!auth.checkAuthorityLevel(5)) {
//                 res.status(403).send({ "message": "You do not have the required clearance level for this action." });
//                 return;
//             }
//             await createSecurityFlag(req, res);
//         });
//     } catch (error) {
//         res.status(500).send({ "message": error.message });
//     }
// });

module.exports = {
    securityFlagsRouter: securityFlagsRouter
};