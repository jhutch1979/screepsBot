// room.energyManager.js
const spawnQueue = require('room.spawnQueue');
module.exports = {
    
    run: function (room) {
        console.log('Running energy manager for room:', room.name);
        // Check if the room has a controller and a spawn
        if (!room.controller || room.find(FIND_MY_SPAWNS).length === 0) return;

        // Energy usage is tracked per room so multi-room empires don't mix their numbers
        if (!room.memory.energyUsage) {
            console.log('Initializing energy usage tracker for room:', room.name);
            room.memory.energyUsage = {
                lastTick: Game.time,
                history: [],  // array of last N ticks
                windowSize: 1500, // how many ticks to keep
            };
        }
        // Drop the old shared tracker left over from the single-room version
        if (Memory.energyUsageTracker) delete Memory.energyUsageTracker;
        if (Memory.lastUpgraderAdjust !== undefined) delete Memory.lastUpgraderAdjust;

        const controllerLevel = room.controller.level;
        const storageExists = room.storage !== undefined;
        
        //console.log('Average energy usage:', global.energyUsageTracker.averageEnergyUsage);
        
        if (controllerLevel >= 4 && storageExists) {
            // Advanced energy management: use miners and haulers
            this.setupEnergyInfrastructure(room);
            this.spawnMiners(room);
            this.spawnHaulers(room);
            this.spawnSuppliers(room);
            this.spawnDroppedHaulers(room);

        } else {
            // Basic energy management: use harvesters
            this.spawnHarvesters(room);
        }
        trackEnergyConsumption(room);
        logEconomyHealth(room.name);
    },

    setupEnergyInfrastructure: function (room) {
        // Execute this function only every 200 ticks
        if (Game.time % 200 !== 0) return;
        console.log('Setting up energy infrastructure for room:', room.name);
        const sources = room.find(FIND_SOURCES);
        for (const source of sources) {
            // Check if a container already exists near the source
            const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });
            if (containers.length === 0) {
                // Find a suitable position adjacent to the source
                const positions = getAdjacentPositions(source.pos);
                for (const pos of positions) {
                    const terrain = room.lookForAt(LOOK_TERRAIN, pos.x, pos.y);
                    if (terrain[0] !== 'wall') {
                        // Place a construction site for the container
                        room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
                        break;
                    }
                }
            }
        }
    },

    spawnMiners: function (room) {
        const sources = room.find(FIND_SOURCES);

        if (!room.memory.minerAssignments) {
            room.memory.minerAssignments = {};
        }

        const body = [WORK, WORK, WORK, WORK, WORK, MOVE];

        for (const source of sources) {
            // Estimate travel time if not stored
            if (!room.memory.sources) room.memory.sources = {};
            if (!room.memory.sources[source.id]) {
                const path = room.findPath(room.find(FIND_MY_SPAWNS)[0].pos, source.pos);
                room.memory.sources[source.id] = { travelTime: path.length };
            }
            const travelTime = room.memory.sources[source.id].travelTime;

            // Queue the replacement early enough that it arrives as the old miner dies:
            // spawn time (3 ticks per part) + walking to the source + a small buffer
            const leadTime = body.length * CREEP_SPAWN_TIME + travelTime + 10;

            const assignedName = room.memory.minerAssignments[source.id];
            const assignedCreep = Game.creeps[assignedName];

            // If there's a valid, alive assigned miner that isn't about to expire, skip
            if (assignedCreep && (assignedCreep.spawning || assignedCreep.ticksToLive > leadTime)) continue;

            const queuedMiner = (room.memory.spawnQueue || []).some(q =>
                q.role === 'miner' && q.memory && q.memory.sourceId === source.id
            );
            if (queuedMiner) continue;

            spawnQueue.add(room, 'miner', body, { role: 'miner', sourceId: source.id }, 2);
        }
    },

    spawnHaulers: function (room) {
        const containers = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_CONTAINER
        });

        if (!room.memory.haulerAssignments) {
            room.memory.haulerAssignments = {};
        }

        for (const container of containers) {
            const assignedName = room.memory.haulerAssignments[container.id];
            const assignedCreep = Game.creeps[assignedName];

            if (!assignedCreep) {
                // Assigned creep no longer exists — clean up assignment
                delete room.memory.haulerAssignments[container.id];
            }

            // Path length is cached; findPath every tick for every container would be expensive
            if (!room.memory.containerPaths) room.memory.containerPaths = {};
            let pathLength = room.memory.containerPaths[container.id];
            if (pathLength === undefined) {
                const storage = room.storage || room.find(FIND_MY_SPAWNS)[0];
                pathLength = room.findPath(container.pos, storage.pos).length;
                room.memory.containerPaths[container.id] = pathLength;
            }

            const carryParts = Math.ceil((10 * pathLength * 2) / 50);
            const body = [];
            for (let i = 0; i < carryParts; i++) body.push(CARRY);
            for (let i = 0; i < Math.ceil(carryParts / 2); i++) body.push(MOVE);

            // Queue the replacement early: spawn time + trip from spawn to the container + a small buffer
            const leadTime = body.length * CREEP_SPAWN_TIME + pathLength + 10;
            if (assignedCreep && (assignedCreep.spawning || assignedCreep.ticksToLive > leadTime)) continue;

            const queuedHauler = (room.memory.spawnQueue || []).some(q =>
                q.role === 'hauler' && q.memory && q.memory.containerId === container.id
            );
            if (queuedHauler) continue;

            spawnQueue.add(room, 'hauler', body, { role: 'hauler', containerId: container.id }, 2);
        }
    },

    spawnHarvesters: function (room) {
        
        room.spawnCreep('harvester', room.controller.level <= 3 ? 2 : 3);
    },
    spawnSuppliers: function (room) {
        const suppliers = _.filter(Game.creeps, creep =>
            creep.memory.role === 'supplier' && creep.memory.room === room.name
        );

        const desiredSuppliers = 2; // Adjust as needed

        const queuedSuppliers = (room.memory.spawnQueue || []).filter(q =>
            q.role === 'supplier' && q.memory && q.memory.room === room.name
        ).length;

        if ((suppliers.length + queuedSuppliers) < desiredSuppliers) {
            // The queue holds the body for up to 300 ticks, so size it for the room's capacity.
            // Only when there are no suppliers at all do we shrink it to what we can afford right now,
            // so the room can bootstrap itself instead of waiting for a full-size body.
            const budget = suppliers.length === 0 ? room.energyAvailable : room.energyCapacityAvailable;
            const bodyParts = room.buildBody([CARRY, CARRY, MOVE], budget);
            spawnQueue.add(room, 'supplier', bodyParts, { role: 'supplier', room: room.name }, 2);
        }
    },
    spawnDroppedHaulers: function (room) {
        const droppedEnergy = room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 100
        });
        const totalDropped = _.sum(droppedEnergy, r => r.amount);

        if (droppedEnergy.length > 0) {
            const droppedHaulers = _.filter(Game.creeps, creep =>
                creep.memory.role === 'droppedHauler' && creep.memory.room === room.name
            );

            let desiredDroppedHaulers = 0;

            if (totalDropped >= 500) desiredDroppedHaulers = 1;
            if (totalDropped >= 1500) desiredDroppedHaulers = 2;
            if (totalDropped >= 3000) desiredDroppedHaulers = 3;
            if (totalDropped >= 5000) desiredDroppedHaulers = 4;

            const queuedDroppedHaulers = (room.memory.spawnQueue || []).filter(q =>
                q.role === 'droppedHauler' && q.memory && q.memory.room === room.name
            ).length;

            if ((droppedHaulers.length + queuedDroppedHaulers) < desiredDroppedHaulers) {
                const body = [CARRY, CARRY, MOVE];
                spawnQueue.add(room, 'droppedHauler', body, { role: 'droppedHauler', room: room.name }, 2);
            }
        }
    }

};

