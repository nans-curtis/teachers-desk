const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/worker.js','utf8');
const match=source.match(/^var Ce=("(?:\\.|[^"\\])*")/s);if(!match)throw Error('Worker bundle boundary missing');
let core=source.slice(match[0].length).replace(/\n\/\* independent-attendance \*\/$/,'').trimEnd();
const suffix='var rn=kt({html:Ce});export{rn as default};';
if(!core.endsWith(suffix))throw Error('Worker export boundary changed');
core=core.slice(0,-suffix.length)+'export{kt as createCore,vt as readState,Gt as readBody,We as validateMutation,Pe as sessionsForDate,R as ValidationError};';
fs.mkdirSync('api',{recursive:true});fs.writeFileSync('api/core.mjs',core);
console.log('Integration API core generated from existing validation and audited mutation handler');
