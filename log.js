// MODULES
var fs = require("fs");
var math = require("mathjs");

// MY MODULES
const simulation = require("./simulation.js");
const fluid = require("./fluid.js");
const caRules = require("./cellularautomatarules.js");
const particle = require("./particle.js");
const particlerules = require("./particlerules.js");

let record = [];
exports.record = record;

let particleReactionResults = [];

let explosionCount = 0;
let explosionSizeTotal = 0;
let explosionForceTotal = 0;

let caCount = 0;
let caSizeTotal = 0;
let caRuleTotal = 0;
let caNeighbourhoodTotal = 0;
let caAnimateCount = 0;
let caAnimateSizeTotal = 0;
let caNeighbourhoodRulesCount = 0;
let caNeighbourhoodRulesRuleTotal = 0;
let caNeighbourhoodRulesNeighbourhoodTotal = 0;
let caAnimateArray = [];

let trailCount = 0;

let fluidMoveCount = 0;
let fluidMoveSizeTotal = 0;
let fluidMoveVelocityTotal = 0;
let fluidExplosionCount = 0;
let fluidExplosionSizeTotal = 0;
let fluidExplosionForceTotal = 0;
let fluidFlowfieldCount = 0;
let fluidFlowfieldSizeTotal = 0;
let fluidFlowfieldDurationTotal = 0;

let shockWaveCount = 0;

exports.caCount = caCount;
exports.caAnimateCount = caAnimateCount;
exports.caNeighbourhoodRulesCount = caNeighbourhoodRulesCount;
exports.fluidMoveCount = fluidMoveCount;
exports.fluidExplosionCount = fluidExplosionCount;
exports.fluidFlowfieldCount = fluidFlowfieldCount;
exports.trailCount = trailCount;
exports.shockWaveCount = shockWaveCount;

