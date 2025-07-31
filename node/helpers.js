export function formatCentiseconds(centiTime) {
    if (centiTime === -1) {
        return 'DNF';
    }
    if (centiTime === -2) {
        return 'DNS';
    }
    let cs = centiTime % 100;
    let s = Math.floor(centiTime / 100) % 60;
    let m = Math.floor(centiTime / 6000);
    if (m > 0) {
        return `${m}:${prefix(s)}.${prefix(cs)}`;
    }
    return `${s}.${prefix(cs)}`;
}

function prefix(n) {
    if (n < 10) {
        return `0${n}`;
    }
    return `${n}`;
}

function timeToRank(time, data) {
    const t = time <= 0 ? Infinity : time;
    let lastRank = null;
    for (const [rankStr, entry] of Object.entries(data)) {
    const rank = parseInt(rankStr);
    lastRank = rank;
    if (entry.time >= t) break;
    }
    return lastRank;
}
