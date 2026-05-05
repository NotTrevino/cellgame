// ─── Config ───────────────────────────────────────────────────────────────────
// Game Speed
var gameSpeed = 1
// Refresh Rate
var foodRefreshInterval = 15000 / gameSpeed;
const frameRefreshInterval = 10; // ms

// ─── Game Mode ────────────────────────────────────────────────────────────────
var gameMode = 1; // 1 or 2

// ─── Ball State ───────────────────────────────────────────────────────────────
var redball = null;
var blueball = null;
var foodElements = null;

var redballVX = 0, redballVY = 0, redspeed = gameSpeed * 0.5;
var redWinsCount = 0, redballX = 0, redballY = 0;

var blueballVX = 0, blueballVY = 0, bluespeed = gameSpeed * 0.5;
var blueWinsCount = 0, blueballX = 680, blueballY = 430;

// ─── 1P State ─────────────────────────────────────────────────────────────────
var stopwatchStart = null;
var stopwatchRunning = false;
var highScore = null; // best (lowest) ms
var lastScore = null; // last winning ms (shown when stopwatch is paused)

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
    redball = document.getElementById("redball");
    blueball = document.getElementById("blueball");
    foodElements = document.getElementsByClassName("food");

    var sel = document.getElementById("mode-select");
    if (sel) {
        gameMode = parseInt(sel.value);
        var prefix = document.getElementById("local-prefix");
        if (prefix) prefix.style.display = (gameMode === 2) ? "inline" : "none";
    }

    resetballpos();
    setupScoreboard();
    spawnfood();
}

window.onload = init;

// ─── Mode Switching ────────────────────────────────────────────────────────────
function switchMode(val) {
    gameMode = parseInt(val);
    highScore = null; // fresh high score for new mode
    lastScore = null;

    // Show/hide "Local " prefix
    var prefix = document.getElementById("local-prefix");
    if (prefix) prefix.style.display = (gameMode === 2) ? "inline" : "none";

    fullReset();
}

function fullReset() {
    // Stop stopwatch
    stopwatchStart = null;
    stopwatchRunning = false;

    // Reset win counts
    redWinsCount = 0;
    blueWinsCount = 0;

    // Remove all food
    var box = document.getElementById("box");
    var foods = Array.from(box.getElementsByClassName("food"));
    foods.forEach(function (f) { f.remove(); });

    // Ensure both balls exist in the DOM
    ensureBall("redball");
    ensureBall("blueball");
    redball = document.getElementById("redball");
    blueball = document.getElementById("blueball");

    resetballsize();
    resetballpos();
    setupScoreboard();
    updateInstructions();
    spawnfood();
}

