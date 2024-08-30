const express = require("express");
const { SessionHandler } = require("../authentication/sessionHandler");
const { projects } = require("../database");
const settings = require('../settings.json');
const { UserAuthenticator } = require("../authentication/user.authenticator");

const jsonRouter = express.Router();
jsonRouter.use(express.json());

/**
 * Get all projects.
 */
jsonRouter.post("/getProjects", async (_req, res) => {
    try {
        const amount = _req.body.amount ? _req.body.amount : settings.defaultAmountToGet;
        const from = _req.body.from ? _req.body.from : 0;
        const showHidden = _req.body.hidden ? _req.body.hidden : false;
        if (typeof showHidden !== "boolean") {
            res.status(400).send({ message: "Invalid 'hidden' value" });
            return;
        }
        const auth = new SessionHandler();
        auth.rateLimitMiddleware(_req, res, () => {
            let query = {}
            if (!showHidden) {
                query = { hidden: false }
            }
            projects.find(query).skip(from).limit(amount).then((result) => {
                if (!result) {
                    res.status(200).send({ message: "No projects found", "projects": [] });
                }
                res.status(200).send({
                    "projects": result
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
jsonRouter.delete("/projects", async (req, res) => {
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
        projects.deleteOne({ _id: id }).then((result) => {
            if (!result) {
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
jsonRouter.post("/projects", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const data = {
            title: _req.body.title,
            tumbnailImageId: _req.body.tumbnailImageId,
            info: _req.body.info,
            images: _req.body.images
        };
        const sessionH = new SessionHandler();
        const requiredData = {
            title: undefined,
            tumbnailImageId: undefined,
            info: undefined,
            images: undefined,
        }
        if (_req.body.tags != undefined) {
            data.tags = _req.body.tags
        }
        if (_req.body.link != undefined) {
            data.link = _req.body.link;
        }
        if (_req.body.hidden == undefined) {
            data.hidden = true;
        } else {
            data.hidden = _req.body.hidden;
        }
        data.lastUpdated = new Date();
        if (typeof data.images != "object" || data.images.length == 0) {
            res.status(400).send({ message: "Invalid 'images' value" });
            return;
        }
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const mergdedData = { ...requiredData, ...data };
            console.log(mergdedData);
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res, mergdedData);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            const project = new projects(data);
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
jsonRouter.put("/projects", async (req, res) => {
    const sessionToken = req.body.sessionToken;
    const data = {
        title: req.body.title,
        tumbnailImageId: req.body.tumbnailImageId,
        info: req.body.info,
        images: req.body.images,
        _id: req.body._id
    };
    const requiredData = {
        title: undefined,
        tumbnailImageId: undefined,
        info: undefined,
        images: undefined,
        _id: undefined
    }
    if (req.body.tags != undefined) {
        data.tags = req.body.tags
    }
    if (req.body.link != undefined) {
        data.link = req.body.link;
    }
    if (req.body.hidden != undefined) {
        data.hidden = req.body.hidden;
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
        projects.updateOne({ _id: data._id }, data).then((result) => {
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