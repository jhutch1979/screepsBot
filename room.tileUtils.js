module.exports = function (Room) {
    Room.prototype.isBuildableTile = function(pos) {
        if (pos.x < 1 || pos.x > 48 || pos.y < 1 || pos.y > 48) return false;
        const terrain = this.lookForAt(LOOK_TERRAIN, pos)[0];
        if (terrain === 'wall') return false;
        const structures = this.lookForAt(LOOK_STRUCTURES, pos);
        if (structures.length) return false;
        const sites = this.lookForAt(LOOK_CONSTRUCTION_SITES, pos);
        if (sites.length) return false;
        return true;
    };
}