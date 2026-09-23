const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, VerticalAlign, ShadingType, ImageRun,
} = require("docx");

const FONT = "함초롱바탕";
const TABLE_WIDTH = 9350; // DXA
const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const THIN = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function P(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { line: 384, after: opts.after ?? 80 }, // 줄간격 160%
    children: [
      new TextRun({
        text,
        font: FONT,
        size: (opts.size || 11) * 2, // half-points (공모요강 규정: 11pt)
        bold: !!opts.bold,
      }),
    ],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 1000, type: WidthType.DXA },
    shading: opts.shade ? { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: opts.colSpan,
    borders: BORDERS,
    children: Array.isArray(text)
      ? text
      : String(text).split("\n").map((line) => P(line, { size: opts.size, bold: opts.bold, after: 0 })),
  });
}

function titleBlock(title) {
  return [
    P(title, { size: 16, align: AlignmentType.CENTER, bold: true, after: 300 }),
  ];
}

function signBlock(names) {
  const rows = names.map(([label, val]) =>
    new TableRow({
      children: [
        cell(label, { width: 2500, shade: true, bold: true }),
        cell(val, { width: TABLE_WIDTH - 2500 }),
      ],
    })
  );
  return new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows });
}

async function saveDoc(doc, outPath) {
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buf);
  console.log("saved", outPath);
}

// ---------------------------------------------------------------
// 서식 1-1: 참가신청서 (개인/팀용)
// ---------------------------------------------------------------
async function buildForm1_1(v, title) {
  v = { ...v, title };
  const rows = [
    new TableRow({ children: [
      cell("참가 구분", { width: 2500, shade: true, bold: true }),
      cell("☑ 개인      □ 팀(최대 4인)", { width: TABLE_WIDTH - 2500 }),
    ]}),
    new TableRow({ children: [
      cell("응모작 제목", { width: 2500, shade: true, bold: true }),
      cell(v.title, { width: TABLE_WIDTH - 2500 }),
    ]}),
    new TableRow({ children: [
      cell("소속기관", { width: 2500, shade: true, bold: true }),
      cell(v.org, { width: 3425 }),
      cell("소속부서/직위", { width: 2000, shade: true, bold: true }),
      cell(v.dept, { width: 1425 }),
    ]}),
    new TableRow({ children: [
      cell("성명", { width: 2500, shade: true, bold: true }),
      cell(v.name, { width: 3425 }),
      cell("생년월일(6자리)", { width: 2000, shade: true, bold: true }),
      cell(v.birth, { width: 1425 }),
    ]}),
    new TableRow({ children: [
      cell("휴대전화", { width: 2500, shade: true, bold: true }),
      cell(v.phone, { width: 3425 }),
      cell("E-mail", { width: 2000, shade: true, bold: true }),
      cell(v.email, { width: 1425 }),
    ]}),
  ];

  const coRows = [1, 2, 3].map((n) =>
    new TableRow({ children: [
      cell(String(n), { width: 800 }),
      cell("", { width: 2850 }),
      cell("", { width: 2850 }),
      cell("", { width: 2850 }),
    ]})
  );

  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("『2026 한국관광 데이터랩 활용 경진대회』참가신청서 [개인/팀용]"),
        new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows }),
        P("", { after: 200 }),
        P("공동 참가자 인적사항 (해당 시 작성)", { bold: true, after: 100 }),
        new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows: [
          new TableRow({ children: [
            cell("연번", { width: 800, shade: true, bold: true }),
            cell("소속기관", { width: 2850, shade: true, bold: true }),
            cell("성명", { width: 2850, shade: true, bold: true }),
            cell("생년월일(6자리)", { width: 2850, shade: true, bold: true }),
          ]}),
          ...coRows,
        ]}),
        P("", { after: 300 }),
        P("위와 같이 한국관광공사가 주최하는 <2026 한국관광 데이터랩 활용 경진대회>에 참가를 신청하며, 제출하는 모든 내용에 대해 허위 사실이 없음을 확인합니다.", { after: 300 }),
        P("2026년      월      일", { align: AlignmentType.CENTER, after: 300 }),
        signBlock([
          ["신청자 대표", `${v.name}   (서명: ______________)`],
          ["공동 참가자1", "※ 해당 시 작성   (서명)"],
          ["공동 참가자2", "※ 해당 시 작성   (서명)"],
          ["공동 참가자3", "※ 해당 시 작성   (서명)"],
        ]),
        P("", { after: 300 }),
        P("한국관광공사 귀중", { align: AlignmentType.CENTER, bold: true, size: 18 }),
      ],
    }],
  });
  await saveDoc(doc, "submission/forms/서식1-1_참가신청서.docx");
}

