

async function createAccount(req, res) {
    try {
        const amount = req.body.amount ? req.body.amount : settings.defaultAmountToGet;
        const from = req.body.from ? req.body.from : 0;
        const projectId = req.body.projectId;
        const sessionTokenString = req.body.sessionToken;
        if (projectId == undefined) {
            res.status(400).send({ message: "No Project Specified." });
            return;
        }

    } catch (error) {
        res.status(500).send(error.message);
    }
}


module.exports = {
    createAccount,
}