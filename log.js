// MODULES
var fs = require("fs");
var math = require("mathjs");

// MY MODULES
const simulation = require("./simulation.js");
const fluid = require("./fluid.js");
const caRules = require("./cellularautomatarules.js");
const particle = require("./particle.js");
const particlerules = require("./particlerules.js");
const effects = require("./effects.js");

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

let lineTrailCount = 0;
let linePolygonCount = 0;

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

let swirlCount = 0;

exports.caCount = caCount;
exports.caAnimateCount = caAnimateCount;
exports.caNeighbourhoodRulesCount = caNeighbourhoodRulesCount;
exports.fluidMoveCount = fluidMoveCount;
exports.fluidExplosionCount = fluidExplosionCount;
exports.fluidFlowfieldCount = fluidFlowfieldCount;
exports.lineTrailCount = lineTrailCount;
exports.linePolygonCount = linePolygonCount;
exports.shockWaveCount = shockWaveCount;
exports.swirlCount = swirlCount;

function reset() {
    record = [];

    particleReactionResults = [];

    explosionCount = 0;
    explosionSizeTotal = 0;
    explosionForceTotal = 0;

    caCount = 0;
    caSizeTotal = 0;
    caRuleTotal = 0;
    caNeighbourhoodTotal = 0;
    caAnimateCount = 0;
    caAnimateSizeTotal = 0;
    caNeighbourhoodRulesCount = 0;
    caNeighbourhoodRulesRuleTotal = 0;
    caNeighbourhoodRulesNeighbourhoodTotal = 0;
    caAnimateArray = [];

    lineTrailCount = 0;
    linePolygonCount = 0;

    fluidMoveCount = 0;
    fluidMoveSizeTotal = 0;
    fluidMoveVelocityTotal = 0;
    fluidExplosionCount = 0;
    fluidExplosionSizeTotal = 0;
    fluidExplosionForceTotal = 0;
    fluidFlowfieldCount = 0;
    fluidFlowfieldSizeTotal = 0;
    fluidFlowfieldDurationTotal = 0;

    shockWaveCount = 0;
}

exports.reset = reset;

