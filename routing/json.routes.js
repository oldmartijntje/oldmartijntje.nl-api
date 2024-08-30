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
                    res.status(404).send({ message: "No projects found" });
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
        if (!auth.checkAuthorityLevel(5)) {
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

module.exports = {
    jsonRouter: jsonRouter
}