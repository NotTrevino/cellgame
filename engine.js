// ─────────────────────────────────────────────────────────────────────────────
// engine.js — Core simulation (movement, physics, collisions, win conditions)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Config ───────────────────────────────────────────────────────────────────
// Game Speed
var gameSpeed = 1
var P1_advantage = 1
var P2_advantage = 1
// Refresh Rate
var foodRefreshInterval = 15000; // ms
var frameRefreshInterval = 10;   // ms

// ─── Game Mode ────────────────────────────────────────────────────────────────
var gameMode = 1; // 0 or 1 or 2

// ─── Game State ───────────────────────────────────────────────────────────────
var redball = null;
var blueball = null;
var foodElements = null;
var foodIntervalId = null;
var frameIntervalId = null;

var redballVX = 0, redballVY = 0, redspeed = P1_advantage * 0.5;
var redWinsCount = 0, redballX = 0, redballY = 0;

var blueballVX = 0, blueballVY = 0, bluespeed = P2_advantage * 0.5;
var blueWinsCount = 0, blueballX = 680, blueballY = 430;

// ─── Score State ─────────────────────────────────────────────────────────────────
var stopwatchStart = null;
var stopwatchRunning = false;
var scores = [];
var highScore = null; // best (lowest) ms
var lowScore = null; // worst (highest) ms
var lastScore = null; // last winning ms (shown when stopwatch is paused)


// ─── Helpers ──────────────────────────────────────────────────────────────────
window.getRadius = function (ball) {
    var r = parseInt(window.getComputedStyle(ball).getPropertyValue("border-radius"));
    return isNaN(r) ? NaN : r;
};

// ─── Ball Movement (Player + AI execution layer) ─────────────────────────────
window.moveredLeft = function () { redballVX = -(isNaN(redspeed) ? P1_advantage * 0.5 : redspeed); redballVY = 0; };
window.moveredUp = function () { redballVY = -(isNaN(redspeed) ? P1_advantage * 0.5 : redspeed); redballVX = 0; };
window.moveredRight = function () { redballVX = (isNaN(redspeed) ? P1_advantage * 0.5 : redspeed); redballVY = 0; };
window.moveredDown = function () { redballVY = (isNaN(redspeed) ? P1_advantage * 0.5 : redspeed); redballVX = 0; };

window.moveblueLeft = function () { blueballVX = -(isNaN(bluespeed) ? P2_advantage * 0.5 : bluespeed); blueballVY = 0; };
window.moveblueUp = function () { blueballVY = -(isNaN(bluespeed) ? P2_advantage * 0.5 : bluespeed); blueballVX = 0; };
window.moveblueRight = function () { blueballVX = (isNaN(bluespeed) ? P2_advantage * 0.5 : bluespeed); blueballVY = 0; };
window.moveblueDown = function () { blueballVY = (isNaN(bluespeed) ? P2_advantage * 0.5 : bluespeed); blueballVX = 0; };

// ─── Growth ───────────────────────────────────────────────────────────────────
window.redballgrowth = function (directions = "LTRB") {
    var r = getRadius(redball);
    if (isNaN(r) || r >= 225) return;

    var growth = 1;
    var size = r + 1;

    redball.style.width = size * 2 + "px";
    redball.style.height = size * 2 + "px";
    redball.style.borderRadius = size + "px";

    // growth direction
    redballX -= growth; // offset fix
    redballY -= growth; // offset fix

    if (directions.includes("L")) redballX -= growth;
    if (directions.includes("R")) redballX += growth;
    if (directions.includes("T")) redballY -= growth;
    if (directions.includes("B")) redballY += growth;
    // Clamp position after growing
    if (redballX > 700 - size * 2) redballX = 700 - size * 2; // Right
    if (redballY > 450 - size * 2) redballY = 450 - size * 2; // Bottom
    if (redballX < 0) redballX = 0; // Left
    if (redballY < 0) redballY = 0; // Top
};

