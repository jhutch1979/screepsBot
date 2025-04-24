var roleRepairer = {

    /** @param {Creep} creep **/
    run: function(creep) {
        creep.giveWayIfEmpty(); // Allow other creeps to pass if this creep is empty
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }
        
        if (creep.memory.working) {
            // If no assigned repair target, find one
            if (!creep.memory.repairingTargetId) {
                const repairTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        if (structure.hits < structure.hitsMax) {
                            if (structure.hits / structure.hitsMax < 0.9) {
                                return true;
                            }
                            if ((structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) &&
                                structure.hits < 50000) {
                                return true;
                            }
                        }
                        return false;
                    }
                });
        
                if (repairTarget) {
                    creep.memory.repairingTargetId = repairTarget.id;
                }
            }
        
            if (creep.memory.repairingTargetId) {
                const target = Game.getObjectById(creep.memory.repairingTargetId);
        
                if (target && target.hits < target.hitsMax) {
                    
                    if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                        creep.memory.currentAction = 'move';
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
                    }else{
                        creep.memory.currentAction = 'repair';
                    }
                } else {
                    // Target is fully repaired or gone, clear memory
                    delete creep.memory.repairingTargetId;
                }
            } else {
                // No repairs needed, fallback to building
                var site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
                if (site) {
                    if (creep.build(site) === ERR_NOT_IN_RANGE) {
                        creep.memory.currentAction = 'move';
                        creep.moveTo(site, { visualizePathStyle: { stroke: '#88ff88' } });
                    } else {
                        creep.memory.currentAction = 'build';
                    }
                } else {
                    // No construction either, park near storage
                    creep.parkIfIdle();
                }
            }
        
        } else {
            
        creep.harvestEnergy(); // Fallback to harvesting energy if no storage is available
            
        }


    }
};

module.exports = roleRepairer;