// ---------------------------------------------------------------
// 서식 2: 개인정보 수집·이용 동의서
// ---------------------------------------------------------------
async function buildForm2(v) {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("『2026 한국관광 데이터랩 활용 경진대회』참가를 위한\n개인정보 수집·이용 동의서"),
        P("공사는 『2026 한국관광 데이터랩 활용 경진대회』 개최 관련 아래와 같이 참가자 개인정보를 수집·이용하고자 합니다. 아래의 내용을 꼼꼼하게 읽으신 후 동의 여부를 선택해 주시기 바랍니다.", { after: 150 }),
        P("※ 본 이벤트는 만14세 미만 아동의 개인정보를 수집하지 않습니다.", { after: 200 }),
        P("□ 개인정보 수집‧이용 내역(필수)", { bold: true, after: 100 }),
        new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows: [
          new TableRow({ children: [
            cell("수집·이용 항목", { width: 3117, shade: true, bold: true }),
            cell("수집·이용 목적", { width: 3117, shade: true, bold: true }),
            cell("보유·이용기간", { width: 3116, shade: true, bold: true }),
          ]}),
          new TableRow({ children: [
            cell("이름, 생년월일(6자리), 휴대폰번호, 이메일주소, 소속기관/부서 및 직위", { width: 3117 }),
            cell("『2026 한국관광 데이터랩 활용 경진대회』 참가자 식별 및 응모접수 확인·당선결과 발표·당선작 홈페이지 게시 및 홍보 등", { width: 3117 }),
            cell("공모전 접수 마감일로부터 3개월 간 (~'26. 12. 31)", { width: 3116 }),
          ]}),
        ]}),
        P("※ 귀하는 위의 개인정보 수집‧이용에 대한 동의를 거부할 권리가 있습니다. 그러나 동의를 거부할 경우, 『2026 한국관광 데이터랩 활용 경진대회』 참가에 제한을 받을 수 있습니다.", { after: 150 }),
        P(`☞ 위와 같이 필수 개인정보를 수집·이용하는데 동의하십니까?   ☑ 예(동의)      □ 아니오(비동의)`, { bold: true, after: 250 }),
        P("□ 개인정보 처리업무 위탁 내역(고지사항)", { bold: true, after: 100 }),
        new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows: [
          new TableRow({ children: [
            cell("위탁받는 자(수탁업체)", { width: 3500, shade: true, bold: true }),
            cell("업무내용", { width: 5850, shade: true, bold: true }),
          ]}),
          new TableRow({ children: [
            cell("㈜상상메이커", { width: 3500 }),
            cell("『2026 한국관광 데이터랩 활용 경진대회』 운영 대행", { width: 5850 }),
          ]}),
        ]}),
        P("", { after: 300 }),
        P("2026년      월      일", { align: AlignmentType.CENTER, after: 300 }),
        signBlock([
          ["신청자 대표", `${v.name}   (서명: ______________)`],
          ["공동 참가자1", "※ 해당 시 작성   (서명)"],
          ["공동 참가자2", "※ 해당 시 작성   (서명)"],
          ["공동 참가자3", "※ 해당 시 작성   (서명)"],
        ]),
        P("", { after: 300 }),
        P("한국관광공사 귀중", { align: AlignmentType.CENTER, bold: true, size: 18 }),
      ],
    }],
  });
  await saveDoc(doc, "submission/forms/서식2_개인정보이용동의서.docx");
}

