const express = require("express");
const { SessionHandler } = require("../authentication/sessionHandler");
const { displayItems, projectData } = require("../database");
const settings = require('../settings.json');
const { UserAuthenticator } = require("../authentication/user.authenticator");

const projectDataRouter = express.Router();
projectDataRouter.use(express.json());

/**
 * Get all project data.
 */
projectDataRouter.post("/getProjectData", async (_req, res) => {
    try {
        const amount = _req.body.amount ? _req.body.amount : settings.defaultAmountToGet;
        const from = _req.body.from ? _req.body.from : 0;
        const projectId = _req.body.projectId;
        const sessionTokenString = _req.body.sessionToken;
        if (projectId == undefined) {
            res.status(400).send({ message: "No Project Specified." });
            return;
        }
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, () => {
            if (!sessionTokenString) {
                // No session token, just get the data for clearance level 0
                projectData.find({
                    projectId: projectId,
                    clearanceLevel: { $lte: 0 }
                }).skip(from).limit(amount).then((result) => {
                    if (!result) {
                        res.status(200).send({ message: "No projectData found", "projectData": [] });
                    }
                    res.status(200).send({
                        "projectData": result
                    });
                }).catch((error) => {
                    res.status(500).send(error.message);
                });
            } else {
                const auth = new UserAuthenticator();
                auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res).then((isAuthorised) => {
                    if (!isAuthorised) {
                        return;
                    }
                    const user = auth.getUserData();
                    user.clearanceLevel = user.clearanceLevel ? user.clearanceLevel : 0;
                    projectData.find({
                        projectId: projectId,
                        clearanceLevelNeeded: { $lte: user.clearanceLevel }
                    }).skip(from).limit(amount).then((result) => {
                        if (!result) {
                            res.status(200).send({ message: "No projectData found", "projectData": [] });
                        }
                        res.status(200).send({
                            "projectData": result
                        });
                    }).catch((error) => {
                        res.status(500).send(error.message);
                    });
                }).catch((error) => {
                    res.status(500).send(error.message);
                });
            }


        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

/**
 * Delete a projectData object.
 */
projectDataRouter.delete("/", async (req, res) => {
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
        projectData.deleteOne({ _id: id }).then((result) => {
            if (result.deletedCount == 0) {
                return res.status(404).send({ message: "projectData not found" });
            }
            return res.status(200).send({ message: "projectData deleted" });
        }).catch((error) => {
            return res.status(500).send(error.message);
        });
    });
});

/**
 * Create a projectData object.
 */
projectDataRouter.post("/", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const data = _req.body.attributes;
        const sessionH = new SessionHandler();
        const clearanceLevelNeeded = _req.body.clearanceLevelNeeded;
        const projectId = _req.body.projectId;
        if (!projectId) {
            res.status(400).send({ message: "No projectId Specified." });
            return;
        }
        if (!data) {
            res.status(400).send({ message: "No attributes specified." });
            return;
        }
        if (clearanceLevelNeeded == undefined) {
            res.status(400).send({ message: "No clearanceLevelNeeded specified." });
            return
        }
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const mergdedData = { attributes: data, clearanceLevelNeeded: clearanceLevelNeeded, projectId: projectId };
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5) || !auth.checkAuthorityLevel(clearanceLevelNeeded)) {
                res.status(403).send({ "message": "You do not have the required clearance level for this action." });
                return;
            }
            const projectDataData = new projectData(mergdedData);
            projectDataData.save().then((result) => {
                res.status(200).send({ message: "ProjectData created", projectData: result });
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
 * Update a projectData.
 */
projectDataRouter.put("/", async (req, res) => {
    const sessionToken = req.body.sessionToken;
    const data = req.body.attributes;
    const sessionH = new SessionHandler();
    const clearanceLevelNeeded = req.body.clearanceLevelNeeded;
    const projectId = req.body.projectId;
    const _id = req.body._id;
    if (!_id) {
        res.status(400).send({ message: "No _id specified." });
        return;
    }
    if (!projectId) {
        res.status(400).send({ message: "No Project Specified." });
        return;
    }
    if (!data) {
        res.status(400).send({ message: "No attributes specified." });
        return;
    }
    if (clearanceLevelNeeded == undefined) {
        res.status(400).send({ message: "No clearanceLevelNeeded specified." });
        return;
    }
    sessionH.rateLimitMiddleware(req, res, async () => {
        if (!sessionToken) {
            return res.status(400).send({ error: "Missing sessionToken" });
        }
        const mergdedData = { attributes: data, clearanceLevelNeeded: clearanceLevelNeeded, projectId: projectId };
        const auth = new UserAuthenticator();
        const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionToken, false, res, mergdedData);
        if (!authenticationSuccess) {
            return;
        }
        if (!auth.checkAuthorityLevel(5) || !auth.checkAuthorityLevel(clearanceLevelNeeded)) {
            res.status(403).send({ "message": "You do not have the required clearance level for this action." });
            return;
        }
        projectData.updateOne({ _id: _id }, mergdedData).then((result) => {
            if (!result) {
                return res.status(404).send({ message: "Project not found" });
            }
            return res.status(200).send({ message: "Project updated" });
        }).catch((error) => {
            return res.status(500).send(error.message);
        });
    });
});

projectDataRouter.post("/getAllProjectIds", async (_req, res) => {
    try {
        const sessionTokenString = _req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(_req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            projectData.find({}).distinct('projectId').then((result) => {
                if (!result) {
                    res.status(200).send({ message: "No projectData found", "projectData": [] });
                }
                res.status(200).send({
                    "projectIds": result
                });
            }).catch((error) => {
                res.status(500).send(error.message);
            });
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

module.exports = {
    projectDataRouter: projectDataRouter
}