// MODULES
var math = require("mathjs");
var fs = require("fs");

// MY MODULES
const server = require("./server.js");
const quadtree = require("./quadtree.js");
const particle = require("./particle.js");
const fluid = require("./fluid.js");
const ca = require("./cellularautomata.js");
const caRules = require("./cellularautomatarules.js");
const geometric = require("./geometric.js");
const effects = require("./effects.js");
const data = require("./data.js");
const log = require("./log.js");

// PERFORMANCE
const { GPU } = require('gpu.js');
const gpu = new GPU();

// VARIABLES
// 10m / 24 fps => 14400
// 15m / 24 fps => 21600

let simulate = false;
/*
let timeEnd = 14400;
let timeSteps = [0, 8640, 11520];

let timeEnd = 17280;
let timeSteps = [0, 11520, 14400];
*/

let timeEnd = 7200;
let timeSteps = [0, 7200, 7200];

let fieldWidth = 768;
let logData = true;
// Particle Values
const stateMax = 12;
const gravConstant = 0.39;
const particleQuadtreeCapacity = 1;
let particleExplosionMultiplicator;
// Fluid Values
const fluidResolution = 8;
const fluidParticleSpeedReduction = .8;
// FluidCells Values
const simulateFluidCells = true;
const fluidCellResolution = 8; // Must be multiply or the same as fluidResolution
const fluidCellRadius = 28;
const fluidCellMaxCount = 127;
// Cellular Automata Values
const caResolution = 3;
const caFreq = 2;
// Quadtree
const fluidQuadtreeCapacity = 16;

exports.logData = logData;
exports.simulate = simulate;

exports.fieldWidth = fieldWidth;
exports.stateMax = stateMax;
exports.gravConstant = gravConstant;
exports.particleExplosionMultiplicator = particleExplosionMultiplicator;
exports.fluidResolution = fluidResolution;
exports.fluidParticleSpeedReduction = fluidParticleSpeedReduction;
exports.simulateFluidCells = simulateFluidCells;
exports.fluidCellResolution = fluidCellResolution;
exports.fluidCellRadius = fluidCellRadius;
exports.fluidCellMaxCount = fluidCellMaxCount;
exports.caResolution = caResolution;
exports.caFreq = caFreq;
exports.fluidQuadtreeCapacity = fluidQuadtreeCapacity;

// Timing
exports.timeEnd = timeEnd;
let realtimeStart = Date.now();
exports.realtimeStart = realtimeStart;
// let timeSteps = [0, 1200, 2400];
exports.timeSteps = timeSteps;
let phase = 0;
exports.phase = phase;

// ////////// PARTICLES
let startBinString = '';
let startHexString;
exports.startHexString = startHexString;
let startDate;
exports.startDate = startDate;

let particles = [];
let particleStats = [];

// Particle Vals
let particleVelocityMaxAbs = .6;
exports.particleVelocityMaxAbs = particleVelocityMaxAbs;

let explosions = [];
exports.explosions = explosions;

// Quadtree
let tree;

// Data Object
let particleData = [];
let fluidData = [];
let tmpFluidData = [];
let preFluidData = [];
let fluidCellData = [];
let lineTrailData = [];
let linePolygonData = [];
let shockwaveData = [];
let decimals = 1;

exports.lineTrailData = lineTrailData;
exports.linePolygonData = linePolygonData;
exports.shockwaveData = shockwaveData;
exports.decimals = decimals;

// FPS
let prevTime = 0;
let prevFrames = 0;
let fps = 0;
exports.fps = fps;

// Fluid
let fluidTree;
exports.fluidTree = fluidTree;

// Particle
let particleVals = require('./particlevals.json');
const Particle = require("./particle.js");
exports.particleVals = particleVals;

// Cellular Automata
let caRuleCount = caRules.rules.length;
let caCurrentRule = caRules.rules.length - 1;

// ////////////////////////////// SETUP

