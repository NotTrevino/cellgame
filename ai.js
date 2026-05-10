// ─────────────────────────────────────────────────────────────────────────────
// ai.js
// ─────────────────────────────────────────────────────────────────────────────

// ─── Planner (Anytime Orienteering — growth-aware, opponent-aware) ────────────────────────────────────────────
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
        var f = foods[order[i]];
        var dx = f.x - x, dy = f.y - y;
        t += Math.sqrt(dx * dx + dy * dy) / spd;
        x = f.x; y = f.y;
    }
    return t;
};

// Growth-aware path cost: radius (and speed) increments with each food eaten
window.pathCostGrowth = function (order, foods, sx, sy, startR, isRed) {
    var x = sx, y = sy, t = 0, r = startR;
    for (var i = 0; i < order.length; i++) {
        var f = foods[order[i]];
        var dx = f.x - x, dy = f.y - y;
        t += Math.sqrt(dx * dx + dy * dy) / planSpeed(r, isRed);
        r = Math.min(r + 1, 224); // grow after each food
        x = f.x; y = f.y;
    }
    return t;
};

// Predict which food indices P2 (blue) will claim via greedy NN simulation.
// Returns a map { index: arrivalTime } so P1 can compare arrival times.
// P1 uses this — does NOT read blueWaypoints or blueFoodChain (no cheating).
window.predictP2Arrivals = function (foods) {
    var br = getRadius(blueball);
    if (isNaN(br)) return {};
    var cx = blueballX + br, cy = blueballY + br;
    var horizon = foodRefreshInterval / gameSpeed;
    var unvisited = foods.map(function (_, i) { return i; });
    var arrivals = {}, t = 0, r = br;

    while (unvisited.length > 0) {
        var bestI = -1, bestD = Infinity;
        for (var i = 0; i < unvisited.length; i++) {
            var f = foods[unvisited[i]];
            var dx = f.x - cx, dy = f.y - cy;
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestD) { bestD = d; bestI = i; }
        }
        var dt = bestD / planSpeed(r, false);
        if (t + dt > horizon) break;
        t += dt;
        r = Math.min(r + 1, 224);
        var idx = unvisited.splice(bestI, 1)[0];
        arrivals[idx] = t;          // record when P2 arrives at this food
        cx = foods[idx].x;
        cy = foods[idx].y;
    }
    return arrivals;
};

// Greedy NN seed — growth-aware speed, horizon-filtered, skips foods P2 wins
window.greedySeed = function (sx, sy, startR, isRed, p2Arrivals) {
    var foods = foodSnapshot;
    var horizon = foodRefreshInterval / gameSpeed;
    var unvisited = foods.map(function (_, i) { return i; });
    var order = [], cx = sx, cy = sy, t = 0, r = startR;

    while (unvisited.length > 0) {
        var bestI = -1, bestD = Infinity;
        for (var i = 0; i < unvisited.length; i++) {
            var idx = unvisited[i];
            var f = foods[idx];
            var dx = f.x - cx, dy = f.y - cy;
            var d = Math.sqrt(dx * dx + dy * dy);

            // Skip foods P2 will reach before P1 (if we have arrival data)
            if (p2Arrivals && p2Arrivals[idx] !== undefined) {
                var myArrival = t + d / planSpeed(r, isRed);
                if (p2Arrivals[idx] < myArrival) continue;
            }

            if (d < bestD) { bestD = d; bestI = i; }
        }

        // If all remaining foods are contested, fall back to any reachable food
        if (bestI === -1) {
            for (var i = 0; i < unvisited.length; i++) {
                var f = foods[unvisited[i]];
                var dx = f.x - cx, dy = f.y - cy;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < bestD) { bestD = d; bestI = i; }
            }
        }
        if (bestI === -1) break;

        var dt = bestD / planSpeed(r, isRed);
        if (t + dt > horizon) break;
        t += dt;
        r = Math.min(r + 1, 224);
        order.push(unvisited.splice(bestI, 1)[0]);
        cx = foods[order[order.length - 1]].x;
        cy = foods[order[order.length - 1]].y;
    }
    return order;
};