window.blueballgrowth = function (directions = "LTRB") {
    var r = getRadius(blueball);
    if (isNaN(r) || r >= 225) return;

    var growth = 1;
    var size = r + 1;

    blueball.style.width = size * 2 + "px";
    blueball.style.height = size * 2 + "px";
    blueball.style.borderRadius = size + "px";

    // growth direction
    blueballX -= growth; // offset fix
    blueballY -= growth; // offset fix

    if (directions.includes("L")) blueballX -= growth;
    if (directions.includes("R")) blueballX += growth;
    if (directions.includes("T")) blueballY -= growth;
    if (directions.includes("B")) blueballY += growth;
    // Clamp position after growing
    if (blueballX > 700 - size * 2) blueballX = 700 - size * 2; // Right
    if (blueballY > 450 - size * 2) blueballY = 450 - size * 2; // Bottom
    if (blueballX < 0) blueballX = 0; // Left
    if (blueballY < 0) blueballY = 0; // Top
};

// ─── Eating Logic ─────────────────────────────────────────────────────────────
window.tryEat = function (ball, growthFn, bL, bR, bT, bB, fL, fR, fT, fB, food) {
    if (
        bR >= fR &&
        bL <= fL &&
        bB >= fB &&
        bT >= fT &&
        getRadius(ball) > getRadius(food)
    ) {
        var dirs = "LTRB";

        var bCenterX = (bL + bR) / 2;
        var bCenterY = (bT + bB) / 2;

        // food position relation
        if (fB < bCenterY) dirs = dirs.replace("B", ""); // food above center
        if (fT > bCenterY) dirs = dirs.replace("T", ""); // food below center
        if (fR < bCenterX) dirs = dirs.replace("R", ""); // food left of center
        if (fL > bCenterX) dirs = dirs.replace("L", ""); // food right of center

        growthFn(dirs);
        food.remove();
        return true;
    }
    return false;
};

// ─── Reset Functions ──────────────────────────────────────────────────────────
window.resetball = function () {
    // ─ ballsize ─
    redball.style.width = "20px";
    redball.style.height = "20px";
    redball.style.borderRadius = "10px";

    blueball.style.width = "20px";
    blueball.style.height = "20px";
    blueball.style.borderRadius = "10px";
    // ─ ballpos ─
    redballX = 0; redballY = 0; redballVX = 0; redballVY = 0;
    redspeed = P1_advantage * 0.5;
    bluespeed = P2_advantage * 0.5;
    var blueR = getRadius(blueball);
    blueballX = 700 - blueR * 2; blueballY = 450 - blueR * 2; blueballVX = 0; blueballVY = 0;
    redball.style.left = "0px"; redball.style.top = "0px";
    blueball.style.left = "680px"; blueball.style.top = "430px";
};

// ─── Win Conditions ───────────────────────────────────────────────────────────
window.redwins = function () {
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
            scores.push(elapsed);
            if (highScore === null || elapsed < highScore) {
                highScore = elapsed;
                // Auto-save if logged in and username already set
                if (gameMode === 1 && currentUser) {
                    var storedName = localStorage.getItem("cell_username") ||
                        (currentUser.user_metadata && currentUser.user_metadata.full_name);
                    if (storedName) saveScore(elapsed, storedName).then(loadLeaderboard);
                }
            }
            if (lowScore === null || elapsed > lowScore) {
                lowScore = elapsed;
            }
            if (gameMode === 1) {
                document.getElementById("value1").innerHTML = formatTime(elapsed);
                document.getElementById("value2").innerHTML = formatTime(highScore) + ' <button onclick="submitScore()" style="font-size:12px;vertical-align:middle;margin-left:6px;">Submit</button>';
            }
        }
    }
    fullReset(false);
    if (gameMode === 0) redWinsCount++;
};

window.bluewins = function () {
    // Recreate redball if it was eaten
    ensureBall("redball");
    redball = document.getElementById("redball");

    if (gameMode === 2) {
        blueWinsCount++;
        document.getElementById("value2").innerHTML = blueWinsCount;
    } else {
        // 1P: AI wins — don't record score, just reset timer
        // Restore last displayed score (or dash if none)
        document.getElementById("value1").innerHTML = lastScore !== null ? formatTime(lastScore) : "—";
    }
    fullReset(false);
    if (gameMode === 0) blueWinsCount++;
};