function setup() {

	console.log(gpuSqrt([3768]));




	// PARTICLES
	effects.explosionSetup();

	startPosition();

	exports.particles = particles;

	// Upadte Particle Statistics
	particleStats = gatherParticleInfo();
	exports.particleStats = particleStats;

	tree = new quadtree([fieldWidth / 2, fieldWidth / 2], fieldWidth, particleQuadtreeCapacity, particles);
	exports.tree = tree;

	// FLUID
	fluid.initParticles();
	exports.fluid = fluid;

	fluidTree = new quadtree([fieldWidth / 2, fieldWidth / 2], fieldWidth, fluidQuadtreeCapacity, fluid.particles);
	exports.fluidTree = fluidTree;

	fluid.initFluidCells();

	// CELLULAR AUTOMATA
	ca.init();

	startDate = new Date();
	exports.startDate = startDate;

	if (simulate) {
		saveSetupData();

		if (logData) {
			log.logBaseSettings();
		}
	}
}

exports.setup = setup;









const gpuSqrt = gpu.createKernel(function(x) {
	let result = math.sqrt(x[0]);

	return result;
}).setOutput([100]);







function startPosition() {
	startStateVals = [];

	let state = 1;

	let radiParticleCount = [4, 8, 16];
	let radiSize = 1;

	for (let i = 0; i < radiParticleCount.length; i++) {
		let radius = radiSize * (i + 1);
		let angleStep = (Math.PI * 2) / radiParticleCount[i];

		for (let j = 0; j < radiParticleCount[i]; j++) {
			let tmpAngle = angleStep * j;

			let pos = [fieldWidth / 2 + radius * 2 * Math.sin(tmpAngle), fieldWidth / 2 + radius * 2 * Math.cos(tmpAngle)];
			let moveDir = [pos[0] - fieldWidth / 2, pos[1] - fieldWidth / 2];
			moveDir = geometric.setMag(moveDir, math.max(geometric.mag(moveDir), 1));

			particles.push(new particle(pos, moveDir, state, 0, particles.length));
		}
	}

	// Set Start Binary String
	for (let i = 0; i < particles.length; i++) {
		// UNCOMMENT for Ordered Start Position
		/*
		if (i % 2 == 1) {
			startBinString += '0';
		} else {
			startBinString += '1';
		}
		*/

		// UNCOMMENT for Unordered Start Position
		startBinString += Math.round(Math.random());

		// UNCOMMENT to add just one kind of value
		// startBinString += '1';
	}

	// PERFORMANCE testString
	// startBinString = '0000000000000000000000000001';




	// Set Start Vals
	for (let i = 0; i < particles.length; i++) {

		if (startBinString.charAt(i) == '0') {
			particles[i].state = -1;
			particles[i].updateVals();
		}

		particles[i].polarity = particles[i].state < 0 ? 1 : -1;
	}

	// Set Explosion Multiplicator
	/*
		Substract the count of particles of the the two states, and determine a value according to the result between .1 (Different states) to .4 (all same states)
	*/
	let positiveStateCount = 0;
	let negativeStateCount = 0;

	for (let i = 0; i < startBinString.length; i++) {
		if (startBinString.charAt(i) == '0') {
			negativeStateCount++;
		} else {
			positiveStateCount++;
		}
	}

	particleExplosionMultiplicator = .1 + (Math.abs(positiveStateCount - negativeStateCount)/particles.length) * .3;
	exports.particleExplosionMultiplicator = particleExplosionMultiplicator;

	startHexString = parseInt(startBinString, 2).toString(36);
	exports.startBinString = startBinString;
	exports.startHexString = startHexString;
}

