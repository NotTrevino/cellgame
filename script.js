var redball = null;
var blueball = null;
var food = null;
var foodElements = null;

var redballVX = 0;
var redballVY = 0;
var redspeed = 0.5;
var redWinsCount = 0;
var redballX = 0;
var redballY = 0;

var blueballVX = 0;
var blueballVY = 0;
var bluespeed = 0.5;
var blueWinsCount = 0;
var blueballX = 680;
var blueballY = 430;

function init() {
    redball = document.getElementById("redball");
    redball.style.left = "0px";
    redball.style.top = "0px";

    blueball = document.getElementById("blueball");
    blueball.style.left = "680px";
    blueball.style.top = "430px";

    foodElements = document.getElementsByClassName("food");

    spawnfood();
}

window.onload = init;

function spawnfood() {
    var boxWidth = 700;
    var boxHeight = 450;
    var foodSize = 10;
    var maxX = boxWidth - foodSize;
    var maxY = boxHeight - foodSize;

    for (var i = 0; i < 25; i++) {
        var food = foodElements[i];
        if (food === undefined) {
            food = document.createElement("div");
            food.classList.add("food");
            document.getElementById("box").appendChild(food);
        }
        var randomX = Math.floor(Math.random() * maxX);
        var randomY = Math.floor(Math.random() * maxY);
        food.style.left = randomX + "px";
        food.style.top = randomY + "px";
    }
}

setInterval(spawnfood, 15000);

function moveredLeft() {
    redballVX = -redspeed;
    redballVY = 0;
}

function moveredUp() {
    redballVY = -redspeed;
    redballVX = 0;
}

function moveredRight() {
    redballVX = redspeed;
    redballVY = 0;
}

function moveredDown() {
    redballVY = redspeed;
    redballVX = 0;
}

function moveblueLeft() {
    blueballVX = -bluespeed;
    blueballVY = 0;
}

function moveblueUp() {
    blueballVY = -bluespeed;
    blueballVX = 0;
}

function moveblueRight() {
    blueballVX = bluespeed;
    blueballVY = 0;
}

function moveblueDown() {
    blueballVY = bluespeed;
    blueballVX = 0;
}

function getKeyAndMove(e) {
    var key_code = e.which || e.keyCode;
    switch (key_code) {
        case 65: //"a" key
            moveredLeft();
            break;
        case 87: //"w" key
            moveredUp();
            break;
        case 68: //"d" key
            moveredRight();
            break;
        case 83: //s key
            moveredDown();
            break;
        case 37: //left arrow key
            moveblueLeft();
            break;
        case 38: //up arrow key
            moveblueUp();
            break;
        case 39: //right arrow key
            moveblueRight();
            break;
        case 40: //down arrow key
            moveblueDown();
            break;
    }
}

function redballgrowth() {
    if (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) < 225) {
        var size = parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius"));
        size += 1;
        redball.style.width = size * 2 + "px";
        redball.style.height = size * 2 + "px";
        redball.style.borderRadius = size + "px";
    }
    if (redballX + redballVX > 700 - (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2) && parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) < 225) {
        redballX = 700 - (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2);
    }
    if (redballY > 450 - (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2) && parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) < 225) {
        redballY = 450 - (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2);
    }
}

function blueballgrowth() {
    if (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) < 225) {
        var size = parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius"));
        size += 1;
        blueball.style.width = size * 2 + "px";
        blueball.style.height = size * 2 + "px";
        blueball.style.borderRadius = size + "px";
    }
    if (blueballX + blueballVX > 700 - (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2) && parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) < 225) {
        blueballX = 700 - (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2);
    }
    if (blueballY + blueballVY > 450 - (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2) && parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) < 225) {
        blueballY = 450 - (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2);
    }
}

function resetballsize() {
    redball.style.width = "20px";
    redball.style.height = "20px";
    redball.style.borderRadius = "10px";
    blueball.style.width = "20px";
    blueball.style.height = "20px";
    blueball.style.borderRadius = "10px";
}

function resetballpos() {
    redballX = 0;
    redballY = 0;
    redballVX = 0;
    redballVY = 0;
    blueballX = 680;
    blueballY = 430;
    blueballVX = 0;
    blueballVY = 0;
    redball.style.left = redballX + "px";
    redball.style.top = redballY + "px";
    blueball.style.left = blueballX + "px";
    blueball.style.top = blueballY + "px";
}