// ---------------------------------------------------------------
// 서식 3: 참가자 유의사항 확인서
// ---------------------------------------------------------------
async function buildForm3(v) {
  const bullets = [
    "다중지원이 금지되며, 동일 작품으로 타 기관 경진대회 또는 공모전 등에 입상하였거나 발표된 논문, 보고서 등의 경우 지원할 수 없으며, 수상 이후에 그 사실이 밝혀질 경우 수상이 취소되거나 상금을 환수할 수 있습니다.",
    "경진대회 응모작에 대한 저작권은 응모자 본인에게 있으나, 응모자는 출품과 동시에 한국관광공사에 별도의 허락 없이도 저작권법상 저작물 이용 허락을 한 것으로 간주됩니다.",
    "한국관광공사는 경진대회 수상작에 한하여 공익 목적으로 온·오프라인 홍보에 활용할 수 있으며, 필요에 따라 수상자와 별도 협의 하에 2차적 저작물로 수정·변형하여 활용할 수 있습니다. 따라서 수상자는 추가적으로 수정·변형이 가능한 원본 파일 제출을 요구받을 수 있습니다.",
    "한국관광공사에 제출한 응모작은 본인의 순수 창작물로서 제3자의 저작권 침해 등 법적 분쟁의 소지가 없어야 합니다. 추후 응모작과 관련하여 타인의 지식재산권 침해 등 법적 분쟁이 발생할 경우 응모자 본인에게 민·형사상 책임이 있는 것은 물론, 수상 이후라도 그 자격은 취소되고 지급된 상금은 전액 환수조치 됩니다.",
    "발표심사 대상자로 선정될 경우, 지정된 일시에 발표심사에 참여하여야 하며, 미참여 시 수상자에서 탈락합니다.",
    "신청인은 심사결과에 이의를 제기할 수 없으며, 심사결과표 등 심사 관련 자료는 비공개이며, 공모·심사·입상작 발표 일정 등은 변경될 수 있습니다.",
  ];
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("『2026 한국관광 데이터랩 활용 경진대회』\n참가자 유의사항 확인서"),
        ...bullets.map((b) => P("□ " + b, { after: 150 })),
        P(`☞ 위의 유의사항을 모두 읽었으며, 이에 동의하십니까?   ☑ 예(동의)      □ 아니오(비동의)`, { bold: true, after: 300 }),
        P("2026년      월      일", { align: AlignmentType.CENTER, after: 300 }),
        signBlock([
          ["신청자 대표", `${v.name}   (서명: ______________)`],
          ["공동 참가자1", "※ 해당 시 작성   (서명)"],
          ["공동 참가자2", "※ 해당 시 작성   (서명)"],
          ["공동 참가자3", "※ 해당 시 작성   (서명)"],
        ]),
        P("", { after: 300 }),
        P("한국관광공사 귀중", { align: AlignmentType.CENTER, bold: true, size: 18 }),
      ],
    }],
  });
  await saveDoc(doc, "submission/forms/서식3_유의사항확인서.docx");
}

