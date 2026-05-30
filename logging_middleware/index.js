// logging_middleware/index.js

let authToken = process.env.AFFORDMED_API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzRnMWEwNWQwQHNyaXQuYWMuaW4iLCJleHAiOjE3ODAxMTkwMjgsImlhdCI6MTc4MDExODEyOCwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjY5ODZiY2M1LWY0M2ItNDMxOC05YjliLTAyNWZmMjEwMjQzNiIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6InJlaGFhbiBkIiwic3ViIjoiOTQ4MTZkMGYtZDVmMy00YzdlLTliY2UtM2Y1MTdlNTVhNDk1In0sImVtYWlsIjoiMjM0ZzFhMDVkMEBzcml0LmFjLmluIiwibmFtZSI6InJlaGFhbiBkIiwicm9sbE5vIjoiMjM0ZzFhMDVkMCIsImFjY2Vzc0NvZGUiOiJTZGtqSkciLCJjbGllbnRJRCI6Ijk0ODE2ZDBmLWQ1ZjMtNGM3ZS05YmNlLTNmNTE3ZTU1YTQ5NSIsImNsaWVudFNlY3JldCI6IllrcVVlVmpjZ2diZ3BSSnIifQ.53VVe797Axpoz2AemE-xWA-J7kwyvcdWP_ikYiO7C-w";

const initLogger = (token) => {
    authToken = token;
};

// Reusable Log function
const Log = async (stack, level, pkg, message) => {
    const apiUrl = "http://4.224.186.213/evaluation-service/logs";

    // Validate inputs to prevent bad requests to the test server
    const validStacks = ["backend", "frontend"];
    const validLevels = ["debug", "info", "warn", "error", "fatal"];
    
    // Normalize inputs to strictly lowercase
    const normalizedStack = stack?.toLowerCase();
    const normalizedLevel = level?.toLowerCase();
    const normalizedPkg = pkg?.toLowerCase();

    if (!validStacks.includes(normalizedStack)) {
        console.warn(`[Local Logger] Invalid stack provided: ${stack}`);
        return;
    }

    if (!validLevels.includes(normalizedLevel)) {
        console.warn(`[Local Logger] Invalid level provided: ${level}`);
        return;
    }

    // API Request to test server
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({
                stack: normalizedStack,
                level: normalizedLevel,
                package: normalizedPkg,
                message: message
            })
        });

        // Handling error for the test server
        if (!response.ok) {
            console.error(`[Logging Middleware Error] Server responded with status: ${response.status}`);
        }
    } catch (error) {
        // Fallback to local console if the server is unreachable
        console.error("[Logging Middleware Network Error]:", error.message);
    }
};

module.exports = { Log, initLogger };