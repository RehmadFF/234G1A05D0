// vehicle_maintence_scheduler/scheduler.js
const { Log } = require('../logging_middleware/index');

// fetch depot list
const fetchDepots = async (token) => {
    const res = await fetch("http://4.224.186.213/evaluation-service/depots", {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("depot api issue");
    const data = await res.json();
    return data.depots || [];
};

// fetch task list
const fetchTasks = async (token) => {
    const res = await fetch("http://4.224.186.213/evaluation-service/vehicles", {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("vehicles api issue");
    const data = await res.json();
    return data.vehicles || [];
};

// greedy roi algo
const buildSchedule = (tasks, maxHrs) => {
    // calc roi (impact / duration)
    const mapped = tasks.map(t => {
        const safeTime = t.Duration > 0 ? t.Duration : 1; 
        return { ...t, roi: t.Impact / safeTime };
    });

    // sort highest roi first, fallback to raw impact
    mapped.sort((x, y) => {
        if (y.roi !== x.roi) return y.roi - x.roi;
        return y.Impact - x.Impact;
    });

    let used = 0;
    let score = 0;
    const selection = [];

    for (const item of mapped) {
        if (used + item.Duration <= maxHrs) {
            selection.push({
                TaskID: item.TaskID,
                Duration: item.Duration,
                Impact: item.Impact
            });
            used += item.Duration;
            score += item.Impact;
        }
    }

    return {
        maxImpactScore: score,
        totalHoursUsed: used,
        budgetHours: maxHrs,
        scheduledTasks: selection
    };
};

const generateSchedules = async (token) => {
    try {
        Log("backend", "info", "service", "starting greedy scheduler");
        
        const depots = await fetchDepots(token);
        const tasks = await fetchTasks(token);
        
        Log("backend", "debug", "service", `loaded ${depots.length} depots and ${tasks.length} tasks`);

        const result = {};

        for (const d of depots) {
            result[`Depot_${d.ID}`] = buildSchedule(tasks, d.MechanicHours);
        }

        Log("backend", "info", "service", "finished building schedules for all depots");
        return result;

    } catch (e) {
        Log("backend", "error", "service", `scheduler failed: ${e.message}`);
        throw e;
    }
};

module.exports = { generateSchedules };