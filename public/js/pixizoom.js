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

el.onmouseup = function(event) {
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
  
    changePos({x: app.stage.x - (newScreenPos.x - x), y: app.stage.y - (newScreenPos.y - y)});
    app.stage.scale.x = newScale.x;
    app.stage.scale.y = newScale.y;

    scaleSpan.innerHTML = newScale.x.toFixed(2) + "x";
};

function changePos(pos) {
    let minPos = -fieldWidth * (newScale.x - 1);
    let maxPos = 0;

    app.stage.x = Math.max(Math.min(pos.x, maxPos), minPos);
    app.stage.y = Math.max(Math.min(pos.y, maxPos), minPos);

    let minimapView = 50;

    minimapDiv.style.width = minimapView/newScale.x + "px";
    minimapDiv.style.height = minimapView/newScale.y + "px";

    let relativeMinimapSize = minimapView/newScale.x;

    minimapDiv.style.margin = ((-app.stage.y/fieldWidth) * relativeMinimapSize) + "px 0 0 " + ((-app.stage.x/fieldWidth) * relativeMinimapSize) + "px";
}