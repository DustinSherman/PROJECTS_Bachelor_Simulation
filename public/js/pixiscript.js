let type = "WEBGL";

if (!PIXI.utils.isWebGLSupported()) {
    type = "canvas";
}

// PIXI.utils.sayHello(type);

// Aliases
let Application = PIXI.Application,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    Sprite = PIXI.Sprite;

// Sprites
let particleSprites = [];
let fluidSprites = [];
let fluidCellSprites = [];
let caSprites = [];

// Values
let timePassed = 0;
let fps = 24;
let play = true;
let speed = 1;

let fpsInterval, timeStart, timeNow, timeThen, timeElapsed;

let scale = .25;

// Particles
let colorsPos = [0xFFFFFF, 0xFDF9F6, 0xFBF3ED, 0xFAECE3, 0xF8E6DA, 0xF6E0D1, 0xF4DAC8, 0xF2D3BE, 0xF0CDB5, 0xEFC7AC, 0xEDC1A3, 0xEBBA99];
let colorsNeg = [0xFFFFFF, 0xF6FBFD, 0xEDF7FB, 0xE3F3FA, 0xDAEFF8, 0xD1EBF6, 0xC8E7F4, 0xBEE2F2, 0xB5DEF0, 0xACDAEF, 0xA3D6ED, 0x99D2EB];
let radiVals = [1.0, 1.414, 1.732, 2.0, 2.236, 2.449, 2.646, 2.828, 3.0, 3.162, 3.317, 3.464, 3.606, 3.742, 3.873, 4.0, 4.123, 4.243, 4.359, 4.472, 4.583, 4.69, 4.796, 4.899, 5.0, 5.099, 5.196, 5.292, 5.385, 5.477, 5.568, 5.657];

// Fluid
let tmpFluidData;
let resolution;
let fluidOrigins = [];
let fluidRows;
let alphaDistance;

// FluidCells
let fluidCellResolution;
let fluidColorLength = 128;
let fluidColorPolarityLength = 16;
let fluidCellFilter = new PIXI.filters.BlurFilter();
const fluidCellContainer = new PIXI.Container();

// trails
let currentParticleTrails = [];
let particleTrailLines = [];
let trailStroke = .6;

// shockwaves
let shockwaveFilters = [];
let shockwaveAmplitudeBase = 16;
let shockwaveWavelengthBase = 32;
let shockwaveRadiusBase = 8;
let shockwaveTimingBase = .01;

// INIT
let app = new Application({
    width: 768, 
    height: 768,
    antialias: true
});
app.renderer.autoResize = true;

fluidCellContainer.filters = [fluidCellFilter];
app.stage.addChild(fluidCellContainer);

let wrapperElement = document.getElementById('wrapper');
wrapperElement.appendChild(app.view);

// Loading sprites into texture cache
loader
    .add([
        '../assets/particle_0.png',
        '../assets/fluidcell.png',
        '../assets/cell.png'
    ])
    .load();

function init() {
    // Set Date
    startDate = convertDate(new Date(startDate));

    initFluid();
    initCellularAutomata();

    // Set Animation Vals
    fpsInterval = 1000/fps;
    timeThen = Date.now();
    timeStart = timeThen;

    // When finished loading start draw
    window.onload = animate();

    addDataToHTML();
}

function animate() {
    requestAnimationFrame(animate);

    timeNow = Date.now();
    timeElapsed = timeNow - timeThen;

    if (play) {
        if (timeElapsed > fpsInterval/speed) {
            timeThen = timeNow - (timeElapsed % fpsInterval);
    
            draw();
        }
    }    
}

function draw() {
    drawFluidCells();
    drawParticles();
    drawParticleTrails();
    drawFluid();
    drawCellularAutomata();
    drawShockwaves();

    if (play) {
        timePassed++;

        updateTime(timePassed);
    }    

    if (timePassed >= timeEnd)  {
        timePassed = 0;
        particleSprites = [];
        fluidSprites = [];
        initFluid();
    }
}

// ////////////////////////////// PARTICLES //////////////////////////////

