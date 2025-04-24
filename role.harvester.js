const { pathColors } = require('constants');
var roleHarvester = {

    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log('Running harvester role for creep:', creep.name);
        creep.giveWayIfEmpty(); // Allow other creeps to pass if this creep is empty
        if(creep.memory.working == true && creep.store.getUsedCapacity() == 0){
            creep.memory.working = false;
            creep.say('harvest')

        }

        if(!creep.memory.working && creep.store.getFreeCapacity() == 0){
            creep.memory.working = true;
            creep.say('working')
        }

        if(!creep.memory.working) {
            creep.memory.currentAction = 'getEnergy';
            const sourceId = creep.findEnergySource();
    const source = Game.getObjectById(sourceId);

    if (!source) {
        creep.say('⚠️ No source');
        return;
    }

    if (creep.pos.isNearTo(source)) {
        creep.harvest(source);
    } else {
        creep.moveTo(source, {
            reusePath: 2,
            visualizePathStyle: { stroke: '#ffffff' } // White for energy retrieval
        });
    }
        }

        else {
            //console.log('Delivering energy to structures');
            let target =  creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            
            if(!target.length){
                target =  creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_TOWER) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
            }
            //console.log('Target:', target);
            //console.log(JSON.stringify(target));
            closeTarget = creep.pos.findClosestByRange(target)
            //console.log(JSON.stringify(closeTarget));
            if(creep.pos.isNearTo(closeTarget)){
                creep.memory.currentAction = 'deliverEnergy';
                creep.transfer(closeTarget, RESOURCE_ENERGY);
            } else {
                creep.memory.currentAction = 'move';
                creep.moveTo(closeTarget, { visualizePathStyle: { stroke: pathColors.harvester } });
            }
            // if(creep.transfer(Game.spawns['Spawn1'], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            //     creep.moveTo(Game.spawns['Spawn1']);
            // }
        }
    }
};

module.exports = roleHarvester;