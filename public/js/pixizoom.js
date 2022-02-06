let zoomScale = 1;
const el = document.getElementById('wrapper');
let lastPos = null;
let newScale = {x: 1, y: 1};

const scaleSpan = document.getElementById('scale_value');
const minimapDiv = document.getElementById('minimap_view');

el.onwheel = function(event) {
    event.preventDefault();

    zoom(event.deltaY, event.offsetX, event.offsetY);
}

el.onmousedown = function(event) {
    lastPos = {x: event.offsetX, y: event.offsetY};
}

el.onmouseup = function() {
    lastPos = null;
}

el.onmousemove = function(event) {
    if (lastPos) {
        changePos({x: app.stage.x + (event.offsetX - lastPos.x), y: app.stage.y + (event.offsetY - lastPos.y)});
        lastPos = {x: event.offsetX, y: event.offsetY};
    }
}

function zoom(s, x, y) {
    let maxScale = 4;
    let minScale = 1;

    s = s > 0 ? 1.1 : 0.9;

    var worldPos = {x: (x - app.stage.x) / app.stage.scale.x, y: (y - app.stage.y)/app.stage.scale.y};
    newScale = {x: Math.max(Math.min(app.stage.scale.x * s, maxScale), minScale), y: Math.max(Math.min(app.stage.scale.y * s, maxScale), minScale)};
    
    var newScreenPos = {x: (worldPos.x ) * newScale.x + app.stage.x, y: (worldPos.y) * newScale.y + app.stage.y};

    app.stage.scale.x = newScale.x;
    app.stage.scale.y = newScale.y;

    let newPos = {x: app.stage.x - (newScreenPos.x - x), y: app.stage.y - (newScreenPos.y - y)};

    changePos(newPos);

    scaleSpan.innerHTML = newScale.x.toFixed(2) + "x";

    scaleShockwaves(viewContainer.width/fieldWidth, newPos);
};

function changePos(pos) {
    let minX, minY, maxX, maxY;

    if (app.stage.width >= innerWidth) {
        minX = -((app.screen.width * newScale.x) - app.stage.width)/2;
        maxX = -((app.screen.width * newScale.x) - app.stage.width)/2 - (app.stage.width - app.screen.width)

        pos.x = Math.max(Math.min(pos.x, minX), maxX);
    } else {
        minX = ((app.screen.width * newScale.x) - app.stage.width)/2;
        maxX = -((app.screen.width * newScale.x) - app.stage.width)/2;

        pos.x = Math.max(Math.min(pos.x, minX), maxX);
    }

    if (app.stage.height >= app.screen.height) {
        minY = -((app.screen.height * newScale.y) - app.stage.height)/2;
        maxY = -((app.screen.height * newScale.y) - app.stage.height)/2 - (app.stage.height - app.screen.height)

        pos.y = Math.max(Math.min(pos.y, minY), maxY);
    } else {
        minY = 0;
        maxY = 0;

        pos.y = 0;
    }

    app.stage.x = pos.x;
    app.stage.y = pos.y;

    let minimapView = 50;

    minimapDiv.style.width = Math.min((minimapView/newScale.x) * app.screen.width/app.screen.height, minimapView) + "px";
    minimapDiv.style.height = (minimapView/newScale.y) + "px";

    let relativeMinimapSize = minimapView/newScale.x;

    let marginTop = ((minY - app.stage.y)/app.stage.height) * minimapView;
    let marginLeft = 0;
    if (app.stage.width >= app.screen.width) {
        marginLeft = ((minX - app.stage.x)/app.stage.width) * minimapView;
    }

    minimapDiv.style.margin = marginTop + "px 0 0 " + marginLeft + "px";
}

function scaleShockwaves(tmpScale, newPos) {
    let scale = tmpScale * screenScale;

    for (let i = 0; i < shockwaveFilters.length; i++) {
        shockwaveFilters[i].amplitude = shockwaveFilterVals[i].amplitude * scale;
        shockwaveFilters[i].wavelength = shockwaveFilterVals[i].waveLength * scale;
        shockwaveFilters[i].radius = shockwaveFilterVals[i].radius * scale;
    
        shockwaveFilters[i].center.x = shockwaveFilterVals[i].x * scale + (newPos.x);
        shockwaveFilters[i].center.y = shockwaveFilterVals[i].y * scale + (newPos.y);
    }
}