// rateLimitMiddleware.js
const { getSession, createSession, updateSession } = require('../helpers/rateLimitUtils');
const { SecurityFlagHandler } = require('../helpers/securityFlag.handler.js');
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
                    // Create security flag for blacklisted IP attempting access
                    try {
                        await SecurityFlagHandler.createSecurityFlag({
                            req: req,
                            riskLevel: 4,
                            description: `Blacklisted IP attempting access after severe rate limit violation`,
                            fileName: 'sessionHandler.js',
                            additionalData: {
                                rateLimitedAt: session.rateLimitedAt,
                                totalCalls: session.calls,
                                attemptedEndpoint: req.originalUrl || req.url
                            }
                        });
                    } catch (flagError) {
                        console.error('Error creating security flag:', flagError);
                    }
                    return res.status(429).json({ message: "Rate limit exceeded by a lot. Try again in 24 hours." });
                }

                session = await updateSession(session, now, limit, blacklistLimit, resetMinutes);

                if (session.rateLimitedAt) {
                    // Create security flag for new blacklist event (severe rate limit violation)
                    try {
                        await SecurityFlagHandler.createSecurityFlag({
                            req: req,
                            riskLevel: 5,
                            description: `IP blacklisted due to severe rate limit violation (${session.calls} calls)`,
                            fileName: 'sessionHandler.js',
                            additionalData: {
                                callCount: session.calls,
                                blacklistLimit: blacklistLimit,
                                rateLimitedAt: session.rateLimitedAt,
                                attemptedEndpoint: req.originalUrl || req.url
                            }
                        });
                    } catch (flagError) {
                        console.error('Error creating security flag:', flagError);
                    }
                    return res.status(429).json({ message: "Rate limit exceeded by a lot. Try again in 24 hours." });
                } else if (session.calls >= limit) {
                    // Create security flag for regular rate limit violation
                    try {
                        await SecurityFlagHandler.createSecurityFlag({
                            req: req,
                            riskLevel: 2,
                            description: `IP exceeded rate limit (${session.calls}/${limit} calls per minute)`,
                            fileName: 'sessionHandler.js',
                            additionalData: {
                                callCount: session.calls,
                                rateLimit: limit,
                                attemptedEndpoint: req.originalUrl || req.url,
                                closeToBlacklist: session.calls >= (blacklistLimit * 0.8)
                            }
                        });
                    } catch (flagError) {
                        console.error('Error creating security flag:', flagError);
                    }
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
