// rateLimitUtils.js
const { sessions, quartzForumAccounts } = require("../database");

const getSession = async (ip) => {
    return await sessions.findOne({ ipAddress: { $eq: ip } });
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

// Check if an IP has created an account in the last 24 hours
const checkAccountCreationLimit = async (ip) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check if there's a session for this IP with account creation in the last 24 hours
    const session = await sessions.findOne({
        ipAddress: { $eq: ip },
        lastAccountCreation: { $gte: twentyFourHoursAgo }
    });

    return session !== null;
};

// Mark that an IP has created an account
const markAccountCreation = async (ip) => {
    let session = await sessions.findOne({ ipAddress: { $eq: ip } });

    if (!session) {
        session = new sessions({
            ipAddress: ip,
            calls: 1,
            firstCall: new Date(),
            lastCall: new Date(),
            lastAccountCreation: new Date()
        });
    } else {
        session.lastAccountCreation = new Date();
    }

    await session.save();
    return session;
};

// Check if a user has posted a message in the last minute
const checkUserMessageLimit = async (userId) => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000 * 60);

    const user = await quartzForumAccounts.findById(userId);
    if (!user) return false;

    return user.lastMessagePost && user.lastMessagePost >= oneMinuteAgo;
};

// Mark that a user has posted a message
const markUserMessage = async (userId) => {
    await quartzForumAccounts.findByIdAndUpdate(userId, {
        lastMessagePost: new Date()
    });
};

// Check if a user has updated their design in the last minute
const checkUserDesignLimit = async (userId) => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000 * 60);

    const user = await quartzForumAccounts.findById(userId);
    if (!user) return false;

    return user.lastDesignUpdate && user.lastDesignUpdate >= oneMinuteAgo;
};

// Mark that a user has updated their design
const markUserDesignUpdate = async (userId) => {
    await quartzForumAccounts.findByIdAndUpdate(userId, {
        lastDesignUpdate: new Date()
    });
};

module.exports = {
    getSession,
    createSession,
    updateSession,
    checkAccountCreationLimit,
    markAccountCreation,
    checkUserMessageLimit,
    markUserMessage,
    checkUserDesignLimit,
    markUserDesignUpdate
};
