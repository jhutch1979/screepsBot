const roleDroppedHauler = {
    run: function(creep) {
        // If creep is full, go deliver to storage first
        if (creep.store.getFreeCapacity() === 0) {
            const storage = creep.room.storage;
            if (storage) {
                if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, { visualizePathStyle: { stroke: '#00ffff' } });
                }
            }
            return; // Stop doing anything else if we're delivering
        }

        // Check if assigned dropped target is still valid
        if (creep.memory.droppedId) {
            const target = Game.getObjectById(creep.memory.droppedId);
            if (!target || target.amount < creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
                // Target gone — clear memory
                delete creep.memory.droppedId;
            }
        }

        // If we don't have a target, pick the biggest dropped energy
        if (!creep.memory.droppedId) {
            const biggest = _(creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
            }))
            .sortBy('amount')
            .reverse()
            .head();

            if (biggest) {
                creep.memory.droppedId = biggest.id;
            }
        }

        // Now act on the assigned dropped energy
        const dropped = Game.getObjectById(creep.memory.droppedId);
        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffffff' } });
            }
            return;
        }

        // No dropped energy target (or no energy left) — return to storage
        
            creep.say('💀 suicide');
            creep.suicide();
            return;
        
    }
};

module.exports = roleDroppedHauler;
