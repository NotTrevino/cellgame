// ─────────────────────────────────────────────────────────────────────────────
// backend/server.js
// ─────────────────────────────────────────────────────────────────────────────

// ─── Supabase Config ─────────────────────────────────────────────────────────
const supabaseUrl = "https://znmnnttmddhgavfewwhp.supabase.co";
const supabaseKey = "sb_publishable_kUXQNorAEPpAZAsOVP7KNA_8jh2RHgv";

window.sb = window.supabase.createClient(supabaseUrl, supabaseKey);

// ─── Auth State ───────────────────────────────────────────────────────────────
window.currentUser = null;

// ─── Auth Listener ────────────────────────────────────────────────────────────
try {
    window.sb.auth.onAuthStateChange(function (event, session) {
        window.currentUser = session ? session.user : null;
        renderAuthBar();
        if (event === "SIGNED_IN") loadLeaderboard();
    });
} catch (e) {
    console.warn("Auth listener setup failed:", e);
}

// ─── Auth Functions ───────────────────────────────────────────────────────────
window.login = async function () {
    await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: "https://nottrevino.github.io/cellgame"
        }
    });
};

window.logout = async function () {
    await sb.auth.signOut();
    currentUser = null;
    renderAuthBar();
};

window.checkUser = async function () {
    const { data: { user } } = await sb.auth.getUser();
    currentUser = user || null;
    renderAuthBar();
};

// ─── UI: Auth Bar ─────────────────────────────────────────────────────────────
window.renderAuthBar = function () {
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
};

// ─── Username Handling ────────────────────────────────────────────────────────
window.getUsername = function () {
    var stored = localStorage.getItem("cell_username");
    if (stored) return stored;

    var defaultName =
        (currentUser && currentUser.user_metadata && currentUser.user_metadata.full_name) ||
        (currentUser && currentUser.email) ||
        "Player";

    var name = prompt("Choose a leaderboard display name:", defaultName);
    if (!name || !name.trim()) return null;

    name = name.trim().slice(0, 20);
    localStorage.setItem("cell_username", name);

    renderAuthBar();
    return name;
};

window.resetUsername = function () {
    localStorage.removeItem("cell_username");
    var name = getUsername();
    if (name) renderAuthBar();
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
window.formatTime = function (ms) {
    return (ms / 1000).toFixed(2) + "s";
};
window.loadLeaderboard = async function () {
    const { data, error } = await sb
        .from("scores")
        .select("username, time_ms, user_id")
        .order("time_ms", { ascending: true })
        .limit(10);

    var body = document.getElementById("leaderboard-body");
    if (!body) return;

    if (error || !data || data.length === 0) {
        body.innerHTML =
            '<tr><td colspan="3" align="center" style="padding:8px;color:#888;">No scores yet — be the first!</td></tr>';
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
            '<td style="padding:6px 14px;border:1px solid #ccc;">' +
            row.username + (isMe ? " ★" : "") +
            '</td>' +
            '<td style="padding:6px 14px;border:1px solid #ccc;text-align:right;">' +
            formatTime(row.time_ms) +
            '</td>';

        body.appendChild(tr);
    });
};

// ─── Score Submission ─────────────────────────────────────────────────────────
window.saveScore = async function (ms, username) {
    if (ms < 2000 || gameMode !== 1) return; // basic anti-cheat
    if (!currentUser) return;
    if (!username) return; // Only accept a provided username, or quietly skip

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
};

// ─── Submit Wrapper ───────────────────────────────────────────────────────────
window.submitScore = async function () {
    if (highScore === null) {
        alert("Win a game first!");
        return;
    }

    if (!currentUser) {
        if (confirm("You need to log in to save your score.\nLog in with Google?")) login();
        return;
    }

    var username = getUsername();
    if (!username) return;

    saveScore(highScore, username);
};