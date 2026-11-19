const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(process.env.COLLECTOR_SOURCE_PATH || path.join(__dirname, '../apps-script/Code.gs'), 'utf8');
const NOW = Date.parse('2026-11-19T00:00:00.000Z');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const survey = () => ({response_id:uuid(1),submitted_at:new Date(NOW).toISOString(),variant:'A',age_group:'20대',residence:'서울',visited_wonju_last12m:'예',baseline_trip_type:'당일치기',package_intent_1to5:4,overnight_intent_after:'1박 이상',top_trigger:'야간 콘텐츠',preferred_lodging_type:'관광호텔',budget_band:'5~8만원',consent:'Y',source:'online-pilot',notes:''});
const event = () => ({event_id:uuid(2),timestamp:new Date(NOW).toISOString(),participant_id:uuid(3),variant:'',event_name:'page_view',page_path:'/',session_id:uuid(4),source:'online-pilot',metadata_json:'{}',consent:'Y'});
function fixture(options={}) {
  let now=NOW; const rows=[];let opens=0;
  const properties=new Map([['TOURGAP_SPREADSHEET_ID','unit-test-sheet']]);
  if(options.budget) properties.set('TOURGAP_SECURITY_BUDGET_V1',JSON.stringify(options.budget));
  const cache=new Map();
  class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  const context=vm.createContext({Date:Clock,JSON,Math,console:{log(){}},ContentService:{MimeType:{JSON:'json'},createTextOutput:body=>({body,setMimeType(){return this;}})},SpreadsheetApp:{openById(){opens++;if(options.sheetError)throw Error('private-sheet-secret-error');return {getSheetByName:name=>({appendRow:cells=>rows.push({name,cells:Array.from(cells)}),getMaxColumns:()=>26})};}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k)||null,setProperty:(k,v)=>properties.set(k,v)})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v)})},LockService:{getScriptLock:()=>({tryLock:()=>!options.lockUnavailable,releaseLock(){}})}});
  vm.runInContext(source,context);
  const call=(payload,extra={})=>JSON.parse(context.doPost({postData:{contents:JSON.stringify({type:'survey',study_id:'wonju-stay-v1',payload,...extra})}}).body);
  return {context,call,rows,properties,get opens(){return opens;},advance:ms=>now+=ms};
}
function rejects(payload,extra={}){const f=fixture();const r=f.call(payload,extra);assert.equal(r.ok,false);assert.equal(r.error,'invalid_request');assert.equal(f.opens,0);assert.equal(f.rows.length,0);}
test('valid survey retains the existing fifteen-column layout',()=>{const f=fixture();assert.equal(f.call(survey()).ok,true);assert.equal(f.rows[0].name,'survey_responses');assert.equal(f.rows[0].cells.length,15);assert.equal(f.rows[0].cells[7],4);});
test('valid consented event retains the existing nine-column layout',()=>{const f=fixture();assert.equal(f.call(event(),{type:'event'}).ok,true);assert.equal(f.rows[0].name,'ab_events');assert.equal(f.rows[0].cells.length,9);});
test('every published select choice and intent score remains accepted',()=>{const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');const fields={age:'age_group',residence:'residence',trigger:'top_trigger',lodging:'preferred_lodging_type',budget:'budget_band'};for(const [id,field] of Object.entries(fields)){const block=html.match(new RegExp('<select id="'+id+'"[^>]*>([\\s\\S]*?)</select>'))[1];for(const match of block.matchAll(/<option(?: value="([^"]*)")?>([^<]*)<\/option>/g)){const value=match[1]===undefined?match[2]:match[1];if(value)assert.equal(fixture().call({...survey(),[field]:value}).ok,true,field+':'+value);}}for(let score=1;score<=5;score++)assert.equal(fixture().call({...survey(),package_intent_1to5:score}).ok,true);});
test('consent is required on the server for surveys and events',()=>{rejects({...survey(),consent:'N'});const p=event();delete p.consent;rejects(p,{type:'event'});});
test('rejects unknown study and unexpected fields before opening a Sheet',()=>{rejects(survey(),{study_id:'other'});rejects({...survey(),email:'not-collected@example.invalid'});});
test('rejects invalid enums, non-numeric scores and malformed identifiers',()=>{rejects({...survey(),residence:'=IMPORTDATA("x")'});rejects({...survey(),package_intent_1to5:'4'});rejects({...survey(),response_id:'=1+1'});});
test('dangerous free text is persisted as visibly literal text',()=>{for(const notes of ['=1+1','  +SUM(1,2)','\t@SUM(1,2)','-1+2']){const f=fixture();assert.equal(f.call({...survey(),notes}).ok,true);assert.equal(f.rows[0].cells[14],'TEXT: '+notes);}});
test('rejects oversized and malformed requests without any Sheet access',()=>{const f=fixture();for(const contents of ['{',' '.repeat(8193)]){const result=JSON.parse(f.context.doPost({postData:{contents}}).body);assert.equal(result.error,'invalid_request');}assert.equal(f.opens,0);});
test('rejects stale timestamps and invalid event metadata',()=>{rejects({...survey(),submitted_at:new Date(NOW-7200000).toISOString()});rejects({...event(),metadata_json:'{"secret":"unexpected"}'},{type:'event'});});
test('validation-only accepts valid input without opening or writing the Sheet',()=>{const f=fixture();const r=f.call(survey(),{validation_only:true});assert.equal(r.ok,true);assert.equal(r.stored,false);assert.equal(f.opens,0);assert.equal(f.rows.length,0);rejects(survey(),{validation_only:'true'});});
test('idempotent retries append once',()=>{const f=fixture();f.call(survey());const second=f.call(survey());assert.equal(second.ok,true);assert.equal(second.duplicate,true);assert.equal(second.stored,false);assert.equal(f.rows.length,1);});
test('global minute budget bounds anonymous writes',()=>{const f=fixture();for(let i=0;i<60;i++)assert.equal(f.call({...survey(),response_id:uuid(100+i)}).ok,true);const r=f.call({...survey(),response_id:uuid(200)});assert.equal(r.error,'rate_limited');assert.equal(f.rows.length,60);});
test('global day budget survives minute changes',()=>{const f=fixture({budget:{day:'2026-11-19',dayCount:1000,minute:Math.floor(NOW/60000)-1,minuteCount:0}});assert.equal(f.call(survey()).error,'rate_limited');assert.equal(f.opens,0);});
test('lock failure denies writes and internal errors are not disclosed',()=>{const f=fixture({lockUnavailable:true});assert.equal(f.call(survey()).error,'unavailable');assert.equal(f.opens,0);const g=fixture({sheetError:true});const r=g.call(survey());assert.equal(r.error,'unavailable');assert.ok(!JSON.stringify(r).includes('private-sheet'));});
test('GET exposes only fixed service/version metadata',()=>{const f=fixture();const r=JSON.parse(f.context.doGet().body);assert.equal(r.version,'2026-11-19-security-v1');assert.equal(f.opens,0);assert.ok(!JSON.stringify(r).includes('unit-test-sheet'));});
test('owner configuration check reads only tab metadata',()=>{const f=fixture();const r=f.context.verifyConfiguration();assert.equal(r.configured,true);assert.equal(r.surveySheetPresent,true);assert.equal(r.eventSheetPresent,true);assert.equal(f.rows.length,0);});
