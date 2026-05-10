// ─────────────────────────────────────────────────────────────────────────────
// ui.js
// ─────────────────────────────────────────────────────────────────────────────

// ─── Init ─────────────────────────────────────────────────────────────────────
window.init = function () {
    redball = document.getElementById("redball");
    blueball = document.getElementById("blueball");
    foodElements = document.getElementsByClassName("food");

    var sel = document.getElementById("mode-select");
    if (sel) {
        gameMode = parseInt(sel.value);
        var prefix = document.getElementById("local-prefix");
        if (prefix) prefix.style.display = (gameMode === 2) ? "inline" : "none";
    }

    resetballs();
    setupScoreboard();
    updateInstructions();
    spawnfood();
    startIntervals();
    if (gameMode === 0) { stopwatchStart = Date.now(); stopwatchRunning = true; }
    checkUser();
    loadLeaderboard();
};

window.onload = init;

// ─── Mode Switching ────────────────────────────────────────────────────────────
window.switchMode = function (val) {
    gameMode = parseInt(val);

    // Show/hide "Local " prefix
    var prefix = document.getElementById("local-prefix");
    if (prefix) prefix.style.visibility = (gameMode === 2) ? "visible" : "hidden";

    fullReset();
};


window.fullReset = function (full = true) {
    // Stop stopwatch
    stopwatchStart = null;
    stopwatchRunning = false;

    if (full) {
        // Reset scores
        scores = [];
        highScore = null;
        lowScore = null;
        lastScore = null;
        // Reset win counts
        redWinsCount = 0;
        blueWinsCount = 0;
        startIntervals();
    }

    // Remove all food
    var box = document.getElementById("box");
    box.replaceChildren();

    // Ensure both balls exist in the DOM
    ensureBall("redball");
    ensureBall("blueball");
    redball = document.getElementById("redball");
    blueball = document.getElementById("blueball");
    if (gameMode === 0) ensurePathCanvas("path-canvas");

    resetballs();
    setupScoreboard();
    updateInstructions();
    spawnfood();
    if (gameMode === 0) { stopwatchStart = Date.now(); stopwatchRunning = true; }
};

window.ensureBall = function (id) {
    if (!document.getElementById(id)) {
        var ball = document.createElement("div");
        ball.id = id;
        document.getElementById("box").appendChild(ball);
    }
};
window.ensurePathCanvas = function (id) {
    if (!document.getElementById("path-canvas")) {
        var canvas = document.createElement("canvas");
        canvas.id = "path-canvas";
        canvas.width = 700;
        canvas.height = 450;
        document.getElementById("box").appendChild(canvas);
    }
}

window.getMedian = function (arr) {
    if (arr.length === 0) return null;

    var sorted = [...arr].sort(function (a, b) {
        return a - b;
    });

    var mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
};

// ─── Scoreboard ───────────────────────────────────────────────────────────────
window.setupScoreboard = function () {
    var label1 = document.getElementById("label1");
    var value1 = document.getElementById("value1");
    var label2 = document.getElementById("label2");
    var value2 = document.getElementById("value2");

    if (gameMode === 1) {
        label1.style.color = "#1a8c1a";
        label1.innerHTML = "Score:";
        value1.style.color = "#1a8c1a";
        value1.innerHTML = lastScore !== null ? formatTime(lastScore) : "—";

        label2.style.color = "#b8860b";
        label2.innerHTML = "Best:";
        value2.style.color = "#b8860b";
        var bestText = highScore !== null ? formatTime(highScore) : "—";
        value2.innerHTML = bestText + ' <button onclick="submitScore()" style="font-size:12px;vertical-align:middle;margin-left:6px;">Submit</button>';
    } else if (gameMode === 2) {
        label1.style.color = "red";
        label1.innerHTML = "Red Wins:";
        value1.style.color = "red";
        value1.innerHTML = redWinsCount;

        label2.style.color = "blue";
        label2.innerHTML = "Blue Wins:";
        value2.style.color = "blue";
        value2.innerHTML = blueWinsCount;
    } else if (gameMode === 0) {

        var median = getMedian(scores);

        label1.style.color = "#1a8c1a";
        label1.innerHTML = "Min / Med / Max:";

        value1.style.color = "#1a8c1a";
        value1.innerHTML =
            (highScore !== null ? formatTime(highScore * gameSpeed) : "—")
            + " / " +
            (median !== null ? formatTime(median * gameSpeed) : "—")
            + " / " +
            (lowScore !== null ? formatTime(lowScore * gameSpeed) : "—");

        label2.style.color = "#b8860b";
        label2.innerHTML = "Red Win%:";

        value2.style.color = "#b8860b";

        var total = redWinsCount + blueWinsCount;

        value2.innerHTML =
            total > 0
                ? ((100 * redWinsCount / total).toFixed(2) + "%")
                : "—";
    }
};

window.updateInstructions = function () {
    var instr = document.getElementById("instructions");
    if (gameMode === 1) {
        instr.innerHTML = "Use WASD or arrow keys to move and to start the timer!<br>"
            + "Reach maximum size first or eat the blue cell to win as fast as possible!";
    } else {
        instr.innerHTML = "Use WASD and arrow keys to move.<br>"
            + "Reach maximum size first or eat the other ball to win!";
    }
};

// ─── Food Spawning ────────────────────────────────────────────────────────────
window.spawnfood = function () {
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
    triggerReplan();
    rebuildBlueFoodChain();
};

window.startIntervals = function () {
    if (foodIntervalId) clearInterval(foodIntervalId);
    if (frameIntervalId) clearInterval(frameIntervalId);

    foodIntervalId = setInterval(spawnfood, foodRefreshInterval / gameSpeed);
    frameIntervalId = setInterval(updateBalls, frameRefreshInterval);
};

window.drawPaths = function () {
    var canvas = document.getElementById("path-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 700, 450);

    var redR = getRadius(redball);
    var blueR = getRadius(blueball);

    function drawLine(waypoints, cx, cy, color) {
        if (!waypoints.length) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (var i = 0; i < waypoints.length; i++)
            ctx.lineTo(waypoints[i].x, waypoints[i].y);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    if (gameMode === 0) {
        if (!isNaN(redR)) drawLine(redWaypoints, redballX + redR, redballY + redR, "red");
        if (!isNaN(blueR)) drawLine(blueFoodChain, blueballX + blueR, blueballY + blueR, "blue");
    }
};