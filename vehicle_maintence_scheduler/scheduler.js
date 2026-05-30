// vehicle_maintence_scheduler/scheduler.js

const { Log } = require('../logging_middleware/index');

// grab depot data from api
const getDepotsList = async (token) => {
    const reqUrl = "http://4.224.186.213/evaluation-service/depots";
    const res = await fetch(reqUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("depot fetch failed");
    const parsed = await res.json();
    return parsed.depots || [];
};

// get all vehicles needing service
const getVehiclesList = async (token) => {
    const reqUrl = "http://4.224.186.213/evaluation-service/vehicles";
    const res = await fetch(reqUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("vehicle fetch failed");
    const parsed = await res.json();
    return parsed.vehicles || [];
};

// main logic to pick best tasks using impact/time ratio
const runGreedyAlgo = (taskList, limitHours) => {
    // map out the impact per hour
    const scoredTasks = taskList.map(t => {
        const timeSafe = t.Duration > 0 ? t.Duration : 1; // avoid divide by zero just in case
        return {
            ...t,
            valueRatio: t.Impact / timeSafe
        };
    });

    // sort by ratio first, then by raw impact if tied
    scoredTasks.sort((a, b) => {
        if (b.valueRatio !== a.valueRatio) return b.valueRatio - a.valueRatio;
        return b.Impact - a.Impact;
    });

    let usedTime = 0;
    let finalScore = 0;
    const chosen = [];

    // go through sorted list and fit what we can into the budget
    for (const item of scoredTasks) {
        if (usedTime + item.Duration <= limitHours) {
            chosen.push({
                TaskID: item.TaskID,
                Duration: item.Duration,
                Impact: item.Impact
            });
            usedTime += item.Duration;
            finalScore += item.Impact;
        }
    }

    return {
        maxImpactScore: finalScore,
        totalHoursUsed: usedTime,
        budgetHours: limitHours,
        scheduledTasks: chosen
    };
};

// entry point for the service
const generateSchedules = async (token) => {
    try {
        Log("backend", "info", "service", "booting up scheduler logic");
        
        const allDepots = await getDepotsList(token);
        const allTasks = await getVehiclesList(token);
        
        Log("backend", "debug", "service", `got ${allDepots.length} depots & ${allTasks.length} tasks`);

        const finalPlan = {};

        // map it out for each depot
        for (const d of allDepots) {
            finalPlan[`Depot_${d.ID}`] = runGreedyAlgo(allTasks, d.MechanicHours);
        }

        Log("backend", "info", "service", "done assigning tasks greedy style");
        return finalPlan;

    } catch (err) {
        Log("backend", "error", "service", `scheduler crashed: ${err.message}`);
        throw err;
    }
};

module.exports = { generateSchedules };