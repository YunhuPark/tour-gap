(() => {
  const cfg = window.TOUR_GAP_VALIDATION_CONFIG || {};
  const STORE_RESP = 'tourgap_validation_responses';
  const STORE_EVT = 'tourgap_validation_events';
  const STORE_ASSIGN = 'tourgap_validation_assignment_counts';
  const $ = (s) => document.querySelector(s);
  const uuid = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };
  const now = () => new Date().toISOString();
  const get = (k, fallback=[]) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const appendLocal = (key, rows) => {
    const existing = get(key);
    if (!Array.isArray(existing) || existing.length + rows.length > 1000) return false;
    return set(key, existing.concat(rows));
  };
  const sessionId = uuid();
  let participantId = uuid();
  let baseline = '';
  let variant = '';
  let pendingEvents = [];
  let assignmentCounts = null;
  let submitted = false;

  function assignVariant() {
    const saved = get(STORE_ASSIGN, {A:0,B:0});
    const c = saved && Number.isInteger(saved.A) && saved.A >= 0 && Number.isInteger(saved.B) && saved.B >= 0 ? {...saved} : {A:0,B:0};
    if (c.A === c.B) variant = Math.random() < .5 ? 'A' : 'B'; else variant = c.A < c.B ? 'A' : 'B';
    assignmentCounts = c; return variant;
  }

  function postCloud(type, payload) {
    if (!cfg.endpoint) return;
    return fetch(cfg.endpoint, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: {'Content-Type':'text/plain;charset=UTF-8'},
      body: JSON.stringify({type, study_id:cfg.studyId, payload})
    }).catch(() => false);
  }

  function recordEvent(eventName, metadata={}) {
    if (submitted || pendingEvents.length >= 16) return;
    const evt = {event_id:uuid(), timestamp:now(), participant_id:participantId, variant, event_name:eventName, page_path:location.pathname, session_id:sessionId, source:cfg.source || 'field-pilot', metadata_json:JSON.stringify(metadata)};
    pendingEvents.push(evt);
  }

  function show(id) { ['#baseline','#concept','#survey','#thanks'].forEach(x => $(x).classList.add('hidden')); $(id).classList.remove('hidden'); window.scrollTo({top:0,behavior:'smooth'}); }

  function renderConcept() {
    const card = $('#concept-card');
    if (variant === 'A') {
      card.classList.remove('variant-b');
      card.innerHTML = `<span class="tag">A · 체류 콘텐츠 결합형</span><h2>원주의 밤까지 이어지는 1박 코스</h2><p>낮 관광 뒤 저녁 콘텐츠와 로컬 식음, 1박 혜택을 한 흐름으로 묶는 가상의 체류 패키지입니다.</p><ul><li>낮: 원주 대표 관광자원 자유 선택</li><li>저녁: 야간 콘텐츠 또는 원도심 문화 프로그램</li><li>식음: 전통시장·로컬 식음 연계</li><li>숙박: 같은 예산 수준의 1박 혜택</li></ul>`;
    } else {
      card.classList.add('variant-b');
      card.innerHTML = `<span class="tag">B · 숙박 혜택 중심형</span><h2>원주 1박, 숙박 혜택에 집중</h2><p>관광 일정은 자유롭게 두고, 동일한 예산 수준의 혜택을 숙박 자체에 집중하는 가상의 제안입니다.</p><ul><li>관광 일정: 자유 선택</li><li>야간 프로그램: 별도 결합 없음</li><li>식음 연계: 별도 결합 없음</li><li>숙박: 같은 예산 수준의 1박 혜택</li></ul>`;
    }
  }

  document.querySelectorAll('[data-baseline]').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('[data-baseline]').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); baseline = btn.dataset.baseline; $('#baseline-next').disabled = false; }));
  $('#baseline-next').addEventListener('click', () => { assignVariant(); renderConcept(); recordEvent('variant_exposure',{baseline_trip_type:baseline}); show('#concept'); });
  $('#cta').addEventListener('click', () => recordEvent('cta_click',{concept:variant}));
  $('#concept-next').addEventListener('click', () => { recordEvent('survey_open'); show('#survey'); });

  $('#survey-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitted || !$('#consent').checked || !e.target.checkValidity()) {
      if (!submitted) e.target.reportValidity();
      return;
    }
    const form = new FormData(e.target);
    const row = {response_id:uuid(), submitted_at:now(), variant, age_group:$('#age').value, residence:$('#residence').value, visited_wonju_last12m:form.get('visited'), baseline_trip_type:baseline, package_intent_1to5:Number(form.get('intent')), overnight_intent_after:form.get('after'), top_trigger:$('#trigger').value, preferred_lodging_type:$('#lodging').value, budget_band:$('#budget').value, consent:$('#consent').checked?'Y':'N', source:cfg.source||'field-pilot', notes:''};
    recordEvent('survey_submit',{intent:row.package_intent_1to5,after:row.overnight_intent_after});
    submitted = true;
    const localSaved = appendLocal(STORE_RESP, [row]);
    appendLocal(STORE_EVT, pendingEvents);
    if (assignmentCounts) { assignmentCounts[variant] += 1; set(STORE_ASSIGN, assignmentCounts); }
    pendingEvents.forEach(evt => postCloud('event', {...evt, consent:'Y'}));
    pendingEvents = [];
    postCloud('survey', row);
    $('#thanks-copy').textContent = `${localSaved ? '이 기기에 저장했습니다.' : '이 기기에 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'} 중앙 접수는 확인되지 않았습니다. 필요한 경우 운영자에게 알려주세요.`;
    show('#thanks');
  });

  $('#next-participant').addEventListener('click', () => { participantId=uuid(); baseline=''; variant=''; submitted=false; pendingEvents=[]; assignmentCounts=null; $('#survey-form').reset(); document.querySelectorAll('[data-baseline]').forEach(b=>b.classList.remove('selected')); $('#baseline-next').disabled=true; recordEvent('page_view'); show('#baseline'); });
  recordEvent('page_view');
})();
