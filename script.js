// ─── Config ───────────────────────────────────────────────────────────────────
// Game Speed
var gameSpeed = 1
var P1_advatage = 1
// Refresh Rate
var foodRefreshInterval = 15000 / gameSpeed;
const frameRefreshInterval = 10; // ms

// ─── Game Mode ────────────────────────────────────────────────────────────────
var gameMode = 1; // 1 or 2

// ─── Ball State ───────────────────────────────────────────────────────────────
var redball = null;
var blueball = null;
var foodElements = null;

var redballVX = 0, redballVY = 0, redspeed = P1_advatage * gameSpeed * 0.5;
var redWinsCount = 0, redballX = 0, redballY = 0;

var blueballVX = 0, blueballVY = 0, bluespeed = gameSpeed * 0.5;
var blueWinsCount = 0, blueballX = 680, blueballY = 430;

// ─── 1P State ─────────────────────────────────────────────────────────────────
var stopwatchStart = null;
var stopwatchRunning = false;
var highScore = null; // best (lowest) ms
var lastScore = null; // last winning ms (shown when stopwatch is paused)

const supabaseUrl = "https://znmnnttmddhgavfewwhp.supabase.co";
const supabaseKey = "sb_publishable_kUXQNorAEPpAZAsOVP7KNA_8jh2RHgv";

const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

// ─── Auth State ───────────────────────────────────────────────────────────────
var currentUser = null;

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
    updateInstructions();
    spawnfood();
    checkUser();
    loadLeaderboard();
}

// Registered BEFORE the auth listener so a bad auth call can never block init
window.onload = init;

// Auth state listener — wrapped so any Supabase error never aborts the script
try {
    sb.auth.onAuthStateChange(function (event, session) {
        currentUser = session ? session.user : null;
        renderAuthBar();
        if (event === "SIGNED_IN") loadLeaderboard();
    });
} catch (e) {
    console.warn("Auth listener setup failed:", e);
}


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
        var bestText = highScore !== null ? formatTime(gameSpeed * highScore) : "—";
        value2.innerHTML = bestText + ' <button onclick="submitScore()" style="font-size:12px;vertical-align:middle;margin-left:6px;">Submit</button>';
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

async function loadLeaderboard() {
    const { data, error } = await sb
        .from("scores")
        .select("username, time_ms, user_id")
        .order("time_ms", { ascending: true })
        .limit(10);

    var body = document.getElementById("leaderboard-body");
    if (!body) return;

    if (error || !data || data.length === 0) {
        body.innerHTML = '<tr><td colspan="3" align="center" style="padding:8px;color:#888;">No scores yet — be the first!</td></tr>';
        return;
    }

    body.innerHTML = "";
    data.forEach(function (row, i) {
        var isMe = currentUser && row.user_id === currentUser.id;
        var tr = document.createElement("tr");
        if (isMe) tr.style.fontWeight = "bold";
        if (i === 0) tr.style.background = "#fffbe6";
        tr.innerHTML =
            '<td style="padding:6px 14px;border:1px solid #ccc;text-align:center;">' + (i + 1) + '</td>' +
            '<td style="padding:6px 14px;border:1px solid #ccc;">' + row.username + (isMe ? " ★" : "") + '</td>' +
            '<td style="padding:6px 14px;border:1px solid #ccc;text-align:right;">' + formatTime(row.time_ms) + '</td>';
        body.appendChild(tr);
    });
}

async function login() {
    await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: "https://nottrevino.github.io/cellgame"
        }
    });
}

async function logout() {
    await sb.auth.signOut();
    currentUser = null;
    renderAuthBar();
}

async function checkUser() {
    const { data: { user } } = await sb.auth.getUser();
    currentUser = user || null;
    renderAuthBar();
}

function renderAuthBar() {
    var bar = document.getElementById("auth-bar");
    if (!bar) return;
    if (currentUser) {
        var name = localStorage.getItem("cell_username") ||
            (currentUser.user_metadata && currentUser.user_metadata.full_name) ||
            currentUser.email || "Player";
        bar.innerHTML =
            'Signed in as <strong>' + name + '</strong>' +
            ' &nbsp;<button onclick="logout()" style="font-size:12px;">Logout</button>' +
            ' <button onclick="resetUsername()" style="font-size:12px;">Change name</button>';
    } else {
        bar.innerHTML = '<button onclick="login()">Login with Google</button>';
    }
}

