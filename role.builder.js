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
            creep.harvestEnergy();
        }

        // Working → build
        else {
            const constructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES, {
                filter: s => s.structureType !== STRUCTURE_WALL && s.structureType !== STRUCTURE_RAMPART
            });
            //const constructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
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
