const { pathColors } = require('constants');
Creep.prototype.findEnergySource = function() {
    const sources = this.room.find(FIND_SOURCES_ACTIVE);
  
     // Step 1: Check if we are already next to a source
     for (const source of sources) {
        if (this.pos.inRangeTo(source, 1)) {
            // Already adjacent to a source — stay here
            return source.id;
        }
    }
    
    // Sort sources by distance first
    const sortedSources = sources.sort((a, b) => 
        this.pos.getRangeTo(a) - this.pos.getRangeTo(b)
    );
    

    for (const source of sortedSources) {
        let freeSpots = 0;

        // Check 8 adjacent tiles
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                const x = source.pos.x + dx;
                const y = source.pos.y + dy;

                if (x < 0 || x > 49 || y < 0 || y > 49) continue; // Map edges

                const pos = new RoomPosition(x, y, this.room.name);
                const terrain = this.room.lookForAt(LOOK_TERRAIN, pos)[0];
                const creepsHere = this.room.lookForAt(LOOK_CREEPS, pos);

                if (terrain !== 'wall' && creepsHere.length === 0) {
                    freeSpots++;
                }
            }
        }

        // If we find a source with free spots, pick it!
        if (freeSpots > 0) {
            return source.id;
        }
    }

    // No good sources, fallback to closest anyway
    if (sources.length) {
        return sortedSources[0].id;
    }

    return null; // No sources at all
}

Creep.prototype.harvestEnergy = function() {
    const storage = this.room.storage;
    if (storage) {
        const storedEnergy = storage.store.getUsedCapacity(RESOURCE_ENERGY);

        if (storedEnergy > 0) {
            // Storage has energy — withdraw it
            if (this.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(storage, {
                    reusePath: 2,
                    visualizePathStyle: { stroke: pathColors.retrieve }
                });
            }
        } else {
            // Storage empty — move away from storage
            if (this.pos.inRangeTo(storage, 1)) {
                // Find an empty spot nearby
                const emptySpots = this.pos.findInRange(FIND_STRUCTURES, 2, {
                    filter: s => {
                        const terrain = Game.map.getRoomTerrain(this.room.name).get(s.pos.x, s.pos.y);
                        return terrain !== TERRAIN_MASK_WALL && s.structureType !== STRUCTURE_STORAGE;
                    }
                });

                if (emptySpots.length > 0) {
                    this.moveTo(emptySpots[0], {
                        visualizePathStyle: { stroke: '#ff00ff' }
                    });
                    this.say('Backing off');
                } else {
                    // No good empty spots, just move randomly
                    const dirs = [TOP, RIGHT, BOTTOM, LEFT, TOP_RIGHT, TOP_LEFT, BOTTOM_RIGHT, BOTTOM_LEFT];
                    this.move(dirs[Math.floor(Math.random() * dirs.length)]);
                    this.say('Move away');
                }
            }
        }
        return;
    }

    // Fallback: harvest from energy source
    const sourceId = this.findEnergySource();
    const source = Game.getObjectById(sourceId);

    if (!source) {
        this.say('⚠️ No source');
        return;
    }

    if (this.pos.isNearTo(source)) {
        this.harvest(source);
    } else {
        this.moveTo(source, {
            reusePath: 2,
            visualizePathStyle: { stroke: '#ffffff' } // White for energy retrieval
        });
    }
}

Creep.prototype.parkIfIdle = function() {
    const flag = Game.flags['Park'];
    if (!flag) {
        this.say('⚠️ No flag');
        return;
    }

    const positions = [];

    for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
            const x = flag.pos.x + dx;
            const y = flag.pos.y + dy;
            if (x < 0 || x > 49 || y < 0 || y > 49) continue;

            const pos = new RoomPosition(x, y, flag.pos.roomName);
            if (this.pos.isEqualTo(pos)) return; // already parked

            const terrain = this.room.lookForAt(LOOK_TERRAIN, pos)[0];
            const structures = this.room.lookForAt(LOOK_STRUCTURES, pos);
            const hasRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);
            const adjacentStructures = this.room.lookForAtArea(LOOK_STRUCTURES, y-1, x-1, y+1, x+1, true)
                .some(entry => entry.structure.structureType !== STRUCTURE_ROAD);
            const occupied = this.room.lookForAt(LOOK_CREEPS, pos).length > 0;

            if (
                terrain !== 'wall' &&
                !hasRoad &&
                !adjacentStructures &&
                !occupied
            ) {
                positions.push(pos);
            }
        }
    }

    if (positions.length) {
        const best = this.pos.findClosestByPath(positions);
        if (best) {
            this.moveTo(best, { visualizePathStyle: { stroke: '#cccccc' } });
        }
    } else {
        this.say('No space');
    }
    
};
Creep.prototype.giveWayIfEmpty = function() {
    if (this.store.getUsedCapacity(RESOURCE_ENERGY) > 0) return; // I'm carrying energy, don't move away

    const creepsHere = this.room.lookForAt(LOOK_CREEPS, this.pos);
    if (creepsHere.length <= 1) return; // No one else here

    // Someone else is also on my tile
    for (const other of creepsHere) {
        if (other.id === this.id) continue; // Ignore self
        if (other.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            // Other creep has energy and is more important
            // Try moving to a random adjacent open tile
            const directions = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
            for (const dir of directions) {
                if (this.move(dir) === OK) {
                    return;
                }
            }
        }
    }
}
Creep.prototype.retreatToRampart = function() {
    // If already on a friendly rampart, no need to move
    const onRampart = this.room.lookForAt(LOOK_STRUCTURES, this.pos)
        .some(s => s.structureType === STRUCTURE_RAMPART && s.my);
    if (onRampart) return; // already on rampart

    // Find all friendly ramparts in the room
    const ramparts = this.room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_RAMPART
    });
    // Filter ramparts that have no creep standing on them
    const freeRamparts = ramparts.filter(r => this.room.lookForAt(LOOK_CREEPS, r.pos).length === 0);

    if (freeRamparts.length) {
        // Move toward the closest free rampart
        const target = this.pos.findClosestByPath(freeRamparts);
        if (target) {
            this.moveTo(target, {
                visualizePathStyle: { stroke: '#00ff00' }  // Green for retreat path
            });
        }
    } else {
        // No free ramparts available, fallback to moving toward spawn
        const spawn = this.pos.findClosestByPath(FIND_MY_SPAWNS);
        if (spawn) {
            this.moveTo(spawn, {
                visualizePathStyle: { stroke: '#00ff00' }  // Green for retreat path
            });
        }
    }
};




