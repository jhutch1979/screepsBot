module.exports = function (Room) {
    Room.prototype.buildHoneycombGrid = function (radius = 10) {
        const spawn = this.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;

        const { x, y } = spawn.pos;

        const maxTowers = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][this.controller.level];
        let existingTowers = this.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });
        const towerConstructionSites = this.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_TOWER
        });
        let towerPlacedCount = existingTowers.length + towerConstructionSites.length;

        const allowedExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][this.controller.level];
        const allowedStorage = CONTROLLER_STRUCTURES[STRUCTURE_STORAGE][this.controller.level] > 0;

        const existingExtensions = this.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        }).length;
        const extensionSites = this.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        }).length;

        const hasStorage = this.storage || this.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_STORAGE
        }).length > 0;

        let neededExtensions = allowedExtensions - (existingExtensions + extensionSites);
        if (neededExtensions <= 0 && hasStorage) return;

        let placedExtensions = 0;
        let storagePlaced = hasStorage;

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                if (dx === 0 && dy === 0) continue; // Skip spawn center

                const pos = new RoomPosition(x + dx, y + dy, this.name);
                const nearbySources = this.lookForAtArea(
                    LOOK_SOURCES,
                    pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1,
                    true
                );
                
                if (nearbySources.length > 0) {
                    // This tile is next to a source! Do not build here.
                    continue;
                }
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist > radius) continue;

                const isEven = (dx + dy) % 2 === 0;

                if (!this.isBuildableTile(pos)) continue;
                //console.log(`Building honeycomb grid at ${pos.x},${pos.y}`);
                if (isEven) {

                    if (!storagePlaced && allowedStorage) {
                        const result = this.createConstructionSite(pos, STRUCTURE_STORAGE);
                        if (result === OK) {
                            storagePlaced = true;
                            continue; // Don't count storage as extension
                        }
                    } else if (towerPlacedCount < maxTowers) {

                        const towerTooClose = existingTowers.some(tower => tower.pos.getRangeTo(pos) < 5);
                        // Place towers if available
                        if (!towerTooClose) {
                            const result = this.createConstructionSite(pos, STRUCTURE_TOWER);
                        }

                    } else if (neededExtensions > 0) {
                        const result = this.createConstructionSite(pos, STRUCTURE_EXTENSION);
                        if (result === OK) {
                            placedExtensions++;
                            neededExtensions--;
                        }
                    }
                } else {
                    // Build roads in between
                    this.createConstructionSite(pos, STRUCTURE_ROAD);
                }

                if (neededExtensions <= 0 && storagePlaced) {
                    return; // Stop early if done
                }
            }
        }
    }

    Room.prototype.runBuildRoads = function (radius = 2, interval = 2) {
        if (!this.memory.lastRoadBuildTick || Game.time - this.memory.lastRoadBuildTick >= interval) {
            console.log(`Building roads in ${this.name}...`);
            const allowedExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][this.controller.level];
            // How many towers allowed at this RCL
            const allowedTowers = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][this.controller.level];

            // +1 for storage (we only place 1 storage ever)
            // +1 for spawn upgrades later (if you want)
            const extraSpecialBuildings = 1; // Storage

            // Total "building slots" needed
            const totalStructures = allowedExtensions + allowedTowers + extraSpecialBuildings;

            // Now estimate radius needed
            const estimatedRadius = Math.ceil(Math.sqrt(totalStructures / 2)) + 1;
            //console.log(`Estimated radius for honeycomb grid: ${estimatedRadius}`);
            this.buildHoneycombGrid(estimatedRadius);
            //this.expandHoneycombGrid();
            this.buildRoadToStructure(this.controller);
            const allStorages = this.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_CONTAINER
            });

            for (const storage of allStorages) {
                this.buildRoadToStructure(storage);
            }
            const containers = this.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            });

            if (this.storage) {
                for (const container of containers) {
                    this.buildRoadBetween(container, this.storage);
                }
            }
            if (this.storage) {
                const towers = this.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_TOWER
                });

                for (const tower of towers) {
                    //console.log(`Building road between ${this.storage.structureType} and ${tower.id}`);
                    this.buildRoadBetween(tower, this.storage);
                }
            }

            this.memory.lastRoadBuildTick = Game.time;
        }
        if (Game.time % 1000 === 0) {
            this.cleanDeadRoadPaths();
        }
    };

    Room.prototype.buildRoadBetween = function (from, to) {
        if (!from || !to) return;

        const fromId = from.id;
        const toId = to.id;
        const type = `${from.structureType}-to-${to.structureType}`;

        if (!this.memory.roadPaths) this.memory.roadPaths = {};
        if (!this.memory.roadPaths[type]) this.memory.roadPaths[type] = {};
        if (!this.memory.roadPaths[type][fromId]) {
            const result = PathFinder.search(from.pos, { pos: to.pos, range: 1 }, {
                swampCost: 5,
                plainCost: 2,
                roomCallback: () => new PathFinder.CostMatrix()
            });

            if (!result.incomplete) {
                this.memory.roadPaths[type][fromId] = result.path.map(p => ({ x: p.x, y: p.y }));
                console.log(`Saved road path from ${from.structureType} to ${to.structureType}`);
            }
        }

        const path = this.memory.roadPaths[type][fromId];
        if (path) {
            for (const step of path) {
                const pos = new RoomPosition(step.x, step.y, this.name);
                const hasRoad = this.lookForAt(LOOK_STRUCTURES, pos).some(s => s.structureType === STRUCTURE_ROAD);
                const hasSite = this.lookForAt(LOOK_CONSTRUCTION_SITES, pos).length > 0;
                if (!hasRoad && !hasSite) {
                    this.createConstructionSite(pos, STRUCTURE_ROAD);
                }
            }
        }
    };

    Room.prototype.buildRoadToStructure = function (structure) {
        const spawn = this.find(FIND_MY_SPAWNS)[0];
        if (!spawn || !structure) return;

        const id = structure.id;
        const type = structure.structureType;

        if (!this.memory.roadPaths) this.memory.roadPaths = {};
        if (!this.memory.roadPaths[type]) this.memory.roadPaths[type] = {};

        // If we already have the path stored, build it
        if (this.memory.roadPaths[type][id]) {
            const path = this.memory.roadPaths[type][id];
            for (const step of path) {
                const pos = new RoomPosition(step.x, step.y, this.name);
                const hasRoad = this.lookForAt(LOOK_STRUCTURES, pos).some(s => s.structureType === STRUCTURE_ROAD);
                const hasSite = this.lookForAt(LOOK_CONSTRUCTION_SITES, pos).length > 0;
                if (!hasRoad && !hasSite) {
                    this.createConstructionSite(pos, STRUCTURE_ROAD);
                }
            }
            return;
        }


        // No path stored — generate it
        const result = PathFinder.search(spawn.pos, { pos: structure.pos, range: 1 }, {
            swampCost: 5,
            plainCost: 2,
            roomCallback: () => new PathFinder.CostMatrix()
        });

        if (!result.incomplete) {
            this.memory.roadPaths[type][id] = result.path.map(p => ({ x: p.x, y: p.y }));
            console.log(`Saved path to ${type} (${id})`);
        }
        this.buildRoadToStructure(structure); // Call again to build the roads
    };

    Room.prototype.cleanDeadRoadPaths = function () {
        if (!this.memory.roadPaths) return;

        for (const type in this.memory.roadPaths) {
            const pathMap = this.memory.roadPaths[type];

            if (type === 'controller') {
                // Controller is always valid (skip or validate if needed)
                continue;
            }

            // Only do this for types that have ID-based entries (like storage, container, link, etc.)
            for (const id in pathMap) {
                if (!Game.getObjectById(id)) {
                    delete pathMap[id];
                    console.log(`Removed dead path to ${type} (${id})`);
                }
            }
        }
    };

    Room.prototype.findBestStorageInHoneycomb = function (radius = 10) {
        const spawn = this.find(FIND_MY_SPAWNS)[0];
        const controller = this.controller;
        const sources = this.find(FIND_SOURCES);

        if (!spawn || !controller || sources.length === 0) return null;

        const candidates = [];

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                if (dx === 0 && dy === 0) continue; // Skip spawn center

                const pos = new RoomPosition(spawn.pos.x + dx, spawn.pos.y + dy, this.name);
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist > radius) continue;

                const isEven = (dx + dy) % 2 === 0;
                if (!isEven) continue; // Only even woven spots (honeycomb)

                if (!this.isBuildableTile(pos)) continue;

                // Calculate score
                let totalDistance = pos.getRangeTo(controller);

                for (const source of sources) {
                    totalDistance += pos.getRangeTo(source);
                }

                candidates.push({ pos, score: totalDistance });
            }
        }

        if (candidates.length === 0) return null;

        // Sort candidates by lowest score (best center)
        candidates.sort((a, b) => a.score - b.score);

        return candidates[0].pos; // Best spot
    };

}