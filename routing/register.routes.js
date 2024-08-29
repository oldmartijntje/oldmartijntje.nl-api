const express = require("express");
const { UserAuthenticator } = require("../authentication/user.authenticator");
const { SessionHandler } = require("../authentication/sessionHandler");

const registerRouter = express.Router();
registerRouter.use(express.json());

/**
 * Register an account using a code.
 * 
 */
registerRouter.post("/", async (_req, res) => {
    try {
        const username = _req.body.username;
        const password = _req.body.password;
        const activationCode = _req.body.activationCode;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            await auth.createAccount(username, password, activationCode, res);
        });
    } catch (error) {
        res.status(500).send({ "message": error.message });
    }
});

/**
 * Generate an account code.
 * 
 */
registerRouter.post("/generate", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const clearanceLevel = _req.body.clearanceLevel;
        const role = _req.body.role;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            const parsed = parseInt(clearanceLevel)
            if (parsed && !auth.checkAuthorityLevel(parsed + 1) && parsed > 0) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            await auth.createRegistratonCodeHandling(clearanceLevel, role, res);


        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * Find all unused codes.
 * 
 */
registerRouter.post("/find", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(4)) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            const handler = auth.getUserHandler();
            const codes = await handler.findAllRegistrationCodes();
            if (!codes) {
                res.status(404).send({ "message": "No codes found." });
                return;
            }
            res.status(200).send(codes);
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * Delete an account code.
 * 
 */
registerRouter.post("/delete", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const activationCode = _req.body.activationCode;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            const handler = auth.getUserHandler();
            const result = await handler.deleteRegistrationCode(activationCode);
            if (!result) {
                res.status(404).send({ "message": "No code found." });
                return;
            }
            res.status(200).send({ "message": "Code deleted." });

        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = {
    registerRouter: registerRouter
}