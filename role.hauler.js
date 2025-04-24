var roleHauler = {

    /** @param {Creep} creep **/
    run: function(creep) {
        creep.giveWayIfEmpty(); // Allow other creeps to pass if this creep is empty
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] == 0){
            creep.memory.working = false;
            creep.say("harvest");
        }
        if(!creep.memory.working && creep.store.getFreeCapacity() == 0){
            creep.memory.working = true;
            creep.say('working');
        }


        if(!creep.memory.working) {
            creep.memory.currentAction = 'getEnergy';
            const container = Game.getObjectById(creep.memory.containerId);

        if (container) {
            if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(container, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {
            creep.say("No container");
        }

        }
        else {
            var targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_STORAGE ) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });


            if(targets.length > 0){
                closeTarget = creep.pos.findClosestByPath(targets);

                if(creep.pos.isNearTo(closeTarget)){
                    creep.memory.currentAction = 'deliverEnergy';
                    creep.transfer(closeTarget, RESOURCE_ENERGY)
                } else {
                    creep.memory.currentAction = 'move';
                    creep.moveTo(closeTarget);
                }
            }
        }





    }
};

module.exports = roleHauler;