// ---------------------------------------------------------------
// 서식 4: 활용사례 작성양식
// ---------------------------------------------------------------
async function buildForm4(v, sections) {
  const headerRows = [
    new TableRow({ children: [
      cell("소속기관명", { width: 1800, shade: true, bold: true }),
      cell(v.org, { width: 2875 }),
      cell("부서명", { width: 1800, shade: true, bold: true }),
      cell(v.dept, { width: 2875 }),
    ]}),
    new TableRow({ children: [
      cell("성명", { width: 1800, shade: true, bold: true }),
      cell(v.name, { width: 2875 }),
      cell("직명/직위", { width: 1800, shade: true, bold: true }),
      cell(v.pos, { width: 2875 }),
    ]}),
    new TableRow({ children: [
      cell("담당업무", { width: 1800, shade: true, bold: true }),
      cell(v.job, { width: 7550, colSpan: 3 }),
    ]}),
  ];

  const bodyRows = [
    new TableRow({ children: [
      cell("응모작 제목", { width: 2400, shade: true, bold: true }),
      cell(sections.title, { width: 6950 }),
    ]}),
    new TableRow({ children: [
      cell("활용 데이터\n(데이터랩·필수)", { width: 2400, shade: true, bold: true }),
      cell(sections.dataUsed, { width: 6950 }),
    ]}),
    new TableRow({ children: [
      cell("타분야 데이터\n(선택)", { width: 2400, shade: true, bold: true }),
      cell(sections.dataOther, { width: 6950 }),
    ]}),
    new TableRow({ children: [
      cell("성과분야\n(1개 선택)", { width: 2400, shade: true, bold: true }),
      cell(sections.field, { width: 6950 }),
    ]}),
    new TableRow({ children: [
      cell("핵심성과\n(1-2줄 요약)", { width: 2400, shade: true, bold: true }),
      cell(sections.coreResult, { width: 6950 }),
    ]}),
    new TableRow({ children: [
      cell("계량성과", { width: 2400, shade: true, bold: true }),
      cell(sections.metrics.map((m) => P("- " + m, { after: 40 })), { width: 6950 }),
    ]}),
  ];

  function matrixTable(m) {
    // m = { corner, colHeads: [c1,c2], rows: [{head, cells:[a,b]}, ...] }
    const colW = [2600, 3375, 3375];
    return new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows: [
      new TableRow({ children: [
        cell(m.corner, { width: colW[0], shade: true, bold: true }),
        cell(m.colHeads[0], { width: colW[1], shade: true, bold: true }),
        cell(m.colHeads[1], { width: colW[2], shade: true, bold: true }),
      ]}),
      ...m.rows.map((r) => new TableRow({ children: [
        cell(r.head, { width: colW[0], shade: true, bold: true }),
        cell(r.cells[0], { width: colW[1] }),
        cell(r.cells[1], { width: colW[2] }),
      ]})),
    ]});
  }

  function numberedSection(no, heading, items) {
    const body = [];
    for (const item of items) {
      if (typeof item === "string") {
        body.push(P("○ " + item, { after: 100 }));
      } else if (item.table) {
        body.push(P("", { after: 60 }));
        body.push(matrixTable(item.table));
        body.push(P("", { after: 100 }));
      }
    }
    return [
      new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows: [
        new TableRow({ children: [
          cell(no, { width: 600, shade: true, bold: true }),
          cell(heading, { width: 8750, shade: true, bold: true }),
        ]}),
      ]}),
      ...body,
      P("", { after: 100 }),
    ];
  }

  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("『2026 한국관광 데이터랩 활용 경진대회』작성양식"),
        P("신청자(대표) 인적사항", { bold: true, after: 100 }),
        new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows: headerRows }),
        P("", { after: 200 }),
        new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows: bodyRows }),
        P("", { after: 300 }),
        ...numberedSection("1)", "문제점 또는 현안사항", sections.problem),
        ...numberedSection("2)", "현안사항 해결을 위한 데이터 활용 방안", sections.approach),
        ...numberedSection("3)", "데이터 활용을 통한 사업 개선 및 적용 사례", sections.applied),
        ...numberedSection("4)", "추진성과 및 기대효과", sections.outcome),
        P("", { after: 150 }),
        P("* 관련 계획안/결과보고서/실적보고서, 사진 등 첨부(모든 제출자료는 Zip파일로 압축하여 제출)", { size: 10, after: 40 }),
        P("* 개조식으로 작성, 분량은 최소 2장~최대 3장 이내(글씨체 및 크기: 함초롱바탕 11pt, 줄간격 160)", { size: 10 }),
      ],
    }],
  });
  await saveDoc(doc, "submission/forms/서식4_활용사례작성양식.docx");
}

// 개인정보(이름/연락처 등)는 git에 올라가지 않는 submission/personal_info.json에서 읽는다.
const V = JSON.parse(fs.readFileSync("submission/personal_info.json", "utf-8"));

