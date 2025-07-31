import { writeFile } from 'fs/promises';
import { formatCentiseconds } from './helpers.js';

// import { readFile } from 'fs/promises';
// async function readJSONFile(path) {
//   const data = await readFile(path, 'utf8');
//   const json = JSON.parse(data);
//   return json;
// }
// const json = await readJSONFile('./wcif1.json');

const res = await fetch('https://www.worldcubeassociation.org/api/v0/competitions/BangaloreMiniJuly2025/wcif/public')
const json = await res.json();

async function main() {
    let results = (await Promise.all(
        json.events.map(async (event) => {
            const [averageData, singleData] = await Promise.all([
            fetch(`https://hamza-yh.github.io/wcaranks/api/average/${event.id}.json`).then(r => r.json()),
            fetch(`https://hamza-yh.github.io/wcaranks/api/single/${event.id}.json`).then(r => r.json())
            ]);
            const data = { averageData, singleData };
            return event.rounds.flatMap(round => round.results.flatMap(result => 
                resultImprovement(event.id, result, data)
            ));
        })
    )).flat()
    results = deduplicateResults(results);

    const groupedByPerson = {};

    for (const entry of results) {
        const { id, value, oldTime, newTime, event, type } = entry;
        if (!groupedByPerson[id]) {
            const personData = json.persons.find(p => p.registrantId === id) || {};
            groupedByPerson[id] = {
                id,
                name: personData.name || null,
                wcaId: personData.wcaId || null,
                results: [],
                totalScore: 0
            };
        }
        groupedByPerson[id].results.push({ event, type, oldTime, newTime, value });
        groupedByPerson[id].totalScore += value;
    }

    const groupedResults = Object.values(groupedByPerson);
    await writeFile('output.json', JSON.stringify(groupedResults, null, 2));
    groupedResults
        .sort((a, b) => b.totalScore - a.totalScore)
        .forEach(person => {
            console.log(`\n${person.name} (${person.wcaId}) — Total Score: ${person.totalScore.toFixed(2)}`);
            person.results
                .filter(r => r.value !== 0)
                .forEach(r => {
                    console.log(`  ${r.event} (${r.type}) — ${formatCentiseconds(r.oldTime)} → ${formatCentiseconds(r.newTime)} | Score: ${r.value.toFixed(2)}`);
                });
        });
}


function deduplicateResults(results) {
  const map = new Map();
  for (const result of results) {
    const key = `${result.event}-${result.id}-${result.type}`;
    const existing = map.get(key);
    if (!existing || result.value > existing.value) {
      map.set(key, result);
    }
  }
  return Array.from(map.values());
}

function rankToPercentile(rank, total) {
  return (total - rank + 0.5) / total;
}

function resultImprovement(event, result, data) {
    const personData = json.persons.find(p => p.registrantId === result.personId);
    const oldSingle = personData.personalBests.find(pb => pb.eventId === event && pb.type === 'single')?.best ?? null;
    const oldAverage = personData.personalBests.find(pb => pb.eventId === event && pb.type === 'average')?.best ?? null;
    const improvement = [
        { event: event, id: result.personId, type: 'single', oldTime: oldSingle, newTime: result.best, value: score(oldSingle, result.best, data.singleData) },
        { event: event, id: result.personId, type: 'average',  oldTime: oldAverage, newTime: result.average, value: score(oldAverage, result.average, data.averageData) },
    ]
    return improvement;
}

function score(oldTime, newTime, data) {
    if (!oldTime || !newTime ) {return 0}
    const oldRank = timeToRank(oldTime, data);
    const newRank = timeToRank(newTime, data);
    const total = timeToRank(Infinity, data);
    const oldP = 1-rankToPercentile(oldRank, total);
    const newP = 1-rankToPercentile(newRank, total);
    return Math.max(0, Number(((oldP - newP)/oldP* 100)));
}

function timeToRank(time, data) {
    const adjustedTime = time <= 0 ? Infinity : time;
    let lastMatchingRank = null;
    for (const [rankStr, entry] of Object.entries(data)) {
        const rank = parseInt(rankStr);
        lastMatchingRank = rank;
        if (entry.time >= adjustedTime) {
            break;
        }
    }    
    return lastMatchingRank
}

await main()

