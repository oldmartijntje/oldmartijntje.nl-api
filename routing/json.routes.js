const express = require("express");
const { SessionHandler } = require("../authentication/sessionHandler");
const { displayItems } = require("../database");
const settings = require('../settings.json');
const { UserAuthenticator } = require("../authentication/user.authenticator");
const { SecurityFlagHandler } = require("../helpers/securityFlag.handler.js");
const { requestLogger } = require("../helpers/requestLogger.js");

const jsonRouter = express.Router();
jsonRouter.use(express.json());

/**
 * Get all displayItems.
 */
jsonRouter.post("/getDisplayItems", async (_req, res) => {
    try {
        const amount = _req.body.amount ? _req.body.amount : settings.defaultAmountToGet;
        const from = _req.body.from ? _req.body.from : 0;
        const showHidden = _req.body.hidden ? _req.body.hidden : false;
        const displayItemType = _req.body.displayItemType ? _req.body.displayItemType : undefined;
        if (typeof showHidden !== "boolean") {
            res.status(400).send({ message: "Invalid 'hidden' value" });
            return;
        }
        const auth = new SessionHandler();
        auth.rateLimitMiddleware(_req, res, () => {
            let query = {}
            if (!showHidden) {
                query["hidden"] = false
            }
            if (displayItemType) {
                query[displayItemType] = displayItemType;
            }
            displayItems.find(query).skip(from).limit(amount).then((result) => {
                if (!result) {
                    res.status(200).send({ message: "No displayItems found", "displayItems": [] });
                }
                res.status(200).send({
                    "displayItems": result
                });
            }).catch((error) => {
                res.status(500).send(error.message);
            });

        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * Delete a project.
 */
jsonRouter.delete("/displayItems", async (req, res) => {
    const { sessionToken, id } = req.query;
    const sessionH = new SessionHandler();
    sessionH.rateLimitMiddleware(req, res, async () => {
        if (!sessionToken || !id) {
            return res.status(400).send({ error: "Missing sessionToken or id" });
        }
        const auth = new UserAuthenticator();
        const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionToken, false, res);
        if (!authenticationSuccess) {
            return;
        }
        if (!auth.checkAuthorityLevel(6)) {
            // Create security flag for insufficient authorization attempt
            try {
                const user = auth.getUserData();
                await SecurityFlagHandler.createSecurityFlag({
                    req: req,
                    riskLevel: 3,
                    description: `User attempted display item deletion with insufficient clearance (level ${user.clearanceLevel})`,
                    fileName: 'json.routes.js',
                    userId: user._id,
                    additionalData: {
                        username: user.username,
                        userClearanceLevel: user.clearanceLevel,
                        requiredClearanceLevel: 6,
                        attemptedAction: 'delete_display_item',
                        displayItemId: id,
                        endpoint: '/getData/displayItems',
                        possibleFrontendBypass: true
                    }
                });
            } catch (flagError) {
                requestLogger.failedSecurityFlag(flagError);
            }
            res.status(403).send({ "message": "You do not have the required clearance level for this action." });
            return;
        }

        // Create security flag for display item deletion attempt
        try {
            const user = auth.getUserData();
            await SecurityFlagHandler.createSecurityFlag({
                req: req,
                riskLevel: 3,
                description: `User deleted display item (ID: ${id})`,
                fileName: 'json.routes.js',
                userId: user._id,
                additionalData: {
                    username: user.username,
                    clearanceLevel: user.clearanceLevel,
                    action: 'delete_display_item_success',
                    displayItemId: id,
                    endpoint: '/getData/displayItems'
                }
            });
        } catch (flagError) {
            requestLogger.failedSecurityFlag(flagError);
        }

        displayItems.deleteOne({ _id: { $eq: id } }).then((result) => {
            if (result.deletedCount == 0) {
                return res.status(404).send({ message: "Project not found" });
            }
            return res.status(200).send({ message: "Project deleted" });
        }).catch((error) => {
            return res.status(500).send(error.message);
        });
    });
});

/**
 * Create a project.
 */
jsonRouter.post("/displayItems", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const data = {
            title: _req.body.title,
            infoPages: _req.body.infoPages,
            displayItemType: _req.body.displayItemType
        };
        const sessionH = new SessionHandler();
        const requiredData = {
            title: undefined,
            infoPages: undefined,
            displayItemType: undefined
        }
        if (_req.body.tags != undefined) {
            data.tags = _req.body.tags
        } else {
            data.tags = [];
        }
        if (_req.body.link != undefined) {
            data.link = _req.body.link;
        }
        if (_req.body.description != undefined) {
            data.description = _req.body.description;
        }
        if (_req.body.thumbnailImage != undefined) {
            data.thumbnailImage = _req.body.thumbnailImage;
        }
        if (_req.body.hidden == undefined) {
            data.hidden = true;
        } else {
            data.hidden = _req.body.hidden;
        }
        if (_req.body.spoiler == undefined) {
            data.spoiler = false;
        } else {
            data.spoiler = _req.body.spoiler;
        }
        if (_req.body.nsfw == undefined) {
            data.nsfw = false;
        } else {
            data.nsfw = _req.body.nsfw;
        }
        if (_req.body.lastUpdated == undefined || _req.body.lastUpdated == null) {
            data.lastUpdated = new Date();
        } else {
            try {
                data.lastUpdated = new Date(_req.body.lastUpdated);
            } catch (e) {
                data.lastUpdated = new Date();
            }
        }
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const mergdedData = { ...requiredData, ...data };
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res, mergdedData);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                // Create security flag for insufficient authorization attempt
                try {
                    const user = auth.getUserData();
                    await SecurityFlagHandler.createSecurityFlag({
                        req: _req,
                        riskLevel: 3,
                        description: `User attempted display item creation with insufficient clearance (level ${user.clearanceLevel})`,
                        fileName: 'json.routes.js',
                        userId: user._id,
                        additionalData: {
                            username: user.username,
                            userClearanceLevel: user.clearanceLevel,
                            requiredClearanceLevel: 5,
                            attemptedAction: 'create_display_item',
                            endpoint: '/getData/displayItems',
                            itemTitle: data.title,
                            itemType: data.displayItemType,
                            possibleFrontendBypass: true
                        }
                    });
                } catch (flagError) {
                    requestLogger.failedSecurityFlag(flagError);
                }
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }

            // Create security flag for display item creation attempt
            try {
                const user = auth.getUserData();
                await SecurityFlagHandler.createSecurityFlag({
                    req: _req,
                    riskLevel: 2,
                    description: `User created display item: ${data.title}`,
                    fileName: 'json.routes.js',
                    userId: user._id,
                    additionalData: {
                        username: user.username,
                        clearanceLevel: user.clearanceLevel,
                        action: 'create_display_item_success',
                        itemTitle: data.title,
                        itemType: data.displayItemType,
                        endpoint: '/getData/displayItems'
                    }
                });
            } catch (flagError) {
                requestLogger.failedSecurityFlag(flagError);
            }

            const project = new displayItems(data);
            project.save().then((result) => {
                res.status(200).send({ message: "Project created", project: result });
                return;
            }).catch((error) => {
                res.status(500).send(error.message);
                return;
            });


        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * Update a project.
 */
jsonRouter.put("/displayItems", async (req, res) => {
    const sessionToken = req.body.sessionToken;
    const data = {
        title: req.body.title,
        _id: req.body._id,
        infoPages: req.body.infoPages,
        displayItemType: req.body.displayItemType
    };
    const requiredData = {
        title: undefined,
        _id: undefined,
        infoPages: undefined,
        displayItemType: undefined
    }
    if (req.body.tags != undefined) {
        data.tags = req.body.tags
    } else {
        data.tags = [];
    }
    if (req.body.link != undefined) {
        data.link = req.body.link;
    }
    if (req.body.hidden != undefined) {
        data.hidden = req.body.hidden;
    }
    if (req.body.description != undefined) {
        data.description = req.body.description;
    }
    if (req.body.thumbnailImage != undefined) {
        data.thumbnailImage = req.body.thumbnailImage;
    }
    if (req.body.spoiler == undefined) {
        data.spoiler = false;
    } else {
        data.spoiler = req.body.spoiler;
    }
    if (req.body.nsfw == undefined) {
        data.nsfw = false;
    } else {
        data.nsfw = req.body.nsfw;
    }
    if (req.body.lastUpdated == undefined || req.body.lastUpdated == null) {
        data.lastUpdated = new Date();
    } else {
        try {
            data.lastUpdated = new Date(req.body.lastUpdated);
        } catch (e) {
            data.lastUpdated = new Date();
        }
    }
    console.log(data.lastUpdated)
    const sessionH = new SessionHandler();
    sessionH.rateLimitMiddleware(req, res, async () => {
        if (!sessionToken) {
            return res.status(400).send({ error: "Missing sessionToken" });
        }
        const mergdedData = { ...requiredData, ...data };
        const auth = new UserAuthenticator();
        const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionToken, false, res, mergdedData);
        if (!authenticationSuccess) {
            return;
        }
        if (!auth.checkAuthorityLevel(5)) {
            // Create security flag for insufficient authorization attempt
            try {
                const user = auth.getUserData();
                await SecurityFlagHandler.createSecurityFlag({
                    req: req,
                    riskLevel: 3,
                    description: `User attempted display item update with insufficient clearance (level ${user.clearanceLevel})`,
                    fileName: 'json.routes.js',
                    userId: user._id,
                    additionalData: {
                        username: user.username,
                        userClearanceLevel: user.clearanceLevel,
                        requiredClearanceLevel: 5,
                        attemptedAction: 'update_display_item',
                        displayItemId: data._id,
                        itemTitle: data.title,
                        endpoint: req.originalUrl || req.url,
                        possibleFrontendBypass: true
                    }
                });
            } catch (flagError) {
                requestLogger.failedSecurityFlag(flagError);
            }
            res.status(403).send({ "message": "You do not have the required clearance level for this action." });
            return;
        }

        // Create security flag for display item update attempt
        try {
            const user = auth.getUserData();
            await SecurityFlagHandler.createSecurityFlag({
                req: req,
                riskLevel: 2,
                description: `User updated display item: ${data.title || data._id}`,
                fileName: 'json.routes.js',
                userId: user._id,
                additionalData: {
                    username: user.username,
                    clearanceLevel: user.clearanceLevel,
                    action: 'update_display_item_success',
                    displayItemId: data._id,
                    itemTitle: data.title,
                    endpoint: req.originalUrl || req.url
                }
            });
        } catch (flagError) {
            requestLogger.failedSecurityFlag(flagError);
        }

        displayItems.updateOne({ _id: { $eq: data._id } }, data).then((result) => {
            if (!result) {
                return res.status(404).send({ message: "Project not found" });
            }
            return res.status(200).send({ message: "Project updated" });
        }).catch((error) => {
            return res.status(500).send(error.message);
        });
    });
});

module.exports = {
    jsonRouter: jsonRouter
}