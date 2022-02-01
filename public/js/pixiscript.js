// Aliases
let Application = PIXI.Application,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    Sprite = PIXI.Sprite;

// INIT
let app = new Application({
    // resizeTo: wrapperElement,
    autoResize: true,
    resolution: devicePixelRatio,
    backgroundColor: 0x000000,
    antialias: true
});

// Sprites
let particleSprites = [];
let particleTorusHoricontalSprites = [];
let particleTorusVerticalSprites = [];
let particleShineSprites = [];
let particleShineTorusHoricontalSprites = [];
let particleShineTorusVerticalSprites = [];
let fluidSprites = [];
let fluidCellSprites = [];
let fluidTorusHoricontalSprites = [];
let fluidTorusVerticalSprites = [];
let fluidCellAlphaDecrease;
let caSprites = [];
let lineTrailGraphics = [];
let explosionGraphics = [];

// Values
let timePassed = 0;
let relativeTimePassed = 0;
let fps = 24;
let play = true;
let speed = 1;
let relativeIndex;

let fpsInterval, timeStart, timeNow, timeThen, timeElapsed;

// The multiplicator that scales the particle graphic down
let scale = .015625;

// Particles
let colorsPos = [0xFFFFFF, 0xFDF9F6, 0xFBF3ED, 0xFAECE3, 0xF8E6DA, 0xF6E0D1, 0xF4DAC8, 0xF2D3BE, 0xF0CDB5, 0xEFC7AC, 0xEDC1A3, 0xEBBA99];
let colorsNeg = [0xFFFFFF, 0xF6FBFD, 0xEDF7FB, 0xE3F3FA, 0xDAEFF8, 0xD1EBF6, 0xC8E7F4, 0xBEE2F2, 0xB5DEF0, 0xACDAEF, 0xA3D6ED, 0x99D2EB];
let radiVals = [1.0, 1.414, 1.732, 2.0, 2.236, 2.449, 2.646, 2.828, 3.0, 3.162, 3.317, 3.464, 3.606, 3.742, 3.873, 4.0, 4.123, 4.243, 4.359, 4.472, 4.583, 4.69, 4.796, 4.899, 5.0, 5.099, 5.196, 5.292, 5.385, 5.477, 5.568, 5.657];
let particleShineCount = 0;
const particleContainer = new PIXI.Container();
const particleTorusHoricontalContainer = new PIXI.Container();
const particleTorusVerticalContainer = new PIXI.Container();
const particleShineContainer = new PIXI.Container();
const particleShineTorusHoricontalContainer = new PIXI.Container();
const particleShineTorusVerticalContainer = new PIXI.Container();
let torusParticleSpacing = 32;
let torusParticleShineSpacing = 64;

// Fluid
let tmpFluidData;
let resolution;
let fluidOrigins = [];
let fluidRows;
let alphaDistance;
const fluidContainer = new PIXI.Container();
const fluidTorusHoricontalContainer = new PIXI.Container();
const fluidTorusVerticalContainer = new PIXI.Container();
let torusFluidParticleSpacing = 5;

// FluidCells
let fluidCellResolution;
let fluidCellBaseParticleCount;
let fluidColorLength = 128;
let fluidColorPolarityLength = 16;
let fluidCellFilter = new PIXI.filters.BlurFilter();
const fluidCellContainer = new PIXI.Container();

// CellularAutomata
const cellularAutomataContainer = new PIXI.Container();

let lineStroke = 1;

// LineTrails
let lineTrailStroke = lineStroke;
const lineTrailContainer = new PIXI.Container();

// explosions
let explosion = [];

// shockwaves
let shockwaveFilters = [];
let shockwaveAmplitudeBase = 16;
let shockwaveWavelengthBase = 32;
let shockwaveRadiusBase = 8;
let shockwaveTimingBase = .01;
let shockwaveStrengthBase = 16;

// Reset / Timebar
let loadingReset = false;

let wrapperElement = document.getElementById('wrapper');
wrapperElement.appendChild(app.view);

const viewContainer = new PIXI.Container();

app.stage.addChild(viewContainer);

// Move container to the center
viewContainer.x = app.screen.width / 2;
viewContainer.y = app.screen.height / 2;
viewContainer.pivot.x = viewContainer.width / 2;
viewContainer.pivot.y = viewContainer.height / 2;

// app.renderer.autoResize = true;

fluidCellContainer.filters = [fluidCellFilter];
// Add in order they should be visibly ordered. First one is bottom and so on.
viewContainer.addChild(fluidCellContainer);
viewContainer.addChild(fluidContainer);
viewContainer.addChild(fluidTorusHoricontalContainer);
viewContainer.addChild(fluidTorusVerticalContainer);
viewContainer.addChild(cellularAutomataContainer);
viewContainer.addChild(lineTrailContainer);
viewContainer.addChild(particleShineContainer);
viewContainer.addChild(particleContainer);
viewContainer.addChild(particleTorusHoricontalContainer);
viewContainer.addChild(particleTorusVerticalContainer);

const mask = new PIXI.Graphics;
mask.beginFill(0xFFFFFF);
mask.drawRect(0, 0, 768, 768);
viewContainer.addChild(mask);
viewContainer.mask = mask;

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

    console.log("Init Pixi");

    initCellularAutomata();
    initFluid();

    // Set Animation Vals
    fpsInterval = 1000 / fps;
    timeThen = Date.now();
    timeStart = timeThen;

    // When finished loading start draw
    document.body.classList.remove("loading");
    loaderElement.style.display = 'none';
    window.onload = animate();

    addDataToHTML();
    resize();

    console.log("Init Pixi finished");
}

