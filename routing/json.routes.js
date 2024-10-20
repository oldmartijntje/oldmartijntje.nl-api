const express = require("express");
const { SessionHandler } = require("../authentication/sessionHandler");
const { displayItems } = require("../database");
const settings = require('../settings.json');
const { UserAuthenticator } = require("../authentication/user.authenticator");

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
            res.status(403).send({ "message": "You do not have the required clearance level for this action." });
            return;
        }
        displayItems.deleteOne({ _id: id }).then((result) => {
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
        data.lastUpdated = new Date();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const mergdedData = { ...requiredData, ...data };
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res, mergdedData);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
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
    data.lastUpdated = new Date();
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
            res.status(403).send({ "message": "You do not have the required clearance level for this action." });
            return;
        }
        displayItems.updateOne({ _id: data._id }, data).then((result) => {
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