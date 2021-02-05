// Data Objects
let particles = [];
let fluid = [];
let fluidCells = [];
let cellularAutomataData = [];
let particleTrails = [];
let shockwaves = [];

let dataObjects = [
    particles,
    fluid,
    fluidCells,
    cellularAutomataData,
    particleTrails,
    shockwaves
]

let dataNames = [
    'particles',
    'fluid',
    'fluidCells',
    'cellularAutomata',
    'trails',
    'shockwaves'
]

let fluidParticleCount;

let cellularAutomataResolution;

// Setup Data
let fieldWidth, timeEnd, saveFreq;
let loadProgress = 0;

let tmpPath = 'undefined';

let startIDHex = '';
let startDate;

let loaderElement = document.getElementById('loader');
let loaderVal = 0;
let loaderbarElement = document.getElementById('loader-bar');
let loaderpercentElement = document.getElementById('loader-percent');

function dataInit() {
    // Get Setup Data
    fetch('../data/' + tmpPath + '/setup.json')
        .then(response => response.json())
        .then(data => {
            startIDHex = data['startIDHex'];
            startDate = data['startDate'];
            fieldWidth = data['fieldWidth'];
            timeEnd = data['timeEnd'];
            saveFreq = data['saveFreq'];
            fluidParticleCount = data['fluidParticleCount'];
            fluidCellResolution = data['fluidCellResolution'];
            cellularAutomataResolution = data['caResolution'];

            // Iterate through all files
            for (let i = 0; i < dataObjects.length; i++) {
                loadFile(0, dataObjects[i], dataNames[i]);
            }
        })
}

function loadFile(index, dataObject, fileName) {
    let tmpData = new Array();
    tmpData = dataObject;

        fetch('../data/' + tmpPath + '/' + pad(index, 6) + '_' + fileName + '.json')
        .then(response => response.json())
        .then(function(data) {
            for (let i = 0; i < saveFreq; i++) {
                tmpData.push(data[i]);
            }
        })
        .then(function() {
            // console.log("Loading", fileName, index, (index / (timeEnd / saveFreq)) * 100);

            loaderVal += ((saveFreq/timeEnd)/dataObjects.length) * 100;
            loaderbarElement.style.width = loaderVal + '%';
            loaderpercentElement.innerHTML = loaderVal.toFixed(1) + ' %';

            if (index + 1 < timeEnd / saveFreq) {
                loadFile(index + 1, dataObject, fileName);
            } else {
                // console.log("Finished", fileName, timeEnd);

                // Check if all data is gathered
                let finished = true;
                for (let i = 0; i < dataObjects.length; i++) {
                    if (dataObjects[i].length != timeEnd) {
                        finished = false;
                        break;
                    }
                }

                if (finished) {
                    document.body.classList.remove('loading');

                    init();
                }
            }
        })
}

dataInit();

// Add leading zeros
function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}