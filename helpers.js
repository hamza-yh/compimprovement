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

export function prefix(n) {
    if (n < 10) {
        return `0${n}`;
    }
    return `${n}`;
}


export function timeToRank(time, data) {
    const t = time <= 0 ? Infinity : time;
    let lastRank = null;
    for (const [rankStr, entry] of Object.entries(data)) {
    const rank = parseInt(rankStr);
    lastRank = rank;
    if (entry.time >= t) break;
    }
    return lastRank;
}


const eventOptions = [
    { value: '333', name: '3x3x3 Cube' },
    { value: '222', name: '2x2x2 Cube' },
    { value: '444', name: '4x4x4 Cube' },
    { value: '555', name: '5x5x5 Cube' },
    { value: '666', name: '6x6x6 Cube' },
    { value: '777', name: '7x7x7 Cube' },
    { value: '333bf', name: '3x3x3 Blindfolded' },
    { value: '333fm', name: '3x3x3 Fewest Moves' },
    { value: '333oh', name: '3x3x3 One-Handed' },
    { value: 'clock', name: 'Clock' },
    { value: 'minx', name: 'Megaminx' },
    { value: 'pyram', name: 'Pyraminx' },
    { value: 'skewb', name: 'Skewb' },
    { value: 'sq1', name: 'Square-1' },
    { value: '444bf', name: '4x4x4 Blindfolded' },
    { value: '555bf', name: '5x5x5 Blindfolded' },
    { value: '333mbf', name: '3x3x3 Multi-Blind' },
];

export function getEventName(value) {
  const match = eventOptions.find(e => e.value === value);
  return match ? match.name : value; // fallback to value if name not found
}
