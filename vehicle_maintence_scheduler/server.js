// vehicle_maintence_scheduler/server.js

const express = require('express');
const { initLogger, Log } = require('../logging_middleware/index');
const { generateSchedules } = require('./scheduler');

const app = express();
const PORT = 4000; // diff port to avoid clashing

// setup token for server api
const TOKEN = process.env.API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzRnMWEwNWQwQHNyaXQuYWMuaW4iLCJleHAiOjE3ODAxMjYzMDUsImlhdCI6MTc4MDEyNTQwNSwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjEwZTQxODU1LWMzMjAtNGY0MS05ZmVkLWU4MmEyNTkxN2FiYSIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6InJlaGFhbiBkIiwic3ViIjoiOTQ4MTZkMGYtZDVmMy00YzdlLTliY2UtM2Y1MTdlNTVhNDk1In0sImVtYWlsIjoiMjM0ZzFhMDVkMEBzcml0LmFjLmluIiwibmFtZSI6InJlaGFhbiBkIiwicm9sbE5vIjoiMjM0ZzFhMDVkMCIsImFjY2Vzc0NvZGUiOiJTZGtqSkciLCJjbGllbnRJRCI6Ijk0ODE2ZDBmLWQ1ZjMtNGM3ZS05YmNlLTNmNTE3ZTU1YTQ5NSIsImNsaWVudFNlY3JldCI6IllrcVVlVmpjZ2diZ3BSSnIifQ.AqVKO5IGP-arHd2GgRI70FsRy924Pg1NRJRvCC6ozF8";
initLogger(TOKEN);

app.get('/api/schedule', async (req, res) => {
    try {
        Log("backend", "info", "route", "hit the schedule api");
        
        const result = await generateSchedules(TOKEN);
        
        Log("backend", "info", "route", "schedule built fine");
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (err) {
        Log("backend", "error", "handler", `schedule api broke: ${err.message}`);
        res.status(500).json({ error: "failed to build schedule" });
    }
});

app.listen(PORT, () => {
    // swapped console.log out for the custom logger
    Log("backend", "info", "config", `vehicle scheduler app live on port ${PORT}`);
});