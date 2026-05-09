// ─────────────────────────────────────────────────────────────────────────────
// ai.js
// ─────────────────────────────────────────────────────────────────────────────

// ─── Planner (Anytime NN + 2-opt) ────────────────────────────────────────────
var foodSnapshot = [];  // {x,y} positions snapshotted at spawnfood time
var redWaypoints = [];  // ordered {x,y} targets for red AI
var blueWaypoints = []; // ordered {x,y} targets for blue AI
var _planGenId = 0;     // incremented each spawn; aborts stale async work

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
    return (spd * gameSpeed) / frameRefreshInterval; // px per ms
};

// Total travel time for an ordered index array
window.pathCost = function (order, foods, sx, sy, spd) {
    var x = sx, y = sy, t = 0;
    for (var i = 0; i < order.length; i++) {
        var f  = foods[order[i]];
        var dx = f.x - x, dy = f.y - y;
        t += Math.sqrt(dx * dx + dy * dy) / spd;
        x = f.x; y = f.y;
    }
    return t;
};

// Greedy nearest-neighbor, horizon-filtered reachable set
window.greedySeed = function (sx, sy, startR, isRed) {
    var foods   = foodSnapshot;
    var horizon = foodRefreshInterval / gameSpeed;
    var spd     = planSpeed(startR, isRed);
    var unvisited = foods.map(function (_, i) { return i; });
    var order = [], cx = sx, cy = sy, t = 0;

    while (unvisited.length > 0) {
        var bestI = -1, bestD = Infinity;
        for (var i = 0; i < unvisited.length; i++) {
            var f  = foods[unvisited[i]];
            var dx = f.x - cx, dy = f.y - cy;
            var d  = Math.sqrt(dx * dx + dy * dy);
            if (d < bestD) { bestD = d; bestI = i; }
        }
        var dt = bestD / spd;
        if (t + dt > horizon) break;
        t += dt;
        order.push(unvisited.splice(bestI, 1)[0]);
        cx = foods[order[order.length - 1]].x;
        cy = foods[order[order.length - 1]].y;
    }
    return order;
};

// One full 2-opt pass — returns { order, cost, improved }
window.twoOptPass = function (order, foods, sx, sy, spd) {
    var best      = pathCost(order, foods, sx, sy, spd);
    var improved  = false;
    var n         = order.length;

    for (var i = 0; i < n - 1; i++) {
        for (var j = i + 1; j < n; j++) {
            var candidate = order.slice(0, i)
                .concat(order.slice(i, j + 1).reverse())
                .concat(order.slice(j + 1));
            var cost = pathCost(candidate, foods, sx, sy, spd);
            if (cost < best) {
                order    = candidate;
                best     = cost;
                improved = true;
            }
        }
    }
    return { order: order, cost: best, improved: improved };
};

// ── Async anytime planning: called at every food spawn ────────────────────────────────
window.triggerReplan = function () {
    snapshotFood();
    var genId = ++_planGenId;

    setTimeout(function () {
        if (genId !== _planGenId) return;

        var rr = getRadius(redball);
        var br = getRadius(blueball);
        var snap = foodSnapshot.slice(); // local copy for this generation

        // Capture positions at planning time
        var rsx = redballX  + rr,  rsy = redballY  + rr;
        var bsx = blueballX + br,  bsy = blueballY + br;
        var rspd = planSpeed(rr, true);
        var bspd = planSpeed(br, false);

        // Phase 1 — greedy seed (instant), commit immediately
        var rOrder = isNaN(rr) ? [] : greedySeed(rsx, rsy, rr, true);
        var bOrder = isNaN(br) ? [] : greedySeed(bsx, bsy, br, false);

        redWaypoints  = rOrder.map(function (i) { return snap[i]; });
        blueWaypoints = bOrder.map(function (i) { return snap[i]; });

        // Phase 2 — iterative 2-opt, one pass per tick
        function improve() {
            if (genId !== _planGenId) return; // food respawned — abort

            var rRes = twoOptPass(rOrder, snap, rsx, rsy, rspd);
            var bRes = twoOptPass(bOrder, snap, bsx, bsy, bspd);

            if (rRes.improved) {
                rOrder = rRes.order;
                redWaypoints = rOrder.map(function (i) { return snap[i]; });
            }
            if (bRes.improved) {
                bOrder = bRes.order;
                blueWaypoints = bOrder.map(function (i) { return snap[i]; });
            }

            // Keep going as long as either side is still finding improvements
            if (rRes.improved || bRes.improved) {
                setTimeout(improve, 0);
            }
        }

        setTimeout(improve, 0);
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