function logBaseSettings() {
    let settingsString = "";

    // UNCOMMENT to log some info
    settingsString += "\r\n" + "Info";
    settingsString += "\r\n" + "  Changing explosion values of particles for an even result count of particles.";
    settingsString += "\r\n" + " ";

    settingsString += "\r\n" + "General Settings / Data";
    // Start Settings
    settingsString += "\r\n" + "  Date " + simulation.startDate;

    if (simulation.startHexString != undefined) {
        settingsString += "\r\n" + "  StartHexString " + simulation.startHexString;
        settingsString += "\r\n" + "  StartBinString " + simulation.startBinString;
        settingsString += "\r\n" + "  StartParticleCount " + simulation.startBinString.length;
    }
    settingsString += "\r\n" + "  GravConstant " + simulation.gravConstant;
    settingsString += "\r\n" + "  FieldWidth " + simulation.fieldWidth;
    settingsString += "\r\n";

    // General Particle Settings
    settingsString += "\r\n" + "Particle Data";
    settingsString += "\r\n" + "  " + "VelocityMaxAbs " + simulation.particleVelocityMaxAbs;
    settingsString += "\r\n" + "  " + "VelocityMax " + particle.velocityMax;
    settingsString += "\r\n" + "  " + "VelocityReduce " + particle.velocityReduce;
    settingsString += "\r\n";
    settingsString += "\r\n" + "  " + "State   | Mass | GravRadius | MergeCnt | ReactionCnt | ExpForce | ExpSize"

    for (let i = 1; i <= simulation.stateMax; i++) {
        settingsString += "\r\n" + "  ";
        settingsString += subsequentSpaces(i + "/-" + i, 7);
        settingsString += " | ";
        settingsString += subsequentSpaces(simulation.particleVals[i - 1]['mass'], 5);
        settingsString += "| ";
        settingsString += subsequentSpaces(simulation.particleVals[i - 1]['gravRadius'], 12);
        settingsString += "| ";
        settingsString += subsequentSpaces(simulation.particleVals[i - 1]['mergeCount'], 9);
        settingsString += "| ";
        settingsString += subsequentSpaces(simulation.particleVals[i - 1]['reactionCount'], 12);
        settingsString += "| ";
        settingsString += subsequentSpaces(simulation.particleVals[i - 1]['explosionForce'], 9);
        settingsString += "| ";
        settingsString += simulation.particleVals[i - 1]['explosionSize'];
    }
    settingsString += "\r\n";

    // Particle Results
    let particleResultsStrings = ["fm", "fe", "ff", "cas", "cac", "caa", "t"];
    settingsString += "\r\n" + "  " + "Particle Results";
    settingsString += "\r\n" + "  " + "Lowest Akin / State | 1   | -1  | 2   | -2  | 3   | -3  | 4   | -4  | 5   | -5  | 6   | -6  | 7   | -7  | 8   | -8  | 9   | -9  | 10  | -10 | 11  | -11";
    for (let i = 0; i < simulation.stateMax - 1; i++) {

        settingsString += "\r\n" + "  ";
        settingsString += subsequentSpaces(i, 19);
        settingsString += " |";
        for (let l = 1; l < simulation.stateMax; l++) { 
            for (let j = -1; j <= 1; j += 2) {           
                let result = particlerules.getParticleReactionResult(l * j, i, 0);
                let resultString = particleResultsStrings[result];
                if (resultString == undefined) {
                    resultString = " ";
                }

                settingsString += " " + subsequentSpaces(resultString, 4);
                settingsString += "|";
            }
        }
    }
    settingsString += "\r\n";
    settingsString += "\r\n";

    // Fluid Movement
    settingsString += "FluidMovement Values";
    settingsString += "  " + "Velocity Base " + particle.fluidMovementVelocity[0] + " Increase " + particle.fluidMovementVelocity[1];
    settingsString += "  " + "Size Base " + particle.fluidMovementSize[0] + " Increase " + particle.fluidMovementSize[1];
    settingsString += "\r\n";

    // FluidExplosion
    settingsString += "FluidExplosion Values";
    settingsString += "  " + "Strength Base " + particle.fluidExplosionStrength[0] + " Increase " + particle.fluidExplosionStrength[1];
    settingsString += "  " + "Size Base " + particle.fluidExplosionSize[0] + " Increase " + particle.fluidExplosionSize[1];
    settingsString += "\r\n";

    // FluidFlowfield
    settingsString += "Fluidflowfield Values";
    settingsString += "  " + "Size Base " + particle.fluidflowfieldSize[0] + " Increase " + particle.fluidflowfieldSize[1];
    settingsString += "  " + "Duration Base " + particle.fluidflowfieldDuration[0] + " Increase " + particle.fluidflowfieldDuration[1];
    settingsString += "\r\n";

    // Cellular Automata Neighbourhood Rule Set
    settingsString += "CA Neighbourhood Rule Set Values";
    settingsString += "  " + "Size Base " + particle.cANeighbourhoodRuleSize[0] + " Increase " + particle.cANeighbourhoodRuleSize[1];
    settingsString += "\r\n";

    // Cellular Automata Complete
    settingsString += "CA Complete Values";
    settingsString += "  " + "Size Base " + particle.cellularAutomataSize[0] + " Increase " + particle.cellularAutomataSize[1];
    settingsString += "\r\n";

    // Cellular Automata Animate
    settingsString += "CA Animate Values";
    settingsString += "  " + "Size Base " + particle.cAAnimateSize[0] + " Increase " + particle.cAAnimateSize[1];
    settingsString += "\r\n";

    // Fluid Data
    settingsString += "\r\n" + "Fluid Data";
    settingsString += "\r\n" + "  " + "Resolution " + simulation.fluidResolution;
    settingsString += "\r\n" + "  " + "SpeedReduction " + simulation.fluidParticleSpeedReduction;
    settingsString += "\r\n";

    // Fluid Cells Data
    settingsString += "\r\n" + "Fluid Cells Data";
    settingsString += "\r\n" + "  " + "Resolution " + simulation.fluidCellResolution;
    settingsString += "\r\n" + "  " + "Radius " + simulation.fluidCellRadius;
    let baseFluidParticles = simulation.fluidTree.contentParticles([simulation.fluidCellResolution/2, simulation.fluidCellResolution/2], simulation.fluidCellRadius, 0).length;
    settingsString += "\r\n" + "  " + "BaseFluidParticles (Radius " + simulation.fluidCellRadius + ") " + baseFluidParticles;
    settingsString += "\r\n";

    // Cellular Automata Data
    settingsString += "\r\n" + "CellularAutomata Data";
    settingsString += "\r\n" + "  " + "Resolution " + simulation.caResolution;
    
    settingsString += "\r\n" + "  " + "Set Variables";
    settingsString += "\r\n" + "  " + "  FluidParticleRadius " + particle.caRuleParticleRadius;
    settingsString += "\r\n";
    
    // Quadtree Settings
    // settingsString += "\r\n" + "Quad Tree";
    // settingsString += "\r\n" + "  " + "Fluid Particle Capacity " + simulation.fluidQuadtreeCapacity;

    // Timing Settings
    let timingNames = ['Normal Phase', 'ExpandPhase', 'EndPhase'];
    settingsString += "\r\n" + "Timing";
    settingsString += "\r\n" + "  ";
    for (let i = 0; i < simulation.timeSteps.length; i++) {
        if (timingNames[i] != undefined) {
            settingsString += timingNames[i] + " ";
        }
        settingsString += simulation.timeSteps[i];

        if (i != simulation.timeSteps.length - 1) {
            settingsString += ", ";
        }
    }

    settingsString += "\r\n";

    // Initialize particlereactionsArray
    for (let i = 0; i < simulation.stateMax - 2; i++) {
        particleReactionResults.push([]);
        for (let j = 0; j < simulation.stateMax - 1; j++) {
            particleReactionResults[i].push([0, 0]);
        }
    }

    record.push(settingsString);
    exports.record = record;

    saveFile('_record_', record);
}

