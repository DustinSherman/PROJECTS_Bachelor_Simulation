let hamburgerElement = document.getElementById('hamburger');
let navElement = document.getElementById("nav");
// let overlayElement = document.getElementById("overlay");

// Toogle Classes on hamburger Menu
hamburgerElement.addEventListener("click", function () {
    this.classList.toggle("is-active");
    navElement.classList.toggle("is-open");
    // overlayElement.classList.toggle("open");
}, false);