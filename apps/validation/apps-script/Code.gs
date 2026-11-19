const SECURITY_VERSION = '2026-11-19-security-v1';
const STUDY_ID = 'wonju-stay-v1';
const SHEET_PROPERTY = 'TOURGAP_SPREADSHEET_ID';
const BUDGET_PROPERTY = 'TOURGAP_SECURITY_BUDGET_V1';
const MAX_MINUTE_REQUESTS = 60;
const MAX_DAILY_REQUESTS = 1000;
const TRIPS = ['당일치기', '1박 이상'];
const SOURCES = ['online-pilot', 'field-pilot'];

function doGet() {
  return json_({ok: true, service: 'tourgap-collector', version: SECURITY_VERSION});
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    require_(typeof raw === 'string' && raw.length <= 8192);
    let body;
    try { body = JSON.parse(raw); } catch (_) { fail_('invalid_request'); }
    require_(record_(body) && keys_(body, ['type', 'study_id', 'payload', 'validation_only']));
    require_(body.study_id === STUDY_ID && ['survey', 'event'].includes(body.type));
    require_(body.validation_only === undefined || typeof body.validation_only === 'boolean');
    const row = validate_(body.type, body.payload);
    if (body.validation_only === true) return json_({ok: true, stored: false, version: SECURITY_VERSION});

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return json_({ok: false, error: 'unavailable', version: SECURITY_VERSION});
    try {
      const cache = CacheService.getScriptCache();
      const dedupKey = 'tourgap:v1:' + body.type + ':' + row.id;
      if (cache.get(dedupKey)) return json_({ok: true, stored: false, duplicate: true, version: SECURITY_VERSION});
      const properties = PropertiesService.getScriptProperties();
      const sheetId = properties.getProperty(SHEET_PROPERTY);
      if (!sheetId || !/^[A-Za-z0-9_-]{10,200}$/.test(sheetId)) throw new Error('configuration');
      budget_(properties);
      const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(row.sheet);
      if (!sheet) throw new Error('configuration');
      sheet.appendRow(row.cells.map(safeCell_));
      cache.put(dedupKey, '1', 21600);
      return json_({ok: true, stored: true, version: SECURITY_VERSION});
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    const code = err && ['invalid_request', 'rate_limited'].includes(err.collectorCode) ? err.collectorCode : 'unavailable';
    return json_({ok: false, error: code, version: SECURITY_VERSION});
  }
}

function validate_(type, p) {
  require_(record_(p));
  if (type === 'survey') {
    const fields = ['response_id','submitted_at','variant','age_group','residence','visited_wonju_last12m','baseline_trip_type','package_intent_1to5','overnight_intent_after','top_trigger','preferred_lodging_type','budget_band','consent','source','notes'];
    require_(keys_(p, fields) && fields.filter(k => k !== 'notes').every(k => Object.prototype.hasOwnProperty.call(p,k)));
    id_(p.response_id); timestamp_(p.submitted_at); choice_(p.variant, ['A','B']);
    choice_(p.age_group, ['10대','20대','30대','40대','50대','60대 이상']);
    choice_(p.residence, ['서울','경기/인천','강원','충청','전라','경상','제주/기타']);
    choice_(p.visited_wonju_last12m, ['예','아니오']); choice_(p.baseline_trip_type, TRIPS);
    score_(p.package_intent_1to5); choice_(p.overnight_intent_after, TRIPS);
    choice_(p.top_trigger, ['야간 콘텐츠','숙박 혜택/할인','로컬 식음료 결합','교통 연계','가족형 숙소','청년형/호스텔형 숙소','늦은 체크아웃','기타']);
    choice_(p.preferred_lodging_type, ['비즈니스/일반호텔','관광호텔','리조트/콘도','소형호텔','호스텔/게스트하우스','한옥/전통형','상관없음']);
    choice_(p.budget_band, ['5만원 미만','5~8만원','8~12만원','12~18만원','18만원 이상']);
    require_(p.consent === 'Y'); choice_(p.source, SOURCES);
    const notes = p.notes === undefined ? '' : p.notes;
    require_(typeof notes === 'string' && notes.length <= 500 && !notes.includes('\u0000'));
    return {sheet: 'survey_responses', id: p.response_id, cells: fields.map(k => k === 'notes' ? notes : p[k])};
  }
  const fields = ['event_id','timestamp','participant_id','variant','event_name','page_path','session_id','source','metadata_json','consent'];
  require_(keys_(p, fields) && fields.every(k => Object.prototype.hasOwnProperty.call(p,k)));
  id_(p.event_id); id_(p.participant_id); id_(p.session_id); timestamp_(p.timestamp);
  require_(p.consent === 'Y'); choice_(p.source, SOURCES); choice_(p.page_path, ['/','/index.html']);
  choice_(p.event_name, ['page_view','variant_exposure','cta_click','survey_open','survey_submit']);
  choice_(p.variant, p.event_name === 'page_view' ? ['', 'A', 'B'] : ['A','B']);
  require_(typeof p.metadata_json === 'string' && p.metadata_json.length <= 512);
  let meta;
  try { meta = JSON.parse(p.metadata_json); } catch (_) { fail_('invalid_request'); }
  require_(record_(meta));
  const allowed = {page_view: [], variant_exposure: ['baseline_trip_type'], cta_click: ['concept'], survey_open: [], survey_submit: ['intent','after']}[p.event_name];
  require_(keys_(meta, allowed) && allowed.every(k => Object.prototype.hasOwnProperty.call(meta,k)));
  if (p.event_name === 'variant_exposure') choice_(meta.baseline_trip_type, TRIPS);
  if (p.event_name === 'cta_click') require_(meta.concept === p.variant);
  if (p.event_name === 'survey_submit') { score_(meta.intent); choice_(meta.after, TRIPS); }
  return {sheet: 'ab_events', id: p.event_id, cells: fields.slice(0,9).map(k => k === 'metadata_json' ? JSON.stringify(meta) : p[k])};
}

