// rateLimitUtils.js
const { sessions } = require("../database");

const getSession = async (ip) => {
    return await sessions.findOne({ ipAddress: ip });
};

const createSession = async (ip) => {
    const newSession = new sessions({ ipAddress: ip, calls: 1, firstCall: new Date(), lastCall: new Date() });
    await newSession.save();
    return newSession;
};

const updateSession = async (session, now, rateLimitPerMinute, blacklistLimitPerMinute, resetMinutes) => {
    if (now - session.firstCall > resetMinutes * 60000) {
        // Reset the rate limit for a new window
        session.calls = 1;
        session.firstCall = now;
    } else if (session.calls >= rateLimitPerMinute) {
        if (session.calls >= blacklistLimitPerMinute) {
            // Blacklist logic
            session.rateLimitedAt = now;
        }
        session.calls++;
    } else {
        session.calls++;
    }
    session.lastCall = now;
    await session.save();
    return session;
};

module.exports = { getSession, createSession, updateSession };