function redwins() {
    if (isNaN(parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")))) {
        // If there is no blueball, create one and add it to the box
        blueball = document.createElement("div");
        blueball.id = "blueball";
        document.getElementById("box").appendChild(blueball);
    }
    redWinsCount++;
    document.getElementById("red-wins").innerHTML = redWinsCount;
    resetballsize();
    resetballpos();
    spawnfood();
}

function bluewins() {
    if (isNaN(parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")))) {
        // If there is no redball, create one and add it to the box
        redball = document.createElement("div");
        redball.id = "redball";
        document.getElementById("box").appendChild(redball);
    }
    blueWinsCount++;
    document.getElementById("blue-wins").innerHTML = blueWinsCount;
    resetballsize();
    resetballpos();
    spawnfood();
}

function updateBalls() {
    // Check boundaries for red ball
    if (redballX + redballVX < 0) {
        redballVX = 0;
        redballX = 0;
    }
    if (redballX + redballVX > 700 - (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2)) {
        redballVX = 0;
        redballX = 700 - (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2);
    }
    if (redballY + redballVY < 0) {
        redballVY = 0;
        redballY = 0;
    }
    if (redballY + redballVY > 450 - (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2)) {
        redballVY = 0;
        redballY = 450 - (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2);
    }

    // Check boundaries for blue ball
    if (blueballX + blueballVX < 0) {
        blueballVX = 0;
        blueballX = 0;
    }
    if (blueballX + blueballVX > 700 - (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2)) {
        blueballVX = 0;
        blueballX = 700 - (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2);
    }
    if (blueballY + blueballVY < 0) {
        blueballVY = 0;
        blueballY = 0;
    }
    if (blueballY + blueballVY > 450 - (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2)) {
        blueballVY = 0;
        blueballY = 450 - (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2);
    }

    // Update red ball position
    redballX += redballVX;
    redballY += redballVY;
    redball.style.left = redballX + "px";
    redball.style.top = redballY + "px";

    // Update blue ball position
    blueballX += blueballVX;
    blueballY += blueballVY;
    blueball.style.left = blueballX + "px";
    blueball.style.top = blueballY + "px";

    // Update ball speed
    redspeed = (1 / (225 - 20)) * (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) - 20) + 0.5;
    bluespeed = (1 / (225 - 20)) * (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) - 20) + 0.5;

    // Check for collisions with food
    for (var i = 0; i < foodElements.length; i++) {
        var food = foodElements[i];
        var foodXleft = parseInt(food.style.left);
        var foodXright = parseInt(food.style.left) + 10;
        var foodYup = parseInt(food.style.top);
        var foodYdown = parseInt(food.style.top) + 10;

        var redballXright = parseInt(redball.style.left) + (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2);
        var redballXleft = parseInt(redball.style.left);
        var redballYdown = parseInt(redball.style.top) + (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) * 2);
        var redballYup = parseInt(redball.style.top);

        if (redballXright >= foodXright && redballXleft <= foodXleft && redballYdown >= foodYdown && redballYup <= foodYup) {
            redballgrowth();
            food.remove();
        }

        var blueballXright = parseInt(blueball.style.left) + (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2);
        var blueballXleft = parseInt(blueball.style.left);
        var blueballYdown = parseInt(blueball.style.top) + (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) * 2);
        var blueballYup = parseInt(blueball.style.top);

        if (blueballXright >= foodXright && blueballXleft <= foodXleft && blueballYdown >= foodYdown && blueballYup <= foodYup) {
            blueballgrowth();
            food.remove();
        }

        // Check if the balls can eat each other
        if (redballXright >= blueballXright && redballXleft <= blueballXleft && redballYdown >= blueballYdown && redballYup <= blueballYup && (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius"))) > (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")))) {
            redballgrowth();
            blueball.remove();
        }

        if (blueballXright >= redballXright && blueballXleft <= redballXleft && blueballYdown >= redballYdown && blueballYup <= redballYup && (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius"))) > (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")))) {
            blueballgrowth();
            redball.remove();
        }
    }

    // Check if a ball has reached the size limit or has been eaten
    if (parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")) == 225 || isNaN(parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")))) {
        redwins();
    }
    if (parseInt(window.getComputedStyle(blueball).getPropertyValue("border-radius")) == 225 || isNaN(parseInt(window.getComputedStyle(redball).getPropertyValue("border-radius")))) {
        bluewins();
    }

    // If there is no more food, spawn food
    if (food === undefined) {
        spawnfood();
    }
}

setInterval(updateBalls, 10);