exports.logBaseSettings = logBaseSettings;

function saveParticles(_Freq) {
    if (simulation.timePassed % _Freq == 0) {
        let particleVals = simulation.particleStats;

        let particleTotal = [0, 0];

        let stringPositiv = "";
        for (let i = 0; i < simulation.stateMax; i++) {
            stringPositiv += (i + 1) + ":  " + particleVals[0][i];

            if (i != simulation.stateMax - 1) {
                stringPositiv += " | ";
            }
        }

        let stringNegativ = "";
        for (let i = 0; i < simulation.stateMax; i++) {
            stringNegativ += "-" + (i + 1) + ": " + particleVals[1][i];

            if (i != simulation.stateMax - 1) {
                stringNegativ += " | ";
            }
        }
        
        let effParticleCount = 0;
        let akin = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let akinString = "";

        let polarity = [0, 0];
        let polarityString = "";

        simulation.particles.forEach(function (particle) {
            if (!particle.merged) {
                effParticleCount++;
            }

            if (particle.state > 0) {
                particleTotal[0]++;
            } else {
                particleTotal[1]++;
            }

            akin[particle.akin]++;

            polarity[(particle.polarity/2) + .5]++;
        });

        for (let i = 0; i < akin.length; i++) {
            akinString += akin[i] + " ";
        }

        for (let i = 0; i < polarity.length; i++) {
            polarityString += ((i - .5) * 2) + ": " + polarity[i];

            if (i != polarity.length - 1) {
                polarityString += " | ";
            }
        }

        let string = "\r\n" + pad(simulation.timePassed, 6) + "  Total " + simulation.particles.length + " (" + effParticleCount + ") ";
        string += "\r\n        Positiv (" + particleTotal[0] + ") " + stringPositiv;
        string += "\r\n        Negativ (" + particleTotal[1] + ") " + stringNegativ;
        string += "\r\n        Akin " + akinString;
        string += "\r\n        Polarity " + polarityString;
        
        string += "\r\n        Explosion Count " + explosionCount + " Ø Size " + (explosionSizeTotal/explosionCount).toFixed(2) + " Ø Force " + (explosionForceTotal/explosionCount).toFixed(2);


        // UNCOMMENT to log the average and overview of the Cellular Automata Rules, which are determined by the number of fluid particles in a radius around the particle
        /*
        string += "\r\n        RulesCount " + "Avg " + (fluidParticleAverage/fluidParticleCount).toFixed(4) + " ";
        for (let i = 0; i < caRulesArray.length; i++) {
            if (caRulesArray[i] != undefined) {
                string += i + ":" + caRulesArray[i];
                if (i != caRulesArray.length - 1) {
                    string += "|";
                }
            }
        }
        */

        // UNCOMMENT to log the neighbourhood happenings
        /*
        string += "\r\n        NeighbourhoodCount ";
        for (let i = 0; i < caNeighbourhoodArray.length; i++) {
            if (caNeighbourhoodArray[i] != undefined) {
                string += i + ":" + caNeighbourhoodArray[i];
                if (i != caNeighbourhoodArray.length - 1) {
                    string += "|";
                }
            }
        }
        */

        // UNCOMMENT to log the Alive happenings
        /*
        string += "\r\n        AliveCount ";
        for (let i = 0; i < caAnimateArray.length; i++) {
            if (caAnimateArray[i] != undefined) {
                string += i + ":" + caAnimateArray[i];
                if (i != caAnimateArray.length - 1) {
                    string += "|";
                }
            }
        }
        */
       
        // UNCOMMENT to log Cellular Automata Happenings
        // string += "\r\n        CA LiveDeath-Rule: " + caHappenings[0] + " Neighbourhood: " + caHappenings[1] + " CellsAlive: " + caHappenings[2];

        // UNCOMMENT to log particle Trails
        string += "\r\n        Particle Trail Count: " + trailCount;

        // UNCOMMENT to log Cellular Automatas Stuff
        string += "\r\n        CA Count: " + caCount + " Ø Size " + ((caSizeTotal/caCount).toFixed(2)) + " Ø Rule " + ((caRuleTotal/caCount).toFixed(2)) + " Ø Neighbourhood " + ((caNeighbourhoodTotal/caCount).toFixed(2));
        string += "\r\n        CA Animate Count: " + caAnimateCount + " Ø Size " + ((caAnimateSizeTotal/caAnimateCount).toFixed(2));
        string += "\r\n        CA Neighbourhood / Rule Count: " + caNeighbourhoodRulesCount + " Ø Rule " + ((caNeighbourhoodRulesRuleTotal/caNeighbourhoodRulesCount).toFixed(2)) + " Ø Neighbourhood " + ((caNeighbourhoodRulesNeighbourhoodTotal/caNeighbourhoodRulesCount).toFixed(2));

        // UNCOMMENT to log Fluid Stiff
        string += "\r\n        FluidMove Count: " + fluidMoveCount + " Ø Size " + ((fluidMoveSizeTotal/fluidMoveCount).toFixed(2)) + " Ø Velocity " + ((fluidMoveVelocityTotal/fluidMoveCount).toFixed(2));
        string += "\r\n        FluidExplosion Count: " + fluidExplosionCount + " Ø Size " + ((fluidExplosionSizeTotal/fluidExplosionCount).toFixed(2)) + " Ø Force " + ((fluidExplosionForceTotal/fluidExplosionCount).toFixed(2));
        string += "\r\n        FluidFlowfield Count: " + fluidFlowfieldCount + " Ø Size " + ((fluidFlowfieldSizeTotal/fluidExplosionCount).toFixed(2)) + " Ø Duration " + ((fluidFlowfieldDurationTotal/fluidExplosionCount).toFixed(2));

        // UNCOMMENT to log all Reaction Results
        string += "\r\n        Particle Reaction Results";
        string += "\r\n        LowestAkin/state |   1 |  -1 |   2 |  -2 |   3 |  -3 |   4 |  -4 |   5 |  -5 |   6 |  -6 |   7 |  -7 |   8 |  -8 |   9 |  -9 |  10 | -10 |  11 | -11 |";
        for (let i = 0; i < particleReactionResults.length; i++) {
            string += "\r\n        " + i + "                |";
            for (let j = 0; j < particleReactionResults[i].length; j++) {
                string += " " + spacePad(particleReactionResults[i][j][0], 3) + " | " + spacePad(particleReactionResults[i][j][1], 3) + " |";
            }
        }

        // string += "\r\n        Shockwave Count: " + shockWaveCount;

        record.push(string);
        exports.record = record;

        logFPS();

        saveFile('_record_', record);
    }
}

