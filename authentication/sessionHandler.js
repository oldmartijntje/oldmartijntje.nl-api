// rateLimitMiddleware.js
const { getSession, createSession, updateSession } = require('../helpers/rateLimitUtils');
const settings = require('../settings.json');

class SessionHandler {
    constructor() { }

    async rateLimitMiddleware(req, res, next) {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const now = new Date();
        const limit = settings.sessionRateLimitPerMinute;
        const blacklistLimit = settings.sessionBlacklistLimitPerMinute;
        const resetMinutes = settings.resetLimitAfterMinutes;

        try {
            let session = await getSession(ip);
            if (!session) {
                session = await createSession(ip);
            } else {
                if (session.rateLimitedAt) {
                    return res.status(429).json({ message: "Rate limit exceeded by a lot. Try again in 24 hours." });
                }

                session = await updateSession(session, now, limit, blacklistLimit, resetMinutes);

                if (session.rateLimitedAt) {
                    return res.status(429).json({ message: "Rate limit exceeded by a lot. Try again in 24 hours." });
                } else if (session.calls >= limit) {
                    return res.status(429).json({ message: "Rate limit exceeded. Try again in a minute." });
                }
            }
            next();
        } catch (error) {
            console.error("Error in rate limiting middleware:", error);
            res.status(500).json({ message: "Internal server error." });
        }
    }
}

module.exports = {
    SessionHandler
};