function animate() {
    requestAnimationFrame(animate);

    timeNow = Date.now();
    timeElapsed = timeNow - timeThen;

    if (play) {
        if (timeElapsed > fpsInterval / speed) {
            timeThen = timeNow - (timeElapsed % fpsInterval);

            draw();
        }
    }

    if (loadingReset) {
        checkReset();
    }
}

function draw() {
    // Check if new Data must be loaded
    if (timePassed % saveFreq == 0) {
        // Set the index so that the next one after the current segment is loaded
        let currentFileIndex = Math.floor(timePassed / saveFreq) + 1;
        relativeIndex = Math.floor(timePassed / saveFreq) % 2;

        if (timePassed < timeEnd - saveFreq) {
            // Add 1 to the relativeIndex so the data gets loaded into the correct array
            loadData(currentFileIndex, (relativeIndex + 1) % 2);
        }
    }

    if (play) {
        drawFluidCells();
        drawParticles();
        drawFluid();
        drawCellularAutomata();

        updateLineTrails();
        drawLineTrails();

        drawShockwaves();

        timePassed++;
        relativeTimePassed = timePassed - Math.floor(timePassed / saveFreq) * saveFreq;

        updateTime(timePassed);
    }

    if (timePassed >= timeEnd) {
        play = false;
    }
}

// ////////////////////////////// PARTICLES //////////////////////////////

function refreshParticles() {
    // Add new Particles
    if (particleSprites.length < particles[relativeIndex][relativeTimePassed].length) {
        for (let i = particleSprites.length; i < particles[relativeIndex][relativeTimePassed].length; i++) {
            particleSprites[i] = new Sprite(
                resources['../assets/particle_0.png'].texture
            );

            particleContainer.addChild(particleSprites[i]);
            particleSprites[i].scale.set(scale, scale);

            // Add Torus particles
            particleTorusHoricontalSprites[i] = new Sprite(
                resources['../assets/particle_0.png'].texture
            );

            particleTorusHoricontalContainer.addChild(particleTorusHoricontalSprites[i]);
            particleTorusHoricontalSprites[i].scale.set(scale, scale);
            particleTorusHoricontalSprites[i].position.set(-torusParticleSpacing, 0);

            particleTorusVerticalSprites[i] = new Sprite(
                resources['../assets/particle_0.png'].texture
            );

            particleTorusVerticalContainer.addChild(particleTorusVerticalSprites[i]);
            particleTorusVerticalSprites[i].scale.set(scale, scale);
            particleTorusVerticalSprites[i].position.set(0, -torusParticleSpacing);
        }
    }

    // Delete merged particles
    if (particleSprites.length > particles[relativeIndex][relativeTimePassed].length) {
        for (let i = particleSprites.length - 1; i >= particles[relativeIndex][relativeTimePassed].length; i--) {
            particleContainer.removeChild(particleSprites[i]);
            particleSprites.splice(i, 1);

            // Delete Torus Particles
            particleTorusHoricontalContainer.removeChild(particleTorusHoricontalSprites[i]);
            particleTorusHoricontalSprites.splice(i, 1);

            particleTorusVerticalContainer.removeChild(particleTorusVerticalSprites[i]);
            particleTorusVerticalSprites.splice(i, 1);
        }
    }

    // Add particle shine graphics
    let particleStateMaxCount = 0;
    for (let i = 0; i < particles[relativeIndex][relativeTimePassed].length; i++) {
        if (Math.abs(particles[relativeIndex][relativeTimePassed][i][2]) == particleMaxState) {
            particleStateMaxCount++;
        }
    }

    if (particleShineSprites.length < particleStateMaxCount) {
        for (let i = particleShineSprites.length; i < particleStateMaxCount; i++) {
            particleShineSprites[i] = new PIXI.Graphics();
            particleShineContainer.addChild(particleShineSprites[i]);

            // Add Torus Shine Particles
            particleShineTorusHoricontalSprites[i] = new PIXI.Graphics();
            particleShineTorusHoricontalContainer.addChild(particleShineTorusHoricontalSprites[i]);

            particleShineTorusVerticalSprites[i] = new PIXI.Graphics();
            particleShineTorusVerticalContainer.addChild(particleShineTorusVerticalSprites[i]);
        }
    } else if (particleShineSprites.length > particleStateMaxCount) {
        for (let i = particleShineSprites.length - 1; i >= particleStateMaxCount; i--) {
            particleShineSprites.splice(i, 1);
            particleShineContainer.removeChild(particleShineSprites[i]);

            // Delete Torus Shine Particles
            particleShineTorusHoricontalSprites.splice(i, 1);
            particleShineTorusHoricontalContainer.removeChild(particleShineTorusHoricontalSprites[i]);

            particleShineTorusVerticalSprites.splice(i, 1);
            particleShineTorusVerticalContainer.removeChild(particleShineTorusVerticalSprites[i]);
        }
    }
}