// 2-opt — growth-aware cost, horizon validated on every swap
window.twoOptPass = function (order, foods, sx, sy, startR, isRed) {
    var horizon = foodRefreshInterval / gameSpeed;
    var best = pathCostGrowth(order, foods, sx, sy, startR, isRed);
    var improved = false;
    var n = order.length;

    for (var i = 0; i < n - 1; i++) {
        for (var j = i + 1; j < n; j++) {
            var candidate = order.slice(0, i)
                .concat(order.slice(i, j + 1).reverse())
                .concat(order.slice(j + 1));
            var cost = pathCostGrowth(candidate, foods, sx, sy, startR, isRed);
            if (cost < best && cost <= horizon) {
                order = candidate;
                best = cost;
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
        var rsx = redballX + rr, rsy = redballY + rr;
        var bsx = blueballX + br, bsy = blueballY + br;

        // P1 predicts P2's greedy path to avoid racing for the same food
        var p2Arrivals = isNaN(br) ? {} : predictP2Arrivals(snap);

        // Phase 1 — greedy seed (instant), commit immediately
        var rOrder = isNaN(rr) ? [] : greedySeed(rsx, rsy, rr, true, p2Arrivals);
        var bOrder = isNaN(br) ? [] : greedySeed(bsx, bsy, br, false, null);

        redWaypoints = rOrder.map(function (i) { return snap[i]; });
        blueWaypoints = bOrder.map(function (i) { return snap[i]; });

        // Phase 2 — iterative 2-opt, one pass per tick (Stockfish-style anytime)
        function improve() {
            if (genId !== _planGenId) return;

            var rRes = isNaN(rr) ? { improved: false }
                : twoOptPass(rOrder, snap, rsx, rsy, rr, true);
            var bRes = isNaN(br) ? { improved: false }
                : twoOptPass(bOrder, snap, bsx, bsy, br, false);

            if (rRes.improved) {
                rOrder = rRes.order;
                redWaypoints = rOrder.map(function (i) { return snap[i]; });
            }
            if (bRes.improved) {
                bOrder = bRes.order;
                blueWaypoints = bOrder.map(function (i) { return snap[i]; });
            }

            // Keep going as long as either side is still finding improvements
            if (rRes.improved || bRes.improved) setTimeout(improve, 0);
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

window.canRedCatchBlueBeforeGrowth = function () {

    var redR = getRadius(redball);
    var blueR = getRadius(blueball);

    if (isNaN(redR) || isNaN(blueR)) return false;

    // already not edible
    if (redR <= blueR) return false;

    var rx = redballX + redR; ry = redballY + redR;
    var bx = blueballX + blueR; by = blueballY + blueR;

    var redSpd = planSpeed(redR, true);
    var blueSpd = planSpeed(blueR, false);

    // Time for red to directly intercept current blue position
    var interceptTime = Math.sqrt((bx - rx) * (bx - rx) + (by - ry) * (by - ry)) / redSpd; // (good approximation and cheap)

    // Simulate blue growth chain until intercept time exceeded
    var simX = bx; simY = by; simRadius = blueR; elapsed = 0;

    for (var i = 0; i < blueFoodChain.length; i++) {

        var f = blueFoodChain[i];

        // skip stale entries
        if (!document.body.contains(f.el)) continue;

        var dx = f.x - simX; dy = f.y - simY;

        elapsed += Math.sqrt(dx * dx + dy * dy) / blueSpd;

        // red catches before this food
        if (elapsed > interceptTime) return true;

        // blue reaches another food first
        simRadius += 1;

        // blue escaped edibility
        if (simRadius >= redR) return false;

        simX = f.x; simY = f.y;
    }

    // Blue ran out of reachable growth before escaping
    return true;
};

window.updateAIp1 = function () {
    var redR = getRadius(redball);
    var blueR = getRadius(blueball);
    if (isNaN(redR) || isNaN(blueR)) return;

    var cx = redballX + redR, cy = redballY + redR;

    // Drop waypoints that have already been eaten
    while (redWaypoints.length > 0 && !waypointStillExists(redWaypoints[0]))
        redWaypoints.shift();

    // Chase enemy if catchable before growth escape
    if (canRedCatchBlueBeforeGrowth()) {
        moveToward(blueballX + blueR, blueballY + blueR, cx, cy, true);
        return true;
    }

    // Follow plan, or fall back to nearest food
    var target = redWaypoints.length > 0 ? redWaypoints[0] : nearestFood(cx, cy);
    if (target) moveToward(target.x, target.y, cx, cy, true);
    return true;
};

// ───  P2 AI (nearest edible) ─────────────────────────────────────────────────
var blueFoodChain = [];
var _blueChainGenId = 0;

window.rebuildBlueFoodChain = function () {
    var genId = ++_blueChainGenId;
    var blueR = getRadius(blueball);
    if (isNaN(blueR)) return;

    // Snapshot food positions once (DOM reads happen here, not per-frame)
    var foods = [];
    for (var i = 0; i < foodElements.length; i++) {
        var f = foodElements[i];
        foods.push({ el: f, x: parseInt(f.style.left) + 5, y: parseInt(f.style.top) + 5 });
    }

    var cx = blueballX + blueR, cy = blueballY + blueR;

    // Step 1: sync — commit nearest food immediately
    if (!foods.length) { blueFoodChain = []; return; }
    var bi = 0, bd = Infinity;
    for (var i = 0; i < foods.length; i++) {
        var dx = foods[i].x - cx, dy = foods[i].y - cy;
        var d = dx * dx + dy * dy;
        if (d < bd) { bd = d; bi = i; }
    }
    var first = foods.splice(bi, 1)[0];
    blueFoodChain = [first];
    cx = first.x; cy = first.y;

    // Steps 2–25: async, one per tick
    function buildNext() {
        if (genId !== _blueChainGenId || !foods.length) return;
        var bi = 0, bd = Infinity;
        for (var i = 0; i < foods.length; i++) {
            var dx = foods[i].x - cx, dy = foods[i].y - cy;
            var d = dx * dx + dy * dy;
            if (d < bd) { bd = d; bi = i; }
        }
        var next = foods.splice(bi, 1)[0];
        blueFoodChain.push(next);
        cx = next.x; cy = next.y;
        setTimeout(buildNext, 0);
    }
    setTimeout(buildNext, 0);
};

window.updateAIp2 = function () {
    var blueR = getRadius(blueball);
    var redR = getRadius(redball);
    if (isNaN(blueR) || isNaN(redR)) return;

    var cx = blueballX + blueR, cy = blueballY + blueR;

    // Drop eaten entries (element-based check, not coordinate fuzzy match)
    while (blueFoodChain.length > 0 && !document.body.contains(blueFoodChain[0].el))
        blueFoodChain.shift();

    // Chase player if bigger and closer than next food
    if (blueR > redR) {
        var ex = redballX + redR, ey = redballY + redR;
        var ed = (ex - cx) * (ex - cx) + (ey - cy) * (ey - cy);
        var fd = blueFoodChain.length > 0
            ? (blueFoodChain[0].x - cx) * (blueFoodChain[0].x - cx) + (blueFoodChain[0].y - cy) * (blueFoodChain[0].y - cy)
            : Infinity;
        if (ed < fd) { moveToward(ex, ey, cx, cy, false); return true; }
    }

    var target = blueFoodChain.length > 0 ? blueFoodChain[0] : nearestFood(cx, cy);
    if (target) moveToward(target.x, target.y, cx, cy, false);
    return true;
};