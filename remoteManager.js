var remoteManager = {
    run: function(roomName, remoteRoomName) {
        if(Game.time % 20 === 0){
            const mem = Memory.rooms[roomName].scoutedRooms[remoteRoomName];
            if(!mem.lastScouted)
            {
                return;
            }
            console.log("running remote manager for room ", remoteRoomName);
        }
    }
};
module.exports = remoteManager