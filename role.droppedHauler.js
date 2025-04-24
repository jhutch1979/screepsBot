module.exports = {
    run: function(creep) {
        // Early check — see if dropped energy justifies existing
        const totalDropped = _.sum(
            creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: r => r.resourceType === RESOURCE_ENERGY
            }),
            r => r.amount
        );

        if (totalDropped < 500 && creep.store.getUsedCapacity() === 0) {
            creep.say('💀 suicide');
            creep.suicide();
            return;
        }

        if (creep.store.getFreeCapacity() === 0) {
            // Full — deliver to storage
            const storage = creep.room.storage;
            if (storage) {
                if (creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
            return;
        }

        // Look for dropped energy
        const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
        });

        if (dropped) {
            if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
                creep.moveTo(dropped, { visualizePathStyle: { stroke: '#ffffff' } });
            }
        } else {
            // No dropped energy found — park near storage
            const storage = creep.room.storage;
            if (storage) {
                creep.moveTo(storage, { visualizePathStyle: { stroke: '#555555' } });
            }
        }
    }
};