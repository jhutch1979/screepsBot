var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleRepairer = require('role.repairer');
var roleDefender = require('role.defender');
var roleWaller = require('role.waller');
//var roomFunctions = require('room.functions');
var creepFunctions = require('creep.functions');
const energyManager = require('room.energyManager');
var roleMiner = require('role.miner');
var roleHauler = require('role.hauler');
var roleSupplier = require('role.supplier');
var roleScout = require('role.scout');
var roleDroppedHauler = require('role.droppedHauler');
require('room.spawnManager')(Room);
require('room.defense')(Room);
require('room.constructionManager')(Room);
require('room.roleTargets')(Room);
require('room.tileUtils')(Room);
var remoteManager = require('remoteManager');

//var roleTower = require('role.tower');

module.exports.loop = function () {

    if (Memory.lastRCL === undefined) {
        Memory.lastRCL = 1;
    }


    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existant creep memory: ', name);
        }
    }
    const scoutExpiry = 10000;

    

    _.forEach(Game.rooms, function (room, roomName) {


        if (room && room.controller && room.controller.my) {
            console.log('Processing room:', roomName);
            const currentLevel = room.controller.level;
            
            for (const remoteRoomName in Memory.rooms[roomName].scoutedRooms) {
                //console.log(remoteRoomName);
                const mem = Memory.rooms[roomName].scoutedRooms[remoteRoomName];
                if (mem.lastScouted && Game.time - mem.lastScouted > scoutExpiry) {
                    console.log('marking room memory expired for: ', remoteRoomName);
                    Memory.rooms[roomName].scoutedRooms[remoteRoomName].expiredScoutData = true;
                }
                else
                {
                    remoteManager.run(roomName, remoteRoomName);
                }
            }//

            if (currentLevel > Memory.lastRCL) {
                console.log(`<span style="color: cyan;">[RCL]</span> Reached RCL ${currentLevel} at Game.time ${Game.time}`);
                Memory[`rcl${currentLevel}Time`] = Game.time;
                Memory.lastRCL = currentLevel;
            }

            room.spawnCreeps();
            room.defend();
            room.runBuildRoads(3, 20);
            energyManager.run(room);
            require('room.spawnQueue').process(room);
        }
    })



    const roleMap = {
        harvester: roleHarvester,
        upgrader: roleUpgrader,
        builder: roleBuilder,
        repairer: roleRepairer,
        miner: roleMiner,
        hauler: roleHauler,
        supplier: roleSupplier,
        scout: roleScout,
        droppedHauler: roleDroppedHauler,
        defender: roleDefender,
        waller: roleWaller
    };

    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        const role = creep.memory.role;
        //console.log(`Creep: ${name}, Role: ${role}`);
        if (role === 'harvester') {
            //console.log('Running harvester logic');
            const sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);

            const towers = creep.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (creep.room.energyAvailable === creep.room.energyCapacityAvailable && towers.length === 0) {
                if (sites.length > 0) {
                    // If there are construction sites, help build
                    roleBuilder.run(creep);
                } else {
                    // No sites? Help upgrade controller
                    roleUpgrader.run(creep);
                }
            } else {
                // Otherwise harvest normally
                //console.log('Harvesting normally');
                roleHarvester.run(creep);
            }
        } else if (roleMap[role]) {
            //console.log(`Running ${role} logic for creep: ${name}`);
            if(role === 'scout')
            {
                roleMap[role].run(creep);
            }else{
            roleMap[role].run(creep);
            }
        }
    }

    //if(Game.Spawns.Spawn1.is)

    console.log('End of cycle');
    console.log();
}