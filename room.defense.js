const roleTower = require('role.tower');
module.exports = function (Room) {

    Room.prototype.defend=function() {
        var towers = this.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_TOWER)
            }
        });
        for(const tower of towers){
            roleTower.run(tower)
        }
    }
}