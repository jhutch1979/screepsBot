module.exports = function (Room) {
    Room.prototype.getUpgraderTarget = function () {
        if (!this.memory.census) {
            this.memory.census = { upgrader: 2 };
        }
        if (!Memory.lastUpgraderAdjust) {
            Memory.lastUpgraderAdjust = Game.time;
        }
        if (!this.controller || !this.controller.my) return 0;

        const downgradeBuffer = this.controller.ticksToDowngrade;

        // Always keep at least 1 upgrader if controller is halfway to downgrade
        if (this.controller.level === 8) {
            if (downgradeBuffer < 100000) return 1;
            if (this.storage && this.storage.store[RESOURCE_ENERGY] > 800000) return 1;
            return 0;
        }

        // EARLY GAME (Pre-storage logic)
        if (!this.storage) {
            const ticksSinceLastAdjust = Game.time - Memory.lastUpgraderAdjust;
            if (ticksSinceLastAdjust < 200) {
                return this.memory.census.upgrader || 2; // Too soon to adjust again
            }
            const avgEnergyUsage = getAverageEnergyUsage(300);
            const expectedProduction = this.find(FIND_SOURCES).length * 10; // Assume 10 energy/tick per source

            const efficiency = avgEnergyUsage / expectedProduction;

            if (efficiency < 0.6) {
                // Not using enough energy, add an upgrader
                this.memory.census.upgrader = Math.min((this.memory.census.upgrader || 2) + 1, 10);
                Memory.lastUpgraderAdjust = Game.time;
            } else if (efficiency > 0.8) {
                // Economy is tight, scale down
                this.memory.census.upgrader = Math.max((this.memory.census.upgrader || 2) - 1, 1);
                Memory.lastUpgraderAdjust = Game.time;
            }
            // else keep the current number
            return this.memory.census.upgrader || 2;
        }
        // ✅ AFTER STORAGE LOGIC
        const stored = this.storage.store[RESOURCE_ENERGY];
        if (stored > 500000) return 3;
        if (stored > 200000) return 2;
        if (stored > 50000) return 1;
        return 0;
    };

    Room.prototype.getBuilderTargetCount = function () {
        const totalBuildWork = _.sum(this.find(FIND_CONSTRUCTION_SITES), site =>
            site.structureType !== STRUCTURE_WALL &&
                site.structureType !== STRUCTURE_RAMPART
                ? site.progressTotal - site.progress
                : 0 // Ignore walls and ramparts
        );

        console.log(`Total build work in ${this.name}: ${totalBuildWork}`);

        if (totalBuildWork === 0) return 0;

        // Estimate new builder strength
        const body = this.buildBody([WORK, CARRY, MOVE], this.energyCapacityAvailable);

        // Count WORK parts in the builder (because WORK is what builds)
        const workParts = body.filter(part => part === WORK).length;

        // If no WORK parts somehow (weird case), assume at least 1
        const buildPower = workParts > 0 ? workParts * 4 : 4; // 4 build points per WORK per tick

        console.log(`Estimated builder buildPower: ${buildPower} per tick`);

        // Estimate number of ticks needed if you had only one builder
        const estimatedTicks = totalBuildWork / buildPower;

        // Scale builders: one builder for roughly every 1500 ticks of work
        var buildersNeeded = Math.ceil(estimatedTicks / 750);
        buildersNeeded = Math.min(buildersNeeded, 5); // At least one builder
        console.log(`Estimated builders needed: ${buildersNeeded}`);

        return Math.min(buildersNeeded, 5); // Never spawn more than 4 builders
    }

    Room.prototype.needsRepairs = function () {
        const repairTarget = this.find(FIND_STRUCTURES, {
            filter: (structure) => {
                if (structure.hits < structure.hitsMax) {
                    if (structure.hits / structure.hitsMax < 0.9) {
                        return true;
                    }
                    if ((structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) &&
                        structure.hits < 50000) {
                        return true;
                    }
                }
                return false;
            }
        });
        return repairTarget.length > 0;
    }
}
function getAverageEnergyUsage(windowSize = 100) {
    if (!Memory.energyUsageTracker || Memory.energyUsageTracker.history.length === 0) return 0;

    const history = Memory.energyUsageTracker.history;
    const slice = history.slice(-windowSize); // Take only last N entries

    const total = slice.reduce((a, b) => a + b, 0);

    return Math.round((total / slice.length) * 100) / 100;
}