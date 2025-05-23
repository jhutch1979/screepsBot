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
        time = Game.time;
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
        
        for (const spawn of spawns) {
            
            if (room.memory.spawnQueue.length === 0) break;
            
            const nextCreep = room.memory.spawnQueue[0];
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
                    // Remove the spawned creep from the queue
                    room.memory.spawnQueue.shift();
                }
            }
        }
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

module.exports = spawnQueue;
