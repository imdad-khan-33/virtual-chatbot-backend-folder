import "./config/env.js"; // Must be first!
import http from "http";
import { app } from './app.js'
import { initSocket } from "./sockets/index.js";
import conectDB from "./db/index.js"
import "./config/passport.config.js";

const server = http.createServer(app);
const io = initSocket(server);
// import './jobs/sessionReminder.js'

import { startSessionReminderJob } from './jobs/sessionReminder.js';
startSessionReminderJob(io);

// Make `io` accessible in your routes/controllers
app.set("io", io);
const PORT = process.env.PORT || 5000;

conectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is listing on PORT ${PORT}`);

    })
}).catch((err) => {
    console.log("MongoDB connection err", err);

})