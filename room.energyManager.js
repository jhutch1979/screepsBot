// room.energyManager.js
const spawnQueue = require('room.spawnQueue');
module.exports = {
    
    run: function (room) {
        console.log('Running energy manager for room:', room.name);
        // Check if the room has a controller and a spawn
        if (!room.controller || room.find(FIND_MY_SPAWNS).length === 0) return;

        if (!Memory.energyUsageTracker) {
            console.log('Initializing energy usage tracker in memory.');
            Memory.energyUsageTracker = {
                lastTick: Game.time,
                history: [],  // array of last N ticks
                windowSize: 1500, // how many ticks to keep
            };
        }

        const controllerLevel = room.controller.level;
        const storageExists = room.storage !== undefined;
        trackEnergyConsumption();
        //console.log('Average energy usage:', global.energyUsageTracker.averageEnergyUsage);
        logEconomyHealth(room.name);
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

        for (const source of sources) {
            const assignedName = room.memory.minerAssignments[source.id];
            const assignedCreep = Game.creeps[assignedName];

            // If there's a valid, alive assigned miner, skip
            if (assignedCreep && assignedCreep.ticksToLive > 20) continue;

            // Estimate travel time if not stored
            if (!Memory.rooms[room.name]) Memory.rooms[room.name] = {};
            if (!Memory.rooms[room.name].sources) Memory.rooms[room.name].sources = {};
            if (!Memory.rooms[room.name].sources[source.id]) {
                const path = room.findPath(room.find(FIND_MY_SPAWNS)[0].pos, source.pos);
                Memory.rooms[room.name].sources[source.id] = { travelTime: path.length };
            }

            const travelTime = Memory.rooms[room.name].sources[source.id].travelTime;

            const body = [WORK, WORK, WORK, WORK, WORK, MOVE];
            const spawn = room.find(FIND_MY_SPAWNS)[0];
            const minerName = `miner_${source.id}_${Game.time.toString().slice(-4)}`;

            const result = spawn.spawnCreep(body, minerName, {
                memory: { role: 'miner', sourceId: source.id }
            });

            if (result === OK) {
                room.memory.minerAssignments[source.id] = minerName;
            }
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
            console.log('Assigned creep:', assignedCreep, 'ticksToLive:', assignedCreep ? assignedCreep.ticksToLive : 'N/A');
            if (assignedCreep && assignedCreep.ticksToLive > 20) continue;

            // If assignment is missing or creep is nearly dead, make a new one
            const storage = room.storage || room.find(FIND_MY_SPAWNS)[0];
            const pathLength = room.findPath(container.pos, storage.pos).length;

            const carryParts = Math.ceil((10 * pathLength * 2) / 50);
            const body = [];
            for (let i = 0; i < carryParts; i++) body.push(CARRY);
            for (let i = 0; i < Math.ceil(carryParts / 2); i++) body.push(MOVE);

            const spawn = room.find(FIND_MY_SPAWNS)[0];
            const name = `hauler_${container.id}_${Game.time.toString().slice(-4)}`;

            const result = spawn.spawnCreep(body, name, {
                memory: { role: 'hauler', containerId: container.id }
            });

            if (result === OK) {
                room.memory.haulerAssignments[container.id] = name;
            }
        }
    },

    spawnHarvesters: function (room) {
        
        result = room.spawnCreep('harvester', 2);
    },
    spawnSuppliers: function (room) {
        const suppliers = _.filter(Game.creeps, creep =>
            creep.memory.role === 'supplier' && creep.memory.room === room.name
        );

        const desiredSuppliers = 2; // Adjust as needed

        if (suppliers.length < desiredSuppliers) {
            const body = [CARRY, CARRY, MOVE]; // Adjust body composition as needed
            const spawn = room.find(FIND_MY_SPAWNS)[0];
            const supplierName = `supplier_${Game.time.toString().slice(-4)}`;
            spawn.spawnCreep(body, supplierName, {
                memory: { role: 'supplier', room: room.name }
            });
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

            if (droppedHaulers.length < desiredDroppedHaulers) {
                const body = [CARRY, CARRY, MOVE];
                const spawn = room.find(FIND_MY_SPAWNS)[0];
                const name = `dropHauler_${Game.time.toString().slice(-4)}`;
                spawn.spawnCreep(body, name, {
                    memory: { role: 'droppedHauler', room: room.name }
                });
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


function getAverageEnergyUsage(windowSize = 100) {
    if (!Memory.energyUsageTracker || Memory.energyUsageTracker.history.length === 0) return 0;

    const history = Memory.energyUsageTracker.history;
    const slice = history.slice(-windowSize); // Take only last N entries

    const total = slice.reduce((a, b) => a + b, 0);

    return Math.round((total / slice.length) * 100) / 100;
}


function trackEnergyConsumption() {
    let energyUsedThisTick = 0;

    for (const name in Game.creeps) {
        const creep = Game.creeps[name];

        if (!creep.my) continue;

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

    // Track spawn energy usage
    for (const spawnName in Game.spawns) {
        const spawn = Game.spawns[spawnName];

        if (spawn.spawning) {
            const spawnEnergyCost = spawn.spawning.energyCapacityNeeded || 0;
            const spawnTime = spawn.spawning.needTime || 1;
            energyUsedThisTick += spawnEnergyCost / spawnTime;
        }
    }

    if (Memory.energyUsageTracker) {
        if (Memory.energyUsageTracker.length >= Memory.energyUsageTracker.windowSize) {
            Memory.energyUsageTracker.history.shift(); // Remove oldest
        }
        Memory.energyUsageTracker.history.push(energyUsedThisTick); // Add current tick usage
        Memory.energyUsageTracker.lastTick = Game.time; // Update last tick
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

    const shortUsage = getAverageEnergyUsage(50);
    const midUsage = getAverageEnergyUsage(150);
    const longUsage = getAverageEnergyUsage(500);

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