// Save Setup Data to JSON
function saveSetupData() {
	let tmpData = {
		'startIDHex': startHexString,
		'startDate': startDate,
		'fieldWidth': fieldWidth,
		'timeEnd': timeEnd,
		'saveFreq': data.saveFreq,
		'fluidParticleCount': fluid.particleCount,
		'fluidCellResolution': fluidCellResolution,
		'fluidCellBaseParticleCount': fluid.fluidCellBaseParticleCount,
		'caResolution': caResolution,
		'caFreq': caFreq,
		'endPhaseTime': timeSteps[timeSteps.length - 1],
		'particleMaxState': stateMax
	}

	tmpData = JSON.stringify(tmpData);

	let dir = 'public/' + startHexString;
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	// Create 'data'-Folder and project-folder if it doesnt exits yet
	let dataDir = dir + '/data/';
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir);
	}

	fs.writeFileSync(dataDir + '/setup.json', tmpData);

	initData();
}

// ////////////////////////////// LOOP

let timePassed = 1;
exports.timePassed = timePassed;

function draw() {
	if (simulate) {
		while (timePassed < timeEnd) {
			gatherData();

			// Print process to console
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			if (timePassed % 2 == 0) {
				process.stdout.write('/ ' + timePassed);
			} else {
				process.stdout.write('\\ ' + timePassed);
			}

			for (let i = explosions.length - 1; i >= 0; i--) {
				explosions[i].draw();

				if (explosions[i].kill) {
					explosions.splice(i, 1);
				}
			}

			// Particles update
			for (let i = 0; i < 5; i++) {
				particles.forEach(function (particle) {
					particleAction(particle, i);
				});
			}

			for (let i = particles.length - 1; i >= 0; i--) {
				if (particles[i].dead) {
					particles.splice(i, 1);
				}
			}

			exports.particles = particles;

			updateQuadtree();

			// Fluid update
			fluid.draw();
			exports.fluid = fluid;

			fluidTree = new quadtree([fieldWidth / 2, fieldWidth / 2], fieldWidth, fluidQuadtreeCapacity, fluid.particles);
			exports.fluidTree = fluidTree;

			// Cellular Automata update
			if (timePassed % caFreq == 0) {
				ca.update();
			}

			// Update Line Effects
			effects.updateLineTrails();

			// Update phase
			for (let i = 0; i < timeSteps.length; i++) {
				if (timePassed == timeSteps[i]) {
					phase = i;

					// Init End Phase
					if (phase == timeSteps.length - 1) {
						log.saveReactionFile();
					}

					if (logData) {
						log.logNewPhase(phase);
					}
				}
			}
			exports.phase = phase;

			// End Phase
			if (phase == timeSteps.length - 1) {
				endPhase();
			}

			// Update Particle Statistics
			particleStats = gatherParticleInfo();
			exports.particleStats = particleStats;

			timePassed++;
			exports.timePassed = timePassed;

			if (logData) {
				// Log Particle Data
				log.saveParticles(60);
			}
		}

		if (timePassed >= timeEnd) {
			gatherData();

			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			console.log("Simulation end at " + timePassed + ". Total Time: " + Math.floor((Date.now() - realtimeStart) / 60000) + "m " + Math.floor((Date.now() - realtimeStart) % 60) + "s");
		}
	}
};

function updateQuadtree() {
	tree = new quadtree([fieldWidth / 2, fieldWidth / 2], fieldWidth, particleQuadtreeCapacity, particles);
	exports.tree = tree;
}

exports.updateQuadtree = updateQuadtree;

exports.draw = draw;

function particleAction(particle, type) {
	if (!particle.merged) {
		if (type == 0) {
			particle.calcGrav();
		} else if (type == 1) {
			// Dont calculate Reactions or merge in the last phase
			if (phase < 2) {
				if (!particle.calced) {
					particle.calc();
				}
			}
		} else if (type == 2) {
			// Dont execute Reactions or merge in the last phase
			if (phase < 2) {
				particle.action();
			}
		} else if (type == 3) {
			particle.move();
		}
	}
	if (type == 4) {
		particle.reset();
	}
}

// ////////////////////////////// PHASES