function ensureBall(id) {
    if (!document.getElementById(id)) {
        var ball = document.createElement("div");
        ball.id = id;
        document.getElementById("box").appendChild(ball);
    }
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────
function setupScoreboard() {
    var label1 = document.getElementById("label1");
    var value1 = document.getElementById("value1");
    var label2 = document.getElementById("label2");
    var value2 = document.getElementById("value2");

    if (gameMode === 2) {
        label1.style.color = "red";
        label1.innerHTML = "Red Wins:";
        value1.style.color = "red";
        value1.innerHTML = redWinsCount;

        label2.style.color = "blue";
        label2.innerHTML = "Blue Wins:";
        value2.style.color = "blue";
        value2.innerHTML = blueWinsCount;
    } else {
        label1.style.color = "#1a8c1a";
        label1.innerHTML = "Score:";
        value1.style.color = "#1a8c1a";
        value1.innerHTML = lastScore !== null ? formatTime(gameSpeed * lastScore) : "—";

        label2.style.color = "#b8860b";
        label2.innerHTML = "Best:";
        value2.style.color = "#b8860b";
        value2.innerHTML = highScore !== null ? formatTime(gameSpeed * highScore) : "—";
    }
}

function updateInstructions() {
    var instr = document.getElementById("instructions");
    if (gameMode === 1) {
        instr.innerHTML = "Use WASD or arrow keys to move and to start the timer!<br>"
            + "Reach maximum size first or eat the blue cell to win as fast as possible!";
    } else {
        instr.innerHTML = "Use WASD and arrow keys to move.<br>"
            + "Reach maximum size first or eat the other ball to win!";
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRadius(ball) {
    var r = parseInt(window.getComputedStyle(ball).getPropertyValue("border-radius"));
    return isNaN(r) ? NaN : r;
}

function formatTime(ms) {
    return (ms / 1000).toFixed(2) + "s";
}

// ─── Food Spawning ────────────────────────────────────────────────────────────
function spawnfood() {
    var maxX = 700 - 10;
    var maxY = 450 - 10;

    for (var i = 0; i < 25; i++) {
        var food = foodElements[i];
        if (food === undefined) {
            food = document.createElement("div");
            food.classList.add("food");
            document.getElementById("box").appendChild(food);
        }
        food.style.left = Math.floor(Math.random() * maxX) + "px";
        food.style.top = Math.floor(Math.random() * maxY) + "px";
    }
}

setInterval(spawnfood, foodRefreshInterval);

// ─── Movement Functions ───────────────────────────────────────────────────────
function moveredLeft() { redballVX = -redspeed; redballVY = 0; }
function moveredUp() { redballVY = -redspeed; redballVX = 0; }
function moveredRight() { redballVX = redspeed; redballVY = 0; }
function moveredDown() { redballVY = redspeed; redballVX = 0; }

function moveblueLeft() { blueballVX = -bluespeed; blueballVY = 0; }
function moveblueUp() { blueballVY = -bluespeed; blueballVX = 0; }
function moveblueRight() { blueballVX = bluespeed; blueballVY = 0; }
function moveblueDown() { blueballVY = bluespeed; blueballVX = 0; }

// ─── Key Handler ─────────────────────────────────────────────────────────────
function getKeyAndMove(e) {
    var key_code = e.which || e.keyCode;
    var isMoveKey = false;

    switch (key_code) {
        case 65: moveredLeft(); isMoveKey = true; break;  // A
        case 87: moveredUp(); isMoveKey = true; break;    // W
        case 68: moveredRight(); isMoveKey = true; break; // D
        case 83: moveredDown(); isMoveKey = true; break;  // S
        case 82: fullReset(); break; // R

        case 37: // left arrow
            if (gameMode === 2) moveblueLeft(); else moveredLeft();
            isMoveKey = true; break;
        case 38: // up arrow
            if (gameMode === 2) moveblueUp(); else moveredUp();
            isMoveKey = true; break;
        case 39: // right arrow
            if (gameMode === 2) moveblueRight(); else moveredRight();
            isMoveKey = true; break;
        case 40: // down arrow
            if (gameMode === 2) moveblueDown(); else moveredDown();
            isMoveKey = true; break;

    }

    if (gameMode === 1 && !stopwatchRunning && isMoveKey) {
        stopwatchStart = Date.now();
        stopwatchRunning = true;
    }
}

// ─── AI (1P mode) ─────────────────────────────────────────────────────────────
function updateAI() {
    var blueR = getRadius(blueball);
    var redR = getRadius(redball);
    if (isNaN(blueR) || isNaN(redR)) return;

    var blueCX = blueballX + blueR;
    var blueCY = blueballY + blueR;

    var bestDist = Infinity;
    var bestDX = 0;
    var bestDY = 0;

    // Nearest food pellet
    for (var i = 0; i < foodElements.length; i++) {
        var f = foodElements[i];
        var dx = (parseInt(f.style.left) + 5) - blueCX;
        var dy = (parseInt(f.style.top) + 5) - blueCY;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { bestDist = d; bestDX = dx; bestDY = dy; }
    }

    // Chase player if AI is bigger
    if (blueR > redR) {
        var dx = (redballX + redR) - blueCX;
        var dy = (redballY + redR) - blueCY;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) { bestDist = d; bestDX = dx; bestDY = dy; }
    }

    // Move one axis toward best target
    if (bestDist < Infinity) {
        if (Math.abs(bestDX) >= Math.abs(bestDY)) {
            if (bestDX > 0) moveblueRight(); else if (bestDX < 0) moveblueLeft();
        } else {
            if (bestDY > 0) moveblueDown(); else if (bestDY < 0) moveblueUp();
        }
    }
}

// ─── Growth Functions ─────────────────────────────────────────────────────────
function redballgrowth() {
    var r = getRadius(redball);
    if (isNaN(r) || r >= 225) return;
    var size = r + 1;
    redball.style.width = size * 2 + "px";
    redball.style.height = size * 2 + "px";
    redball.style.borderRadius = size + "px";
    // Clamp position after growing
    if (redballX > 700 - size * 2) redballX = 700 - size * 2;
    if (redballY > 450 - size * 2) redballY = 450 - size * 2;
}

function blueballgrowth() {
    var r = getRadius(blueball);
    if (isNaN(r) || r >= 225) return;
    var size = r + 1;
    blueball.style.width = size * 2 + "px";
    blueball.style.height = size * 2 + "px";
    blueball.style.borderRadius = size + "px";
    if (blueballX > 700 - size * 2) blueballX = 700 - size * 2;
    if (blueballY > 450 - size * 2) blueballY = 450 - size * 2;
}

// ─── Reset Functions ──────────────────────────────────────────────────────────
function resetballsize() {
    redball.style.width = "20px";
    redball.style.height = "20px";
    redball.style.borderRadius = "10px";
    blueball.style.width = "20px";
    blueball.style.height = "20px";
    blueball.style.borderRadius = "10px";
}

function resetballpos() {
    redballX = 0; redballY = 0; redballVX = 0; redballVY = 0;
    blueballX = 680; blueballY = 430; blueballVX = 0; blueballVY = 0;
    redball.style.left = "0px"; redball.style.top = "0px";
    blueball.style.left = "680px"; blueball.style.top = "430px";
}

// ─── Win Functions ────────────────────────────────────────────────────────────
function redwins() {
    // Recreate blueball if it was eaten
    ensureBall("blueball");
    blueball = document.getElementById("blueball");

    if (gameMode === 2) {
        redWinsCount++;
        document.getElementById("value1").innerHTML = redWinsCount;
    } else {
        // 1P: player wins — record time
        if (stopwatchRunning) {
            var elapsed = Date.now() - stopwatchStart;
            lastScore = elapsed;
            if (highScore === null || elapsed < highScore) highScore = elapsed;
            document.getElementById("value1").innerHTML = formatTime(elapsed);
            document.getElementById("value2").innerHTML = formatTime(highScore);
        }
        stopwatchRunning = false;
        stopwatchStart = null;
    }

    resetballsize();
    resetballpos();
    spawnfood();
}

function bluewins() {
    // Recreate redball if it was eaten
    ensureBall("redball");
    redball = document.getElementById("redball");

    if (gameMode === 2) {
        blueWinsCount++;
        document.getElementById("value2").innerHTML = blueWinsCount;
    } else {
        // 1P: AI wins — don't record score, just reset timer
        stopwatchRunning = false;
        stopwatchStart = null;
        // Restore last displayed score (or dash if none)
        document.getElementById("value1").innerHTML = lastScore !== null ? formatTime(lastScore) : "—";
    }

    resetballsize();
    resetballpos();
    spawnfood();
}

// ─── Main Update Loop ─────────────────────────────────────────────────────────
function updateBalls() {
    if (gameMode === 1 && !stopwatchRunning) return;

    var redR = getRadius(redball);
    var blueR = getRadius(blueball);

    // Boundary checks — red
    if (redballX + redballVX < 0) { redballVX = 0; redballX = 0; }
    if (redballX + redballVX > 700 - redR * 2) { redballVX = 0; redballX = 700 - redR * 2; }
    if (redballY + redballVY < 0) { redballVY = 0; redballY = 0; }
    if (redballY + redballVY > 450 - redR * 2) { redballVY = 0; redballY = 450 - redR * 2; }

    // Boundary checks — blue
    if (blueballX + blueballVX < 0) { blueballVX = 0; blueballX = 0; }
    if (blueballX + blueballVX > 700 - blueR * 2) { blueballVX = 0; blueballX = 700 - blueR * 2; }
    if (blueballY + blueballVY < 0) { blueballVY = 0; blueballY = 0; }
    if (blueballY + blueballVY > 450 - blueR * 2) { blueballVY = 0; blueballY = 450 - blueR * 2; }

    // AI movement (1P only)
    if (gameMode === 1 && stopwatchRunning) updateAI();

    // Update positions
    redballX += redballVX; redballY += redballVY;
    redball.style.left = redballX + "px";
    redball.style.top = redballY + "px";

    blueballX += blueballVX; blueballY += blueballVY;
    blueball.style.left = blueballX + "px";
    blueball.style.top = blueballY + "px";

    // Update speeds (proportional to size)
    redspeed = (1 / (225 - 20)) * (getRadius(redball) - 20) + 0.5;
    bluespeed = (1 / (225 - 20)) * (getRadius(blueball) - 20) + 0.5;

    // Live stopwatch display (1P)
    if (gameMode === 1 && stopwatchRunning) {
        document.getElementById("value1").innerHTML = formatTime(Date.now() - stopwatchStart);
    }

    // ── Food collision ──────────────────────────────────────────────────────
    var rL = parseInt(redball.style.left), rR = rL + getRadius(redball) * 2;
    var rT = parseInt(redball.style.top), rB = rT + getRadius(redball) * 2;
    var bL = parseInt(blueball.style.left), bR = bL + getRadius(blueball) * 2;
    var bT = parseInt(blueball.style.top), bB = bT + getRadius(blueball) * 2;

    for (var i = foodElements.length - 1; i >= 0; i--) {
        var food = foodElements[i];
        if (!food) continue;

        var fL = parseInt(food.style.left), fR = fL + 10;
        var fT2 = parseInt(food.style.top), fB2 = fT2 + 10;

        if (rR >= fR && rL <= fL && rB >= fB2 && rT <= fT2) {
            redballgrowth();
            food.remove();
            continue;
        }
        if (bR >= fR && bL <= fL && bB >= fB2 && bT <= fT2) {
            blueballgrowth();
            food.remove();
        }
    }

    // ── Ball-on-ball collision ──────────────────────────────────────────────
    // Re-read positions after potential growth
    rL = parseInt(redball.style.left); rR = rL + getRadius(redball) * 2;
    rT = parseInt(redball.style.top); rB = rT + getRadius(redball) * 2;
    bL = parseInt(blueball.style.left); bR = bL + getRadius(blueball) * 2;
    bT = parseInt(blueball.style.top); bB = bT + getRadius(blueball) * 2;

    if (rR >= bR && rL <= bL && rB >= bB && rT <= bT && getRadius(redball) > getRadius(blueball)) {
        redballgrowth();
        blueball.remove();
    }
    if (bR >= rR && bL <= rL && bB >= rB && bT <= rT && getRadius(blueball) > getRadius(redball)) {
        blueballgrowth();
        redball.remove();
    }

    // ── Win conditions ──────────────────────────────────────────────────────
    var finalRedR = getRadius(redball);
    var finalBlueR = getRadius(blueball);

    if (finalRedR === 225 || isNaN(finalBlueR)) { redwins(); return; }
    if (finalBlueR === 225 || isNaN(finalRedR)) { bluewins(); return; }

    // Respawn food if exhausted
    if (foodElements.length === 0) spawnfood();
}

setInterval(updateBalls, frameRefreshInterval);