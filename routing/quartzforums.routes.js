const express = require("express");
const { authenticateAccessKey, validateImplementationKey, checkRequesterLimbo } = require("../authentication/quartzforum.auth");
const {
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
} = require("../controller/quartzforums.controller"); const quartzforumsRouter = express.Router();
quartzforumsRouter.use(express.json());

// Account Management Routes
quartzforumsRouter.post("/account/register", createAccount);
quartzforumsRouter.post("/account/login", login);
quartzforumsRouter.post("/account/validate-access-key", validateAccessKey);
quartzforumsRouter.post("/account/reset-access-key", resetAccessKey);
quartzforumsRouter.delete("/account", deleteAccount);
quartzforumsRouter.get("/account/:userId", checkRequesterLimbo, getUserProfile);

// Message Management Routes
quartzforumsRouter.post("/message", validateImplementationKey, authenticateAccessKey, postMessage);
quartzforumsRouter.delete("/message/:messageId", authenticateAccessKey, deleteMessage);

// Forum Management Routes
quartzforumsRouter.get("/forum", validateImplementationKey, checkRequesterLimbo, getForum);
quartzforumsRouter.get("/forums/recent", checkRequesterLimbo, getRecentForums);
quartzforumsRouter.get("/forums", checkRequesterLimbo, getAllForums);

// Implementation Key Routes
quartzforumsRouter.get("/implementation-key/:key", getImplementationKey);

module.exports = {
    quartzforumsRouter: quartzforumsRouter
};