let totalTimeEndPhase = (timeEnd - timeSteps[timeSteps.length - 1]) - 60;
let fluidParticleMaxVelocityReduce = fluid.maxVelocity / totalTimeEndPhase;
let velocityMaxAbsReduce = particleVelocityMaxAbs / totalTimeEndPhase;

function endPhase() {
	// Slow all particles down
	particles.forEach(function (particle) {
		if (particle.velocityMaxAbs > 0) {
			particle.velocityMaxAbs -= velocityMaxAbsReduce;
		} else if (particle.velocityMaxAbs < 0) {
			particle.velocityMaxAbs = 0;
		}
	});

	// Slow all fluid particles down
	fluid.reduceFluidParticleMaxVelocity(fluidParticleMaxVelocityReduce);

	// Decrease Rule of CA
	let ruleDecreaseFreq = Math.floor((timeEnd - timeSteps[timeSteps.length - 1]) / caRuleCount);

	if ((timePassed - timeSteps[timeSteps.length - 1]) % ruleDecreaseFreq == 0) {
		if (caCurrentRule > 0) {
			caCurrentRule--;
		}

		for (let i = 0; i < ca.cells.length; i++) {
			for (let j = 0; j < ca.cells[i].length; j++) {
				if (ca.cells[i][j].ruleIndex > caCurrentRule) {
					ca.updateRule(ca.cells[i][j], caCurrentRule);
				}
			}
		}
	}

	// Decrease all fluid Cells
	let fluidCellDecreaseFreq = Math.floor((timeEnd - timeSteps[timeSteps.length - 1]) / (fluidCellMaxCount - fluid.fluidCellBaseParticleCount));
	let fluidCellIncreaseFreq = Math.floor((timeEnd - timeSteps[timeSteps.length - 1]) / fluid.fluidCellBaseParticleCount);

	if ((timePassed - timeSteps[timeSteps.length - 1]) % fluidCellDecreaseFreq == 0) {
		for (let i = 0; i < fluid.fluidCells.length; i++) {
			if (fluid.fluidCells[i][0] > fluid.fluidCellBaseParticleCount && fluid.fluidCells[i][0] < (fluidCellMaxCount - 7)) {
				fluid.fluidCells[i][0]--;
			}
		}
	}

	if ((timePassed - timeSteps[timeSteps.length - 1]) % fluidCellIncreaseFreq == 0) {
		for (let i = 0; i < fluid.fluidCells.length; i++) {
			if (fluid.fluidCells[i][0] < fluid.fluidCellBaseParticleCount) {
				fluid.fluidCells[i][0]++;
			}
		}
	}
}

// ////////////////////////////// DATA

function initData() {
	let dir = 'public/' + startHexString + '/';
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	fs.copyFile('public/template.html', 'public/' + startHexString + '/index.html', (err) => {
		if (err) throw err;
		// console.log('source.txt was copied to destination.txt');
	});
}

