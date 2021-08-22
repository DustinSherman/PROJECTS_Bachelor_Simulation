// MODULES
const fs = require('fs');

// MY MODULES
const server = require("./server.js");
const simulation = require("./simulation.js");

let saveFreq = 120;
exports.saveFreq = saveFreq;

// DataObjects
let particleData = [];
let fluidData = [];
let fluidCellData = [];
let cellularAutomataData = [];
let lineTrailsData = [];
let linePolygonsData = [];
// let shockwaveData = [];

function addData(tmpParticleData, tmpFluidData, tmpFluidCellData, tmpcaData, tmpLineTrailsData, tmpLinePolygonsData) {
    particleData.push(tmpParticleData);
    fluidData.push(tmpFluidData);
    fluidCellData.push(tmpFluidCellData);
    cellularAutomataData.push(tmpcaData);
    lineTrailsData.push(tmpLineTrailsData);
    linePolygonsData.push(tmpLinePolygonsData);
    // shockwaveData.push(tmpShockwaveData);
}

exports.addData = addData;

function save(index) {
    // Save JSON Files
    saveFile(index, particleData, 'particles');
    saveFile(index, fluidData, 'fluid');
    saveFile(index, fluidCellData, 'fluidCells');
    saveFile(index, cellularAutomataData, 'cellularAutomata');
    saveFile(index, lineTrailsData, 'lineTrails');
    saveFile(index, linePolygonsData, 'linePolygons');
    // saveFile(index, shockwaveData, 'shockwaves');

    particleData = [];
    fluidData = [];
    fluidCellData = [];
    cellularAutomataData = [];
    lineTrailsData = [];
    linePolygonsData = [];
    // shockwaveData = [];
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