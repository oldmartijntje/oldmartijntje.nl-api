const express = require("express");
const { UserAuthenticator } = require("../authentication/user.authenticator");
const { SessionHandler } = require("../authentication/sessionHandler");
const { SecurityFlagHandler } = require("../helpers/securityFlag.handler.js");

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
            
            // Create security flag for account creation attempt
            try {
                await SecurityFlagHandler.createSecurityFlag({
                    req: _req,
                    riskLevel: 1,
                    description: `Account creation attempt with activation code`,
                    fileName: 'register.routes.js',
                    additionalData: {
                        username: username,
                        activationCode: activationCode ? '[PROVIDED]' : '[MISSING]',
                        endpoint: '/register/',
                        action: 'account_creation_attempt'
                    }
                });
            } catch (flagError) {
                console.error('Error creating security flag:', flagError);
            }
            
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
        const textNote = _req.body.textNote;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                // Create security flag for insufficient authorization attempt
                try {
                    const user = auth.getUserData();
                    await SecurityFlagHandler.createSecurityFlag({
                        req: _req,
                        riskLevel: 2,
                        description: `User attempted registration code generation with insufficient clearance (level ${user.clearanceLevel})`,
                        fileName: 'register.routes.js',
                        userId: user._id,
                        additionalData: {
                            username: user.username,
                            userClearanceLevel: user.clearanceLevel,
                            requiredClearanceLevel: 5,
                            attemptedAction: 'generate_registration_code',
                            requestedClearanceLevel: clearanceLevel,
                            endpoint: '/register/generate',
                            possibleFrontendBypass: true
                        }
                    });
                } catch (flagError) {
                    console.error('Error creating security flag:', flagError);
                }
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            const parsed = parseInt(clearanceLevel)
            if (typeof parsed != typeof 0 || parsed < 0) {
                res.status(400).send({ "message": "Invalid clearance level." });
                return;
            }
            if (!auth.checkAuthorityLevel(parsed + 1)) {
                // Create security flag for insufficient authorization for requested clearance level
                try {
                    const user = auth.getUserData();
                    await SecurityFlagHandler.createSecurityFlag({
                        req: _req,
                        riskLevel: 1,
                        description: `User attempted to generate registration code for clearance level ${parsed} but lacks required authority (level ${parsed + 1})`,
                        fileName: 'register.routes.js',
                        userId: user._id,
                        additionalData: {
                            username: user.username,
                            userClearanceLevel: user.clearanceLevel,
                            requiredClearanceLevel: parsed + 1,
                            requestedClearanceLevel: parsed,
                            attemptedAction: 'generate_registration_code_elevated',
                            endpoint: '/register/generate',
                            possiblePrivilegeEscalation: true
                        }
                    });
                } catch (flagError) {
                    console.error('Error creating security flag:', flagError);
                }
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            
            // Create security flag for successful registration code generation
            try {
                const user = auth.getUserData();
                await SecurityFlagHandler.createSecurityFlag({
                    req: _req,
                    riskLevel: parsed >= 4 ? 3 : 1,
                    description: `User generated registration code for clearance level ${parsed}`,
                    fileName: 'register.routes.js',
                    userId: user._id,
                    additionalData: {
                        username: user.username,
                        userClearanceLevel: user.clearanceLevel,
                        generatedClearanceLevel: parsed,
                        role: role,
                        textNote: textNote ? '[PROVIDED]' : '[NONE]',
                        action: 'generate_registration_code_success',
                        endpoint: '/register/generate'
                    }
                });
            } catch (flagError) {
                console.error('Error creating security flag:', flagError);
            }
            
            await auth.createRegistratonCodeHandling(clearanceLevel, role, textNote, res);


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
                // Create security flag for insufficient authorization attempt
                try {
                    const user = auth.getUserData();
                    await SecurityFlagHandler.createSecurityFlag({
                        req: _req,
                        riskLevel: 2,
                        description: `User attempted to view registration codes with insufficient clearance (level ${user.clearanceLevel})`,
                        fileName: 'register.routes.js',
                        userId: user._id,
                        additionalData: {
                            username: user.username,
                            userClearanceLevel: user.clearanceLevel,
                            requiredClearanceLevel: 4,
                            attemptedAction: 'view_registration_codes',
                            endpoint: '/register/find',
                            possibleFrontendBypass: true
                        }
                    });
                } catch (flagError) {
                    console.error('Error creating security flag:', flagError);
                }
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            const handler = auth.getUserHandler();
            const codes = await handler.findAllRegistrationCodes();
            if (!codes) {
                res.status(404).send({ "message": "No codes found." });
                return;
            }
            res.status(200).send({ "codes": codes });
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
                // Create security flag for insufficient authorization attempt
                try {
                    const user = auth.getUserData();
                    await SecurityFlagHandler.createSecurityFlag({
                        req: _req,
                        riskLevel: 1,
                        description: `User attempted registration code deletion with insufficient clearance (level ${user.clearanceLevel})`,
                        fileName: 'register.routes.js',
                        userId: user._id,
                        additionalData: {
                            username: user.username,
                            userClearanceLevel: user.clearanceLevel,
                            requiredClearanceLevel: 5,
                            attemptedAction: 'delete_registration_code',
                            activationCode: activationCode ? '[PROVIDED]' : '[MISSING]',
                            endpoint: '/register/delete',
                            possibleFrontendBypass: true
                        }
                    });
                } catch (flagError) {
                    console.error('Error creating security flag:', flagError);
                }
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            
            // Create security flag for registration code deletion attempt
            try {
                const user = auth.getUserData();
                await SecurityFlagHandler.createSecurityFlag({
                    req: _req,
                    riskLevel: 1,
                    description: `User deleted registration code`,
                    fileName: 'register.routes.js',
                    userId: user._id,
                    additionalData: {
                        username: user.username,
                        userClearanceLevel: user.clearanceLevel,
                        action: 'delete_registration_code_success',
                        activationCode: activationCode ? '[PROVIDED]' : '[MISSING]',
                        endpoint: '/register/delete'
                    }
                });
            } catch (flagError) {
                console.error('Error creating security flag:', flagError);
            }
            
            const handler = auth.getUserHandler();
            const result = await handler.deleteRegistrationCode(activationCode);
            if (!result) {
                res.status(404).send({ "message": "No code found." });
                return;
            }
            const codes = await handler.findAllRegistrationCodes();
            if (!codes) {
                res.status(200).send({ "message": "Deleted Code!" });
                return;
            }
            res.status(200).send({ "message": "Deleted Code!", "codes": codes });

        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = {
    registerRouter: registerRouter
}