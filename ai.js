// ─────────────────────────────────────────────────────────────────────────────
// ai.js
// ─────────────────────────────────────────────────────────────────────────────

// ─── Planner ─────────────────────────────────────────────────────────────────
var BEAM_WIDTH = 8;
var foodSnapshot = [];   // {x,y} positions snapshotted at spawnfood time
var redWaypoints = [];  // ordered {x,y} targets for red AI
var blueWaypoints = [];  // ordered {x,y} targets for blue AI

window.snapshotFood = function () {
    foodSnapshot = [];
    for (var i = 0; i < foodElements.length; i++) {
        var f = foodElements[i];
        foodSnapshot.push({
            x: parseInt(f.style.left) + 5,
            y: parseInt(f.style.top) + 5
        });
    }
};

// px per ms at a given radius for red or blue
window.planSpeed = function (radius, isRed) {
    var base = isRed ? P1_advantage : 1;
    var spd = base * ((1 / (225 - 20)) * (radius - 20) + 0.5);
    return (spd * gameSpeed) / frameRefreshInterval; // px/ms
};

// Beam search over food snapshot. Returns ordered [{x,y}] waypoint array.
window.beamPlan = function (startX, startY, startR, isRed) {
    var foods = foodSnapshot;
    var n = foods.length;
    if (n === 0) return [];

    var horizon = foodRefreshInterval / gameSpeed; // ms until next respawn

    // node: { x, y, r, t, mask, path[] }
    var beam = [{ x: startX, y: startY, r: startR, t: 0, mask: 0, path: [] }];
    var best = [];

    for (var depth = 0; depth < n && beam.length > 0; depth++) {
        var next = [];

        for (var i = 0; i < beam.length; i++) {
            var nd = beam[i];
            var spd = planSpeed(nd.r, isRed);

            for (var j = 0; j < n; j++) {
                if (nd.mask & (1 << j)) continue;

                var dx = foods[j].x - nd.x;
                var dy = foods[j].y - nd.y;
                var dt = Math.sqrt(dx * dx + dy * dy) / spd;

                if (nd.t + dt > horizon) continue; // unreachable in time

                var newR = Math.min(nd.r + 1, 224);
                var newPath = nd.path.concat(j);

                next.push({
                    x: foods[j].x,
                    y: foods[j].y,
                    r: newR,
                    t: nd.t + dt,
                    mask: nd.mask | (1 << j),
                    path: newPath
                });
            }

            // Leaf node — update best if this path is longer
            if (nd.path.length > best.length) best = nd.path;
        }

        if (next.length === 0) break;

        // Prune to beam width by path length (food collected)
        next.sort(function (a, b) { return b.path.length - a.path.length; });
        beam = next.slice(0, BEAM_WIDTH);

        if (beam[0].path.length > best.length) best = beam[0].path;
    }

    return best.map(function (i) { return { x: foods[i].x, y: foods[i].y }; });
};

// ── Async planning: called at every food spawn ────────────────────────────────
window.triggerReplan = function () {
    snapshotFood(); // snapshot runs sync so positions are captured this frame

    setTimeout(function () { // planning runs off the main thread tick
        var rr = getRadius(redball);
        var br = getRadius(blueball);
        if (!isNaN(rr)) redWaypoints = beamPlan(redballX + rr, redballY + rr, rr, true);
        if (!isNaN(br)) blueWaypoints = beamPlan(blueballX + br, blueballY + br, br, false);
    }, 0);
};

// ── Execution helpers (synchronous, called every frame) ───────────────────────
window.nearestFood = function (cx, cy) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < foodElements.length; i++) {
        var f = foodElements[i];
        var fx = parseInt(f.style.left) + 5;
        var fy = parseInt(f.style.top) + 5;
        var d = (fx - cx) * (fx - cx) + (fy - cy) * (fy - cy);
        if (d < bestD) { bestD = d; best = { x: fx, y: fy }; }
    }
    return best;
};

window.waypointStillExists = function (wp) {
    for (var i = 0; i < foodElements.length; i++) {
        var f = foodElements[i];
        var fx = parseInt(f.style.left) + 5;
        var fy = parseInt(f.style.top) + 5;
        if (Math.abs(fx - wp.x) < 4 && Math.abs(fy - wp.y) < 4) return true;
    }
    return false;
};

window.moveToward = function (tx, ty, cx, cy, isRed) {
    var dx = tx - cx, dy = ty - cy;
    if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) isRed ? moveredRight() : moveblueRight();
        else if (dx < 0) isRed ? moveredLeft() : moveblueLeft();
    } else {
        if (dy > 0) isRed ? moveredDown() : moveblueDown();
        else if (dy < 0) isRed ? moveredUp() : moveblueUp();
    }
};
window.updateAIp1 = function () {
    var redR = getRadius(redball);
    var blueR = getRadius(blueball);
    if (isNaN(redR) || isNaN(blueR)) return;

    var cx = redballX + redR, cy = redballY + redR;

    // Drop waypoints that have already been eaten
    while (redWaypoints.length > 0 && !waypointStillExists(redWaypoints[0]))
        redWaypoints.shift();

    // Chase enemy if we're bigger and closer than next waypoint
    if (redR > blueR) {
        var ex = blueballX + blueR, ey = blueballY + blueR;
        var ed = (ex - cx) * (ex - cx) + (ey - cy) * (ey - cy);
        var wd = redWaypoints.length > 0
            ? (redWaypoints[0].x - cx) * (redWaypoints[0].x - cx)
            + (redWaypoints[0].y - cy) * (redWaypoints[0].y - cy)
            : Infinity;
        if (ed < wd) { moveToward(ex, ey, cx, cy, true); return true; }
    }

    // Follow plan, or fall back to nearest food
    var target = redWaypoints.length > 0 ? redWaypoints[0] : nearestFood(cx, cy);
    if (target) moveToward(target.x, target.y, cx, cy, true);
    return true;
};

// ─── AI (1P mode) ─────────────────────────────────────────────────────────────
window.updateAIp2 = function () {
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
    return true
};