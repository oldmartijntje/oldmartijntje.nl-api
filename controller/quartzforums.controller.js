

const { quartzForumAccounts, quartzForumForums, quartzForumMessages, implementationKeys } = require('../database.js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Helper function to strip HTML tags from text
function stripHtml(text) {
    if (!text || typeof text !== 'string') return text;
    // Remove HTML tags and decode HTML entities
    return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
}

// Helper function to sanitize user input
function sanitizeInput(text) {
    if (!text || typeof text !== 'string') return text;
    let sanitized = stripHtml(text);
    // Convert URLs to wiki links
    sanitized = convertUrlsToWikiLinks(sanitized);
    return sanitized;
}

// Helper function to generate access key
function generateAccessKey() {
    return crypto.randomBytes(32).toString('hex');
}

// Comprehensive profanity list
const profanityList = [
    'fuck', 'fucking', 'fucked', 'fucker', 'fucks',
    'bitch', 'bitches', 'bitching',
    'damn', 'damned', 'damning',
    'asses', 'asshole', 'assholes',
    'bastard', 'bastards',
    'cunt', 'cunts',
    'dick', 'dicks', 'dickhead',
    'nigger', 'niggers', 'nigga', 'niggas',
    'faggot', 'faggots', 'fag', 'fags',
    'retard', 'retarded', 'retards',
    'slut', 'sluts', 'slutty',
    'whore', 'whores',
    'cock', 'cocks',
    'pussy', 'pussies',
    'hitler'
];

// Helper function to convert URLs to wiki links
function convertUrlsToWikiLinks(text) {
    if (!text || typeof text !== 'string') return text;

    // Regular expression to match http:// and https:// URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.replace(urlRegex, (url) => {
        try {
            const urlObj = new URL(url);
            let path = urlObj.pathname;

            // Remove leading slash if it exists
            if (path.startsWith('/')) {
                path = path.substring(1);
            }

            // If path is empty, use the domain
            if (!path) {
                path = urlObj.hostname;
            }

            // Remove trailing slash if it exists
            if (path.endsWith('/')) {
                path = path.substring(0, path.length - 1);
            }

            // Create wiki link format [[path|unknown link]]
            return `[[${path}|unknown link]]`;
        } catch (e) {
            // If URL parsing fails, return the original text
            return `[[${url}|unknown link]]`;
        }
    });
}

// Helper function to check for profanity
function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    return profanityList.some(word => lowerText.includes(word));
}

// Helper function to check for profanity and update limbo status
async function checkProfanityAndUpdateLimbo(content, user) {
    if (containsProfanity(content)) {
        user.limbo = true;
        await user.save();
    }
}