exports.saveParticles = saveParticles;

function saveFile(fileName, data) {
    let saveDestination = 'public/data/' + simulation.startHexString + '/';
    let dateString = (simulation.startDate.getFullYear() % 100) + pad((simulation.startDate.getMonth() + 1), 2) + pad(simulation.startDate.getDate(), 2) + pad(simulation.startDate.getHours(), 2) + pad(simulation.startDate.getMinutes(), 2);

    fs.writeFileSync(saveDestination + dateString + fileName + simulation.startHexString + '.txt', data);
}

exports.saveFile = saveFile;

function logFPS() {
    let elapsedTime = Math.floor((Date.now() - simulation.realtimeStart)/1000);
    let fps = simulation.timePassed/elapsedTime;

    let string = "\r\n" + "      " + "  FPS: " + fps.toFixed(4) + " (" + simulation.getCurrentFPS()[0].toFixed(4) + ")";

    record.push(string);
    exports.record = record;

    saveFile('_record_', record);
}

exports.logFPS = logFPS;

function logNewPhase(phase) {
    let phaseNames = ["Start Phase", "ExpandPhase", "EndPhase"];

    let string = "\r\n" + pad(simulation.timePassed, 6) + "  New Phase " + phaseNames[phase - 1];

    record.push(string);
    exports.record = record;

    saveFile('_record_', record);
}