function drawParticles() {
    // Add new Particles
    for (let i = particleSprites.length; i < particles[timePassed].length; i++) {
        // Check for no merged Particles
        if (particles[timePassed][i][2] != undefined) {
            particleSprites[i] = new Sprite(
                resources['../assets/particle_0.png'].texture
            );
    
            app.stage.addChild(particleSprites[i]);
            particleSprites[i].scale.set(scale, scale);
        }
    }

    // Delete merged particles
    for (let i = particleSprites.length - 1; i >= 0; i--) {
        if (particles[timePassed][i][2] == undefined) {
            particleSprites[i].splice(i, 1);
        }
    }

    for (let i = 0; i < particles[timePassed].length; i++) {
        particleSprites[i].position.set(particles[timePassed][i][0], particles[timePassed][i][1]);

        if (timePassed > 0) {
            // Set Color of particles
            if (particles[timePassed][i][2] != particles[timePassed - 1][i][2]) {
                let colorIndex = Math.abs(particles[timePassed][i][2]);
                particleSprites[i].tint = particles[timePassed][i][2] > 0 ? colorsPos[colorIndex] : colorsNeg[colorIndex];
            }

            // Set size of particles
            if (particles[timePassed][i][3] != particles[timePassed - 1][i][3]) {
                let scale = radiVals[particles[timePassed][i][3]];
                particleSprites[i].scale.set(scale, scale);
            }
        }
    }
}

// ////////////////////////////// PARTICLE FLUID //////////////////////////////

function initFluid() {
    // Intialize Fluid Cells
    let rowCount = (fieldWidth/fluidCellResolution);
    let fluidCellCount = rowCount * rowCount;

    for (let i = 0; i < fluidCellCount; i++) {
        fluidCellSprites[i] = new Sprite(
            resources['../assets/fluidcell.png'].texture
        );

        fluidCellContainer.addChild(fluidCellSprites[i]);
        fluidCellSprites[i].x = (i % rowCount) * fluidCellResolution
        fluidCellSprites[i].y = Math.floor(i/rowCount) * fluidCellResolution;
        fluidCellSprites[i].width = fluidCellResolution;
        fluidCellSprites[i].height = fluidCellResolution;

        let color = fluidCellColors[fluidColorPolarityLength][21];

        fluidCellSprites[i].tint = color;
    }

    // Load initial fluidParticleData
    tmpFluidData = new Array(fluidParticleCount);
    for (let i = 0; i < fluidParticleCount; i++) {
        tmpFluidData[i] = [undefined, undefined, 0];
    }

    fluidRows = Math.sqrt(fluidParticleCount);
    resolution = fieldWidth/fluidRows;
    alphaDistance = resolution * 8;

    for (let i = 0; i < fluidRows; i++) {
        for (let j = 0; j < fluidRows; j++) {
            fluidOrigins.push([j * resolution + resolution/2, i * resolution + resolution/2]);
        }
    }

    // Initialize the fluid data
    for (let i = 0; i < fluidParticleCount; i++) {
        fluidSprites[i] = new Sprite(
            resources['../assets/particle_0.png'].texture
        );

        app.stage.addChild(fluidSprites[i]);
        fluidSprites[i].scale.set(scale, scale);
        fluidSprites[i].alpha = 0;
    }
}

function drawFluid() {
    // Refresh fluid particle vals
    if (timePassed > 0) {
        for (let i = 0; i < fluid[timePassed].length; i++) {
            let index = fluid[timePassed][i][0];
            let tmpDistance;

            if (tmpFluidData[index][2] < alphaDistance) {
                tmpDistance = getDistance(fluidOrigins[index], [fluid[timePassed][i][1], fluid[timePassed][i][2]]);
            } else {
                tmpDistance = alphaDistance;
            }

            tmpFluidData[index] = [fluid[timePassed][i][1], fluid[timePassed][i][2], tmpDistance];
        }
    }

    // Draw Fluid Particles
    for (let i = 0; i < fluidParticleCount; i++) {
        if (tmpFluidData[i][0] != undefined) {
            let alpha;

            if (tmpFluidData[i][2] != alphaDistance) {
                alpha = (tmpFluidData[i][2]/alphaDistance).toFixed(2);
            } else {
                alpha = 1;
            }

            fluidSprites[i].alpha = alpha;
            fluidSprites[i].position.set(tmpFluidData[i][0], tmpFluidData[i][1]);
        }
    }
}

