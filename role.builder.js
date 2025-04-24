var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {
        creep.giveWayIfEmpty(); // Allow other creeps to pass if this creep is empty

        // Toggle working state
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('withdraw');
        }
        const storageEmpty = !creep.room.storage || creep.room.storage.store[RESOURCE_ENERGY] === 0;

        if (
            !creep.memory.working &&
            (creep.store.getFreeCapacity() === 0 || ((creep.room.storage) && (storageEmpty && creep.store[RESOURCE_ENERGY] > 0)))
        ) {
            creep.memory.working = true;
            creep.say('build');
        }

        // Not working → withdraw from storage
        if (!creep.memory.working) {
            creep.memory.currentAction = 'getEnergy';
            const storage = creep.room.storage;
            if (storage) {
                if(storage.store[RESOURCE_ENERGY] >0 ){
                    if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, { visualizePathStyle: { stroke: '#ffaa00' } });
                    }
                }
            } else {
                creep.harvestEnergy(); // Fallback to harvesting energy if no storage is available
            }
        }

        // Working → build
        else {
            const constructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
            if (constructionSites.length) {
                const closeSite = creep.pos.findClosestByRange(constructionSites);
                
                if (creep.pos.inRangeTo(closeSite, 3)) {
                    //console.log(creep.name, 'building', closeSite.id, closeSite.progress, closeSite.progressTotal);
                    creep.memory.currentAction = 'build';
                    creep.build(closeSite);
                } else {
                    creep.memory.currentAction = 'move';
                    creep.moveTo(closeSite, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            } else {
                // Optional: idle near storage
                //console.log(creep.name, 'no construction sites');
                creep.parkIfIdle();
            }
        }
    }
};

module.exports = roleBuilder;