function drawParticles() {
    refreshParticles();

    let particleShineIndex = 0;

    for (let i = 0; i < particleSprites.length; i++) {
        let particlePosition = [particles[relativeIndex][relativeTimePassed][i][0], particles[relativeIndex][relativeTimePassed][i][1]];
        particleSprites[i].position.set(particlePosition[0], particlePosition[1]);

        if (timePassed > 0) {
            // Set Color of particles
            let colorIndex = Math.abs(particles[relativeIndex][relativeTimePassed][i][2]) - 1;
            let color = particles[relativeIndex][relativeTimePassed][i][2] > 0 ? colorsPos[colorIndex] : colorsNeg[colorIndex];
            particleSprites[i].tint = color;

            // Set size of particles
            let particleScale = radiVals[particles[relativeIndex][relativeTimePassed][i][3]];
            particleSprites[i].scale.set(particleScale * scale, particleScale * scale);

            // Draw Torus Particles
            if (particlePosition[0] < torusParticleSpacing) {
                particleTorusHoricontalSprites[i].position.set(particlePosition[0] + fieldWidth, particlePosition[1]);
            } else if (particlePosition[0] > fieldWidth - torusParticleSpacing) {
                particleTorusHoricontalSprites[i].position.set(particlePosition[0] - fieldWidth, particlePosition[1]);
            }

            if (particlePosition[1] < torusParticleSpacing) {
                particleTorusVerticalSprites[i].position.set(particlePosition[0], particlePosition[1] + fieldWidth);
            } else if (particlePosition[1] > fieldWidth - torusParticleSpacing) {
                particleTorusVerticalSprites[i].position.set(particlePosition[0], particlePosition[1] - fieldWidth);
            }

            // Set color and scale of torus particle
            if (particlePosition[0] < torusParticleSpacing || particlePosition[0] > fieldWidth - torusParticleSpacing 
                || particlePosition[1] < torusParticleSpacing || particlePosition[1] > fieldWidth - torusParticleSpacing) {
                    particleTorusVerticalSprites[i].tint = color;
                    particleTorusVerticalSprites[i].scale.set(particleScale * scale, particleScale * scale);
            }

            // Add shine effect to particles if they are in the last state && and have more than 8 merged Particles includiing itself
            if (Math.abs(particles[relativeIndex][relativeTimePassed][i][2]) == particleMaxState &&
                particles[relativeIndex][relativeTimePassed][i][3] >= 8) {
                let particleCenter = [particlePosition[0] + particleScale / 2, particlePosition[1] + particleScale / 2];

                // Standard Values
                let shineLength = .2;

                // Temporary Values
                let totalLength = Math.max(shineLength * particles[relativeIndex][relativeTimePassed][i][3], 8);

                drawParticleShine(particleShineSprites[particleShineIndex], particleCenter, totalLength, color, particleScale);

                // Draw Torus Shine Particles
                if (particleCenter[0] < torusParticleShineSpacing) {
                    drawParticleShine(particleShineSprites[particleShineIndex], [particleCenter[0] + fieldWidth, particleCenter[1]], totalLength, color, particleScale);
                } else if (particleCenter[0] > fieldWidth - torusParticleShineSpacing) {
                    drawParticleShine(particleShineSprites[particleShineIndex], [particleCenter[0] - fieldWidth, particleCenter[1]], totalLength, color, particleScale);
                }

                if (particleCenter[1] < torusParticleShineSpacing) {
                    drawParticleShine(particleShineSprites[particleShineIndex], [particleCenter[0], particleCenter[1] + fieldWidth], totalLength, color, particleScale);

                } else if (particleCenter[1] > fieldWidth - torusParticleShineSpacing) {
                    drawParticleShine(particleShineSprites[particleShineIndex], [particleCenter[0], particleCenter[1] - fieldWidth], totalLength, color, particleScale);
                }

                particleShineIndex++;
            }
        }
    }
}

function drawParticleShine(sprite, pos, totalLength, color, particleScale) {
    // Standard Values
    let shineGradientSteps = 10;
    let shineStroke = Math.max(particleScale / 4, 1);

    sprite.clear();
    sprite.moveTo(pos[0] - totalLength, pos[1]);

    // Horizontal line
    for (let j = -shineGradientSteps; j <= shineGradientSteps; j++) {
        if (j != 0) {
            sprite.lineStyle(shineStroke, color, 1 / Math.abs(j));
            sprite.lineTo(pos[0] + j * (totalLength / shineGradientSteps), pos[1]);
        }
    }

    // Vertical Line
    sprite.lineStyle(0, color, 0);
    sprite.lineTo(pos[0], pos[1] - totalLength);

    for (let j = -shineGradientSteps; j <= shineGradientSteps; j++) {
        if (j != 0) {
            sprite.lineStyle(shineStroke, color, 1 / Math.abs(j));
            sprite.lineTo(pos[0], pos[1] + j * (totalLength / shineGradientSteps));
        }
    }
}

// ////////////////////////////// PARTICLE FLUID //////////////////////////////

