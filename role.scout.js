var roleScout = {
    run: function (creep) {
        if (!creep.memory.home) {
            creep.suicide();
        }
        var homeName = creep.memory.home
        var homeRoom = Game.rooms[homeName];
        var maxScoutDistance =2;
//
        //if (!homeRoom.memory.scoutQueue) {
        //    homeRoom.memory.scoutQueue = [];
        //    var exits = Game.map.describeExits(homeName);
        //    if (!exits) {
        //        creep.say('No exits');
        //        return;
        //    }
//
        //    var targets = [];
        //    for (var dir in exits) {
        //        targets.push(exits[dir]);
//
        //    }
        //    homeRoom.memory.scoutQueue = targets;
        //    homeRoom.memory.scoutIndex = 0;
//
        //    if (!homeRoom.memory.scoutedRooms)
        //        homeRoom.memory.scoutedRooms = {};
//
        //    for (var target in targets) {
        //        if (!homeRoom.memory.scoutedRooms[targets[target]]) {
        //            homeRoom.memory.scoutedRooms[targets[target]] = {};
//
        //        }
        //        console.log(target);
        //        homeRoom.memory.scoutedRooms[targets[target]].distance = 1;
        //        homeRoom.memory.scoutedRooms[targets[target]].discoveredFrom = homeName;
        //    }
        //}
//
//
        addToScoutQue(homeRoom, homeName, creep)
        var targetRooms = homeRoom.memory.scoutQueue;

        var index = homeRoom.memory.scoutIndex || 0;
        var targetRoom = targetRooms[index % targetRooms.length];
        //console.log(targetRoom)

        if (!homeRoom.memory.scoutedRooms[targetRoom].lastScouted || homeRoom.memory.scoutedRooms[targetRoom].expiredScoutData === true) {


            if (creep.room.name === targetRoom) {
                if (!homeRoom.memory.scoutedRooms) {
                    homeRoom.memory.scoutedRooms = {};
                }
                if (!homeRoom.memory.scoutedRooms[creep.room.name]) {
                    homeRoom.memory.scoutedRooms[creep.room.name] = {};
                }
                //if (!homeRoom.memory.scoutedRooms[creep.room.name]) {
                //    homeRoom.memory.scoutedRooms[creep.room.name] = {};
                //}
                homeRoom.memory.scoutedRooms[creep.room.name].lastScouted = Game.time;

                if (creep.room.controller) {
                    if (creep.room.controller.owner) {
                        homeRoom.memory.scoutedRooms[creep.room.name].owner = creep.room.controller.owner.username;
                        homeRoom.memory.scoutedRooms[creep.room.name].type = 'owned';
                    } else {
                        homeRoom.memory.scoutedRooms[creep.room.name].owner = null;
                        homeRoom.memory.scoutedRooms[creep.room.name].type = 'neutral';
                    }
                    homeRoom.memory.scoutedRooms[creep.room.name].controllerId = creep.room.controller.id;
                } else {
                    homeRoom.memory.scoutedRooms[creep.room.name].type = 'highway';
                }

                var sources = creep.room.find(FIND_SOURCES);
                var sourceIds = [];
                for (var i = 0; i < sources.length; i++) {
                    sourceIds.push(sources[i].id);
                }
                homeRoom.memory.scoutedRooms[creep.room.name].sources = sourceIds;

                creep.say("📍" + targetRoom);

                // Detect hostile creeps
                var hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
                homeRoom.memory.scoutedRooms[creep.room.name].hostileCreeps = hostileCreeps.length;

                // Detect hostile structures (like towers or spawns)
                var hostileStructures = creep.room.find(FIND_HOSTILE_STRUCTURES);
                homeRoom.memory.scoutedRooms[creep.room.name].hostileStructures = hostileStructures.length;

                // Optional: Record names or types
                homeRoom.memory.scoutedRooms[creep.room.name].hostileCreepNames = [];
                for (var i = 0; i < hostileCreeps.length; i++) {
                    homeRoom.memory.scoutedRooms[creep.room.name].hostileCreepNames.push(hostileCreeps[i].owner.username);
                }

                homeRoom.memory.scoutedRooms[creep.room.name].expiredScoutData = false;
                //console.log((index+1) % targetRooms.length)
                if(homeRoom.memory.scoutedRooms[creep.room.name].distance < maxScoutDistance){
                    addToScoutQue(homeRoom, creep.room.name, creep);
                }
                homeRoom.memory.scoutIndex = (index + 1) % targetRooms.length;
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
        else {
            //creep.say("Scouting Data up to date for ", targetRoom)
            if(creep.room.name !== homeName){
                creep.say("going home")
                var exitDir = creep.room.findExitTo(homeName);
                    var exit = creep.pos.findClosestByRange(exitDir);
                    if (exit) {
                        creep.moveTo(exit, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                creep.moveTo(25,25)
            }
             
        homeRoom.memory.scoutIndex = (index + 1) % targetRooms.length;
        }
    }
};

function addToScoutQue(homeRoom, currentRoomName, creep) {

    if (!homeRoom.memory.scoutQueue) {
        homeRoom.memory.scoutQueue = [];
        homeRoom.memory.scoutIndex = 0;
    }

    if (!homeRoom.memory.scoutedRooms) {
        homeRoom.memory.scoutedRooms = {};
    }

    const exits = Game.map.describeExits(currentRoomName);

    if (!exits) {
        return;
    }

    const currentTargets = homeRoom.memory.scoutQueue;

    for (const dir in exits) {

        const roomName = exits[dir];

        if (!currentTargets.includes(roomName) && roomName !== homeRoom.name) {

            // add room to queue
            currentTargets.push(roomName);

            // create memory entry
            homeRoom.memory.scoutedRooms[roomName] = {};

            // determine distance
            let currentDistance;

            if (currentRoomName === homeRoom.name) {
                currentDistance = 0;
            } else {
                currentDistance =
                    homeRoom.memory.scoutedRooms[currentRoomName].distance;
            }

            homeRoom.memory.scoutedRooms[roomName].distance =
                currentDistance + 1;

            homeRoom.memory.scoutedRooms[roomName].discoveredFrom =
                currentRoomName;
        }
    }
}

module.exports = roleScout;
