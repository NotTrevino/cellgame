// ─────────────────────────────────────────────────────────────────────────────
// input.js
// ─────────────────────────────────────────────────────────────────────────────
window.getKeyAndMove=function (e) {
    var key_code = e.which || e.keyCode;
    var isMoveKey = false;

    switch (key_code) {
        case 65: if (gameMode !== 0) { moveredLeft(); isMoveKey = true; } break;  // A
        case 87: if (gameMode !== 0) { moveredUp(); isMoveKey = true; } break;    // W
        case 68: if (gameMode !== 0) { moveredRight(); isMoveKey = true; } break; // D
        case 83: if (gameMode !== 0) { moveredDown(); isMoveKey = true; } break;  // S
        case 82: fullReset(); break; // R
        //case 71: P1_advantage = Math.max(P1_advantage - 1, 1); break; // G
        //case 72: P1_advantage += 1; break;                           // H
        case 189: // -
        case 109: // - (numpad)
            gameSpeed = Math.max(gameSpeed - 1, 1);
            startIntervals();
            break;
        case 187: // +
        case 107: // + (numpad)
            gameSpeed = Math.min(gameSpeed + 1, 10);
            startIntervals();
            break;

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
};