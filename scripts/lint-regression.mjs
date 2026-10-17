import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const baseline=JSON.parse(fs.readFileSync('ops/lint-baseline.json','utf8'));
const result=spawnSync(process.execPath,['node_modules/eslint/bin/eslint.js','.','--format','json'],{encoding:'utf8',maxBuffer:20*1024*1024});
if (!result.stdout || result.status>1) { console.error(result.stderr); process.exit(1); }
const counts={};
for (const file of JSON.parse(result.stdout)) for (const message of file.messages) {
 if(message.severity!==2) continue;
 const key=path.relative(process.cwd(),file.filePath).split(path.sep).join('/')+':'+message.ruleId;
 counts[key]=(counts[key]||0)+1;
}
const added=Object.entries(counts).filter(([key,count])=>count>(baseline[key]||0));
if(added.length) { console.error('New lint errors:',added); process.exit(1); }
console.log(`No new lint errors. Existing debt: ${Object.values(counts).reduce((a,b)=>a+b,0)} (baseline ${Object.values(baseline).reduce((a,b)=>a+b,0)}). Full npm run lint still reports legacy debt.`);
