// priority_inbox.js

// Import your custom logger! (Adjust the path as needed)
const { Log } = require('../logging_middleware/index'); 

// Helper function to assign numerical weights to categories
const getPriorityWeight = (type) => {
    const weights = {
        "Placement": 3,
        "Result": 2,
        "Event": 1
    };
    return weights[type] || 0;
};

/**
 * Fetches and sorts notifications to return the Priority Inbox
 * @param {string} authToken - Your registered Bearer token
 * @param {number} topN - The number of top notifications to return
 */
const getPriorityNotifications = async (authToken, topN = 10) => {
    const apiUrl = "http://4.224.186.213/evaluation-service/notifications";

    try {
        // 1. Fetch data from the evaluation server
        Log("backend", "info", "service", "Initiating fetch to Affordmed Notification API");
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        const notifications = data.notifications || [];
        
        Log("backend", "debug", "service", `Successfully fetched ${notifications.length} notifications`);

        // 2. Apply the Sorting Algorithm
        notifications.sort((a, b) => {
            const weightA = getPriorityWeight(a.Type);
            const weightB = getPriorityWeight(b.Type);

            // Primary Sort: By Weight (Descending)
            if (weightA !== weightB) {
                return weightB - weightA; 
            }

            // Secondary Sort: By Recency (Descending)
            const timeA = new Date(a.Timestamp).getTime();
            const timeB = new Date(b.Timestamp).getTime();
            return timeB - timeA; 
        });

        // 3. Extract the top 'N' results
        const topNotifications = notifications.slice(0, topN);
        
        Log("backend", "info", "service", `Successfully computed Top ${topN} priority notifications`);
        
        return topNotifications;

    } catch (error) {
        Log("backend", "error", "service", `Failed to compute priority inbox: ${error.message}`);
        throw error;
    }
};

module.exports = { getPriorityNotifications };