// logging_middleware/index.js

let authToken = process.env.API_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMzRnMWEwNWQwQHNyaXQuYWMuaW4iLCJleHAiOjE3ODAxMjYzMDUsImlhdCI6MTc4MDEyNTQwNSwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjEwZTQxODU1LWMzMjAtNGY0MS05ZmVkLWU4MmEyNTkxN2FiYSIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6InJlaGFhbiBkIiwic3ViIjoiOTQ4MTZkMGYtZDVmMy00YzdlLTliY2UtM2Y1MTdlNTVhNDk1In0sImVtYWlsIjoiMjM0ZzFhMDVkMEBzcml0LmFjLmluIiwibmFtZSI6InJlaGFhbiBkIiwicm9sbE5vIjoiMjM0ZzFhMDVkMCIsImFjY2Vzc0NvZGUiOiJTZGtqSkciLCJjbGllbnRJRCI6Ijk0ODE2ZDBmLWQ1ZjMtNGM3ZS05YmNlLTNmNTE3ZTU1YTQ5NSIsImNsaWVudFNlY3JldCI6IllrcVVlVmpjZ2diZ3BSSnIifQ.AqVKO5IGP-arHd2GgRI70FsRy924Pg1NRJRvCC6ozF8";

const initLogger = (token) => {
    authToken = token;
};

const Log = async (stack, lvl, pkg, msg) => {
    const apiEndpoint = "http://4.224.186.213/evaluation-service/logs";

    const allowedStacks = ["backend", "frontend"];
    const allowedLevels = ["debug", "info", "warn", "error", "fatal"];

    // force string lowercase just to be safe from 400 errors
    const s = String(stack).toLowerCase();
    const l = String(lvl).toLowerCase();
    const p = String(pkg).toLowerCase();

    // THE FIX: Force the message to be max 48 characters to prevent 400 errors
    let safeMsg = String(msg);
    if (safeMsg.length > 48) {
        safeMsg = safeMsg.substring(0, 48);
    }

    if (!allowedStacks.includes(s) || !allowedLevels.includes(l)) {
        process.stdout.write(`[logger issue] bad stack or level passed\n`);
        return;
    }

    try {
        const req = await fetch(apiEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({
                stack: s,
                level: l,
                package: p,
                message: safeMsg
            })
        });

        if (!req.ok) {
            const errTxt = await req.text();
            process.stdout.write(`[logger rejected] code: ${req.status} reason: ${errTxt}\n`);
        }
    } catch (e) {
        process.stdout.write(`[logger crashed]: ${e.message}\n`);
    }
};

module.exports = { Log, initLogger };