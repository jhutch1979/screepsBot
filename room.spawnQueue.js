// room.spawnQueue.js

const spawnQueue = {
    /**
     * Adds a new spawn request to the room's spawn queue.
     * @param {Room} room - The room to add the spawn request to.
     * @param {string} role - The role of the creep.
     * @param {Array} body - The body parts array for the creep.
     * @param {Object} memory - The memory object to assign to the creep.
     * @param {number} priority - The priority of the spawn request (lower number = higher priority).
     */
    add: function(room, role, body, memory = {}, priority = 5) {
        if (!room.memory.spawnQueue) {
            room.memory.spawnQueue = [];
        }
        const time = Game.time;
        room.memory.spawnQueue.push({ role, body, memory, priority, time });
        // Sort the queue based on priority (ascending order)
        room.memory.spawnQueue.sort((a, b) => a.priority - b.priority);
    },

    /**
     * Processes the spawn queue for a given room.
     * @param {Room} room - The room to process the spawn queue in.
     */
    process: function(room) {
        if (!room.memory.spawnQueue || room.memory.spawnQueue.length === 0) return;
        if (Game.time % 50 === 0) {
            this.cleanSpawnQueue(room);
        }
        const spawns = room.find(FIND_MY_SPAWNS, {
            filter: spawn => !spawn.spawning
        });
        
        // Track energy locally so a second spawn this tick doesn't pick something the first one already paid for
        let energyAvailable = room.energyAvailable;

        for (const spawn of spawns) {
            
            if (room.memory.spawnQueue.length === 0) break;
            
            const index = this.selectNext(room, energyAvailable);
            if (index === -1) break; // Nothing affordable right now; same answer for every spawn

            const nextCreep = room.memory.spawnQueue[index];
            const name = `${nextCreep.role}_${Game.time}`;
            const body = nextCreep.body;

            // Use dryRun to check if the spawn can create the creep
            const canSpawn = spawn.spawnCreep(nextCreep.body, name, {
                memory: nextCreep.memory,
                dryRun: true
            });
            //console.log(`Spawn ${spawn.name} dryRun result for ${name}: ${canSpawn}: ${body}`);
            if (canSpawn === OK) {
                // Spawn the creep
                const result = spawn.spawnCreep(nextCreep.body, name, {
                    memory: nextCreep.memory
                });

                if (result === OK) {
                    // Preserve miner/hauler assignment tracking now that these roles
                    // also spawn through the queue.
                    if (nextCreep.memory.sourceId) {
                        if (!room.memory.minerAssignments) room.memory.minerAssignments = {};
                        room.memory.minerAssignments[nextCreep.memory.sourceId] = name;
                    }

                    if (nextCreep.memory.containerId) {
                        if (!room.memory.haulerAssignments) room.memory.haulerAssignments = {};
                        room.memory.haulerAssignments[nextCreep.memory.containerId] = name;
                    }

                    energyAvailable -= getBodyCost(body);
                    // Remove the spawned creep from the queue
                    room.memory.spawnQueue.splice(index, 1);
                }
            }
        }
    },

    /**
     * Picks which queue entry to spawn next. Returns its index, or -1 if nothing should spawn now.
     * Rule: the queue is sorted by priority. Entries that can never be built (cost above
     * energyCapacityAvailable, or more than 50 parts) are dropped. Otherwise spawn the first entry
     * we can afford right now, but once we pass an entry we can't afford yet, only entries with the
     * same (or better) priority may jump ahead of it. Lower-priority entries wait, so cheap
     * low-priority creeps can't keep draining the energy an expensive high-priority creep is waiting for.
     * @param {Room} room
     * @param {number} energyAvailable - energy left to spend this tick
     */
    selectNext: function(room, energyAvailable) {
        const queue = room.memory.spawnQueue;
        let blockedPriority = null;

        for (let i = 0; i < queue.length; i++) {
            const entry = queue[i];
            if (blockedPriority !== null && entry.priority > blockedPriority) break;

            const cost = getBodyCost(entry.body);
            if (!entry.body || entry.body.length === 0 || entry.body.length > MAX_CREEP_SIZE || cost > room.energyCapacityAvailable) {
                console.log(`[SpawnQueue] Dropped ${entry.role} in room ${room.name}: can never be spawned (cost ${cost}, capacity ${room.energyCapacityAvailable}, ${entry.body ? entry.body.length : 0} parts).`);
                queue.splice(i, 1);
                i--;
                continue;
            }

            if (cost <= energyAvailable) return i;

            // Can afford it once the room fills up; only same-or-higher priority entries may pass it
            if (blockedPriority === null) blockedPriority = entry.priority;
        }
        return -1;
    },
    cleanSpawnQueue: function(room) {
        if (!room.memory.spawnQueue) return;

        const now = Game.time;
        const oldLength = room.memory.spawnQueue.length;
    
        room.memory.spawnQueue = room.memory.spawnQueue.filter(task => {
            if (!task.time) {
                console.log(`[SpawnQueue] Removed task with missing time in room ${room.name}.`);
                return false;
            }
            if (now - task.time > 300) {
                console.log(`[SpawnQueue] Removed old task (age: ${now - task.time} ticks) in room ${room.name}.`);
                return false;
            }
            return true; // Keep good tasks
        });
    
        const newLength = room.memory.spawnQueue.length;
        if (oldLength !== newLength) {
            console.log(`[SpawnQueue] Cleaned ${oldLength - newLength} outdated tasks in room ${room.name}.`);
        }
    }
};

function getBodyCost(body) {
    let cost = 0;
    for (const part of body || []) {
        cost += BODYPART_COST[part] || 0;
    }
    return cost;
}

module.exports = spawnQueue;
