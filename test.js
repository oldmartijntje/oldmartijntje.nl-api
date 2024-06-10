const cors = require("cors");
const express = require("express");

var visit = 0;
const port = 3000

const loginRouter = express.Router();
loginRouter.use(express.json());

loginRouter.get("/isOnline", async (_req, res) => {
    visit++;
    console.log("Connection go brrr...")
    res.status(200).send({ "message": "The server is online." });
});

loginRouter.get("/visits", async (_req, res) => {
    visit++;
    console.log("We have had " + visit + " visits since startup!")
    res.status(200).send({ "message": "We have had " + visit + " visits since startup!" });
});

const app = express();
app.use(cors());
app.use("/test", loginRouter);
// start the Express server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}...`);
}).on('error', (err) => {
    console.error('Server startup error:', err);
});