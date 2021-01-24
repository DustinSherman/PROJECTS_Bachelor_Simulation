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
let trailsData = [];

function addData(tmpParticleData, tmpFluidData, tmpFluidCellData, tmpcaData, tmpTrailsData) {
    particleData.push(tmpParticleData);
    fluidData.push(tmpFluidData);
    fluidCellData.push(tmpFluidCellData);
    cellularAutomataData.push(tmpcaData);
    trailsData.push(tmpTrailsData);
}

exports.addData = addData;

function save(index) {
    // Save JSON Files
    saveFile(index, particleData, 'particles');
    saveFile(index, fluidData, 'fluid');
    saveFile(index, fluidCellData, 'fluidCells');
    saveFile(index, cellularAutomataData, 'cellularAutomata');
    saveFile(index, trailsData, 'trails');

    particleData = [];
    fluidData = [];
    fluidCellData = [];
    cellularAutomataData = [];
    trailsData = [];
}

exports.save = save;

function saveFile(index, dataObject, fileName) {
    let saveDestination = 'public/data/' + simulation.startHexString + '/';

    let dataString = JSON.stringify(dataObject);
    fs.writeFileSync(saveDestination + pad(index, 6) + '_' + fileName + '.json', dataString);
}

// Add leading zeros
function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}