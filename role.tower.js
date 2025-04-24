var roleTower = {
    run: function(tower) {
        //console.log('here')
        let targets= tower.room.find(FIND_HOSTILE_CREEPS);
        if(targets.length){
            let target = tower.pos.findClosestByRange(targets);
            if(target){
                tower.attack(target);
            }
        }

    }

};

module.exports = roleTower;