function gatherData() {
	// Save Data
	particleData = [];
	particles.forEach(function (particle) {
		if (!particle.merged) {
			let tmpData = [];

			tmpData.push(parseFloat(particle.pos[0].toFixed(decimals)));
			tmpData.push(parseFloat(particle.pos[1].toFixed(decimals)));
			tmpData.push(particle.state);
			tmpData.push(particle.mergedParticles.length);

			particleData.push(tmpData);
		}
	})

	// Gather Fluid Data
	fluidData = [];

	for (let i = 0; i < fluid.particles.length; i++) {
		let index = fluid.particles[i].index;

		fluidData.push(index);
		fluidData.push(parseFloat(fluid.particles[i].pos[0].toFixed(decimals)));
		fluidData.push(parseFloat(fluid.particles[i].pos[1].toFixed(decimals)));
	}

	tmpFluidData = [];

	if (timePassed > 0) {
		tmpFluidData = Array.from(compareFluidArray(fluidData, preFluidData));
	} else {
		tmpFluidData = Array.from(fluidData);
	}

	preFluidData = Array.from(fluidData);

	// Gather Fluid Cell Data
	fluidCellData = [];

	fluidCellData = Array.from(fluid.fluidCellData);

	// Gather Cellular Automata Data
	let tmpCellularAutmataData = ca.getChangedCells();

	data.addData(particleData, tmpFluidData, fluidCellData, tmpCellularAutmataData, lineTrailData);

	// Reset trails Data
	lineTrailData = [];
	exports.lineTrailData = lineTrailData;

	// Reset shockwave Data
	shockwaveData = [];
	exports.shockwaveData = shockwaveData;

	// Save JSON Files
	if (((timePassed) % data.saveFreq == 0 && timePassed != 0) || timePassed >= timeEnd) {
		let saveIndex = ((timePassed) / data.saveFreq - 1);

		data.save(saveIndex);

		process.stdout.clearLine();
		process.stdout.cursorTo(0);

		let realTimePassed = Math.floor(Math.floor((Date.now() - realtimeStart) / 60000) / 60) + "h " + (Math.floor((Date.now() - realtimeStart) / 60000) % 60) + "m " + (Math.floor((Date.now() - realtimeStart) / 1000) % 60) + "s " + ((Date.now() - realtimeStart) % 1000) + "ms";
		let elapsedTime = Math.floor((Date.now() - realtimeStart) / 1000) - prevTime;
		fps = data.saveFreq / elapsedTime;
		exports.fps = fps;

		prevTime = Math.floor((Date.now() - realtimeStart) / 1000);

		let timeLeft = (timeEnd - timePassed) / fps;

		let saveString = "Saved."
		saveString += " Time " + timePassed + "/" + timeEnd + " (" + data.saveFreq + ").";
		saveString += " Realtime " + realTimePassed + " FPS " + fps.toFixed(2);
		saveString += " RemainingTime " + Math.floor(timeLeft / 3600) + "h " + (Math.floor(timeLeft / 60) % 60) + "m " + Math.floor(timeLeft % 60) + "s";

		console.log(saveString);

		// console.log("Memory Used", process.memoryUsage());
	}
}

let getCurrentFPSPrevTime = 0;

function getCurrentFPS() {
	let elapsedTime = Math.floor((Date.now() - realtimeStart) / 1000) - getCurrentFPSPrevTime;
	let elapsedFrames = timePassed - prevFrames;

	let currentFPS = elapsedFrames / elapsedTime;

	getCurrentFPSPrevTime = Math.floor((Date.now() - realtimeStart) / 1000);
	prevFrames = timePassed;

	return [currentFPS, elapsedFrames];
}

exports.getCurrentFPS = getCurrentFPS;

function compareFluidArray(_RawData, _PreRawData) {
	let data = Array.from(_RawData);
	let preData = Array.from(_PreRawData);
	let tmpData = [];

	for (let i = 0; i < data.length / 3; i++) {
		let dataChanged = false;

		if (data[i * 3 + 1] !== preData[i * 3 + 1] || data[i * 3 + 2] !== preData[i * 3 + 2]) {
			dataChanged = true;
		}

		if (dataChanged) {
			let tmpDataObject = [];

			for (let j = 0; j < data[i].length; j++) {
				tmpDataObject.push(data[i][j]);
			}

			tmpData.push(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
		}
	}

	return tmpData;
}

function gatherParticleInfo() {
	let particleValsPositiv = [];
	let particleValsNegativ = [];

	for (let i = 0; i < stateMax; i++) {
		particleValsPositiv.push(0);
		particleValsNegativ.push(0);
	}

	for (let i = 0; i < particles.length; i++) {
		if (particles[i].state > 0) {
			particleValsPositiv[particles[i].state - 1]++;
		} else {
			particleValsNegativ[math.abs(particles[i].state) - 1]++;
		}
	}

	return [particleValsPositiv, particleValsNegativ];
}

exports.gatherParticleInfo = gatherParticleInfo;

function round(_Val) {
	return math.round(_Val * 100) / 100;
}