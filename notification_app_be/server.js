// notification_app_be/server.js

const express = require('express');
const { initLogger } = require('../logging_middleware/index');
const { getPriorityNotifications } = require('./priority_inbox');

const app = express();
const PORT = 3000;

// Initialize your logging middleware with your valid access token
const TOKEN = process.env.APP_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzRnMWEwNWQwQHNyaXQuYWMuaW4iLCJleHAiOjE3ODAxMjI0MDcsImlhdCI6MTc4MDEyMTUwNywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImIxOWYzMzljLWUyYWYtNDhlMS04ZmQ4LWQzYmVkNzZhYjBlNCIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6InJlaGFhbiBkIiwic3ViIjoiOTQ4MTZkMGYtZDVmMy00YzdlLTliY2UtM2Y1MTdlNTVhNDk1In0sImVtYWlsIjoiMjM0ZzFhMDVkMEBzcml0LmFjLmluIiwibmFtZSI6InJlaGFhbiBkIiwicm9sbE5vIjoiMjM0ZzFhMDVkMCIsImFjY2Vzc0NvZGUiOiJTZGtqSkciLCJjbGllbnRJRCI6Ijk0ODE2ZDBmLWQ1ZjMtNGM3ZS05YmNlLTNmNTE3ZTU1YTQ5NSIsImNsaWVudFNlY3JldCI6IllrcVVlVmpjZ2diZ3BSSnIifQ.WA8EV8T4U_E2qRNIfKW2hYfaFkjUAZ6u27QhIRW451I";
initLogger(TOKEN);

// Create the endpoint to fetch the priority inbox
app.get('/api/priority-inbox', async (req, res) => {
    try {
        const topNotifications = await getPriorityNotifications(TOKEN, 10);
        res.status(200).json(topNotifications);
    } catch (error) {
        // ADD THIS LINE to see the real issue in your terminal
        console.error("DEBUG - Real Error:", error); 
        
        res.status(500).json({ error: "Failed to fetch priority inbox" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Hit http://localhost:${PORT}/api/priority-inbox in Postman`);
});