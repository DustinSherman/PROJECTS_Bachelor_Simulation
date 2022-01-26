// MODULES
const fs = require('fs');

// MY MODULES
const simulation = require("./simulation.js");

let saveFreq = 120;
let saveAllFreq = 1920;
exports.saveFreq = saveFreq;
exports.saveAllFreq = saveAllFreq;

// DataObjects
let particleData = [];
let fluidData = [];
let fluidCellData = [];
let cellularAutomataData = [];
let lineTrailsData = [];
let linePolygonsData = [];
let shockwaveData = [];
// let explosionData = [];

function addData(tmpParticleData, tmpFluidData, tmpFluidCellData, tmpcaData, tmpLineTrailsData, tmpShockwaveData/*, tmpExplosionData*/) {
    particleData.push(tmpParticleData);
    fluidData.push(tmpFluidData);
    fluidCellData.push(tmpFluidCellData);
    cellularAutomataData.push(tmpcaData);
    lineTrailsData.push(tmpLineTrailsData);
    // linePolygonsData.push(tmpLinePolygonsData);
    shockwaveData.push(tmpShockwaveData);
    // explosionData.push(tmpExplosionData);
}

exports.addData = addData;

function save(index) {
    // Save JSON Files
    saveFile(index, particleData, 'particles');
    saveFile(index, fluidData, 'fluid');
    saveFile(index, fluidCellData, 'fluidCells');
    saveFile(index, cellularAutomataData, 'cellularAutomata');
    saveFile(index, lineTrailsData, 'lineTrails');
    // saveFile(index, linePolygonsData, 'linePolygons');
    saveFile(index, shockwaveData, 'shockwaves');
    // saveFile(index, explosionData, 'explosion');

    particleData = [];
    fluidData = [];
    fluidCellData = [];
    cellularAutomataData = [];
    lineTrailsData = [];
    // linePolygonsData = [];
    shockwaveData = [];
    // explosionData = [];
}

exports.save = save;

function saveFile(index, dataObject, fileName) {
    let saveDestination = 'public/' + simulation.startHexString + '/data/';

    let dataString = JSON.stringify(dataObject);
    fs.writeFileSync(saveDestination + pad(index, 6) + '_' + fileName + '.json', dataString);
}

// Add leading zeros
function pad(num, size) {
    let s = "000000000" + num;
    return s.substr(s.length - size);
}