function initFluid() {
    // Intialize Fluid Cells
    let rowCount = (fieldWidth / fluidCellResolution);
    let fluidCellCount = rowCount * rowCount;

    console.log("Init", fluidCellCount, "FluidCells");

    for (let i = 0; i < fluidCellCount; i++) {
        fluidCellSprites[i] = new Sprite(
            resources['../assets/fluidcell.png'].texture
        );

        fluidCellContainer.addChild(fluidCellSprites[i]);
        fluidCellSprites[i].x = (i % rowCount) * fluidCellResolution
        fluidCellSprites[i].y = Math.floor(i / rowCount) * fluidCellResolution;
        fluidCellSprites[i].width = fluidCellResolution;
        fluidCellSprites[i].height = fluidCellResolution;

        let color = fluidCellColors[fluidColorPolarityLength][fluidCellBaseParticleCount];

        fluidCellSprites[i].tint = color;
    }

    fluidCellAlphaDecrease = 1 / (timeEnd - endPhaseTime);

    // Load initial fluidParticleData

    console.log("Init Pixi Fluid", fluidParticleCount, "fluidParticleCount");

    tmpFluidData = new Array(fluidParticleCount);
    for (let i = 0; i < fluidParticleCount; i++) {
        tmpFluidData[i] = [undefined, undefined, 0];
    }

    fluidRows = Math.sqrt(fluidParticleCount);
    resolution = fieldWidth / fluidRows;
    alphaDistance = resolution * 8;

    // Reset fluidOrigin
    fluidOrigins = [];

    for (let i = 0; i < fluidRows; i++) {
        for (let j = 0; j < fluidRows; j++) {
            fluidOrigins.push([j * resolution + resolution / 2, i * resolution + resolution / 2]);
        }
    }

    // Initialize the fluid data
    for (let i = 0; i < fluidParticleCount; i++) {
        fluidSprites[i] = new Sprite(
            resources['../assets/particle_0.png'].texture
        );

        fluidContainer.addChild(fluidSprites[i]);
        fluidSprites[i].scale.set(scale, scale);
        fluidSprites[i].alpha = 0;
    }

    // Initialize Torus fluid data
    for (let i = 0; i < fluidParticleCount; i++) {
        fluidTorusHoricontalSprites[i] = new Sprite(
            resources['../assets/particle_0.png'].texture
        );

        fluidTorusHoricontalContainer.addChild(fluidTorusHoricontalSprites[i]);
        fluidTorusHoricontalSprites[i].scale.set(scale, scale);
        fluidTorusHoricontalSprites[i].alpha = 0;
        fluidTorusHoricontalSprites[i].position.set(-torusFluidParticleSpacing, 0);

        fluidTorusVerticalSprites[i] = new Sprite(
            resources['../assets/particle_0.png'].texture
        );

        fluidTorusVerticalContainer.addChild(fluidTorusVerticalSprites[i]);
        fluidTorusVerticalSprites[i].scale.set(scale, scale);
        fluidTorusVerticalSprites[i].alpha = 0;
        fluidTorusVerticalSprites[i].position.set(0, -torusFluidParticleSpacing);
    }
}

function drawFluid() {
    // Refresh fluid particle vals
    // 3 Values per fluidParticle are saved, therefore we divide the total length of the array at this timeIndex by 3

    if (timePassed > 0) {
        let index = 0;

        for (let i = 0; i < fluid[relativeIndex][relativeTimePassed].length / 3; i++) {
            // Since only the difference between the indexes is saved the index always adds up
            index += fluid[relativeIndex][relativeTimePassed][i * 3];
            let tmpDistance;

            // Check if the particle did cross a border at the side and we need to change the origin corrdinates
            if (getDistance(tmpFluidData[index], [fluid[relativeIndex][relativeTimePassed][i * 3 + 1], fluid[relativeIndex][relativeTimePassed][i * 3 + 2]]) > fieldWidth / 2) {
                if (tmpFluidData[index][0] - fluid[relativeIndex][relativeTimePassed][i * 3 + 1] > fieldWidth / 2) {
                    // Fluidparticle moved over the edge on the right
                    fluidOrigins[index][0] -= fieldWidth;
                } else if (tmpFluidData[index][0] - fluid[relativeIndex][relativeTimePassed][i * 3 + 1] < -fieldWidth / 2) {
                    // Fluidparticle moved over the edge on the right
                    fluidOrigins[index][0] += fieldWidth;
                }

                if (tmpFluidData[index][1] - fluid[relativeIndex][relativeTimePassed][i * 3 + 2] > fieldWidth / 2) {
                    // Fluidparticle moved over the edge on the bottom
                    fluidOrigins[index][1] -= fieldWidth;
                } else if (tmpFluidData[index][1] - fluid[relativeIndex][relativeTimePassed][i * 3 + 2] < -fieldWidth / 2) {
                    // Fluidparticle moved over the edge on the top
                    fluidOrigins[index][1] += fieldWidth;
                }
            }

            if (tmpFluidData[index][2] < alphaDistance) {
                tmpDistance = getDistance(fluidOrigins[index], [fluid[relativeIndex][relativeTimePassed][i * 3 + 1], fluid[relativeIndex][relativeTimePassed][i * 3 + 2]]);
            } else {
                tmpDistance = alphaDistance;
            }

            tmpFluidData[index] = [fluid[relativeIndex][relativeTimePassed][i * 3 + 1], fluid[relativeIndex][relativeTimePassed][i * 3 + 2], tmpDistance];
        }
    }

    // Draw Fluid Particles
    for (let i = 0; i < fluidParticleCount; i++) {
        if (tmpFluidData[i][0] != undefined) {
            let alpha;

            if (tmpFluidData[i][2] != alphaDistance) {
                alpha = (tmpFluidData[i][2] / alphaDistance).toFixed(2);
            } else {
                alpha = 1;
            }

            fluidSprites[i].alpha = alpha;
            fluidSprites[i].position.set(tmpFluidData[i][0], tmpFluidData[i][1]);

            // Draw torus fluid particles
            if (tmpFluidData[i][0] < torusFluidParticleSpacing) {
                fluidTorusHoricontalSprites[i].alpha = alpha;
                fluidTorusHoricontalSprites[i].position.set(tmpFluidData[i][0] + fieldWidth, tmpFluidData[i][1]);
            } else if (tmpFluidData[i][0] > fieldWidth - torusFluidParticleSpacing) {
                fluidTorusHoricontalSprites[i].alpha = alpha;
                fluidTorusHoricontalSprites[i].position.set(tmpFluidData[i][0] - fieldWidth, tmpFluidData[i][1]);
            }

            if (tmpFluidData[i][1] < torusFluidParticleSpacing) {
                fluidTorusVerticalSprites[i].alpha = alpha;
                fluidTorusVerticalSprites[i].position.set(tmpFluidData[i][1] + fieldWidth, tmpFluidData[i][1]);
            } else if (tmpFluidData[i][1] > fieldWidth - torusFluidParticleSpacing) {
                fluidTorusVerticalSprites[i].alpha = alpha;
                fluidTorusVerticalSprites[i].position.set(tmpFluidData[i][1] - fieldWidth, tmpFluidData[i][1]);
            }
        }
    }

}

