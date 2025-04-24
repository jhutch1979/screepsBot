var roleScout = {
    run: function(creep) {
        if (!creep.memory.targetRooms || creep.memory.targetRooms.length === 0) {
            var baseRoom = creep.room.name;
            var exits = Game.map.describeExits(baseRoom);

            if (!exits) {
                creep.say('No exits');
                return;
            }

            var targets = [];
            for (var dir in exits) {
                targets.push(exits[dir]);
            }

            creep.memory.targetRooms = targets;
            creep.memory.targetIndex = 0;
        }

        var targetRooms = creep.memory.targetRooms;
        var index = creep.memory.targetIndex || 0;
        var targetRoom = targetRooms[index % targetRooms.length];

        if (creep.room.name === targetRoom) {
            if (!Memory.rooms[creep.room.name]) {
                Memory.rooms[creep.room.name] = {};
            }

            Memory.rooms[creep.room.name].lastScouted = Game.time;

            if (creep.room.controller) {
                if (creep.room.controller.owner) {
                    Memory.rooms[creep.room.name].owner = creep.room.controller.owner.username;
                    Memory.rooms[creep.room.name].type = 'owned';
                } else {
                    Memory.rooms[creep.room.name].owner = null;
                    Memory.rooms[creep.room.name].type = 'neutral';
                }
                Memory.rooms[creep.room.name].controllerId = creep.room.controller.id;
            } else {
                Memory.rooms[creep.room.name].type = 'highway';
            }

            var sources = creep.room.find(FIND_SOURCES);
            var sourceIds = [];
            for (var i = 0; i < sources.length; i++) {
                sourceIds.push(sources[i].id);
            }
            Memory.rooms[creep.room.name].sources = sourceIds;

            creep.say("📍" + targetRoom);
            creep.memory.targetIndex = (index + 1) % targetRooms.length;
            // Detect hostile creeps
            var hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
            Memory.rooms[creep.room.name].hostileCreeps = hostileCreeps.length;

            // Detect hostile structures (like towers or spawns)
            var hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES);
            Memory.rooms[creep.room.name].hostileStructures = hostileStructures.length;

            // Optional: Record names or types
            Memory.rooms[creep.room.name].hostileCreepNames = [];
            for (var i = 0; i < hostileCreeps.length; i++) {
                Memory.rooms[creep.room.name].hostileCreepNames.push(hostileCreeps[i].owner.username);
            }
        }

        if (creep.room.name !== targetRoom) {
            var exitDir = creep.room.findExitTo(targetRoom);
            var exit = creep.pos.findClosestByRange(exitDir);
            if (exit) {
                creep.moveTo(exit, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        } else {
            creep.moveTo(25, 25, { visualizePathStyle: { stroke: '#999999' } });
        }
    }
};

module.exports = roleScout;
