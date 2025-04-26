const { pathColors } = require('constants');
var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.working == true && creep.store.getUsedCapacity() == 0){
            creep.memory.working = false;
            creep.say('harvest')
        }

        if(!creep.memory.working && creep.store.getFreeCapacity() == 0){
            creep.memory.working = true;
            creep.say('working')
        }


        if(!creep.memory.working){
            creep.memory.currentAction = 'getEnergy';
            //creep.say('getEnergy');
                creep.harvestEnergy(); // Fallback to harvesting energy if no storage is available
            
        }else{
            //console.log(creep)
            let controller = creep.room.controller;
            // if(creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
            //     creep.moveTo(controller);
            // }
            if(creep.pos && creep.pos.inRangeTo(controller, 3)){
                creep.memory.currentAction = 'upgrade';
                //creep.say('upgrade');
                creep.upgradeController(controller);
            } else{
                creep.memory.currentAction = 'move';
                //creep.say('move');
                creep.moveTo(controller, { visualizePathStyle: { stroke: pathColors.upgrader } });
            }
        }


    }
};

module.exports = roleUpgrader;