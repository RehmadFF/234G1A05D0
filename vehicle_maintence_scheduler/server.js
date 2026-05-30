// vehicle_maintence_scheduler/server.js

const express = require('express');
const { initLogger } = require('../logging_middleware/index');
const { generateSchedules } = require('./scheduler');

const app = express();
const PORT = 4000; // Using a different port to avoid conflicts

// PASTE YOUR FRESH TOKEN HERE
const TOKEN = process.env.API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzRnMWEwNWQwQHNyaXQuYWMuaW4iLCJleHAiOjE3ODAxMjM5MDcsImlhdCI6MTc4MDEyMzAwNywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjRkNTM0M2E4LWMyNzYtNDk0Zi1iNWUyLTljZDFmYmZjMDAxNCIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6InJlaGFhbiBkIiwic3ViIjoiOTQ4MTZkMGYtZDVmMy00YzdlLTliY2UtM2Y1MTdlNTVhNDk1In0sImVtYWlsIjoiMjM0ZzFhMDVkMEBzcml0LmFjLmluIiwibmFtZSI6InJlaGFhbiBkIiwicm9sbE5vIjoiMjM0ZzFhMDVkMCIsImFjY2Vzc0NvZGUiOiJTZGtqSkciLCJjbGllbnRJRCI6Ijk0ODE2ZDBmLWQ1ZjMtNGM3ZS05YmNlLTNmNTE3ZTU1YTQ5NSIsImNsaWVudFNlY3JldCI6IllrcVVlVmpjZ2diZ3BSSnIifQ.GFAvCAgrdnvzOFQ-LzGR4KiH6rbISZ8S-T_X8pJxekI";
initLogger(TOKEN);

app.get('/api/schedule', async (req, res) => {
    try {
        const optimizedSchedules = await generateSchedules(TOKEN);
        res.status(200).json({
            success: true,
            data: optimizedSchedules
        });
    } catch (error) {
        console.error("DEBUG - Real Error:", error);
        res.status(500).json({ error: "Failed to generate schedules" });
    }
});

app.listen(PORT, () => {
    console.log(`Scheduler running on http://localhost:${PORT}`);
    console.log(`Hit http://localhost:${PORT}/api/schedule in Postman`);
});