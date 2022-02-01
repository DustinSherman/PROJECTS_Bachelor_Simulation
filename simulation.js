// MODULES
var math = require("mathjs");
var fs = require("fs");

// MY MODULES
const quadtree = require("./quadtree.js");
const particle = require("./particle.js");
const fluid = require("./fluid.js");
const ca = require("./cellularautomata.js");
const caRules = require("./cellularautomatarules.js");
const geometric = require("./geometric.js");
const effects = require("./effects.js");
const data = require("./data.js");
const log = require("./log.js");

// VARIABLES
// 12m / 24fps => 17280

let timeEnd = 17280;
let timePassed = 0;
exports.timePassed = timePassed;
let timeSteps = [0, 9600, 14400];
exports.timeSteps = timeSteps;

let fieldWidth = 768;
let logData = true;
// Particle Values
const stateMax = 12;
const gravConstant = .39;
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
// 12m / 24fps => 17280
exports.timeEnd = timeEnd;
let realtimeStart = Date.now();
exports.realtimeStart = realtimeStart;
exports.timeSteps = timeSteps;
let phase = 0;
exports.phase = phase;

// ////////// PARTICLES
let startBitString;
let startHexString;
exports.startHexString = startHexString;
let startDate = new Date();
exports.startDate = startDate;

let particles = [];
let particleStats = [];

let calcDecimals = 6;
let calcDecimalsMultiplier = Math.pow(10, calcDecimals);

exports.calcDecimalsMultiplier = calcDecimalsMultiplier;

// Particle Vals
let particleVelocityMaxAbs = .6;
exports.particleVelocityMaxAbs = particleVelocityMaxAbs;

let explosions = [];
exports.explosions = explosions;

let swirls = [];
exports.swirls = swirls;

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
let explosionData = [];
let decimals = 1;

exports.lineTrailData = lineTrailData;
exports.linePolygonData = linePolygonData;
exports.shockwaveData = shockwaveData;
exports.explosionData = explosionData;
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

// ////////////////////////////// PROCESS LISTENER

process.on("message", message => {
	startBitString = message.startBitString;
	exports.startBitString = startBitString;

	startHexString = parseInt(startBitString, 2).toString(36);
	exports.startHexString = startHexString;

	console.log("start " + startHexString);

	setup();

	if (timePassed >= timeEnd) {
		console.log("end   " + startHexString);

		process.exit();
	}
})

// ////////////////////////////// SETUP

function setup() {
	// PARTICLES
	effects.explosionSetup();
	
	startPosition();

	exports.particles = particles;

	// Update Particle Statistics
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

	setupFileStructure();

	saveSetupData(false);

	if (logData) {
		log.logBaseSettings();
	}
	
	draw();
}

exports.setup = setup;

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

	// Set Start Vals
	for (let i = 0; i < particles.length; i++) {
		if (startBitString.charAt(i) == '0') {
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

	for (let i = 0; i < startBitString.length; i++) {
		if (startBitString.charAt(i) == '0') {
			negativeStateCount++;
		} else {
			positiveStateCount++;
		}
	}

	particleExplosionMultiplicator = .15 + (Math.abs(positiveStateCount - negativeStateCount) / particles.length) * .75;
	exports.particleExplosionMultiplicator = particleExplosionMultiplicator;
}

// Save Setup Data to JSON
function saveSetupData(simulationFinished) {
	let tmpData = {
		'startIDHex': startHexString,
		'startDate': startDate,
		'fieldWidth': fieldWidth,
		'timeEnd': timeEnd,
		'saveFreq': data.saveFreq,
		'saveAllFreq': data.saveAllFreq,
		'fluidParticleCount': fluid.particleCount,
		'fluidCellResolution': fluidCellResolution,
		'fluidCellBaseParticleCount': fluid.fluidCellBaseParticleCount,
		'caResolution': caResolution,
		'caFreq': caFreq,
		'endPhaseTime': timeSteps[timeSteps.length - 1],
		'particleMaxState': stateMax,
		'simulationFinished' : simulationFinished
	}

	tmpData = JSON.stringify(tmpData);

	fs.writeFileSync('public/' + startHexString + '/data/setup.json', tmpData);
}

function setupFileStructure() {
	let dir = 'public/' + startHexString;
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	// Create 'data'-Folder and project-folder if it doesnt exits yet
	let dataDir = dir + '/data/';
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir);
	}

	let logDir = dir + '/log/';
	if (!fs.existsSync(logDir)) {
		fs.mkdirSync(logDir);
	}

	fs.copyFile('public/template.html', 'public/' + startHexString + '/index.html', (err) => {
		if (err) throw err;
	});
}