function drawFluidCells() {
    // 3 Values per fluidCell are saved, therefore we divide the total length of the array at this timeIndex by 3

    let index = 0;

    for (let i = 0; i < fluidCells[relativeIndex][relativeTimePassed].length / 3; i++) {
        let fluidColorIndex = Math.min(fluidCells[relativeIndex][relativeTimePassed][i * 3 + 1], fluidColorLength - 1);
        let fluidColorPolarityIndex = Math.min(Math.max(fluidCells[relativeIndex][relativeTimePassed][i * 3 + 2], -fluidColorPolarityLength), fluidColorPolarityLength) + fluidColorPolarityLength;

        let color = fluidCellColors[fluidColorPolarityIndex][fluidColorIndex];

        index += fluidCells[relativeIndex][relativeTimePassed][i * 3];

        fluidCellSprites[index].tint = color;
    }

    // In the endPhase decrease the alpha of all fluid Cells step by step
    if (timePassed >= endPhaseTime) {
        for (let i = 0; i < fluidCellSprites.length; i++) {
            fluidCellSprites[i].alpha -= fluidCellAlphaDecrease;
        }
    }
}

// ////////////////////////////// CELLULAR AUTOMATA //////////////////////////////

let caCells = [];
let caAliveCount = [];
let caAliveCountMax = 64;

function initCellularAutomata() {
    console.log("Init Pixi CA");

    let rowCount = fieldWidth / cellularAutomataResolution;

    for (let i = 0; i < rowCount * rowCount; i++) {
        caCells[i] = false;
        caAliveCount[i] = 0;

        caSprites[i] = new Sprite(
            resources['../assets/cell.png'].texture
        );

        let cellularAutomataPadding = (cellularAutomataResolution - cellularAutomataCellSize) / 2;

        caSprites[i].x = (i % rowCount) * cellularAutomataResolution + cellularAutomataPadding;
        caSprites[i].y = Math.floor(i / rowCount) * cellularAutomataResolution + cellularAutomataPadding;
        caSprites[i].visible = caCells[i];

        // Set Size to half of original resolution
        caSprites[i].width = cellularAutomataCellSize;
        caSprites[i].height = cellularAutomataCellSize;

        cellularAutomataContainer.addChild(caSprites[i]);
    }
}

function drawCellularAutomata() {
    let index = 0;

    // Update Cells
    for (let i = 0; i < cellularAutomataData[relativeIndex][relativeTimePassed].length; i++) {
        index += cellularAutomataData[relativeIndex][relativeTimePassed][i][0];
        let alive = cellularAutomataData[relativeIndex][relativeTimePassed][i][1] == 1 ? true : false;

        caCells[index] = alive;

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
                caSprites[i].alpha = caAliveCount[i] / caAliveCountMax;
            } else {
                caSprites[i].alpha = 1;
            }
        } else {
            caAliveCount[i] = 0;
        }
    }
}

// ////////////////////////////// LINE TRAILS //////////////////////////////

let lineTrails = [];

function updateLineTrails() {
    // Add new trails to the array
    for (let i = lineTrails.length; i < lineTrailsData[relativeIndex][relativeTimePassed].length; i++) {
        lineTrails.push([0, lineTrailsData[relativeIndex][relativeTimePassed][i]]);

        lineTrailGraphics.push(new PIXI.Graphics());
        lineTrailContainer.addChild(lineTrailGraphics[i]);
    }

    // Update the duration value and add the position to the array
    for (let i = 0; i < lineTrails.length; i++) {
        if (lineTrailsData[relativeIndex][relativeTimePassed][i] != undefined && lineTrailsData[relativeIndex][relativeTimePassed][i] != null) {
            lineTrails[i][1].push(lineTrailsData[relativeIndex][relativeTimePassed][i]);
            lineTrails[i][0]++;
        } else if (lineTrails[i][0] > 0) {
            lineTrails[i][0]--;
            lineTrails[i][1].splice(0, 1);
        }
    }
}

function drawLineTrails() {
    // Draw LineTrails
    for (let i = 0; i < lineTrails.length; i++) {
        if (lineTrails[i][0] > 0) {
            lineTrailGraphics[i].clear();
            lineTrailGraphics[i].lineStyle(lineTrailStroke, 0xFFFFFF, .4);

            // Move to first position
            let pos = lineTrails[i][1][0];
            lineTrailGraphics[i].moveTo(parseFloat(pos[0]), parseFloat(pos[1]));

            // Draw a line through all positions in the past
            for (let j = 1; j < lineTrails[i][1].length; j++) {

                pos = lineTrails[i][1][j];
                let prevPos = lineTrails[i][1][j - 1];

                // If Trail crosses border
                let torus = false;
                let torusPos = [
                    [pos[0], pos[1]],
                    [prevPos[0], prevPos[1]]
                ];

                if (getDistance(prevPos, pos) > fieldWidth/2) {
                    torus = true;

                    if (prevPos[0] - pos[0] > fieldWidth / 2) {
                        torusPos[0][0] += fieldWidth;
                        torusPos[1][0] -= fieldWidth;
                    } else if (prevPos[0] - pos[0] < -fieldWidth / 2) {
                        torusPos[0][0] -= fieldWidth;
                        torusPos[1][0] += fieldWidth;
                    }
                    if (prevPos[1] - pos[1] > fieldWidth / 2) {
                        torusPos[0][1] += fieldWidth;
                        torusPos[1][1] -= fieldWidth;
                    } else if (prevPos[1] - pos[1] < -fieldWidth / 2) {
                        torusPos[0][1] -= fieldWidth;
                        torusPos[1][1] += fieldWidth;
                    }
                }

                if (torus) {
                    lineTrailGraphics[i].lineTo(parseFloat(torusPos[0][0]), parseFloat(torusPos[0][1]));

                    lineTrailGraphics[i].lineStyle(0, 0x000000, 0);
                    lineTrailGraphics[i].lineTo(parseFloat(torusPos[1][0]), parseFloat(torusPos[1][1]));
                    lineTrailGraphics[i].lineStyle(lineTrailStroke, 0xFFFFFF, .4);
                } else {
                    lineTrailGraphics[i].lineTo(parseFloat(pos[0]), parseFloat(pos[1]));
                }
            }
        } else if (lineTrails[i][0] == 0) {
            lineTrailGraphics[i].clear();
            lineTrails[i][0]--;
        }
    }
}

