// rateLimitUtils.js
const { sessions } = require("../database");
const { SecurityFlagHandler } = require('./securityFlag.handler.js');

const HONEYPOT_BAN_DURATION_MS = 93 * 24 * 60 * 60 * 1000; // 90 days, also change this in server.js
// the ban time increases factorally:
// 30 days, 120 days, 270 days....

// In-memory caches for rate limiting
const sessionCache = new Map();
const accountCreationCache = new Map();
const userMessageCache = new Map();
const userDesignCache = new Map();

// Track which sessions need DB sync
const dirtySessionIps = new Set();

// Track last security flag creation time per IP (to avoid spam)
const lastSecurityFlagCache = new Map();

// Periodic database sync (every 30 seconds)
const DB_SYNC_INTERVAL = 30000;
let syncInterval = null;

// Start periodic sync when module loads
const startPeriodicSync = () => {
    if (syncInterval) return; // Already running

    syncInterval = setInterval(async () => {
        await syncCachesToDatabase();
    }, DB_SYNC_INTERVAL);
};

// Sync dirty sessions to database
const syncCachesToDatabase = async () => {
    if (dirtySessionIps.size === 0) return;

    const ipsToSync = Array.from(dirtySessionIps);
    dirtySessionIps.clear();

    try {
        // Batch update sessions
        const updatePromises = ipsToSync.map(async (ip) => {
            const session = sessionCache.get(ip);
            if (!session) return;

            await sessions.findOneAndUpdate(
                { ipAddress: ip },
                {
                    $set: {
                        calls: session.calls,
                        firstCall: session.firstCall,
                        lastCall: session.lastCall,
                        rateLimitedAt: session.rateLimitedAt,
                        strikes: session.strikes ?? 0,
                        lastAccountCreation: session.lastAccountCreation
                    }
                },
                { upsert: true }
            );
        });

        await Promise.all(updatePromises);
    } catch (error) {
        console.error('Error syncing sessions to database:', error);
        // Re-add failed IPs to dirty set
        ipsToSync.forEach(ip => dirtySessionIps.add(ip));
    }
};

// Initialize: load recent sessions from DB into cache
const initializeCache = async () => {
    try {
        const recentSessions = await sessions.find({
            lastCall: { $gte: new Date(Date.now() - 60 * 60000) } // Last hour
        }).limit(10000);

        recentSessions.forEach(session => {
            sessionCache.set(session.ipAddress, {
                ipAddress: session.ipAddress,
                calls: session.calls,
                firstCall: session.firstCall,
                lastCall: session.lastCall,
                rateLimitedAt: session.rateLimitedAt,
                strikes: session.strikes ?? 0,
                lastAccountCreation: session.lastAccountCreation
            });
        });

        console.log(`Loaded ${recentSessions.length} sessions into cache`);
    } catch (error) {
        console.error('Error initializing session cache:', error);
    }
};

// Call on server start
initializeCache();
startPeriodicSync();

const getSession = async (ip) => {
    // Check in-memory cache first
    let session = sessionCache.get(ip);

    if (!session) {
        // Not in cache, check database
        const dbSession = await sessions.findOne({ ipAddress: { $eq: ip } });
        if (dbSession) {
            session = {
                ipAddress: dbSession.ipAddress,
                calls: dbSession.calls,
                firstCall: dbSession.firstCall,
                lastCall: dbSession.lastCall,
                rateLimitedAt: dbSession.rateLimitedAt,
                strikes: dbSession.strikes ?? 0,
                lastAccountCreation: dbSession.lastAccountCreation
            };
            sessionCache.set(ip, session);
        }
    }

    return session;
};

const createSession = async (ip) => {
    const newSession = {
        ipAddress: ip,
        calls: 1,
        firstCall: new Date(),
        lastCall: new Date(),
        strikes: 0
    };

    sessionCache.set(ip, newSession);
    dirtySessionIps.add(ip);

    return newSession;
};

const updateSession = async (session, now, rateLimitPerMinute, blacklistLimitPerMinute, resetMinutes, req = null) => {
    const wasOverLimit = session.calls >= rateLimitPerMinute;

    if (now - session.firstCall > resetMinutes * 60000) {
        // Reset the rate limit for a new window
        session.calls = 1;
        session.firstCall = now;
    } else if (session.calls >= rateLimitPerMinute) {
        if (session.calls >= blacklistLimitPerMinute) {
            // Blacklist logic - immediately sync to DB
            session.rateLimitedAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            dirtySessionIps.add(session.ipAddress);
            // Force immediate DB sync for blacklist events
            await syncCachesToDatabase();
        }
        session.calls++;
    } else {
        session.calls++;
    }
    session.lastCall = session.rateLimitedAt && session.rateLimitedAt > now ? session.rateLimitedAt : now;

    // Update in cache
    sessionCache.set(session.ipAddress, session);
    dirtySessionIps.add(session.ipAddress);

    // Create security flag if hitting rate limit (only once per 10 minutes per IP)
    if (session.calls === rateLimitPerMinute + 1 && !wasOverLimit && req) {
        const tenMinutesAgo = Date.now() - 10 * 60000;
        const lastFlagTime = lastSecurityFlagCache.get(session.ipAddress);

        if (!lastFlagTime || lastFlagTime < tenMinutesAgo) {
            try {
                await SecurityFlagHandler.createSecurityFlag({
                    req: req,
                    riskLevel: 3,
                    description: `IP exceeded rate limit (${session.calls} calls in ${resetMinutes} minute window)`,
                    fileName: 'rateLimitUtils.js',
                    additionalData: {
                        callCount: session.calls,
                        rateLimit: rateLimitPerMinute,
                        blacklistLimit: blacklistLimitPerMinute,
                        windowMinutes: resetMinutes,
                        firstCall: session.firstCall,
                        rateLimitType: 'session',
                        closeToBan: session.calls >= (blacklistLimitPerMinute * 0.7)
                    }
                });
                lastSecurityFlagCache.set(session.ipAddress, Date.now());
            } catch (error) {
                console.error('Error creating rate limit security flag:', error);
            }
        }
    }

    return session;
};

