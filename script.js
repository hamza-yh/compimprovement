import { formatCentiseconds, timeToRank, getEventName} from "./helpers.js";

async function analyzeComp() {
    const compId = document.getElementById('compId').value.trim();
    const output = document.getElementById('output');
    if (!compId) return alert('Enter a competition ID');
    output.innerHTML = '<p>Loading...</p>';

    const res = await fetch(`https://www.worldcubeassociation.org/api/v0/competitions/${compId}/wcif/public`);
    if (!res.ok) return output.innerHTML = '<p>Failed to fetch competition data.</p>';
    const json = await res.json();

    const results = (await Promise.all(
        json.events.map(async (event) => {
            const [averageData, singleData] = await Promise.all([
                fetch(`https://hamza-yh.github.io/wcaranks/api/average/${event.id}.json`).then(r => r.json()),
                fetch(`https://hamza-yh.github.io/wcaranks/api/single/${event.id}.json`).then(r => r.json())
            ]);
            const data = { averageData, singleData };
            return event.rounds.flatMap(round => round.results.flatMap(result =>
                resultImprovement(event.id, result, data, json.persons)
            ));
        })
    )).flat();

    const deduped = deduplicateResults(results);
    const grouped = {};
    for (const r of deduped) {
        const { id, value, oldTime, newTime, event, type } = r;
        if (!grouped[id]) {
            const p = json.persons.find(p => p.registrantId === id) || {};
            grouped[id] = {
            id,
            name: p.name || 'Unknown',
            wcaId: p.wcaId || '—',
            results: [],
            totalScore: 0
            };
        }
        grouped[id].results.push({ event, type, oldTime, newTime, value });
        grouped[id].totalScore += value;
    }
    const sorted = Object.values(grouped).sort((a, b) => b.totalScore - a.totalScore);

    let html = '<table><thead><tr><th>Name</th><th>Total</th><th>Event</th><th>Time</th><th>Score</th></tr></thead><tbody>';
    for (const person of sorted) {
    const nonZeroResults = person.results.filter(r => r.value !== 0);
    if (nonZeroResults.length === 0) continue;
    const rowspan = nonZeroResults.length;
    let first = true;
    for (const r of nonZeroResults) {
        html += '<tr>';
        if (first) {
        html += `<td rowspan="${rowspan}" class="name-row">${person.name} (${person.wcaId})</td>`;
        html += `<td rowspan="${rowspan}" class="name-row">${person.totalScore.toFixed(2)}</td>`;
        first = false;
        }
        html += `<td>${getEventName(r.event)} ${r.type}</td>`;
        html += `<td>${formatCentiseconds(r.oldTime)} → ${formatCentiseconds(r.newTime)}</td>`;
        html += `<td>${r.value.toFixed(2)}</td>`;
        html += '</tr>';
    }
    }
    html += '</tbody></table>';
    output.innerHTML = html;
}

document.getElementById('analyzeBtn').addEventListener('click', analyzeComp);

function resultImprovement(event, result, data, persons) {
    const personData = persons.find(p => p.registrantId === result.personId);
    const oldSingle = personData?.personalBests.find(pb => pb.eventId === event && pb.type === 'single')?.best ?? null;
    const oldAverage = personData?.personalBests.find(pb => pb.eventId === event && pb.type === 'average')?.best ?? null;
    return [
    { event, id: result.personId, type: 'single', oldTime: oldSingle, newTime: result.best, value: score(oldSingle, result.best, data.singleData) },
    { event, id: result.personId, type: 'average', oldTime: oldAverage, newTime: result.average, value: score(oldAverage, result.average, data.averageData) }
    ];
}


function score(oldTime, newTime, data) {
    if (!oldTime || !newTime) return 0;
    const oldRank = timeToRank(oldTime, data);
    const newRank = timeToRank(newTime, data);
    const total = timeToRank(Infinity, data);
    const oldP = 1 - rankToPercentile(oldRank, total);
    const newP = 1 - rankToPercentile(newRank, total);
    return Math.max(0, ((oldP - newP) / oldP) * 100);
}


function rankToPercentile(rank, total) {
    return (total - rank + 0.5) / total;
}

function deduplicateResults(results) {
    const map = new Map();
    for (const r of results) {
    const key = `${r.event}-${r.id}-${r.type}`;
    if (!map.has(key) || r.value > map.get(key).value) {
        map.set(key, r);
    }
    }
    return Array.from(map.values());
}