function logBaseSettings() {
    let settingsString = "";

    // UNCOMMENT to log some info
    settingsString += "\r\n" + "Info";
    settingsString += "\r\n" + "  Balance Phase now at 9600 instead of 11520. Balance threshold now at 660 instead of 800";
    settingsString += "\r\n" + "  Balance Phase Mass Reduction/Increase now mass/1.6 instead of mass/1.8 times balanceMulti.";
    settingsString += "\r\n" + "  Balance Phase now also increases/decreases reaction and mergeCount. +/- Divided by 2.5 times round(balanceMulti)";
    // settingsString += "\r\n" + "  Balance Phase now also increases/decreases explosionMultiplicator. +/- balanceMulti/2";
    settingsString += "\r\n" + "  Swirl Fluid Particle Radius is divided by 2 and particlerules changed (deleted some fluidmove effects) to decrease saved data size.";
    settingsString += "\r\n" + "  Reduced size of CAs and made it relevant to timePassed";
    settingsString += "\r\n" + "  Save all Freq changed to 1920 from 960";
    settingsString += "\r\n" + " ";

    settingsString += "\r\n" + "General Settings / Data";
    // Start Settings
    settingsString += "\r\n" + "  Date " + simulation.startDate;

    if (simulation.startHexString != undefined) {
        settingsString += "\r\n" + "  StartHexString " + simulation.startHexString;
        settingsString += "\r\n" + "  StartBinString " + simulation.startBitString;
        settingsString += "\r\n" + "  StartParticleCount " + simulation.startBitString.length;
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
        settingsString += subsequentSpaces(simulation.particleVals[i - 1]['gravRadius'], 11);
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
    settingsString += "\r\n" + "    " + "Lowest Akin / State | 1   | -1  | 2   | -2  | 3   | -3  | 4   | -4  | 5   | -5  | 6   | -6  | 7   | -7  | 8   | -8  | 9   | -9  | 10  | -10 | 11  | -11";
    for (let i = 0; i < simulation.stateMax - 1; i++) {
        settingsString += "\r\n" + "    ";
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

    // Particle Explosions
    settingsString += "  " + "Particle Explosion Multiplicator";
    settingsString += "\r\n" + "    " + "Near Particle Radius " + particle.nearParticleRadius;
    settingsString += "\r\n" + "    " + "Near Particle Threshold " + particle.nearParticleCountThreshold;
    settingsString += "\r\n" + "    " + "Explosion Multiplicator " + simulation.particleExplosionMultiplicator;
    // settingsString += "\r\n" + "    " + "Same State Multiplicator " + particle.sameStateMultiplicator;
    // settingsString += "\r\n" + "    " + "Different State Multiplicator " + particle.diffStateMultiplicator;

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

    // Cellular Automata Complete
    settingsString += "CA Complete Values";
    settingsString += "  " + "Size Base " + particle.cellularAutomataSize[0] + " Increase " + particle.cellularAutomataSize[1];
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
    let baseFluidParticles = simulation.fluidTree.contentParticles([simulation.fluidCellResolution / 2, simulation.fluidCellResolution / 2], simulation.fluidCellRadius, 0).length;
    settingsString += "\r\n" + "  " + "BaseFluidParticles (Radius " + simulation.fluidCellRadius + ") " + baseFluidParticles;
    settingsString += "\r\n";

    // Fluid Swirl Data
    settingsString += "\r\n" + "Fluid Swirl Data";
    settingsString += "\r\n" + "  " + "SwirlVelocityMaxAbsReduceBase " + particle.swirlVelocityMaxAbsReduceBase;
    settingsString += "\r\n" + "  " + "SwirlForceBase " + effects.swirlForceBase;
    settingsString += "\r\n" + "  " + "SwirlRadiusBase " + particle.swirlRadiusBase;

    // Cellular Automata Data
    settingsString += "\r\n" + "CellularAutomata Data";
    settingsString += "\r\n" + "  " + "Resolution " + simulation.caResolution;

    settingsString += "\r\n" + "  " + "Set Variables";
    settingsString += "\r\n" + "  " + "  FluidParticleRadius " + particle.caRuleParticleRadius;
    settingsString += "\r\n";

    // Quadtree Settings
    settingsString += "\r\n" + "Quad Tree";
    settingsString += "\r\n" + "  " + "Fluid Particle Capacity " + simulation.fluidQuadtreeCapacity;

    // Timing Settings
    let timingNames = ['BalancePhase', 'EndPhase'];
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

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logBaseSettings = logBaseSettings;

function saveParticles(freq) {
    if (simulation.timePassed % freq == 0) {
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

            polarity[(particle.polarity / 2) + .5]++;
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

        string += "\r\n        Explosion Count " + explosionCount + " Ø Size " + (explosionSizeTotal / explosionCount).toFixed(2) + " Ø Force " + (explosionForceTotal / explosionCount).toFixed(2);


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

        // UNCOMMENT to log Fluid Stiff
        string += "\r\n        FluidMove Count: " + fluidMoveCount + " Ø Size " + ((fluidMoveSizeTotal / fluidMoveCount).toFixed(2)) + " Ø Velocity " + ((fluidMoveVelocityTotal / fluidMoveCount).toFixed(2));
        string += "\r\n        FluidExplosion Count: " + fluidExplosionCount + " Ø Size " + ((fluidExplosionSizeTotal / fluidExplosionCount).toFixed(2)) + " Ø Force " + ((fluidExplosionForceTotal / fluidExplosionCount).toFixed(2));

        // UNCOMMENT to log Cellular Automatas Stuff
        string += "\r\n        CA Count: " + caCount + " Ø Size " + ((caSizeTotal / caCount).toFixed(2)) + " Ø Rule " + ((caRuleTotal / caCount).toFixed(2)) + " Ø Neighbourhood " + ((caNeighbourhoodTotal / caCount).toFixed(2));

        // UNCOMMENT to log lines (trails, polygons) stuff
        string += "\r\n        Line Trails Count: " + lineTrailCount;

        // UNCOMMENT zo log swirl Count
        string += "\r\n        Swirl Count: " + swirlCount;

        // UNCOMMENT to log all Reaction Results
        string += "\r\n        Particle Reaction Results";
        string += "\r\n        LowestAkin/state |   1 |  -1 |   2 |  -2 |   3 |  -3 |   4 |  -4 |   5 |  -5 |   6 |  -6 |   7 |  -7 |   8 |  -8 |   9 |  -9 |  10 | -10 |  11 | -11 |";
        for (let i = 0; i < particleReactionResults.length; i++) {
            string += "\r\n        " + i + "                |";
            for (let j = 0; j < particleReactionResults[i].length; j++) {
                string += " " + spacePad(particleReactionResults[i][j][0], 3) + " | " + spacePad(particleReactionResults[i][j][1], 3) + " |";
            }
        }

        string += "\r\n        Shockwave Count: " + shockWaveCount;

        record.push(string);
        exports.record = record;

        logFPS();

        saveFile('_record_' + simulation.startHexString + '.txt', record);
    }
}

exports.saveParticles = saveParticles;

function saveFile(fileName, data) {
    let saveDestination = 'public/' + simulation.startHexString + '/log/';
    // let dateString = (simulation.startDate.getFullYear() % 100) + pad((simulation.startDate.getMonth() + 1), 2) + pad(simulation.startDate.getDate(), 2) + pad(simulation.startDate.getHours(), 2) + pad(simulation.startDate.getMinutes(), 2);

    fs.writeFileSync(saveDestination + fileName, data);
}

exports.saveFile = saveFile;

function logFPS() {
    let elapsedTime = Math.floor((Date.now() - simulation.realtimeStart) / 1000);
    let fps = simulation.timePassed / elapsedTime;

    let string = "\r\n" + "      " + "  FPS: " + fps.toFixed(4) + " (" + simulation.getCurrentFPS()[0].toFixed(4) + ")";

    record.push(string);
    exports.record = record;

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logFPS = logFPS;

function logNewPhase(phase) {
    let phaseNames = ["Start Phase", "ExpandPhase", "EndPhase"];

    let string = "\r\n" + pad(simulation.timePassed, 6) + "  New Phase " + phaseNames[phase];

    record.push(string);
    exports.record = record;

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logNewPhase = logNewPhase;

function logBalancePhase(particleCount, particleThreshold, balanceMulti, massPrev, massNew, reactionCountPrev, reactionCountNew, mergeCountPrev, mergeCountNew/*, particleExplosionMultiPrev, particleExplosionMultiNew*/) {
    let string = "\r\n" + "        " + "Balance Phase ParticleCount " + particleCount + " Threshold " + particleThreshold + " Resulting Multiplicator " + balanceMulti;

    /*
    if (balanceMulti > 0) {
        string += "\r\n" + "        " + "Mass Reduction Before/After";
    } else {
        string += "\r\n" + "        " + "Mass Increase Before/After";
    }

    for (let i = 0; i < simulation.particleVals.length; i++) {
        string += "\r\n" + "        " + "State " + i + " " + massPrev[i] + "/" + massNew[i];
    }
    */

    string += "\r\n" + "        " + "Particle Vals Change (Before/After)";

    string += "\r\n" + "        " + "State | Mass             | ReactionCount | MergeCount";

    for (let i = 0; i < simulation.particleVals.length; i++) {
        string += "\r\n" + "        " + subsequentSpaces(i + 1, 5) + " | " + subsequentSpaces((massPrev[i] + "/" + massNew[i]), 16) + " | " + subsequentSpaces(reactionCountPrev[i] + "/" + reactionCountNew[i], 13) + " | " + mergeCountPrev[i] + "/" + mergeCountNew[i];
    }

    // string += "\r\n" + "        " + "ParticleExplosionMuliplicator (Before/After) " + particleExplosionMultiPrev + "/" + particleExplosionMultiNew;

    record.push(string);
    exports.record = record;

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logBalancePhase = logBalancePhase;

function logBinary(binaryResult) {
    let string = " BinaryResult " + binaryResult;

    record.push(string);

    saveFile('_record_' + simulation.startHexString + '.txt', record);
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
            string += " " + logParticle.state + "#" + logParticle.id;
        }
    });

    record.push(string);

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logReaction = logReaction;

function logReactionResult(particle) {
    let string = " =>";

    particle.tmpCalcParticles.forEach(function (tmpCalcParticle) {
        string += " " + tmpCalcParticle.state + "#" + tmpCalcParticle.id;
    });

    let newParticleCount = Math.floor(particle.tmpCalcParticles.length / 2);

    for (let i = 0; i < newParticleCount; i++) {
        string += " " + simulation.particles[simulation.particles.length - 1 - i].state + "#" + simulation.particles[simulation.particles.length - 1 - i].id;
    }

    // UNCOMMENT to log the result of a reaction
    // record.push(string);

    saveFile('_record_' + simulation.startHexString + '.txt', record);
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

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logReactionLowestAkin = logReactionLowestAkin;

function logExplosion(size, force, count, threshold) {
    let string = "\r\n" + "        " + "New Explosion " + "Size " + size.toFixed(2) + " Force " + force.toFixed(2);

    if (count > threshold) {
        string += " " + count + "/" + threshold + " near Particles";
    }

    explosionCount++;
    explosionSizeTotal += size;
    explosionForceTotal += force;

    record.push(string);

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logExplosion = logExplosion;

function logMerge(particle) {
    let self = particle;

    let string = "\r\n" + pad(simulation.timePassed, 6) + "  Merge [" + self.pos[0].toFixed(2) + ", " + self.pos[1].toFixed(2) + "] ";

    string += " " + self.state + "#" + self.id + " |";

    self.tmpCalcParticles.forEach(function (logParticle) {
        if (logParticle != self) {
            string += " " + logParticle.state + "#" + logParticle.id;
        }
    });

    record.push(string);

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logMerge = logMerge;

// ////////////////////////////// RESULTS //////////////////////////////

// ////////////////////////////// Fluid

function logFluidVelocity(size, velocityMag, velocityVector) {
    let string = "\r\n" + "        " + "New FluidVeloity Size " + size.toFixed(2) + " Velocity " + velocityMag.toFixed(2) + " Vector (" + velocityVector[0].toFixed(2) + ", " + velocityVector[1].toFixed(2) + ")";

    fluidMoveCount++;
    fluidMoveSizeTotal += size;
    fluidMoveVelocityTotal += velocityMag;

    record.push(string);

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logFluidVelocity = logFluidVelocity;

function logFluidExplosion(size, force) {
    let string = "\r\n" + "        " + "New FluidExplosion Size " + size + " Force " + force;

    fluidExplosionCount++;
    fluidExplosionSizeTotal += size;
    fluidExplosionForceTotal += force;

    record.push(string);

    saveFile('_record_' + simulation.startHexString + '.txt', record);
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

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logFluidFlowfield = logFluidFlowfield;
*/

// ////////////////////////////// Cellular Automata

function logCA(center, size, rule, neighbourhood, form) {
    let string = "\r\n" + "        " + "New Cellular Automata pos " + center + " size " + size + " Rule " + rule + " Neighbourhood " + neighbourhood;

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

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logCA = logCA;

// ////////////////////////////// Lines (Polygons and Trails)

function logLineTrails(center, size, duration) {
    let string = "";

    string += "\r\n" + "      " + "  " + "New Trails center " + center + " size " + size + " duration " + duration;

    record.push(string);

    lineTrailCount++;

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logLineTrails = logLineTrails;


// ////////////////////////////// Shockwaves

function logShockwave(center, strength) {
    let string = "\r\n" + "      " + "  " + "New Shockwave center " + center + " strength " + strength;

    record.push(string);

    shockWaveCount++;

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logShockwave = logShockwave;

// ////////////////////////////// Swirls

function logSwirl(center, radius, direction, particleType) {
    let string = "";

    string += "\r\n" + "      " + "  " + "New Swirl center " + center + " radius " + radius + " direction " + direction + " " + particleType;

    record.push(string);

    swirlCount++;

    saveFile('_record_' + simulation.startHexString + '.txt', record);
}

exports.logSwirl = logSwirl;

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
            string += " " + spacePad(((particleReactionResults[i][j][0] / allReactionsCount) * 100).toFixed(1) + '%', 5) + " | " + spacePad(((particleReactionResults[i][j][1] / allReactionsCount) * 100).toFixed(1) + '%', 5) + " |";
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

    saveFile('_reactionStatistics_' + simulation.startHexString + '.txt', string);
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