// Account Management
async function createAccount(req, res) {
    try {
        let { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Sanitize username input
        username = sanitizeInput(username);

        if (!username.trim()) {
            return res.status(400).json({ message: 'Username cannot be empty or contain only HTML' });
        }

        // Validate username format and length
        if (username.length < 4) {
            return res.status(400).json({ message: 'Username must be at least 4 characters long' });
        }

        if (username.length > 32) {
            return res.status(400).json({ message: 'Username must be no more than 32 characters long' });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ message: 'Username can only contain letters, numbers, and underscores' });
        }

        // Check if username already exists
        const existingUser = await quartzForumAccounts.findOne({ name: username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Create new account
        const accessKey = generateAccessKey();
        const hasOffensiveUsername = containsProfanity(username);

        const newUser = new quartzForumAccounts({
            name: username,
            password: password, // Will be hashed by pre-save middleware
            accessKey: accessKey,
            limbo: hasOffensiveUsername // Set limbo status based on username profanity
        });

        await newUser.save();

        res.status(201).json({
            userId: newUser._id,
            username: newUser.name,
            accessKey: newUser.accessKey
        });
    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * Validate Access Key
 * POST /forums/account/validate-access-key
 * Body: { accessKey: string }
 */
async function validateAccessKey(req, res) {
    try {
        const { accessKey } = req.body;

        if (!accessKey) {
            return res.status(400).json({
                valid: false,
                message: 'Access key is required'
            });
        }

        const user = await quartzForumAccounts.findOne({ accessKey });

        if (!user) {
            return res.status(200).json({
                valid: false,
                message: 'Invalid access key'
            });
        }

        // Update last usage
        user.lastUsage = new Date();
        await user.save();

        res.status(200).json({
            valid: true,
            message: 'Access key is valid',
            user: {
                userId: user._id,
                username: user.name,
                limbo: user.limbo,
                createdAt: user.createdAt,
                lastUsage: user.lastUsage
            }
        });
    } catch (error) {
        console.error('Validate access key error:', error);
        res.status(500).json({
            valid: false,
            message: 'Internal server error'
        });
    }
}

async function login(req, res) {
    try {
        let { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Sanitize username input
        username = sanitizeInput(username);

        const user = await quartzForumAccounts.findOne({ name: username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last usage
        user.lastUsage = new Date();
        await user.save();

        res.status(200).json({
            userId: user._id,
            username: user.name,
            accessKey: user.accessKey
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function resetAccessKey(req, res) {
    try {
        let { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Sanitize username input
        username = sanitizeInput(username);

        const user = await quartzForumAccounts.findOne({ name: username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate new access key
        user.accessKey = generateAccessKey();
        user.lastUsage = new Date();
        await user.save();

        res.status(200).json({
            accessKey: user.accessKey
        });
    } catch (error) {
        console.error('Reset access key error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteAccount(req, res) {
    try {
        let { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Sanitize username input
        username = sanitizeInput(username);

        const user = await quartzForumAccounts.findOne({ name: username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Set all user's messages' accountId to null
        await quartzForumMessages.updateMany(
            { accountId: user._id },
            { $set: { accountId: null } }
        );

        // Delete the user account
        await quartzForumAccounts.findByIdAndDelete(user._id);

        res.status(200).json({
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getUserProfile(req, res) {
    try {
        const userId = req.params.userId;
        const requesterInLimbo = req.requesterInLimbo || false;

        // Validate ObjectId format
        if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const user = await quartzForumAccounts.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get forums where user has posted
        const userMessages = await quartzForumMessages.find({
            accountId: userId,
            ...(requesterInLimbo ? {} : { limbo: { $ne: true } })
        });

        const forumIds = [...new Set(userMessages.map(msg => msg.forumId.toString()))];

        const forums = await quartzForumForums.find({ _id: { $in: forumIds } });

        const forumData = await Promise.all(forums.map(async (forum) => {
            const messageCount = await quartzForumMessages.countDocuments({
                forumId: forum._id,
                accountId: userId,
                ...(requesterInLimbo ? {} : { limbo: { $ne: true } })
            });

            return {
                forumId: forum._id,
                implementationKey: forum.implementationKey,
                subpage: forum.subpage,
                messageCount: messageCount
            };
        }));

        res.status(200).json({
            userId: user._id,
            username: user.name,
            profileDesign: user.profileDesign,
            forums: forumData
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Message Management
async function postMessage(req, res) {
    try {
        let { implementationKey, subpage, content } = req.body;
        const user = req.quartzUser; // Set by auth middleware

        if (!implementationKey || !subpage || !content) {
            return res.status(400).json({ message: 'Implementation key, subpage, and content are required' });
        }

        // Sanitize content input
        content = sanitizeInput(content);

        if (!content.trim()) {
            return res.status(400).json({ message: 'Message content cannot be empty or contain only HTML' });
        }

        // Check for profanity and update user limbo status
        await checkProfanityAndUpdateLimbo(content, user);

        // Find or create forum
        let forum = await quartzForumForums.findOne({
            implementationKey: implementationKey,
            subpage: subpage
        });

        if (!forum) {
            forum = new quartzForumForums({
                implementationKey: implementationKey,
                subpage: subpage,
                lastPush: new Date()
            });
            await forum.save();
        } else {
            forum.lastPush = new Date();
            await forum.save();
        }

        // Create message
        const message = new quartzForumMessages({
            forumId: forum._id,
            accountId: user._id,
            content: content,
            limbo: user.limbo
        });

        await message.save();

        res.status(201).json({
            messageId: message._id,
            forumId: forum._id,
            content: message.content,
            createdAt: message.createdAt
        });
    } catch (error) {
        console.error('Post message error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteMessage(req, res) {
    try {
        const messageId = req.params.messageId;
        const user = req.quartzUser; // Set by auth middleware

        const message = await quartzForumMessages.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.accountId?.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'You do not own this message' });
        }

        // Set accountId to null instead of deleting
        message.accountId = null;
        await message.save();

        res.status(200).json({
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Forum Management
async function getForum(req, res) {
    try {
        const { implementationKey, subpage } = req.query;
        const requesterInLimbo = req.requesterInLimbo || false;

        if (!implementationKey || !subpage) {
            return res.status(400).json({ message: 'Implementation key and subpage are required' });
        }

        const forum = await quartzForumForums.findOne({
            implementationKey: implementationKey,
            subpage: subpage
        });

        if (!forum) {
            return res.status(404).json({ message: 'Forum not found' });
        }

        // Get messages with user data
        const messages = await quartzForumMessages.aggregate([
            {
                $match: {
                    forumId: forum._id,
                    ...(requesterInLimbo ? {} : { limbo: { $ne: true } })
                }
            },
            {
                $lookup: {
                    from: 'quartzforumaccounts',
                    localField: 'accountId',
                    foreignField: '_id',
                    as: 'account'
                }
            },
            {
                $sort: { createdAt: 1 }
            },
            {
                $project: {
                    messageId: '$_id',
                    accountId: '$accountId',
                    username: { $ifNull: [{ $arrayElemAt: ['$account.name', 0] }, null] },
                    content: '$content',
                    limbo: '$limbo',
                    createdAt: '$createdAt'
                }
            }
        ]);

        res.status(200).json({
            forumId: forum._id,
            implementationKey: forum.implementationKey,
            subpage: forum.subpage,
            lastPush: forum.lastPush,
            messages: messages
        });
    } catch (error) {
        console.error('Get forum error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getRecentForums(req, res) {
    try {
        const requesterInLimbo = req.requesterInLimbo || false;

        // First, get all recent forums
        const forums = await quartzForumForums.aggregate([
            {
                $lookup: {
                    from: 'implementationkeys',
                    localField: 'implementationKey',
                    foreignField: 'implementationKey',
                    as: 'keyData'
                }
            },
            {
                $match: {
                    'keyData.disabled': { $ne: true }
                }
            },
            {
                $sort: { lastPush: -1 }
            },
            {
                $limit: 50 // Get more initially to filter later
            }
        ]);

        let filteredForums = [];

        // Filter forums based on limbo status if requester is not in limbo
        if (!requesterInLimbo) {
            for (const forum of forums) {
                // Check if forum has any messages from non-limbo users
                const nonLimboMessageCount = await quartzForumMessages.countDocuments({
                    forumId: forum._id,
                    $or: [
                        { limbo: false },
                        { limbo: { $exists: false } },
                        {
                            $expr: {
                                $eq: [
                                    { $ifNull: ["$limbo", false] },
                                    false
                                ]
                            }
                        }
                    ]
                });

                // Include forum if it has at least one non-limbo message
                if (nonLimboMessageCount > 0) {
                    filteredForums.push({
                        forumId: forum._id,
                        implementationKey: forum.implementationKey,
                        subpage: forum.subpage,
                        lastPush: forum.lastPush
                    });
                }

                // Stop once we have 25 forums
                if (filteredForums.length >= 25) {
                    break;
                }
            }
        } else {
            // If requester is in limbo, show all forums
            filteredForums = forums.slice(0, 25).map(forum => ({
                forumId: forum._id,
                implementationKey: forum.implementationKey,
                subpage: forum.subpage,
                lastPush: forum.lastPush
            }));
        }

        res.status(200).json({
            forums: filteredForums
        });
    } catch (error) {
        console.error('Get recent forums error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getAllForums(req, res) {
    try {
        const { implementationKey, subpage, limit = 50, offset = 0 } = req.query;

        let matchConditions = {};
        if (implementationKey) {
            matchConditions.implementationKey = implementationKey;
        }
        if (subpage) {
            matchConditions.subpage = { $regex: subpage, $options: 'i' };
        }

        const pipeline = [
            {
                $lookup: {
                    from: 'implementationkeys',
                    localField: 'implementationKey',
                    foreignField: 'implementationKey',
                    as: 'keyData'
                }
            },
            {
                $match: {
                    'keyData.disabled': { $ne: true },
                    ...matchConditions
                }
            },
            {
                $facet: {
                    forums: [
                        { $skip: parseInt(offset) },
                        { $limit: parseInt(limit) },
                        {
                            $project: {
                                forumId: '$_id',
                                implementationKey: '$implementationKey',
                                subpage: '$subpage',
                                lastPush: '$lastPush'
                            }
                        }
                    ],
                    total: [{ $count: 'count' }]
                }
            }
        ];

        const result = await quartzForumForums.aggregate(pipeline);
        const forums = result[0].forums;
        const total = result[0].total[0]?.count || 0;

        res.status(200).json({
            total: total,
            forums: forums
        });
    } catch (error) {
        console.error('Get all forums error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Get implementation key details
async function getImplementationKey(req, res) {
    try {
        const key = req.params.key;

        const implementationKeyData = await implementationKeys.findOne({ implementationKey: key });

        if (!implementationKeyData) {
            return res.status(404).json({ message: 'Implementation key not found' });
        }

        res.status(200).json({
            implementationKey: implementationKeyData.implementationKey,
            domain: implementationKeyData.domain,
            disabled: implementationKeyData.disabled
        });
    } catch (error) {
        console.error('Get implementation key error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = {
    createAccount,
    login,
    validateAccessKey,
    resetAccessKey,
    deleteAccount,
    getUserProfile,
    postMessage,
    deleteMessage,
    getForum,
    getRecentForums,
    getAllForums,
    getImplementationKey
};