exports.logNewPhase = logNewPhase;

function logBinary(binaryResult) {
    let string = " BinaryResult " + binaryResult;

    record.push(string);

    saveFile('_record_', record);
}

exports.logBinary = logBinary;

function logReaction(particle, center, lowestAkin) {
    let self = particle;

    let string = "\r\n" + pad(simulation.timePassed, 6) + "  Reaction [" + center[0].toFixed(2) + ", " + center[1].toFixed(2) + "]";

    if (self.tmpCalcParticles.length > self.reactionCount) {
        string += " Extra " + self.tmpCalcParticles.length + " of " + self.reactionCount;
    }

    string += " " + self.state + "#" + self.id;

    self.tmpCalcParticles.forEach(function (logParticle) {
        if (logParticle != self) {
            string += " " + logParticle.state  + "#" + logParticle.id;
        }
    });

    record.push(string);

    saveFile('_record_', record);
}

exports.logReaction = logReaction;

function logReactionResult(particle) {
    let string = " =>";

    particle.tmpCalcParticles.forEach(function (tmpCalcParticle) {
        string += " " + tmpCalcParticle.state + "#" + tmpCalcParticle.id;
    });

    let newParticleCount = Math.floor(particle.tmpCalcParticles.length/2);

    for (let i = 0; i < newParticleCount; i++) {
        string += " " + simulation.particles[simulation.particles.length - 1 - i].state + "#" + simulation.particles[simulation.particles.length - 1 - i].id;
    }

    // UNCOMMENT to log the result of a reaction
    // record.push(string);

    saveFile('_record_', record);
}

exports.logReactionResult = logReactionResult;

function saveReactionResults(state, lowestAkin) {
    let stateIndex = state > 0 ? 0 : 1;

    particleReactionResults[lowestAkin][Math.abs(state) - 1][stateIndex]++;
}

exports.saveReactionResults = saveReactionResults;

function logReactionLowestAkin(lowestAkin) {
    let string = " (LowestAkin " + lowestAkin + ")";

    record.push(string);

    saveFile('_record_', record);
}

exports.logReactionLowestAkin = logReactionLowestAkin;