function drawFluidCells() {
    for (let i = 0; i < fluidCells[timePassed].length; i++) {
        if (fluidCells[timePassed][i][0] != undefined) {
            let fluidColorIndex = Math.min(fluidCells[timePassed][i][0], fluidColorLength - 1);
            let fluidColorPolarityIndex = Math.min(Math.max(fluidCells[timePassed][i][1], -fluidColorPolarityLength), fluidColorPolarityLength) + fluidColorPolarityLength;
    
            let color = fluidCellColors[fluidColorPolarityIndex][fluidColorIndex];
    
            fluidCellSprites[i].tint = color;
        }
    }
}

// ////////////////////////////// CELLULAR AUTOMATA //////////////////////////////

let caCells = [];
let caAliveCount = [];
let caAliveCountMax = 64;

function initCellularAutomata() {
    let rowCount = fieldWidth/cellularAutomataResolution;

    let cellularAutomataContainer = new PIXI.Container();
    app.stage.addChild(cellularAutomataContainer);

    for (let i = 0; i < rowCount * rowCount; i++) {
        caCells[i] = false;
        caAliveCount[i] = 0;

        caSprites[i] = new Sprite(
            resources['../assets/cell.png'].texture
        );

        caSprites[i].x = (i % rowCount) * cellularAutomataResolution;
        caSprites[i].y = Math.floor(i/rowCount) * cellularAutomataResolution;
        caSprites[i].visible = caCells[i];

        cellularAutomataContainer.addChild(caSprites[i]);
    }
}

// Function to call if skipped ahead and the Cellular Automata needs to update to load the data

function updateCellularAutomata() {
    document.body.classList.add('loading');

    initCellularAutomata();

    for (let i = 0; i < timePassed; i++) {
        for (let j = 0; j < cellularAutomataData[i].length; j++) {
            let index = cellularAutomataData[i][j];

            caCells[index] = !caCells[index];
        }

        loaderVal += (i/timePassed) * 100;
        loaderbarElement.style.width = loaderVal + '%';
        loaderpercentElement.innerHTML = loaderVal.toFixed(1) + ' %';
    }

    document.body.classList.remove('loading');
    play = true;
}

function drawCellularAutomata() {
    // Update Cells
    for (let i = 0; i < cellularAutomataData[timePassed].length; i++) {
        let index = cellularAutomataData[timePassed][i];

        caCells[index] = !caCells[index];

        caSprites[index].visible = caCells[index];
    }

    // Set Alpha for CA Cells
    for (let i = 0; i < caCells.length; i++) {
        if (caCells[i]) {
            if (caAliveCount[i] < caAliveCountMax) {
                caAliveCount[i]++;
            }

            if (caAliveCount[i] == 1) {
                caSprites[i].alpha = 1;
            } else if (caAliveCount[i] < caAliveCountMax) {
                caSprites[i].alpha = caAliveCount[i]/caAliveCountMax;
            } else {
                caSprites[i].alpha = 1;
            }
        } else {
            caAliveCount[i] = 0;
        }
    }
}

// ////////////////////////////// PARTICLE TRAILS //////////////////////////////

/*
    The first value of the saved particleTrailData is the index of the particle, the second value the length of the trail and the third value the duration
    of the trail being visible. We also add the trailLength a second time to subtract it from the trailoop to make the trail "grow" from 0 to its designated 
    length.
*/

