const express = require("express");

const quartzforumsRouter = express.Router();
quartzforumsRouter.use(express.json());
const { createAccount } = require("../controller/quartzforums.controller")

quartzforumsRouter.post("/create", createAccount);



module.exports = {
    quartzforumsRouter: quartzforumsRouter
}