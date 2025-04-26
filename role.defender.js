var roleDefender = {
    run: function(creep) {
        const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        
        if (target) {
            if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
            }
        } else {
            // Optional: patrol near spawn
            const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
            if (spawn) creep.moveTo(spawn);
        }
    }
};

module.exports = roleDefender;