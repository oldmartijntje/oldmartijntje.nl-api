const express = require("express");
const { UserAuthenticator } = require("./user.authenticator");
const { SessionHandler } = require("../authentication/sessionHandler");
const { SecurityFlagHandler } = require("../helpers/securityFlag.handler.js");
const { requestLogger } = require("../helpers/requestLogger.js");

const loginRouter = express.Router();
loginRouter.use(express.json());

/**
 * Get the sessiontoken by using your password and username.
 * 
 */
loginRouter.post("/", async (_req, res) => {
    try {
        const username = _req.body.username;
        const password = _req.body.password;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateByCredentialsWithResponseHandling(username, password, res, undefined, _req);
            if (!authenticationSuccess) {
                // Create security flag for failed login
                try {
                    await SecurityFlagHandler.createSecurityFlag({
                        req: _req,
                        riskLevel: 3,
                        description: `Failed login attempt for username: ${username}`,
                        fileName: 'login.routes.js',
                        additionalData: {
                            username: username,
                            endpoint: '/login/',
                            action: 'login_failed',
                            reason: 'invalid_credentials'
                        }
                    });
                } catch (flagError) {
                    requestLogger.failedSecurityFlag(flagError)
                }
                return;
            }

            // Create security flag for successful login
            try {
                await SecurityFlagHandler.createSecurityFlag({
                    req: _req,
                    riskLevel: 1,
                    description: `Successful login for username: ${username}`,
                    fileName: 'login.routes.js',
                    userId: auth.getUserData()._id,
                    additionalData: {
                        username: username,
                        endpoint: '/login/',
                        action: 'login_success',
                        userClearanceLevel: auth.getUserData().clearanceLevel
                    }
                });
            } catch (flagError) {
                requestLogger.failedSecurityFlag(flagError)
            }

            const sessionToken = auth.getSessionToken();
            if (sessionToken) {
                const response = { "message": "Logged in succesfully", success: true, "data": auth.getUserData() };
                response["sessionToken"] = sessionToken;
                res.status(200).send(response);
                return;
            }
            res.status(501).send({ "message": "Unexpected logic escape: How did this occur?" });
        });
    } catch (error) {
        res.status(500).send({ "message": error.message });
    }
});

/**
 * check if your sessiontoken is valid.
 * 
 */
loginRouter.post("/validateToken", async (_req, res) => {
    try {
        const username = _req.body.username;
        const sessionTokenString = _req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, username, res);
            if (!authenticationSuccess) {
                // Create security flag for failed token validation
                try {
                    await SecurityFlagHandler.createSecurityFlag({
                        req: _req,
                        riskLevel: 1,
                        description: `Failed token validation for username: ${username}`,
                        fileName: 'login.routes.js',
                        additionalData: {
                            username: username,
                            endpoint: '/login/validateToken',
                            action: 'token_validation_failed',
                            reason: 'invalid_token'
                        }
                    });
                } catch (flagError) {
                    requestLogger.failedSecurityFlag(flagError)
                }
                return;
            }
            const response = { "message": "Logged in succesfully", success: true, "data": auth.getUserData() };
            res.status(200).send(response)
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * refresh your sessiontoken for a new one.
 * 
 */
loginRouter.post("/refreshToken", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, res);
            if (!authenticationSuccess) {
                // Create security flag for failed token refresh
                try {
                    await SecurityFlagHandler.createSecurityFlag({
                        req: _req,
                        riskLevel: 2,
                        description: `Failed token refresh attempt`,
                        fileName: 'login.routes.js',
                        additionalData: {
                            endpoint: '/login/refreshToken',
                            action: 'token_refresh_failed',
                            reason: 'invalid_token'
                        }
                    });
                } catch (flagError) {
                    requestLogger.failedSecurityFlag(flagError)
                }
                return;
            }

            const sessionToken = auth.refreshSessionToken();
            if (sessionToken) {
                // Create security flag for successful token refresh
                try {
                    await SecurityFlagHandler.createSecurityFlag({
                        req: _req,
                        riskLevel: 1,
                        description: `Successful token refresh`,
                        fileName: 'login.routes.js',
                        userId: auth.getUserData()._id,
                        additionalData: {
                            username: auth.getUserData().username,
                            endpoint: '/login/refreshToken',
                            action: 'token_refresh_success',
                            userClearanceLevel: auth.getUserData().clearanceLevel
                        }
                    });
                } catch (flagError) {
                    requestLogger.failedSecurityFlag(flagError)
                }

                const response = { "message": "Logged in succesfully", success: true, "data": auth.getUserData() };
                response["sessionToken"] = sessionToken;
                res.status(200).send(response);
                return;
            }
            // Guest accounts cannot refresh their token.

            res.status(403).send({ "message": "Guest accounts cannot refresh their token." });
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = {
    loginRouter: loginRouter
}