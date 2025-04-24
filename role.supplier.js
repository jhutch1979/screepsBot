var roleSupplier = {
    run: function(creep) {
        creep.giveWayIfEmpty(); // Allow other creeps to pass if this creep is empty
        // Switch between collect/deliver
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('🔄 collect');
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            creep.say('⚡ supply');
        }

        // Not working: get energy from storage
        if (!creep.memory.working) {
            var storage = creep.room.storage;
            if (storage && storage.store[RESOURCE_ENERGY] > 0) {
                if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
        }

        // Working: deliver energy
        else {
            // Priority 1: Towers
            var towers = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_TOWER &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (towers.length > 0) {
                if (creep.transfer(towers[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(towers[0], { visualizePathStyle: { stroke: '#f88' } });
                }
                return;
            }

            // Priority 2: Spawns
            var spawns = creep.room.find(FIND_MY_SPAWNS, {
                filter: s => s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (spawns.length > 0) {
                if (creep.transfer(spawns[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawns[0], { visualizePathStyle: { stroke: '#88f' } });
                }
                return;
            }

            // Priority 3: Extensions
            var extensions = creep.room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType === STRUCTURE_EXTENSION &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (extensions.length > 0) {
                if (creep.transfer(extensions[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(extensions[0], { visualizePathStyle: { stroke: '#8f8' } });
                }
                return;
            }

            // Nothing to fill — idle at storage
            if (creep.room.storage) {
                creep.parkIfIdle(); // Optional: park near storage
            }
        }
    }
};

module.exports = roleSupplier;