const banIp = async (ip) => {
    if (!ip) return null;

    const now = new Date();
    const existingSession = await getSession(ip);
    const session = existingSession ? { ...existingSession } : {
        ipAddress: ip,
        calls: 1,
        firstCall: now,
        lastCall: now,
        strikes: 0,
    };

    const currentStrikes = Number.isInteger(session.strikes) ? session.strikes : 0;
    session.strikes = currentStrikes + 1;

    const banDurationMs = HONEYPOT_BAN_DURATION_MS * session.strikes * session.strikes;
    session.rateLimitedAt = new Date(Date.now() + banDurationMs);
    session.lastCall = session.rateLimitedAt;

    sessionCache.set(ip, session);
    dirtySessionIps.add(ip);

    await syncCachesToDatabase();

    return session;
};

// Check if an IP has created an account in the last 24 hours
const checkAccountCreationLimit = async (ip) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check in-memory cache first
    const cachedTime = accountCreationCache.get(ip);
    if (cachedTime && cachedTime >= twentyFourHoursAgo) {
        return true;
    }

    // Check session cache
    const session = sessionCache.get(ip);
    if (session && session.lastAccountCreation && session.lastAccountCreation >= twentyFourHoursAgo) {
        accountCreationCache.set(ip, session.lastAccountCreation);
        return true;
    }

    // Fall back to database check only if not in cache
    const dbSession = await sessions.findOne({
        ipAddress: { $eq: ip },
        lastAccountCreation: { $gte: twentyFourHoursAgo }
    });

    if (dbSession) {
        accountCreationCache.set(ip, dbSession.lastAccountCreation);
        return true;
    }

    return false;
};

// Mark that an IP has created an account
const markAccountCreation = async (ip) => {
    const now = new Date();
    accountCreationCache.set(ip, now);

    let session = sessionCache.get(ip);

    if (!session) {
        session = {
            ipAddress: ip,
            calls: 1,
            firstCall: new Date(),
            lastCall: new Date(),
            lastAccountCreation: now
        };
    } else {
        session.lastAccountCreation = now;
    }

    sessionCache.set(ip, session);
    dirtySessionIps.add(ip);

    return session;
};

// Cleanup old cache entries periodically
const cleanupCache = () => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60000;
    const oneDayAgo = now - 24 * 60 * 60000;

    // Cleanup session cache - remove entries older than 1 hour
    for (const [ip, session] of sessionCache.entries()) {
        if (session.lastCall && session.lastCall.getTime() < oneHourAgo) {
            // Don't remove if blacklisted or has recent account creation
            if (!session.rateLimitedAt && (!session.lastAccountCreation || session.lastAccountCreation.getTime() < oneDayAgo)) {
                sessionCache.delete(ip);
            }
        }
    }

    // Cleanup account creation cache - remove entries older than 24 hours
    for (const [ip, time] of accountCreationCache.entries()) {
        if (time.getTime() < oneDayAgo) {
            accountCreationCache.delete(ip);
        }
    }

    // Cleanup user message cache - remove entries older than 1 minute
    const oneMinuteAgo = now - 60 * 1000;
    for (const [userId, time] of userMessageCache.entries()) {
        if (time.getTime() < oneMinuteAgo) {
            userMessageCache.delete(userId);
        }
    }

    // Cleanup user design cache - remove entries older than 1 minute
    for (const [userId, time] of userDesignCache.entries()) {
        if (time.getTime() < oneMinuteAgo) {
            userDesignCache.delete(userId);
        }
    }

    // Cleanup security flag cache - remove entries older than 10 minutes
    const tenMinutesAgo = now - 10 * 60000;
    for (const [ip, time] of lastSecurityFlagCache.entries()) {
        if (time < tenMinutesAgo) {
            lastSecurityFlagCache.delete(ip);
        }
    }
};

// Run cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60000);

// Graceful shutdown handler
const shutdown = async () => {
    console.log('Syncing rate limit data before shutdown...');
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    await syncCachesToDatabase();
    console.log('Rate limit data synced successfully');
};

module.exports = {
    getSession,
    createSession,
    updateSession,
    checkAccountCreationLimit,
    markAccountCreation,
    banIp,
    shutdown,
    syncCachesToDatabase
};