function drawParticleTrails() {
    for (let i = 0; i < particleTrails[timePassed].length; i++) {
        let currentParticleTrailData = [particleTrails[timePassed][i][0], particleTrails[timePassed][i][1], particleTrails[timePassed][i][2], particleTrails[timePassed][i][1]];

        currentParticleTrails.push(currentParticleTrailData);

        particleTrailLines.push(new PIXI.Graphics());

        app.stage.addChild(particleTrailLines[i]);
    }

    for (let i = currentParticleTrails.length - 1; i >= 0; i--) {
        // Delete dead trails
        if (currentParticleTrails[i][2] <= -currentParticleTrails[i][1]) {
            app.stage.removeChild(particleTrailLines[i]);

            currentParticleTrails.splice(i, 1);
            particleTrailLines.splice(i, 1);
        } else {
            // Draw trail
            let index = currentParticleTrails[i][0];
            particleTrailLines[i].clear();
            particleTrailLines[i].lineStyle(trailStroke, 0xFFFFFF, 1);

            // Since the particle could have been merged in the meantime and therefore hasnt been saved we check every time if the particle exists
            if (particles[timePassed][index] != undefined) {
                particleTrailLines[i].moveTo(parseFloat(particles[timePassed][index][1]), parseFloat(particles[timePassed][index][2]));

                let trailLength = currentParticleTrails[i][1];
    
                for (let j = 1; j < trailLength - currentParticleTrails[i][3]; j++) {
                    if (particles[timePassed - j][index] != undefined) {
                        let pos = [parseFloat(particles[timePassed - j][index][1]), parseFloat(particles[timePassed - j][index][2])];
                        let prevPos = [parseFloat(particles[timePassed - j + 1][index][1]), parseFloat(particles[timePassed - j + 1][index][2])];
        
                        // If Trail crosses border
                        let torus = false;
                        let torusPos = [[pos[0], pos[1]], [prevPos[0], prevPos[1]]];
                        if (prevPos[0] - pos[0] > fieldWidth/2) {
                            torus = true;
                            torusPos[0][0] += fieldWidth;
                            torusPos[1][0] -= fieldWidth;
                        } else if (prevPos[0] - pos[0] < -fieldWidth/2) {
                            torus = true;
                            torusPos[0][0] -= fieldWidth;
                            torusPos[1][0] += fieldWidth;
                        }
                        if (prevPos[1] - pos[1] > fieldWidth/2) {
                            torus = true;
                            torusPos[0][1] += fieldWidth;
                            torusPos[1][1] -= fieldWidth;
                        } else if (prevPos[1] - pos[1] < -fieldWidth/2) {
                            torus = true;
                            torusPos[0][1] -= fieldWidth;
                            torusPos[1][1] += fieldWidth;
                        }
        
                        if (torus) {
                            particleTrailLines[i].lineTo(torusPos[0][0].toFixed(1), torusPos[0][1].toFixed(1));
        
                            particleTrailLines[i].lineStyle(16, 0xFF0000, .1);
                            particleTrailLines[i].lineTo(torusPos[1][0].toFixed(1), torusPos[1][1].toFixed(1));
        
                        } else {
                            particleTrailLines[i].lineStyle(trailStroke, 0xFFFFFF, 1);
                        }
        
                        particleTrailLines[i].lineTo(pos[0], pos[1]);
                    }
                }
            }
    
            // Reduce the timer of the trail
            currentParticleTrails[i][2]--;

            // Reduce the trailLengthReduction if its greater than 0
            if (currentParticleTrails[i][3] > 0) {
                currentParticleTrails[i][3]--;
            }
        }
    }
}

// ////////////////////////////// SHOCKWAVES //////////////////////////////

function drawShockwaves() {
    // Add new Shockwave Filters
    let newShockwave = false;
    for (let i = 0; i < shockwaves[timePassed].length; i++) {
        shockwaveFilters.push(new PIXI.filters.ShockwaveFilter());

        // Set shockwaveFilter
        shockwaveFilters[i].center.x = shockwaves[timePassed][i][0];
        shockwaveFilters[i].center.y = shockwaves[timePassed][i][1];
        shockwaveFilters[i].amplitude = shockwaveAmplitudeBase;
        shockwaveFilters[i].wavelength = shockwaveWavelengthBase;
        shockwaveFilters[i].radius = shockwaveRadiusBase * shockwaves[timePassed][i][2];

        newShockwave = true;
    }

    // Actualize filters if a new filter is added
    if (newShockwave) {
        app.filters = [shockwaveFilters];
    }

    // Increase Timer for shockwaves
    for (let i = 0; i < shockwaveFilters.length; i++) {
        shockwaveFilters[i].time += shockwaveTimingBase;

        let multi = 1 - shockwaveFilters[i].time;
        shockwaveFilters[i].amplitude = shockwaveAmplitudeBase * multi;
    }

    // Delete passed shockwaves
    for (let i = shockwaveFilters.length - 1; i >= 0; i--) {
        if (shockwaveFilters[i].time > 1) {
            shockwaveFilters.splice(i, 1);
        }
    }
}

// hack fit size css
document.body.onresize = () => { scaleToWindow() };
scaleToWindow = function() {
    const canvas = app.view;
    let scaleX, scaleY, scale, center;
    scaleX = window.innerWidth / canvas.offsetWidth;
    scaleY = window.innerHeight / canvas.offsetHeight;
    scale = Math.min(scaleX, scaleY);
    canvas.style.transformOrigin = "0 0";
    canvas.style.transform = "scale(" + scale + ")";
}