function logExplosion(size, force, count, threshold) {
    let string = "\r\n" + "        " + "Explosion " + "Size " + size.toFixed(2) + " Force " + force.toFixed(2);

    if (count > threshold) {
        string += " " + count + "/" + threshold + " near Particles";
    }

    explosionCount++;
    explosionSizeTotal += size;
    explosionForceTotal += force;

    record.push(string);

    saveFile('_record_', record);
}

exports.logExplosion = logExplosion;

function logMerge(particle) {
    let self = particle;

    let string = "\r\n" + pad(simulation.timePassed, 6) + "  Merge [" + self.pos[0].toFixed(2) + ", " + self.pos[1].toFixed(2) + "] ";

    string+= " " + self.state + "#" + self.id + " |";

    self.tmpCalcParticles.forEach(function (logParticle) {
        if (logParticle != self) {
            string += " " + logParticle.state + "#" + logParticle.id;
        }
    });

    record.push(string);

    saveFile('_record_', record);
}

exports.logMerge = logMerge;

function logCA(center, size, rule, neighbourhood, form) {
    let string =  "\r\n" + "        " + "Cellular Automata pos " + center + " size " + size + " Rule " + rule + " Neighbourhood " + neighbourhood;

    if (form == 0) {
        string += " Form Rect";
    } else if (form == 1) {
        string += " Form Circle";
    }

    caCount++;
    caSizeTotal += size;
    caRuleTotal += rule;
    caNeighbourhoodTotal += neighbourhood;

    record.push(string);

    saveFile('_record_', record);
}

exports.logCA = logCA;

function logCANeighbourhoodRule(center, size, neighbourIndex, ruleIndex, form) {
    let string = "";

    if (form == 0) {
        string += " Rect";
    } else if (form == 1) {
        string += " Circle";
    }

    string += "\r\n" + "      " + "  " + "caNeighbourhood / Rule ";
    string += "Pos " + center + " size " + size + " Neighbours " + caRules.neighbours[neighbourIndex] + " Rule " + caRules.rules[ruleIndex];

    caNeighbourhoodRulesCount++;
    caNeighbourhoodRulesRuleTotal += ruleIndex;
    caNeighbourhoodRulesNeighbourhoodTotal += neighbourIndex;

    record.push(string);

    saveFile('_record_', record);
}

exports.logCANeighbourhoodRule = logCANeighbourhoodRule;

function logCellularAutomataAnimate(center, size, form) {
    let string = "";

    // UNCOMMENT to log all calcParticles
    /*
    string += "\r\n" + "      " + "  " + "caAliveParticles ";
    for (let i = 0; i < particle.tmpCalcParticles.length; i++) {
        if (i != 0) {
            string += "|";
        }
        string += particle.tmpCalcParticles[i].state + "#" + particle.tmpCalcParticles[i].id + "*" + particle.tmpCalcParticles[i].polarity;
    }
    string += " ";
    for (let i = 0; i < particle.tmpCalcParticles.length; i++) {
        if (i != 0) {
            string += "|";
        }
        string += particle.tmpCalcParticles[i].polarity > 0 ? 1 : 0;
    }
    string += " " + size;
    */

    let formString = form == 0 ? "Rectangle" : "Circle";

    string += "\r\n" + "      " + "  " + "caAnimate ";
    string += "Pos " + center + " size " + size + " form " + formString;

    if (caAnimateArray[size] == undefined) {
        caAnimateArray[size] = 1;
    } else {
        caAnimateArray[size]++;
    }

    record.push(string);

    caAnimateCount++;
    caAnimateSizeTotal += size;

    saveFile('_record_', record);    
}

exports.logCellularAutomataAnimate = logCellularAutomataAnimate;

function logTrails(pos) {
    let string = "";

    string += "\r\n" + "      " + "  " + "Trails pos " + pos;

    record.push(string);

    trailCount++;

    saveFile('_record_', record); 
}

exports.logTrails = logTrails;

