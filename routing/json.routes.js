const express = require("express");
const { SessionHandler } = require("../authentication/sessionHandler");
const { projects } = require("../database");
const settings = require('../settings.json');

const jsonRouter = express.Router();
jsonRouter.use(express.json());

/**
 * check if your sessiontoken is valid.
 * 
 * Also returns the tenants that the user is part of.
 */
jsonRouter.post("/projects", async (_req, res) => {
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

module.exports = {
    jsonRouter: jsonRouter
}