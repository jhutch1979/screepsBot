module.exports = function (Room) {
    
    
    Room.prototype.spawnCreep = function(creepType, desiredCount, priority = 5) {
        const spawnQueue = require('room.spawnQueue');
        //priority = 5; // Default priority for spawning
        let typeTarget;
        if (desiredCount !== null && desiredCount !== undefined) {
            typeTarget = desiredCount;
        } else {
            typeTarget = _.get(this.memory, ['census', creepType], 2);
        }
       
        const creepCount = _.filter(Game.creeps, (creep) => creep.memory.role === creepType && creep.room.name === this.name).length;
    
        // 🔥 NEW CHECK: Is there already a queued spawn for this role?
        const queuedCount = (this.memory.spawnQueue || []).filter(q => q.role === creepType).length;
    
        console.log(`Creep count for ${creepType} in ${this.name}: ${creepCount} active, ${queuedCount} queued, target ${typeTarget}`);
        
        if ((creepCount + queuedCount) < typeTarget ||(creepType === 'harvester' && creepCount === 0 && queuedCount <3)) {
            let body;
            if (creepType === 'scout') {
                body = [MOVE];
                priority = 10; // Lower priority for scouts
            } else if (creepType === 'harvester' && creepCount === 0) {
                priority = 1; // Higher priority for the first harvester
            
                body = this.buildBody([WORK, CARRY, MOVE], this.energyAvailable); // Emergency
         
            }else if (creepType === 'defender') {
                body = this.getDefenderBody();
            } else {
                body = this.buildBody([WORK, CARRY, MOVE], this.energyCapacityAvailable);
            }

            if (creepType === 'harvester' && priority === 5  ) {
                priority=3; // Higher priority for the first harvester
            }

            if (!body || body.length === 0) {
                console.log(`[ERROR] Skipping spawn of '${creepType}' due to empty body.`);
                return ERR_INVALID_ARGS;
            }
    
            spawnQueue.add(this, creepType, body, { role: creepType }, priority);
    
            console.log(`Queued spawn of ${creepType}`);
            return OK;
        }
        return ERR_BUSY;
    }
    
    
    Room.prototype.spawnScout = function(count = 1) { 
        const scoutCount = _.filter(Game.creeps, creep => creep.memory.role === 'scout').length;
    
        if (scoutCount < count) {
            const spawn = this.find(FIND_MY_SPAWNS)[0];
            const name = 'Scout' + Game.time.toString().slice(-4);
            const result = spawn.spawnCreep([MOVE], name, {
                memory: {
                    role: 'scout'
                }
            });
    
            if (result === OK) {
                console.log(`Spawning global scout: ${name}`);
            }
    
            return result;
        }
    
        return ERR_BUSY;};
    Room.prototype.spawnCreeps = function() {
        // let result = this.spawnCreep('harvester');
        // if (result === OK) return;
        let upgraderTarget;
        if (this.getUpgraderTarget) {
            upgraderTarget = this.getUpgraderTarget();
        } else {
            let value = _.get(this.memory, ['census', 'upgrader']);
            upgraderTarget = (value !== undefined && value !== null) ? value : 2;
        }
        result = this.spawnCreep('upgrader', upgraderTarget, 4);
        if (result === OK) return;
    
        // Only try spawning builders if there’s something to build
        const hasSites = this.find(FIND_MY_CONSTRUCTION_SITES).length > 0;
        if (hasSites) {
            if (this.getBuilderTargetCount){
                builderTarget = this.getBuilderTargetCount();
            } else {
                let value = _.get(this.memory, ['census', 'builder']);
                builderTarget = (value !== undefined && value !== null) ? value : 2;    
            }
            result = this.spawnCreep('builder', builderTarget, this.controller.level > 4 ? 4 : 5);
            if (result === OK) return;
        } else {
            this.spawnCreep('builder', 0); // Set builder count to 0 if no construction sit
        }
        if (this.needsRepairs()) {
            result = this.spawnCreep('repairer');
            if (result === OK) return;
        } else {
            this.spawnCreep('repairer', 0); // Set repairer count to 0 if no repairs needed
        }

        let defenderTarget;
        if (this.getUpgraderTarget) {
            defenderTarget = this.getDefenderTarget();
        } else {
            defenderTarget = 0;
        }
        result = this.spawnCreep('defender', defenderTarget, -1);
        if (result === OK) return;

       
        result = this.spawnScout();
        if (result === OK) return;
    };
};

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}
//Room.prototype.spawnCreeps = function() {
Room.prototype.buildBody = function(pattern, maxEnergy) {
    let cost = 0;
        _.forEach(pattern, function(part){
            cost += BODYPART_COST[part]
        })
        let body = []
        const maxPatterns = Math.min(
            Math.floor(maxEnergy / cost),    // How many full patterns fit by energy
            Math.floor(50 / pattern.length)  // How many patterns fit by size limit
        );
        if(maxPatterns < 1) return pattern;
        for(let i=0; i<maxPatterns; i++){
            _.forEach(pattern, function(part){
                body.push(part);
            })
        }
        return body;

}
Room.prototype.getDefenderBody = function() {
    switch (this.controller.level) {
        case 1:
            return [TOUGH, ATTACK, MOVE];

        case 2:
            return [TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE];
        case 3:
            return [TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE];
        case 4:
            return [TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, MOVE, MOVE];
        case 5:
            return [TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE];
        default:
            return [TOUGH, ATTACK, ATTACK, ATTACK, MOVE];
    }
}