// ////////////////////////////// SHOCKWAVES //////////////////////////////

function drawShockwaves() {
    // Add new Shockwave Filters
    let newShockwave = false;
    for (let i = 0; i < shockwaveData[relativeIndex][relativeTimePassed].length; i++) {
        shockwaveFilters.push(new PIXI.filters.ShockwaveFilter());

        let strength = shockwaveData[relativeIndex][relativeTimePassed][i][2];

        // Set shockwaveFilter
        shockwaveFilters[shockwaveFilters.length - 1].center.x = shockwaveData[relativeIndex][relativeTimePassed][i][0];
        shockwaveFilters[shockwaveFilters.length - 1].center.y = shockwaveData[relativeIndex][relativeTimePassed][i][1];
        shockwaveFilters[shockwaveFilters.length - 1].amplitude = Math.round(shockwaveAmplitudeBase * strength/shockwaveStrengthBase);
        shockwaveFilters[shockwaveFilters.length - 1].wavelength = Math.round(shockwaveWavelengthBase* strength/shockwaveStrengthBase);
        shockwaveFilters[shockwaveFilters.length - 1].radius = shockwaveRadiusBase * strength;

        newShockwave = true;
    }

    // Actualize filters if a new filter is added
    if (newShockwave) {
        viewContainer.filters = shockwaveFilters;
    }

    // Increase Timer for shockwaves
    for (let i = 0; i < shockwaveFilters.length; i++) {
        shockwaveFilters[i].time += shockwaveTimingBase;
    }

    // Delete passed shockwaves
    for (let i = shockwaveFilters.length - 1; i >= 0; i--) {
        if (shockwaveFilters[i].time > 1) {
            shockwaveFilters.splice(i, 1);
            viewContainer.filters = shockwaveFilters;
        }
    }
}

// ////////////////////////////// RESET //////////////////////////////
let fluidReady = false;
let fluidCellsReady = false;
let cellularAutomataReady = false;
let lineTrailsReady = false;

function reset(time) {
    loadingReset = true;
    play = false;

    resetParticles();

    // Fluid Reset
    /*
        Iterate through all data of the fluid AND the fluid Cells from the beginning to the new time to load the current data.
    */
    fluidReady = false;
    fluid = [
        [],
        []
    ];

    fluidCellsReady = false;
    fluidCells = [
        [],
        []
    ];

    initResetFluid();
    resetFluid(time);

    initResetFluidCells();
    resetFluidCells(time);

    // CA Reset
    /*
        Iterate through all data of the cellular Automata from the beginning to the new time to load the current data.
    */
    cellularAutomataReady = false;
    cellularAutomataData = [
        [],
        []
    ];

    initResetCellularAutomata();
    resetCellularAutomata(time);

    // Line Trails
    while (lineTrailContainer.children[0]) {
        lineTrailContainer.removeChild(lineTrailContainer.children[0]);
    }

    lineTrailsReady = false;
    lineTrails = [];
    lineTrailsData = [
        [],
        []
    ];

    resetLineTrails(time);
}

function resetParticles() {
    // Particle Reset
    // Delete all particle elements from the stage
    particles = [
        [],
        []
    ];

    particleSprites = [];
    while (particleContainer.children[0]) {
        particleContainer.removeChild(particleContainer.children[0]);
    }
    particleShineSprites = [];
    while (particleShineContainer.children[0]) {
        particleShineContainer.removeChild(particleShineContainer.children[0]);
    }

    // Load both particle arrays
    loadFile(Math.floor(timePassed / saveFreq), (Math.floor(timePassed / saveFreq) % 2), particles, 'particles', undefined);
    loadFile(Math.floor(timePassed / saveFreq) + 1, ((Math.floor(timePassed / saveFreq) + 1) % 2), particles, 'particles', undefined);
}

function initResetFluid() {
    // Load initial fluidParticleData
    tmpFluidData = new Array(fluidParticleCount);
    for (let i = 0; i < fluidParticleCount; i++) {
        tmpFluidData[i] = [undefined, undefined, 0];
    }

    fluidRows = Math.sqrt(fluidParticleCount);
    resolution = fieldWidth / fluidRows;
    alphaDistance = resolution * 8;

    // Reset fluidOrigin
    fluidOrigins = [];

    for (let i = 0; i < fluidRows; i++) {
        for (let j = 0; j < fluidRows; j++) {
            fluidOrigins.push([j * resolution + resolution / 2, i * resolution + resolution / 2]);
        }
    }

    // Initialize the fluid data
    for (let i = 0; i < fluidParticleCount; i++) {
        fluidSprites[i].scale.set(scale, scale);
        fluidSprites[i].alpha = 0;
    }
}