const SECTIONS = {
  title: "관광객이 많으면 숙박시설도 늘려야 할까? - TOUR-GAP, 수요·공급압력·실제 체류성과를 교차 검증하는 지역관광 의사결정 시스템",
  dataUsed: "지역별 방문자수(외지인), 내비게이션 목적지 검색(숙박), 신용카드 관광지출(외지인), 숙박/체류시간(숙박방문자 비율·평균 체류시간·평균 숙박일수)",
  dataOther: "행정안전부 지방행정 인허가 원시데이터: 문화_숙박업, 문화_관광숙박업(인허가일·영업상태·객실수)",
  field: "☑ 전략수립 및 기획",
  coreResult: "공식 객실자료와 실제 체류 outcome으로 평창·원주 판단 2건을 교정하고 홍천을 혼합병목 우선진단으로 도출했다. 홍천 고수요 신호는 월별 12/12개월 유지됐고, 분석 종료 후 공식 야간·체류형 사업과 방향적 정합성을 확인했다.",
  metrics: [
    "18개 시군×12개월 / 일반 숙박업 3,027개·96,511실+관광숙박업 281개 / 고수요 9개→4 Decision Type",
    "판단교정 2건(평창·원주)+홍천 우선진단 1곳",
    "홍천 고수요 12/12개월·rolling 6개월 7/7 / 108개 민감도 조합에서 핵심 유형 108/108 유지",
  ],
  problem: [
    "관광수요가 높거나 숙박검색이 많다는 이유만으로 숙박시설 확충을 우선하면 실제 체류행태와 다른 의사결정을 할 수 있음",
    "숙박 목적지 검색은 실제 투숙이 아니라 관심·탐색을 나타내는 proxy이므로, 검색량만으로 숙박 전환 성과를 판단하면 오진 가능성이 있음",
    "같은 고수요 지역도 실제 체류성과가 높을 수 있고 낮을 수 있어, 수요·공급·성과를 한 점수로 합치기보다 서로 다른 축으로 확인할 필요가 있음",
    "따라서 '수요 확인 → 공급압력 확인 → 실제 체류성과 검증 → 후속 조사 순서 결정'의 단계형 진단체계를 구축함",
  ],
  approach: [
    "분석 범위: 강원 18개 시군, 2025-08~2026-07(12개월). 공급은 인허가·폐업·취소·휴업 상태를 반영해 2026-07-31 시점으로 재구성",
    "체류수요(Stay Demand) = 외지인 방문·숙박 목적지 검색·외지인 관광지출을 강원 18개 시군 내 percentile로 변환한 뒤 평균. 데이터랩 공식 '관광수요 지수'와 구분되는 자체 파생지표로 명시",
    "공급커버리지(Supply Coverage) = 일반 숙박업(시설 percentile 30% + 객실 percentile 70%; 객실값 보유율 99.93%)과 관광숙박업 영업시설 percentile의 평균. 관광숙박업 객실은 결측 편차로 제외. Consensus Gap = Stay Demand - Supply Coverage이며 법적 업종 원시량은 합산하지 않음",
    "실제 체류깊이(Observed Stay Depth) = 모델 산식에 사용하지 않은 평균 체류시간 percentile과 평균 숙박일수 percentile의 평균. proxy 가설을 검증하는 독립 outcome으로 사용",
    "고수요 지역(Stay Demand ≥ 50)을 집중 비교하고, Gap의 부호와 Stay Depth 50 기준으로 4개 Decision Type을 분류. Gap과 outcome의 관계는 Spearman 상관으로 별도 검정",
    "※ Consensus Gap은 수익성·객실 증설량을 의미하지 않으며, proxy와 실제 outcome이 충돌하면 실제 체류성과를 우선해 재분류함",
  ],
  applied: [
    "초기 모델은 원주시를 '방문 대비 숙박검색이 약한 지역'으로 해석했으나, 숙박/체류시간 실제 outcome을 추가해 가설을 재검증함",
    "원주 실제 결과: 평균 체류시간 1,866분(강원 3/18위), 평균 숙박일수 2.81일(2/18위), Stay Depth 91.67. 월평균 숙박방문자 비율도 전국 기초지자체 평균보다 +6.69%p 높고 12/12개월 상회",
    "이에 '숙박검색 약세 = 실제 숙박 전환 약세' 가설 1건을 폐기하고 원주를 '공급압력 + 체류성과 양호'로 재분류. 추가 객실 검토보다 가동률·ADR·성수기 공실 확인을 선행하도록 판단 순서를 수정",
    "홍천은 Stay Demand 75.93, Consensus Gap +12.31p, 평균 체류시간 935분(17/18위), 평균 숙박일수 2.47일(16/18위)로 기본 산식에서 고수요 9개 중 유일한 '양(+) Gap + Stay Depth<50' 혼합병목 우선진단 지역으로 도출",
    {
      table: {
        corner: "Outcome-Aware Decision Matrix (고수요 9개 지역)",
        colHeads: ["Gap ≤ 0 · 공급여유", "Gap > 0 · 공급압력"],
        rows: [
          { head: "Stay Depth ≥ 50\n(실제 체류 양호)", cells: [
            "균형/효율\n강릉·동해\n(현 구조 유지·벤치마킹)",
            "공급압력+체류성과 양호\n원주·춘천\n(가동률·ADR·성수기 공실 확인)",
          ]},
          { head: "Stay Depth < 50\n(실제 체류 약함)", cells: [
            "체류깊이 개선\n속초·평창·양양·고성\n(야간·연박·동선·식음 연계)",
            "혼합병목 우선진단\n홍천\n(공급병목+체류상품 동시 검증)",
          ]},
        ],
      },
    },
    "시스템 구현 및 공개: 동일 원본에서 Demand/Supply/Outcome과 Decision Type을 재현하도록 분석 로직을 구성하고, 강원 18개 시군을 선택·비교하는 Production 웹 대시보드를 공개함 - https://tour-gap-dashboard.vercel.app",
    "검증: Gap vs Stay Depth는 Spearman ρ=+0.011, p=0.964(n=18)로 현재 표본에서 단조 관계가 확인되지 않아 예측값에서 제외. 108개 민감도 조합에서 홍천·원주 핵심 유형은 108/108 유지했고, 별도 시간분할에서 홍천 no-spend 수요신호는 월별 12/12개월·rolling 6개월 7/7 고수요를 유지",
  ],
  outcome: [
    "분석성과: 강원 18개 시군을 수요·공급커버리지·실제 체류성과 3축으로 평가하고, 고수요 9개 지역을 4개 Decision Type으로 분류해 단일 Gap 순위를 지역별 후속전략으로 전환",
    "데이터 품질성과: 인허가·폐업·취소·휴업일을 수요기간 종료일(2026-07-31)로 복원해 일반 숙박업 3,027개·96,511실, 관광숙박업 281개 스냅샷을 재구성하고 객실 수를 공급축에 반영",
    "의사결정 개선성과: 공식 객실자료로 평창 공급공백 후보를 공급여유로 교정하고, 실제 outcome으로 원주 '숙박검색 약세=체류전환 약세' 가설을 폐기. 이후 홍천 1곳을 혼합병목 우선진단으로 도출",
    "외적정합성: 분석 종료일(7/31) 이후 홍천군 공식자료에서 야시장(8/21~9/12)과 1박 2일 체류형 치유관광 시범투어(8/27~28)가 확인돼 '야간·체류형 상품 우선 검토'와 방향이 일치. 정책채택·인과 검증은 아니며 결과는 Production 대시보드로 재현·공개",
    "기대효과: 공급검증·체류깊이 개선·혼합병목 동시검증·현 구조 유지의 4개 후속경로로 조사·사업기획 순서를 표준화해 공급투자·체류정책 오진 위험을 낮추는 사전진단에 활용 가능",
    "파급·확장성: 동일 데이터가 제공되는 타 시군구에도 같은 산식·판정절차를 적용할 수 있고, 가동률·ADR·공실·교통·규제·입지를 추가하면 투자·상품기획 후속 판단으로 확장 가능",
    "※ 실증 범위: 본 결과는 매출·예약 증가나 투자수익을 실증한 것이 아님. 사후 공식 정책자료의 방향 일치는 외적 정합성 근거이며 정책채택·효과·인과 검증을 의미하지 않음. TOUR-GAP은 '추가 검증이 필요한 문제 유형과 순서'를 정하는 의사결정 지원도구임.",
  ],
};

(async () => {
  await buildForm1_1(V, SECTIONS.title);
  await buildForm2(V);
  await buildForm3(V);
  await buildForm4(V, SECTIONS);
})();
