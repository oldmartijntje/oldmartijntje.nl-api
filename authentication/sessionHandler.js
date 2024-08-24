const { sessions } = require("../database");
const { compare } = require('bcrypt');
const mongodb = require("mongodb");
const settings = require('../settings.json');



class SessionHandler {

    constructor() {
    }

    async rateLimitMiddleware(req, res, next) {
        const ip = req.ip || req.connection.remoteAddress;
        const limit = 100;  // Example limit, e.g., 100 requests
        const windowMs = settings.resetLimitAfterMinutes;  // Example time window, e.g., 1 minute

        let session = await sessions.findOne({ ipAdress: ip });

        if (session) {
            if (session.rateLimitedAt) {
                return res.status(429).json({ message: "Rate limit exceeded by A lot. Try again in 24 hours." });
            }
            const now = new Date();
            if (now.getMinutes() - session.firstCall.getMinutes() > windowMs) {
                // Reset the rate limit for a new window
                session.calls = 1;
                session.firstCall = now;
                session.lastCall = now;
            } else if (settings.sessionRateLimitPerMinute < session.calls) {
                if (settings.sessionBlacklistLimitPerMinute < session.calls) {
                    // Set rate limited time
                    session.rateLimitedAt = now;
                    session.lastCall = now;
                    await session.save();
                    return res.status(429).json({ message: "Rate limit exceeded by A lot. Try again in 24 hours." });
                }
                session.calls++;
                session.lastCall = now;
                await session.save();
                return res.status(429).json({ message: "Rate limit exceeded. Try again later." });
            }


            // Check if the user is rate limited
            if (session.calls >= limit) {
                if (session.rateLimitedAt) {
                    return res.status(429).json({ message: "Rate limit exceeded. Try again later." });
                }
                // Set rate limited time
                session.rateLimitedAt = now;
                session.lastCall = now;
                await session.save();
                return res.status(429).json({ message: "Rate limit exceeded. Try again later." });
            }
            // Increment the number of calls
            session.calls++;
            session.lastCall = now;


            await session.save();
        } else {
            // Create a new session for the IP
            session = new sessions({ ipAdress: ip });
            await session.save();
        }

        next();
    }

}

module.exports = {
    SessionHandler: SessionHandler
};