function budget_(properties) {
  const now = Date.now();
  const day = new Date(now + 9 * 60 * 60000).toISOString().slice(0,10);
  const minute = Math.floor(now / 60000);
  const raw = properties.getProperty(BUDGET_PROPERTY);
  const prior = raw ? JSON.parse(raw) : {};
  const dayCount = prior.day === day ? prior.dayCount : 0;
  const minuteCount = prior.minute === minute ? prior.minuteCount : 0;
  if (!Number.isInteger(dayCount) || dayCount < 0 || !Number.isInteger(minuteCount) || minuteCount < 0) throw new Error('budget state');
  if (dayCount >= MAX_DAILY_REQUESTS || minuteCount >= MAX_MINUTE_REQUESTS) fail_('rate_limited');
  properties.setProperty(BUDGET_PROPERTY, JSON.stringify({day,dayCount:dayCount+1,minute,minuteCount:minuteCount+1}));
}

function safeCell_(value) {
  // A visible prefix remains literal in Sheets and later CSV exports.
  return typeof value === 'string' && (/^[\s\u0000-\u001f\u007f]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value)) ? 'TEXT: ' + value : value;
}
function record_(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function keys_(value, allowed) { return Object.keys(value).every(k => allowed.includes(k)); }
function require_(condition) { if (!condition) fail_('invalid_request'); }
function fail_(code) { const error = new Error(code); error.collectorCode = code; throw error; }
function choice_(value, choices) { require_(typeof value === 'string' && choices.includes(value)); }
function score_(value) { require_(typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5); }
function id_(value) { require_(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)); }
function timestamp_(value) {
  require_(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value));
  const parsed = Date.parse(value); const age = Date.now() - parsed;
  require_(Number.isFinite(parsed) && new Date(parsed).toISOString() === value && age >= -300000 && age <= 3600000);
}
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }

// Run only in the owner's editor. This does not read cells or append test rows.
function verifyConfiguration() {
  const result = {configured: false, surveySheetPresent: false, eventSheetPresent: false};
  try {
    const id = PropertiesService.getScriptProperties().getProperty(SHEET_PROPERTY);
    result.configured = !!id;
    if (id) {
      const ss = SpreadsheetApp.openById(id);
      const survey = ss.getSheetByName('survey_responses'); const events = ss.getSheetByName('ab_events');
      result.surveySheetPresent = !!survey && survey.getMaxColumns() >= 15;
      result.eventSheetPresent = !!events && events.getMaxColumns() >= 9;
    }
  } catch (_) { result.surveySheetPresent = false; result.eventSheetPresent = false; }
  console.log(JSON.stringify(result));
  return result;
}
