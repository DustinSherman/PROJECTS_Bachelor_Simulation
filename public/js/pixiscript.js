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
        particleSprites[i] = new Sprite(
            resources['../assets/particle_0.png'].texture
        );

        app.stage.addChild(particleSprites[i]);
        particleSprites[i].scale.set(scale, scale);
    }

    for (let i = 0; i < particles[timePassed].length; i++) {
        particleSprites[i].position.set(particles[timePassed][i][1], particles[timePassed][i][2]);
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
        let index = fluidCells[timePassed][i][0];
        let fluidColorIndex = Math.min(fluidCells[timePassed][i][1], fluidColorLength - 1);
        let fluidColorPolarityIndex = Math.min(Math.max(fluidCells[timePassed][i][2], -fluidColorPolarityLength), fluidColorPolarityLength) + fluidColorPolarityLength;

        let color = fluidCellColors[fluidColorPolarityIndex][fluidColorIndex];

        fluidCellSprites[index].tint = color;
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

        if (caCells[index] && caAliveCount[index] < caAliveCountMax) {
            caAliveCount[index]++;
        } else if (!caCells[index]) {
            caAliveCount[index] = 0;
        }

        caSprites[index].visible = caCells[index];

        if (caCells[index]) {
            if (caAliveCount[index] == 1) {
                caSprites[index].alpha = 1;
            } else if (caAliveCount[index] < caAliveCountMax) {
                caSprites[index].alpha = caAliveCount[index]/caAliveCountMax;
            } else {
                caSprites[index].alpha = 1;
            }
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