function resetFluid(index) {

    console.log("Loading Fluid", index * saveFreq);

    fetch('../' + tmpPath + '/data/' + pad(index, 6) + '_fluid.json')
        .then(response => response.json())
        .then(function (data) {
            fluid[index % 2] = [...data];
            
            for (let i = index * saveFreq; i < (index + 1) * saveFreq; i++) {
                let tmpRelativeTimePassed = i - Math.floor(i / saveFreq) * saveFreq;
                let tmpRelativeIndex = Math.floor(i / saveFreq) % 2;

                let fluidIndex = 0;

                for (let j = 0; j < fluid[tmpRelativeIndex][tmpRelativeTimePassed].length / 3; j++) {

                    fluidIndex += fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3];
                    let tmpDistance;

                    // Check if the particle did cross a border at the side and we need to change the origin corrdinates
                    if (getDistance(tmpFluidData[fluidIndex], [fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 1], fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 2]]) > fieldWidth / 2) {
                        if (tmpFluidData[fluidIndex][0] - fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 1] > fieldWidth / 2) {
                            // Fluidparticle moved over the edge on the right
                            fluidOrigins[fluidIndex][0] -= fieldWidth;
                        } else if (tmpFluidData[fluidIndex][0] - fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 1] < -fieldWidth / 2) {
                            // Fluidparticle moved over the edge on the right
                            fluidOrigins[fluidIndex][0] += fieldWidth;
                        }

                        if (tmpFluidData[fluidIndex][1] - fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 2] > fieldWidth / 2) {
                            // Fluidparticle moved over the edge on the bottom
                            fluidOrigins[fluidIndex][1] -= fieldWidth;
                        } else if (tmpFluidData[fluidIndex][1] - fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 2] < -fieldWidth / 2) {
                            // Fluidparticle moved over the edge on the top
                            fluidOrigins[fluidIndex][1] += fieldWidth;
                        }
                    }

                    if (tmpFluidData[fluidIndex][2] < alphaDistance) {
                        tmpDistance = getDistance(fluidOrigins[fluidIndex], [fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 1], fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 2]]);
                    } else {
                        tmpDistance = alphaDistance;
                    }

                    tmpFluidData[fluidIndex] = [fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 1], fluid[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 2], tmpDistance];
                }

                // Fill the second array with fluid data of the next segment
                if (i == timePassed) {
                    fetch('../' + tmpPath + '/data/' + pad(index + 1, 6) + '_fluid.json')
                        .then(response => response.json())
                        .then(function (data) {
                            fluid[(index + 1) % 2] = [...data];
                            fluidReady = true;
                        });
                }
            }

            if ((index + 1) * saveFreq < timePassed) {
                resetFluid(index + 1);
            }
        });
}

function initResetFluidCells() {
    // Intialize Fluid Cells
    let rowCount = (fieldWidth / fluidCellResolution);
    let fluidCellCount = rowCount * rowCount;

    console.log("Init", fluidCellCount, "Reset FluidCells");

    for (let i = 0; i < fluidCellCount; i++) {
        let color = fluidCellColors[fluidColorPolarityLength][fluidCellBaseParticleCount];

        fluidCellSprites[i].tint = color;
    }

    fluidCellAlphaDecrease = 1 / (timeEnd - endPhaseTime);

    console.log("Finished Fluid Cell Reset Init");
}

function resetFluidCells(index) {

    console.log("Loading Fluid Cells", index * saveFreq);

    fetch('../' + tmpPath + '/data/' + pad(index, 6) + '_fluidCells.json')
        .then(response => response.json())
        .then(function (data) {
            fluidCells[index % 2] = [...data];

            for (let i = index * saveFreq; i < (index + 1) * saveFreq; i++) {
                let tmpRelativeTimePassed = i - Math.floor(i / saveFreq) * saveFreq;
                let tmpRelativeIndex = Math.floor(i / saveFreq) % 2;

                let fluidCellindex = 0;

                for (let j = 0; j < fluidCells[tmpRelativeIndex][tmpRelativeTimePassed].length / 3; j++) {
                    if (fluidCells[tmpRelativeIndex][tmpRelativeTimePassed][j * 3] != undefined) {
                        let fluidColorIndex = Math.min(fluidCells[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 1], fluidColorLength - 1);
                        let fluidColorPolarityIndex = Math.min(Math.max(fluidCells[tmpRelativeIndex][tmpRelativeTimePassed][j * 3 + 2], -fluidColorPolarityLength), fluidColorPolarityLength) + fluidColorPolarityLength;

                        let color = fluidCellColors[fluidColorPolarityIndex][fluidColorIndex];

                        fluidCellindex += fluidCells[tmpRelativeIndex][tmpRelativeTimePassed][j * 3];

                        fluidCellSprites[fluidCellindex].tint = color;
                    }
                }

                if (i >= endPhaseTime) {
                    for (let j = 0; j < fluidCellSprites.length; j++) {
                        fluidCellSprites[j].alpha -= fluidCellAlphaDecrease;
                    }
                }

                // Fill the second array with fluid data of the next segment
                if (i == timePassed) {
                    fetch('../' + tmpPath + '/data/' + pad(index + 1, 6) + '_fluidCells.json')
                        .then(response => response.json())
                        .then(function (data) {
                            fluidCells[(index + 1) % 2] = [...data];
                            fluidCellsReady = true;
                        });
                }
            }

            animateLoadingCircle();

            if ((index + 1) * saveFreq < timePassed) {
                resetFluidCells(index + 1);
            }
        });
}

function initResetCellularAutomata() {
    console.log("Init Reset CA");

    let rowCount = fieldWidth / cellularAutomataResolution;

    for (let i = 0; i < rowCount * rowCount; i++) {
        caCells[i] = false;
        caAliveCount[i] = 0;

        caSprites[i].visible = caCells[i];
    }
}