function logFluidVelocity(size, velocityMag, velocityVector) {
    let string = "\r\n" + "        " + "FluidVeloity Size " + size.toFixed(2) + " Velocity " + velocityMag.toFixed(2) + " Vector (" + velocityVector[0].toFixed(2) + ", " + velocityVector[1].toFixed(2) + ")";

    fluidMoveCount++;
    fluidMoveSizeTotal += size;
    fluidMoveVelocityTotal += velocityMag;

    record.push(string);

    saveFile('_record_', record);
}

exports.logFluidVelocity = logFluidVelocity;

function logFluidExplosion(size, force) {
    let string = "\r\n" + "        " + "FluidExplosion Size " + size + " Force " + force;

    fluidExplosionCount++;
    fluidExplosionSizeTotal += size;
    fluidExplosionForceTotal += force;

    record.push(string);

    saveFile('_record_', record);
}

exports.logFluidExplosion = logFluidExplosion;

/*
function logFluidFlowfield(size, duration, form) {
    let type;
    let shape;

    if (form >= 8) {
        type = "Hourglass";
        shape = Math.round((form - 8)/8.0) == 0 ? "Square" : "Cirlce";
    } else {
        type = "Swirl";
        shape = Math.round(form/8.0) == 0 ? "Square" : "Cirlce";
    }

    let string = "\r\n" + "        " + "FluidFlowfield " + type + " " + shape + " Size " + size + " Duration " + duration;

    fluidFlowfieldCount++;
    fluidFlowfieldSizeTotal += size;
    fluidFlowfieldDurationTotal += duration;

    record.push(string);

    saveFile('_record_', record);
}

exports.logFluidFlowfield = logFluidFlowfield;
*/

// Save all reactions to a file
function saveReactionFile() {
    let allReactionsCount = 0;

    for (let i = 0; i < particleReactionResults.length; i++) {
        for (let j = 0; j < particleReactionResults[i].length; j++) {
            allReactionsCount += particleReactionResults[i][j][0];
            allReactionsCount += particleReactionResults[i][j][1];
        }
    }

    let string = "Particle Reaction Results";
    string += "\r\nLowestAkin/state |     1 |    -1 |     2 |    -2 |     3 |    -3 |     4 |    -4 |     5 |    -5 |     6 |    -6 |     7 |    -7 |     8 |    -8 |     9 |    -9 |    10 |   -10 |    11 |   -11 |";
    for (let i = 0; i < particleReactionResults.length; i++) {
        string += "\r\n" + i + "                |";
        for (let j = 0; j < particleReactionResults[i].length; j++) {
            string += " " + spacePad(((particleReactionResults[i][j][0]/allReactionsCount) * 100).toFixed(1) + '%', 5) + " | " + spacePad(((particleReactionResults[i][j][1]/allReactionsCount) * 100).toFixed(1) + '%', 5) + " |";
        }
    }

    string += "\r\nParticle Reaction Results";
    string += "\r\nLowestAkin/state |   1 |  -1 |   2 |  -2 |   3 |  -3 |   4 |  -4 |   5 |  -5 |   6 |  -6 |   7 |  -7 |   8 |  -8 |   9 |  -9 |  10 | -10 |  11 | -11 |";
    for (let i = 0; i < particleReactionResults.length; i++) {
        string += "\r\n" + i + "                |";
        for (let j = 0; j < particleReactionResults[i].length; j++) {
            string += " " + spacePad(particleReactionResults[i][j][0], 3) + " | " + spacePad(particleReactionResults[i][j][1], 3) + " |";
        }
    }

    string += "\r\n";   
    string += "\r\nTotal Reactions " + allReactionsCount;

    saveFile('_reactionStatistics_', string);
}

exports.saveReactionFile = saveReactionFile;

// Add leading zeros
function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}

// Add leading spaces
function spacePad(num, size) {
    var s = "                                        " + num;
    return s.substr(s.length - size);
}

// Add subsequent spaces
function subsequentSpaces(num, size) {
    var s = num + "                                        ";
    return s.substr(0, size);
}