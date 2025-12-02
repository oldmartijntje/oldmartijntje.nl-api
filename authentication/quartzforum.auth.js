const { quartzForumAccounts, implementationKeys } = require('../database.js');

/**
 * Middleware to authenticate QuartzForum users via access key
 * Sets req.quartzUser if authenticated
 */
async function authenticateAccessKey(req, res, next) {
    try {
        const accessKey = req.headers['x-access-key'];

        if (!accessKey) {
            return res.status(401).json({ message: 'Access key required' });
        }

        const user = await quartzForumAccounts.findOne({ accessKey: accessKey });

        if (!user) {
            return res.status(401).json({ message: 'Invalid access key' });
        }

        // Update last usage
        user.lastUsage = new Date();
        await user.save();

        req.quartzUser = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * Middleware to validate implementation key
 * Sets req.implementationKeyData if valid
 */
async function validateImplementationKey(req, res, next) {
    try {
        const implementationKey = req.body.implementationKey || req.query.implementationKey;

        if (!implementationKey) {
            return res.status(400).json({ message: 'Implementation key required' });
        }

        const keyData = await implementationKeys.findOne({ implementationKey: implementationKey });

        if (!keyData) {
            return res.status(403).json({ message: 'Implementation key not found' });
        }

        if (keyData.disabled) {
            return res.status(403).json({ message: 'Implementation key is disabled' });
        }

        req.implementationKeyData = keyData;
        next();
    } catch (error) {
        console.error('Implementation key validation error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * Optional middleware to check if requester is in limbo
 * For read operations where limbo status affects what they can see
 */
async function checkRequesterLimbo(req, res, next) {
    try {
        const requesterAccessKey = req.query.requesterAccessKey;

        if (requesterAccessKey) {
            const user = await quartzForumAccounts.findOne({ accessKey: requesterAccessKey });
            if (user) {
                req.requesterInLimbo = user.limbo;
            }
        }

        req.requesterInLimbo = req.requesterInLimbo || false;
        next();
    } catch (error) {
        console.error('Limbo check error:', error);
        req.requesterInLimbo = false;
        next();
    }
}

module.exports = {
    authenticateAccessKey,
    validateImplementationKey,
    checkRequesterLimbo
};