// Helper function to get adjacent positions around a given RoomPosition
function getAdjacentPositions(pos) {
    const positions = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue; // Skip the current position
            const x = pos.x + dx;
            const y = pos.y + dy;
            // Ensure the new position is within room boundaries
            if (x >= 0 && x < 50 && y >= 0 && y < 50) {
                positions.push(new RoomPosition(x, y, pos.roomName));
            }
        }
    }
    return positions;
}


function getAverageEnergyUsage(room, windowSize = 100) {
    const tracker = room.memory.energyUsage;
    if (!tracker || tracker.history.length === 0) return 0;

    const slice = tracker.history.slice(-windowSize); // Take only last N entries

    const total = slice.reduce((a, b) => a + b, 0);

    return Math.round((total / slice.length) * 100) / 100;
}


function trackEnergyConsumption(room) {
    let energyUsedThisTick = 0;

    // Only count creeps working in this room, otherwise every room would add up the whole empire
    for (const creep of room.find(FIND_MY_CREEPS)) {

        let activeWorkParts = creep.getActiveBodyparts(WORK);
        if (activeWorkParts === 0) continue;

        const action = (creep.memory && creep.memory.currentAction) ? creep.memory.currentAction : null;


        if (action === 'upgrade') {
            energyUsedThisTick += activeWorkParts * 1;
        } else if (action === 'build') {
            energyUsedThisTick += activeWorkParts * 5;
        } else if (action === 'repair') {
            energyUsedThisTick += activeWorkParts * 1;
        }
    }

    // Track spawn energy usage (this room's spawns only)
    for (const spawn of room.find(FIND_MY_SPAWNS)) {
        if (spawn.spawning) {
            const spawnEnergyCost = spawn.spawning.energyCapacityNeeded || 0;
            const spawnTime = spawn.spawning.needTime || 1;
            energyUsedThisTick += spawnEnergyCost / spawnTime;
        }
    }

    const tracker = room.memory.energyUsage;
    if (tracker) {
        if (tracker.history.length >= tracker.windowSize) {
            tracker.history.shift(); // Remove oldest
        }
        tracker.history.push(energyUsedThisTick); // Add current tick usage
        tracker.lastTick = Game.time; // Update last tick
    }

}

function logEconomyHealth(roomName) {
    const room = Game.rooms[roomName];
    if (!room) {
        console.log(`<span style="color: red;">[ERROR]</span> Room ${roomName} not visible.`);
        return;
    }

    const sources = room.find(FIND_SOURCES);
    const income = sources.length * 10; // Estimate: 10 energy/tick per source

    const shortUsage = getAverageEnergyUsage(room, 50);
    const midUsage = getAverageEnergyUsage(room, 150);
    const longUsage = getAverageEnergyUsage(room, 500);

    const shortEfficiency = (shortUsage / income) * 100;
    const midEfficiency = (midUsage / income) * 100;
    const longEfficiency = (longUsage / income) * 100;

    console.log(
        `[Economy] ` +
        `<span style="color:${getEfficiencyColor(shortEfficiency)};">Short ${shortEfficiency.toFixed(1)}%</span> | ` +
        `<span style="color:${getEfficiencyColor(midEfficiency)};">Mid ${midEfficiency.toFixed(1)}%</span> | ` +
        `<span style="color:${getEfficiencyColor(longEfficiency)};">Long ${longEfficiency.toFixed(1)}%</span>`
    );
}

function getEfficiencyColor(efficiency) {
    if (efficiency >= 70 && efficiency <= 90) return 'green';
    if (efficiency > 90) return 'yellow';
    return 'red';
}



