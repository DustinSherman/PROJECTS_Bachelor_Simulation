// ////////////////////////////// INFO

// Add variable text to html
let iterationElement = document.getElementById('iteration');
let dateElement = document.getElementById('date');

function addDataToHTML() {
    iterationElement.innerHTML += tmpPath;

    let dateFormatted = pad(startDate.getDate(), 2) + "." + pad(startDate.getMonth() + 1, 2) + "." + startDate.getFullYear() + " " + pad(startDate.getHours(), 2) + ":" + pad(startDate.getMinutes(), 2)
    dateElement.innerHTML += dateFormatted;
}

// ////////////////////////////// TIMELINE

function updateTime(time) {
    // Marker
    let position = (time/timeEnd) * 100;
    let markerElement = document.getElementById('marker');
    markerElement.style.left = position + '%';

    // Text
    let framesElement = document.getElementById('frames');
    framesElement.innerHTML = timePassed + " / " + timeEnd;

    let realTimeElement = document.getElementById('realtime');
    let realTimeString = pad(Math.floor((timePassed / fps) / 60), 2);
    realTimeString += ":" + pad(Math.floor((timePassed / fps) % 60), 2);
    realTimeString += " / ";
    realTimeString += pad(Math.floor((timeEnd / fps) / 60), 2);
    realTimeString += ":" + pad(Math.floor((timeEnd / fps) % 60), 2);

    realTimeElement.innerHTML = realTimeString;
}

let lineElement = document.getElementById('line');

lineElement.addEventListener("click", function (event) {
    play = false;

    document.body.classList.add("loading");
    loaderElement.style.display = 'flex';

    let timelineElement = document.getElementById('timeline');

    let timeLinePos = timelineElement.getBoundingClientRect().left;
    let timelineWidth = timelineElement.offsetWidth;

    let position = event.pageX - timeLinePos;

    let newTime = timeEnd * (position / timelineWidth);

    loadProgress = 0;

    timePassed = Math.round(newTime);

    // Substract one because saveFiles start with 0
    let lastSaveAllIndex = Math.floor(timePassed / saveAllFreq) * (saveAllFreq / saveFreq) - 1;

    setTimeout(function() {
        reset(lastSaveAllIndex)
    }, 500);

    updateTime(timePassed);
});

// ////////////////////////////// CONTROLS

let playpauseElement = document.getElementById('playpause');
playpauseElement.addEventListener("click", function () {
    this.classList.toggle("active");
    play = !play;
}, false);

let speedElement = document.getElementById('speed');

let fasterElement = document.getElementById('fastforward');
fasterElement.addEventListener("click", function () {
    if (speed < 2) {
        speed += .25;
        speedElement.innerHTML = speed.toFixed(2);
    }
})

let slowerElement = document.getElementById('fastbackward');
slowerElement.addEventListener("click", function () {
    if (speed > .5) {
        speed -= .25;
        speedElement.innerHTML = speed.toFixed(2);
    }
})

let fullscreenElement = document.getElementById('fullscreen');
fullscreenElement.addEventListener("click", function () {
    if (isFullScreenCurrently()) {
        goOutFullscreen();
        document.body.classList.remove('fullscreen');
    } else {
        goInFullscreen(document.body);
        document.body.classList.add('fullscreen');
    }

    setTimeout(() => {
        resize();
    }, 5000);
})

let closeheaderElement = document.getElementById('closeheader');
let headerElement = document.getElementById('header');
closeheaderElement.addEventListener("click", function () {
    if (headerElement.classList.contains('closed')) {
        headerElement.classList.remove('closed');
        this.classList.remove('closed');
        headerElement.style.marginTop = "-1px";

        resize();
    } else {
        headerElement.classList.add('closed');
        this.classList.add('closed');

        let headerHeight = headerElement.offsetHeight;
        headerElement.style.marginTop = "-" + headerHeight + "px";

        resizeCanvas();
    }
})

// ////////////////////////////// USEFUL FUNCTIONS

function getDistance(pos0, pos1) {
    let distX = (pos0[0] - pos1[0]);
    let distY = (pos0[1] - pos1[1]);

    return Math.sqrt(distX * distX + distY * distY);
}

function convertDate(date) {
    let newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);

    let offset = date.getTimezoneOffset() / 60;
    let hours = date.getHours();

    let currentYear = new Date().getFullYear();
    const beginSummertime = new Date('03/29' + currentYear);
    const endSummertime = new Date('10/25' + currentYear);

    if (!(date > beginSummertime && date < endSummertime)) {
        offset += 1;
    }

    newDate.setHours(hours - offset);

    return newDate;
}

function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length - size);
}