const express = require('express');
const { SessionHandler } = require('../authentication/sessionHandler');
const { UserAuthenticator } = require('../authentication/user.authenticator');
const {
    getBlogs,
    getBlog,
    createBlog,
    updateBlog,
    deleteBlog,
    logDeniedBlogAction
} = require('../controller/blogs.controller.js');

const blogsRouter = express.Router();
blogsRouter.use(express.json());

function isHiddenRequested(hiddenValue) {
    return hiddenValue === true || hiddenValue === 'true';
}

async function enableHiddenAccessIfAllowed(req, res) {
    req.blogCanSeeHidden = false;

    if (!isHiddenRequested(req.query.hidden)) {
        return true;
    }

    const sessionTokenString = req.query.sessionToken;
    if (!sessionTokenString) {
        res.status(403).send({ message: 'A valid sessionToken with clearance level 2 or higher is required to view hidden blogs.' });
        return false;
    }

    const auth = new UserAuthenticator();
    const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
    if (!authenticationSuccess) {
        return false;
    }

    if (!auth.checkAuthorityLevel(2)) {
        res.status(403).send({ message: 'A clearance level of 2 or higher is required to view hidden blogs.' });
        return false;
    }

    req.blogCanSeeHidden = true;
    return true;
}

blogsRouter.get('/blogs', async (req, res) => {
    try {
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(req, res, async () => {
            const canContinue = await enableHiddenAccessIfAllowed(req, res);
            if (!canContinue) {
                return;
            }
            await getBlogs(req, res);
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

blogsRouter.get('/blogs/:blogIdentifier', async (req, res) => {
    try {
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(req, res, async () => {
            const canContinue = await enableHiddenAccessIfAllowed(req, res);
            if (!canContinue) {
                return;
            }
            await getBlog(req, res);
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

blogsRouter.post('/blogs', async (req, res) => {
    try {
        const sessionTokenString = req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(4)) {
                const user = auth.getUserData();
                await logDeniedBlogAction(req, user, 'create_blog', {
                    blogIdentifier: req.body.blogIdentifier,
                    _id: req.body._id
                });
                res.status(403).send({ message: 'You do not have the required clearance level for this action.' });
                return;
            }
            await createBlog(req, res);
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

blogsRouter.put('/blogs', async (req, res) => {
    try {
        const sessionTokenString = req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                const user = auth.getUserData();
                await logDeniedBlogAction(req, user, 'update_blog', {
                    blogIdentifier: req.body.blogIdentifier,
                    _id: req.body._id
                });
                res.status(403).send({ message: 'You do not have the required clearance level for this action.' });
                return;
            }
            await updateBlog(req, res);
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

blogsRouter.delete('/blogs', async (req, res) => {
    try {
        const sessionTokenString = req.query.sessionToken || req.body.sessionToken;
        const sessionH = new SessionHandler();
        sessionH.rateLimitMiddleware(req, res, async () => {
            const auth = new UserAuthenticator();
            const authenticationSuccess = await auth.authenticateBySessionTokenWithResponseHandling(sessionTokenString, false, res);
            if (!authenticationSuccess) {
                return;
            }
            if (!auth.checkAuthorityLevel(5)) {
                const user = auth.getUserData();
                await logDeniedBlogAction(req, user, 'delete_blog', {
                    blogIdentifier: req.body.blogIdentifier || req.query.blogIdentifier,
                    _id: req.body._id || req.query.id
                });
                res.status(403).send({ message: 'You do not have the required clearance level for this action.' });
                return;
            }
            await deleteBlog(req, res);
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

module.exports = {
    blogsRouter
};