// ////////////////////////////// LOOP

function draw() {
	while (timePassed < timeEnd) {
		// Print process to console
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		if (timePassed % 2 == 0) {
			process.stdout.write('/ ' + timePassed);
		} else {
			process.stdout.write('\\ ' + timePassed);
		}

		gatherData();

		for (let i = explosions.length - 1; i >= 0; i--) {
			explosions[i].draw();

			if (explosions[i].kill) {
				explosions.splice(i, 1);
			}
		}

		for (let i = 0; i < swirls.length; i++) {
			swirls[i].draw();
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

				if (logData) {
					log.logNewPhase(phase);
				}
			}
		}
		exports.phase = phase;

		// Balance Phase
		if (phase == 1) {
			balancePhase();
		}

		// End Phase
		if (phase == 2) {
			endPhase();
		}

		// Update Particle Statistics
		particleStats = gatherParticleInfo();
		exports.particleStats = particleStats;

		timePassed++;
		exports.timePassed = timePassed;

		if (logData) {
			// Log Particle Data
			log.saveParticles(240);
		}
	}

	if (timePassed >= timeEnd) {
		gatherData();

		log.saveReactionFile();

		saveSetupData(true);

		// Rename record file to indicate simulation is finished
		// fs.rename('public/' + startHexString + '/log/_record_' + startHexString + '.txt', 'public/' + startHexString + '/log/record_' + startHexString + '.txt', function (error) {});

		// process.stdout.clearLine();
		// process.stdout.cursorTo(0);
		// console.log("Simulation end at " + timePassed + ". Total Time: " + Math.floor((Date.now() - realtimeStart) / 60000) + "m " + Math.floor((Date.now() - realtimeStart) % 60) + "s");
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

/*
	There are three phases. The first one sees the universe expand. The second one balances the universe,
	so either more or less particles are created. In the last phase every particle slowly stops, the fluidCells
	loose saturation and the cellular automatas decrease their rules.

	// Balance Phase
	The amount of particles is counted and compared to a thresholdcount (1600), according to that the mass of particcles is either
	increased or decreased and the reactionCount and mergeCount is increased/decreased
*/

let balanceParticleCountThreshold = 660;
let balancePhaseInit = false;
let maxSwirlCount = 6;
let swirlParticleIndex = [];

function balancePhase() {
	if (!balancePhaseInit) {
		let balanceMulti = round(Math.max(Math.min((particles.length - balanceParticleCountThreshold)/400, 2), -2));

		// Reduce or Increase Mass		
		let massPrev = [];
		for (let i = 0; i < particleVals.length; i++) {
			massPrev[i] = particleVals[i]['mass'];
		}

		for (let i = 0; i < particleVals.length; i++) {
			// Mass Reduce or Increase
			particleVals[i]['mass'] -= round((particleVals[i]['mass']/1.6) * balanceMulti);
		}

		let massNew = [];
		for (let i = 0; i < particleVals.length; i++) {
			massNew[i] = particleVals[i]['mass'];
		}

		// Reduce or Increase reactionCount and mergeCount (Dont update state 12 particles!)
		let reactionCountPrev = [];
		let mergeCountPrev = [];
		let reactionCountNew = [];
		let mergeCountNew = [];

		if (Math.abs(Math.round(balanceMulti)) > 0) {
			for (let i = 0; i < particleVals.length; i++) {
				reactionCountPrev[i] = particleVals[i]['reactionCount'];
				mergeCountPrev[i] = particleVals[i]['mergeCount'];
			}
	
			let reactionCountDecreaseVals = [2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 6];

			for (let i = 0; i < particleVals.length - 1; i++) {
				// If reactionCount gets decreased use the array otherwise just increase the value
				if (balanceMulti < 0) {
					particleVals[i]['reactionCount'] = reactionCountDecreaseVals[i];
				} else {
					if (particleVals[i]['reactionCount'] > 2) {
						particleVals[i]['reactionCount'] += Math.round((particleVals[i]['reactionCount']/2.5) * Math.round(balanceMulti));
						particleVals[i]['reactionCount'] = Math.max(particleVals[i]['reactionCount'], 2);
					}
				}

				if (particleVals[i]['mergeCount'] > 1) {
					particleVals[i]['mergeCount'] += Math.round((particleVals[i]['mergeCount']/2.5) * Math.round(balanceMulti));
					particleVals[i]['mergeCount'] = Math.max(particleVals[i]['mergeCount'], 1);
				}
			}

			for (let i = 0; i < particleVals.length; i++) {
				reactionCountNew[i] = particleVals[i]['reactionCount'];
				mergeCountNew[i] = particleVals[i]['mergeCount'];
			}
		}

		// Increase / Decrease Explosion Multiplicator
		/*
		let particleExplosionMultiPrev = particleExplosionMultiplicator;

		particleExplosionMultiplicator += balanceMulti/2;
		particleExplosionMultiplicator = Math.min(Math.max(particleExplosionMultiplicator, .15), .9);
		
		let particleExplosionMultiNew = particleExplosionMultiplicator;

		particles.forEach(function (particle) {
			particle.updateVals();
		});
		*/
		
		// Add all state 1 / -1 particle indexes to array
		particles.forEach(function (particle) {
			if (Math.abs(particle.state) == 1) {
				swirlParticleIndex.push(particle.id);
			}
		});

		if (logData) {
			log.logBalancePhase(particles.length, balanceParticleCountThreshold, balanceMulti, massPrev, massNew, reactionCountPrev, reactionCountNew, mergeCountPrev, mergeCountNew/*, particleExplosionMultiPrev, particleExplosionMultiNew*/);
		}

		balancePhaseInit = true;
	}

	// Check for swirl
	for (let i = 0; i < swirlParticleIndex.length; i++) {
		particles[swirlParticleIndex[i]].checkSwirl();
	}
}

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

let logFreq = 1920;

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

	let prevFluidCellIndex = 0;

	let tmpCellularAutmataData = [];

	if (timePassed % data.saveAllFreq == 0) {
		// Save Fluid (Particles) Data
		tmpFluidData = Array.from(fluidData);

		preFluidData = Array.from(tmpFluidData);

		// Save all Fluid Cell Data
		fluidCellData = [];

		for (let i = 0; i < fluid.fluidCells.length; i++) {
			let index = i - prevFluidCellIndex;
			prevFluidCellIndex = i;

			fluidCellData.push(index, Math.min(fluid.fluidCells[i][0], fluidCellMaxCount), fluid.fluidCells[i][1]);
		}

		// Gather Cellular Automata Data
		tmpCellularAutmataData = ca.getAliveCells();






		console.log("Saving all data");
		console.log("Fluid Array Length", tmpFluidData.length);







	} else {
		// Just save changed Data
		tmpFluidData = Array.from(compareFluidArray(fluidData, preFluidData));

		preFluidData = Array.from(fluidData);

		// Gather Fluid Cell Data
		fluidCellData = [];

		fluidCellData = Array.from(fluid.fluidCellData);

		// Gather Cellular Automata Data
		tmpCellularAutmataData = ca.getChangedCells();

		// explosion Data
		/*
		for (let i = 0; i < explosions.length; i++) {
			let tmpData = [[explosions[i].pos[0].toFixed(decimals), explosions[i].pos[1].toFixed(decimals)], explosions[i].tmpSize.toFixed(decimals)];

			explosionData.push(tmpData);
		}
		*/
	}

	// Clean up tmpFluidData by changing indexes to only the difference to the prev Index
	let index = 0;
	let prevIndex = 0;
	for (let i = 0; i < tmpFluidData.length / 3; i++) {
		index = tmpFluidData[i * 3] - prevIndex;
		prevIndex = tmpFluidData[i * 3];

		tmpFluidData[i * 3] = index;
	}

	data.addData(particleData, tmpFluidData, fluidCellData, tmpCellularAutmataData, lineTrailData, shockwaveData);

	// Reset trails Data
	lineTrailData = [];
	exports.lineTrailData = lineTrailData;

	// Reset shockwave Data
	shockwaveData = [];
	exports.shockwaveData = shockwaveData;

	// Reset Explosion Data
	/*
	explosionData = [];
	exports.explosionData = explosionData;
	*/

	// Save JSON Files
	if (((timePassed) % data.saveFreq == 0 && timePassed != 0) || timePassed >= timeEnd) {
		let saveIndex = ((timePassed) / data.saveFreq - 1);







		if (timePassed % data.saveAllFreq == 0) {
			console.log("Saving all to index", saveIndex);
		}








		data.save(saveIndex);
	}
	
	if (((timePassed) % logFreq == 0 && timePassed != 0) || timePassed >= timeEnd) {
		let realTimePassed = Math.floor(Math.floor((Date.now() - realtimeStart) / 60000) / 60) + "h " + (Math.floor((Date.now() - realtimeStart) / 60000) % 60) + "m " + (Math.floor((Date.now() - realtimeStart) / 1000) % 60) + "s";
		let elapsedTime = Math.floor((Date.now() - realtimeStart) / 1000) - prevTime;
		fps = logFreq / elapsedTime;
		exports.fps = fps;

		prevTime = Math.floor((Date.now() - realtimeStart) / 1000);

		let timeLeft = (timeEnd - timePassed) / fps;
		let memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;

		let date = new Date();

		let time = date.getHours() + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();

		process.stdout.clearLine();
		process.stdout.cursorTo(0);

		let saveString = "      " + startHexString;
		saveString += " time " + timePassed + "/" + timeEnd/* + " (" + data.saveFreq + ")."*/;
		saveString += " real " + realTimePassed + " FPS " + fps.toFixed(2);
		// saveString += " remaining " + Math.floor(timeLeft / 3600) + "h " + (Math.floor(timeLeft / 60) % 60) + "m " + Math.floor(timeLeft % 60) + "s";
		saveString += " at " + time;
		saveString += " memory " + Math.round(memoryUsed * 100) / 100 + "MB";

		console.log(saveString);
		// console.log("Memory Used", process.memoryUsage());
	};

	// Change simulationFinshed value in setup.json file
	if (timePassed >= timeEnd) {









































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

function compareFluidArray(rawData, preRawData) {
	let data = Array.from(rawData);
	let preData = Array.from(preRawData);
	let tmpData = [];

	for (let i = 0; i < data.length / 3; i++) {
		let dataChanged = false;

		if (data[i * 3 + 1] !== preData[i * 3 + 1] || data[i * 3 + 2] !== preData[i * 3 + 2]) {
			dataChanged = true;
		}

		if (dataChanged) {
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

function round(val) {
	return Math.round((val + Number.EPSILON) * calcDecimalsMultiplier) / calcDecimalsMultiplier;
}