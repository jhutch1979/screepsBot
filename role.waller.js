const roleWaller = {
    run: function (creep) {
        creep.giveWayIfEmpty();

        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }
        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }

        if (creep.memory.working) {
            // First priority: Build any walls or ramparts under construction
            const wallSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
                filter: (site) =>
                    site.structureType === STRUCTURE_WALL || site.structureType === STRUCTURE_RAMPART
            });

            if (wallSite) {
                if (creep.build(wallSite) === ERR_NOT_IN_RANGE) {
                    creep.memory.currentAction = 'move';
                    creep.moveTo(wallSite, { visualizePathStyle: { stroke: '#00ffff' } });
                } else {
                    creep.memory.currentAction = 'build';
                }
                return;
            }

            // Otherwise: Repair existing walls/ramparts by tier
            if (!creep.memory.wallRepairTargetId || !creep.memory.repairThreshold) {
                const thresholds = [1000, 5000, 10000];
                let target = null;
                let threshold = null;

                for (const t of thresholds) {
                    target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                        filter: (structure) =>
                            (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) &&
                            structure.hits < t
                    });

                    if (target) {
                        threshold = t;
                        break;
                    }
                }

                if (target) {
                    creep.memory.wallRepairTargetId = target.id;
                    creep.memory.repairThreshold = threshold;
                }
            }

            if (creep.memory.wallRepairTargetId) {
                const target = Game.getObjectById(creep.memory.wallRepairTargetId);
                const threshold = creep.memory.repairThreshold || 10000; // fallback

                if (target) {
                    if (creep.repair(target) === ERR_NOT_IN_RANGE) {
                        creep.memory.currentAction = 'move';
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ff9999' } });
                    } else {
                        creep.memory.currentAction = 'repair';
                    }

                    // ✅ Only release if the wall is fully repaired for this phase
                    if (target.hits >= threshold) {
                        delete creep.memory.wallRepairTargetId;
                        delete creep.memory.repairThreshold;
                    }
                } else {
                    delete creep.memory.wallRepairTargetId;
                    delete creep.memory.repairThreshold;
                }
            } else {
                creep.parkIfIdle();
            }
        } else {
            creep.harvestEnergy();
        }
    }
};

module.exports = roleWaller;