// ─── Main Game Loop ───────────────────────────────────────────────────────────
window.updateBalls = function () {
    if (gameMode === 0 && !stopwatchRunning) return;
    if (gameMode === 1 && !stopwatchRunning) return;
    // Live stopwatch display (1P)
    if (gameMode === 1 && stopwatchRunning) {
        document.getElementById("value1").innerHTML = formatTime(Date.now() - stopwatchStart);
    }
    // NaN position recovery — clears any corruption from prior frames
    if (isNaN(redballX)) { redballX = 0; redballVX = 0; }
    if (isNaN(redballY)) { redballY = 0; redballVY = 0; }
    if (isNaN(blueballX)) { blueballX = 680; blueballVX = 0; }
    if (isNaN(blueballY)) { blueballY = 430; blueballVY = 0; }

    for (var s = 0; s < gameSpeed; s++) {
        var redR = getRadius(redball);
        var blueR = getRadius(blueball);

        // AI movement (2P)
        if (gameMode === 0 && stopwatchRunning) { updateAIp1(); updateAIp2(); }
        // AI movement (1P only)
        if (gameMode === 1 && stopwatchRunning) updateAIp2();

        // Update positions
        redballX += redballVX;
        redballY += redballVY;

        blueballX += blueballVX;
        blueballY += blueballVY;

        // Clamp positions inside arena
        redballX = Math.max(0, Math.min(700 - redR * 2, redballX));
        redballY = Math.max(0, Math.min(450 - redR * 2, redballY));

        blueballX = Math.max(0, Math.min(700 - blueR * 2, blueballX));
        blueballY = Math.max(0, Math.min(450 - blueR * 2, blueballY));

        // Render
        redball.style.left = redballX + "px";
        redball.style.top = redballY + "px";

        blueball.style.left = blueballX + "px";
        blueball.style.top = blueballY + "px";


        // ── Food collision ──────────────────────────────────────────────────────
        var rL = parseInt(redball.style.left), rR = rL + getRadius(redball) * 2;
        var rT = parseInt(redball.style.top), rB = rT + getRadius(redball) * 2;
        var bL = parseInt(blueball.style.left), bR = bL + getRadius(blueball) * 2;
        var bT = parseInt(blueball.style.top), bB = bT + getRadius(blueball) * 2;

        for (var i = foodElements.length - 1; i >= 0; i--) {
            var food = foodElements[i];
            if (!food) continue;

            var fL = parseInt(food.style.left), fR = fL + 10;
            var fT = parseInt(food.style.top), fB = fT + 10;

            tryEat(redball, redballgrowth, rL, rR, rT, rB, fL, fR, fT, fB, food);
            tryEat(blueball, blueballgrowth, bL, bR, bT, bB, fL, fR, fT, fB, food);
        }

        // ── Ball-on-ball collision ──────────────────────────────────────────────
        // Re-read positions after potential growth
        rL = parseInt(redball.style.left); rR = rL + getRadius(redball) * 2;
        rT = parseInt(redball.style.top); rB = rT + getRadius(redball) * 2;
        bL = parseInt(blueball.style.left); bR = bL + getRadius(blueball) * 2;
        bT = parseInt(blueball.style.top); bB = bT + getRadius(blueball) * 2;

        tryEat(redball, redballgrowth, rL, rR, rT, rB, bL, bR, bT, bB, blueball);
        tryEat(blueball, blueballgrowth, bL, bR, bT, bB, rL, rR, rT, rB, redball);


        // Update speeds (proportional to size)
        var newRS = P1_advantage * ((1 / (225 - 20)) * (getRadius(redball) - 20) + 0.5);
        var newBS = P2_advantage * ((1 / (225 - 20)) * (getRadius(blueball) - 20) + 0.5);
        if (!isNaN(newRS)) redspeed = newRS;
        if (!isNaN(newBS)) bluespeed = newBS;

        // ── Win conditions ──────────────────────────────────────────────────────
        var finalRedR = getRadius(redball);
        var finalBlueR = getRadius(blueball);

        if (isNaN(finalBlueR) || (finalRedR === 225 && finalRedR > finalBlueR)) { redwins(); return; }
        else if (isNaN(finalRedR) || (finalBlueR === 225 && finalBlueR > finalRedR)) { bluewins(); return; }
        else if (finalRedR === 225 && finalBlueR === 225) { fullReset(false); return }

        // Respawn food if exhausted
        if (foodElements.length === 0) spawnfood();

    }
};