function getUsername() {
    var stored = localStorage.getItem("cell_username");
    if (stored) return stored;
    var defaultName = (currentUser && currentUser.user_metadata && currentUser.user_metadata.full_name)
        || (currentUser && currentUser.email) || "Player";
    var name = prompt("Choose a leaderboard display name:", defaultName);
    if (!name || !name.trim()) return null;
    name = name.trim().slice(0, 20);
    localStorage.setItem("cell_username", name);
    renderAuthBar();
    return name;
}

function resetUsername() {
    localStorage.removeItem("cell_username");
    var name = getUsername();
    if (name) renderAuthBar();
}

async function submitScore() {
    if (highScore === null) { alert("Win a game first!"); return; }
    if (!currentUser) {
        if (confirm("You need to log in to save your score.\nLog in with Google?")) login();
        return;
    }
    var username = getUsername();
    if (!username) return;
    await saveScore(highScore, username);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRadius(ball) {
    var r = parseInt(window.getComputedStyle(ball).getPropertyValue("border-radius"));
    return isNaN(r) ? NaN : r;
}

function formatTime(ms) {
    return (ms / (1000 * gameSpeed)).toFixed(2) + "s";
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
        //case 71: P1_advatage = Math.max(P1_advatage - 1, 1); break; // G
        //case 72: P1_advatage += 1; break;                           // H
        case 189 || 109: gameSpeed = Math.max(P1_advatage - 1, 1); break; // -
        case 187 || 107: gameSpeed += 1; break;                           // +

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

function tryEat(ball, growthFn, bL, bR, bT, bB, fL, fR, fT, fB, food) {
    if (bR >= fR && bL <= fL && bB >= fB && bT <= fT && getRadius(ball) > getRadius(food)) {
        growthFn();
        food.remove();
        return true;
    }
    return false;
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
async function saveScore(ms, username) {
    if (ms < 2000) return; // basic anti-cheat
    if (!currentUser) return;

    // Only accept a provided username, or quietly skip
    if (!username) return;

    // Check if existing DB score is already better
    const { data: existing } = await sb
        .from("scores")
        .select("time_ms")
        .eq("user_id", currentUser.id)
        .single();

    if (existing && existing.time_ms <= ms) return; // not a new personal best

    await sb.from("scores").upsert({
        user_id: currentUser.id,
        username: username,
        time_ms: ms
    }, { onConflict: "user_id" });

    loadLeaderboard();
}
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
            if (highScore === null || elapsed < highScore) {
                highScore = elapsed;
                // Auto-save if logged in and username already set
                if (currentUser) {
                    var storedName = localStorage.getItem("cell_username") ||
                        (currentUser.user_metadata && currentUser.user_metadata.full_name);
                    if (storedName) saveScore(elapsed, storedName).then(loadLeaderboard);
                }
            }
            document.getElementById("value1").innerHTML = formatTime(elapsed);
            var bestText = formatTime(highScore);
            document.getElementById("value2").innerHTML = bestText + ' <button onclick="submitScore()" style="font-size:12px;vertical-align:middle;margin-left:6px;">Submit</button>';
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
    redspeed = P1_advatage * gameSpeed * ((1 / (225 - 20)) * (getRadius(redball) - 20) + 0.5);
    bluespeed = gameSpeed * ((1 / (225 - 20)) * (getRadius(blueball) - 20) + 0.5);

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

    // ── Win conditions ──────────────────────────────────────────────────────
    var finalRedR = getRadius(redball);
    var finalBlueR = getRadius(blueball);

    if (isNaN(finalBlueR) || (finalRedR === 225 && finalRedR > finalBlueR)) { redwins(); return; }
    if (isNaN(finalRedR) || (finalBlueR === 225 && finalBlueR > finalRedR)) { bluewins(); return; }
    else if (finalRedR === 225 && finalBlueR === 225) { fullReset(); }

    // Respawn food if exhausted
    if (foodElements.length === 0) spawnfood();
}

setInterval(updateBalls, frameRefreshInterval);