// notification_app_be/server.js

const express = require('express');
// import custom logger and init function
const { initLogger, Log } = require('../logging_middleware/index');
const { fetchPriorityInbox } = require('./priority_inbox');

const app = express();
const PORT = 3000;

// setup token for server api
const TOKEN = process.env.API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzRnMWEwNWQwQHNyaXQuYWMuaW4iLCJleHAiOjE3ODAxMjYzMDUsImlhdCI6MTc4MDEyNTQwNSwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjEwZTQxODU1LWMzMjAtNGY0MS05ZmVkLWU4MmEyNTkxN2FiYSIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6InJlaGFhbiBkIiwic3ViIjoiOTQ4MTZkMGYtZDVmMy00YzdlLTliY2UtM2Y1MTdlNTVhNDk1In0sImVtYWlsIjoiMjM0ZzFhMDVkMEBzcml0LmFjLmluIiwibmFtZSI6InJlaGFhbiBkIiwicm9sbE5vIjoiMjM0ZzFhMDVkMCIsImFjY2Vzc0NvZGUiOiJTZGtqSkciLCJjbGllbnRJRCI6Ijk0ODE2ZDBmLWQ1ZjMtNGM3ZS05YmNlLTNmNTE3ZTU1YTQ5NSIsImNsaWVudFNlY3JldCI6IllrcVVlVmpjZ2diZ3BSSnIifQ.AqVKO5IGP-arHd2GgRI70FsRy924Pg1NRJRvCC6ozF8";
initLogger(TOKEN);

// endpoint for priority inbox
app.get('/api/priority-inbox', async (req, res) => {
    try {
        Log("backend", "info", "route", "fetching priority inbox via api");
        const topNotifs = await fetchPriorityInbox(TOKEN, 10);
        
        Log("backend", "info", "route", "sent priority inbox data successfully");
        res.status(200).json(topNotifs);
    } catch (err) {
        // removed console.error to comply with rules
        Log("backend", "error", "handler", `priority api failed: ${err.message}`);
        res.status(500).json({ error: "failed to fetch priority inbox" });
    }
});

// start server
app.listen(PORT, () => {
    // swapped console log for custom logger
    Log("backend", "info", "config", `notification api live on port ${PORT}`);
});