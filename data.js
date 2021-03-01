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
let shockwaveData = [];

function addData(tmpParticleData, tmpFluidData, tmpFluidCellData, tmpcaData, tmpTrailsData, tmpShockwaveData) {
    particleData.push(tmpParticleData);
    fluidData.push(tmpFluidData);
    fluidCellData.push(tmpFluidCellData);
    cellularAutomataData.push(tmpcaData);
    trailsData.push(tmpTrailsData);
    shockwaveData.push(tmpShockwaveData);
}

exports.addData = addData;

function save(index) {
    // Save JSON Files
    saveFile(index, particleData, 'particles');
    saveFile(index, fluidData, 'fluid');
    saveFile(index, fluidCellData, 'fluidCells');
    saveFile(index, cellularAutomataData, 'cellularAutomata');
    saveFile(index, trailsData, 'trails');
    saveFile(index, shockwaveData, 'shockwaves');

    particleData = [];
    fluidData = [];
    fluidCellData = [];
    cellularAutomataData = [];
    trailsData = [];
    shockwaveData = [];
}

exports.save = save;

/*
function rewrite(index) {
    let saveDestination = 'public/data/' + simulation.startHexString + '/';

    // All relevant files that contain string, which should be written without a certain sign (in this case ")
    let fileNames = ['fluid', 'fluidCells'];
    
    for (let i = 0; i < fileNames.length; i++) {
        let fileName = fileNames[i];

        let data = fs.readFileSync(saveDestination + pad(index, 6) + '_' + fileName + '.json');


        console.log("Data length", data.length);

        for (let i = 0; i < data.length/3; i++) {
            let tmpData = data[i * 3];

            console.log("Data type ", typeof(tmpData), " Data ", tmpData);

            data[i * 3] = tmpData.replace(/["']/g, "");
        }

        // let newData = data.replace(/["']/g, "");
  
        fs.writeFileSync(saveDestination + pad(index, 6) + '_' + fileName + '.json', newData);
    }
}

exports.rewrite = rewrite;
*/

function saveFile(index, dataObject, fileName) {
    let saveDestination = 'public/data/' + simulation.startHexString + '/';

    let dataString = JSON.stringify(dataObject);
    fs.writeFileSync(saveDestination + pad(index, 6) + '_' + fileName + '.json', dataString);
}

// Add leading zeros
function pad(num, size) {
    let s = "000000000" + num;
    return s.substr(s.length - size);
}