// priority_inbox.js
const { Log } = require('../logging_middleware/index'); 

// simple mapper for weights
const getWeight = (typeStr) => {
    const w = { "Placement": 3, "Result": 2, "Event": 1 };
    return w[typeStr] || 0;
};

const fetchPriorityInbox = async (token, limit = 10) => {
    const endpoint = "http://4.224.186.213/evaluation-service/notifications";

    try {
        Log("backend", "info", "service", "fetching unread notifications from server api");
        
        const req = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!req.ok) throw new Error(`api failed with ${req.status}`);

        const parsed = await req.json();
        const notifs = parsed.notifications || [];
        
        Log("backend", "debug", "service", `got ${notifs.length} items to sort`);

        // sort by weight first, then fallback to newest time
        notifs.sort((a, b) => {
            const wA = getWeight(a.Type);
            const wB = getWeight(b.Type);

            if (wA !== wB) return wB - wA; 
            
            return new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime();
        });

        // grab only what we need
        const finalSet = notifs.slice(0, limit);
        Log("backend", "info", "service", `done sorting top ${limit} items`);
        
        return finalSet;

    } catch (e) {
        Log("backend", "error", "service", `priority inbox broke: ${e.message}`);
        throw e;
    }
};

module.exports = { fetchPriorityInbox };