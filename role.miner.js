var roleMiner = {
    run: function(creep) {
        creep.giveWayIfEmpty(); // Allow other creeps to pass if this creep is empty
        const source = Game.getObjectById(creep.memory.sourceId);
        if (!source) {
            creep.say('No source!');
            return;
        }

        // Look for nearby container and cache its location
        if (!creep.memory.containerPos) {
            const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })[0];

            const site = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })[0];

            const target = container || site;

            if (target) {
                creep.memory.containerPos = {
                    x: target.pos.x,
                    y: target.pos.y,
                    roomName: target.pos.roomName
                };
            } else {
                creep.say('No container!');
                return;
            }
        }

        // Go to container position if not there yet
        const containerPos = new RoomPosition(
            creep.memory.containerPos.x,
            creep.memory.containerPos.y,
            creep.memory.containerPos.roomName
        );

        if (!creep.pos.isEqualTo(containerPos)) {
            creep.moveTo(containerPos, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        // Harvest from the assigned source
        const result = creep.harvest(source);
        if (result !== OK) {
            creep.say(`Err: ${result}`);
        }
    }
};

module.exports = roleMiner;