function resetCellularAutomata(index) {

    console.log("Loading Cellular Automata", index * saveFreq);

    fetch('../' + tmpPath + '/data/' + pad(index, 6) + '_cellularAutomata.json')
        .then(response => response.json())
        .then(function (data) {
            cellularAutomataData[index % 2] = [...data];

            for (let i = index * saveFreq; i < (index + 1) * saveFreq; i++) {
                let tmpRelativeTimePassed = i - Math.floor(i / saveFreq) * saveFreq;
                let tmpRelativeIndex = Math.floor(i / saveFreq) % 2;

                // Update Cells
                for (let j = 0; j < cellularAutomataData[tmpRelativeIndex][tmpRelativeTimePassed].length; j++) {
                    let index = cellularAutomataData[tmpRelativeIndex][tmpRelativeTimePassed][j];

                    caCells[index] = !caCells[index];

                    caSprites[index].visible = caCells[index];
                }

                // Set Alpha for CA Cells
                for (let j = 0; j < caCells.length; j++) {
                    if (caCells[j]) {
                        if (caAliveCount[j] < caAliveCountMax) {
                            caAliveCount[j]++;
                        }

                        if (caAliveCount[j] == 1) {
                            caSprites[j].alpha = 1;
                        } else if (caAliveCount[j] < caAliveCountMax) {
                            caSprites[j].alpha = caAliveCount[j] / caAliveCountMax;
                        } else {
                            caSprites[j].alpha = 1;
                        }
                    } else {
                        caAliveCount[j] = 0;
                    }
                }

                // Fill the second array with data of the next segment
                if (i == timePassed) {
                    fetch('../' + tmpPath + '/data/' + pad(index + 1, 6) + '_cellularAutomata.json')
                        .then(response => response.json())
                        .then(function (data) {
                            cellularAutomataData[(index + 1) % 2] = [...data];
                            cellularAutomataReady = true;
                        });
                }
            }

            animateLoadingCircle();

            if ((index + 1) * saveFreq < timePassed) {
                resetCellularAutomata(index + 1);
            }
        });
}

function resetLineTrails(index) {

    console.log("Loading Line Trails", index * saveFreq);

    fetch('../' + tmpPath + '/data/' + pad(index, 6) + '_lineTrails.json')
        .then(response => response.json())
        .then(function (data) {
            lineTrailsData[index % 2] = [...data];

            for (let i = index * saveFreq; i < (index + 1) * saveFreq; i++) {
                let tmpRelativeTimePassed = i - Math.floor(i / saveFreq) * saveFreq;
                let tmpRelativeIndex = Math.floor(i / saveFreq) % 2;

                // Updating Line Trails
                // Add new trails to the array
                for (let j = lineTrails.length; j < lineTrailsData[tmpRelativeIndex][tmpRelativeTimePassed].length; j++) {
                    lineTrails.push([0, lineTrailsData[tmpRelativeIndex][tmpRelativeTimePassed][j]]);

                    lineTrailGraphics.push(new PIXI.Graphics());
                    lineTrailContainer.addChild(lineTrailGraphics[j]);
                }

                // Update the duration value and add the position to the array
                for (let j = 0; j < lineTrails.length; j++) {
                    if (lineTrailsData[tmpRelativeIndex][tmpRelativeTimePassed][j] != undefined && lineTrailsData[tmpRelativeIndex][tmpRelativeTimePassed][j] != null) {
                        lineTrails[j][1].push(lineTrailsData[tmpRelativeIndex][tmpRelativeTimePassed][j]);
                        lineTrails[j][0]++;
                    } else if (lineTrails[j][0] > 0) {
                        lineTrails[j][0]--;
                        lineTrails[j][1].splice(0, 1);
                    }
                }

                // Fill the second array with data of the next segment
                if (i == timePassed) {
                    fetch('../' + tmpPath + '/data/' + pad(index + 1, 6) + '_lineTrails.json')
                        .then(response => response.json())
                        .then(function (data) {
                            lineTrailsData[(index + 1) % 2] = [...data];
                            lineTrailsReady = true;
                        });
                }
            }

            animateLoadingCircle();

            if ((index + 1) * saveFreq < timePassed) {
                resetLineTrails(index + 1);
            }
        });
}

function checkReset() {
    let particlesReady = true;

    for (let i = 0; i < particles.length; i++) {
        if (particles[i].length != saveFreq) {
            particlesReady = false;
            break;
        }
    }

    if (particlesReady && fluidReady && fluidCellsReady && cellularAutomataReady && lineTrailsReady) {
        document.body.classList.remove("loading");

        relativeIndex = Math.floor(timePassed / saveFreq) % 2;

        loaderElement.style.display = 'none';
        document.getElementById('loading-circle').style.strokeDashoffset = loadCircleCircu;

        loadingReset = false;
        play = true;
    }
}

window.addEventListener('resize', resize);

function resize() {
    // Get the parent element
    const parent = app.view.parentNode;

    // Resize the renderer
    app.renderer.resize(parent.clientWidth, parent.clientHeight);

    if (app.screen.height < app.screen.width) {
        viewContainer.height = app.screen.height;
        viewContainer.width = app.screen.height;
    } else {
        viewContainer.height = app.screen.width;
        viewContainer.width = app.screen.width;
    }

    // You can use the 'screen' property as the renderer visible
    // area, this is more useful than view.width/height because
    // it handles resolution
    viewContainer.position.set(app.screen.width/2 - viewContainer.width/2, app.screen.height/2 - viewContainer.height/2);
}