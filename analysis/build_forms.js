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
    children: Array.isArray(text) ? text : [P(text, { size: opts.size, bold: opts.bold, after: 0 })],
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
async function buildForm1_1(v) {
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
async function buildForm4(v, sections, figures) {
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

  function numberedSection(no, heading, bullets) {
    return [
      new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, rows: [
        new TableRow({ children: [
          cell(no, { width: 600, shade: true, bold: true }),
          cell(heading, { width: 8750, shade: true, bold: true }),
        ]}),
      ]}),
      ...bullets.map((b) => P("○ " + b, { after: 100 })),
      P("", { after: 100 }),
    ];
  }

  const figParas = [];
  for (const fig of figures) {
    figParas.push(new Paragraph({
      children: [new ImageRun({ data: fs.readFileSync(fig.path), transformation: { width: 460, height: 268 }, type: "png" })],
      alignment: AlignmentType.CENTER,
    }));
    figParas.push(P(fig.caption, { align: AlignmentType.CENTER, size: 18, after: 200 }));
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
        P("", { after: 200 }),
        P("붙임: 참고자료(그림)", { bold: true, after: 150 }),
        ...figParas,
      ],
    }],
  });
  await saveDoc(doc, "submission/forms/서식4_활용사례작성양식.docx");
}

// 개인정보(이름/연락처 등)는 git에 올라가지 않는 submission/personal_info.json에서 읽는다.
const V = JSON.parse(fs.readFileSync("submission/personal_info.json", "utf-8"));

const SECTIONS = {
  title: "TOUR-GAP: 수요·공급 압력 교차검증으로 지역 숙박정책의 착시를 걷어내다",
  dataUsed: "지역별 관광 현황(방문자, 숙박/체류시간), 관광산업분석-숙박업종별 세부현황(숙박시설 개/폐업현황)",
  dataOther: "없음 (데이터랩 데이터만으로 방법론 구성)",
  field: "☑ 전략수립 및 기획",
  coreResult: "방문자 증가율이 낮았던 양양군의 신규 숙박시설이 신안군보다 5.6배 많았음을 데이터로 규명하고, 공급-수요 격차(TOUR-GAP 지수)가 일정 수준을 넘은 지역에서 이듬해 숙박방문자비율·체류시간이 하락 전환한다는 조기경보 패턴을 실증 검증함.",
  metrics: [
    "양양군 신규 숙박시설 169개(2017~2025) vs 신안군 30개 - 5.6배 격차 규명",
    "양양군 TOUR-GAP 지수 128pt 초과(2023) 이후 숙박방문자비율 -3.0%p, 평균체류시간 -127분(-11.5%) 하락 확인(2024년)",
    "신안군은 TOUR-GAP 103pt로 낮게 유지되며 같은 기간 평균체류시간 +48분(2020→2025) 개선",
    "방문자수 증가율은 신안군(2019 대비 +27.7%)이 양양군(+12.6%)보다 오히려 높음에도 숙박공급은 정반대로 양양군에 쏠림",
  ],
  problem: [
    "지자체·투자자가 방문자수만 보고 숙박 인허가·투자를 결정하는 경우가 많아, 실제 수요 증가 속도와 무관하게 공급이 과잉되거나 부족해지는 지역이 발생",
    "강원 양양군은 서핑관광 붐 이후 소형 생활숙박업 중심으로 숙박시설이 급증했으나, 이 공급 확대가 실제 체류 성과로 이어지는지 검증된 바 없음",
    "전남 신안군처럼 도서·오지형 관광지는 수요가 꾸준히 늘어도 공급이 억제되어 기회를 놓치고 있을 가능성이 있으나, 판단 근거(지표)가 없어 정책 우선순위를 정하기 어려움",
  ],
  approach: [
    "데이터랩 '지역별 관광 현황(방문자)'에서 연도별 방문자수(외지인, 연인원)를 추출해 2019=100 기준 수요압력지수 산출",
    "데이터랩 '숙박업종별 세부현황'(행정안전부 지방행정 인허가 데이터 기반)에서 2017~2025년 업종별 신규 개업 건수를 지자체별로 집계, 누적 개업 수를 2019=100 기준 공급압력지수로 환산",
    "두 지수의 차이(TOUR-GAP = 공급압력지수 - 수요압력지수)를 연도별로 계산해 공급이 수요를 얼마나 앞질렀는지 정량화",
    "데이터랩 '숙박/체류시간' 메뉴의 숙박방문자비율(%), 평균 체류시간(분)을 실제 체류성과 지표로 삼아 TOUR-GAP과 1년 시차를 두고 교차검증(회고적 백테스트)",
    "서핑관광 붐 지역(양양군)과 도서·오지형 관광지(신안군) 두 곳에 동일 방법론을 적용해 대조 검증",
  ],
  applied: [
    "양양군: 2017~2025년 신규 숙박시설 169개(전체 344개 중 49%) 개업 확인, 이 중 69.2%가 생활숙박업(펜션·게스트하우스류). 공급압력지수 산출 결과 2023년 TOUR-GAP 128pt로 임계 구간을 넘어섰고, 2024년부터 숙박방문자비율(24.7%→21.7%→21.0%)과 평균체류시간(1,109분→982분→1,007분)이 동반 하락 - 공급과잉 조짐을 사후 데이터로 실증 (붙임 그림1, 그림2)",
    "신안군: 같은 기간 신규 숙박시설은 30개(전체 71개 중 42%)에 그쳤으나 방문자수는 2019년 대비 +27.7%로 양양군(+12.6%)보다 더 크고 꾸준하게 증가. TOUR-GAP은 2025년 103pt로 양양군보다 낮게 유지됐고, 숙박방문자비율(16.0%→17.1%)·체류시간(1,767분→1,815분)은 오히려 소폭 개선 - 공급이 억제돼도 체류 질이 유지·개선될 수 있음을 확인",
    "두 사례 교차비교로 'TOUR-GAP이 약 120~130pt 이상을 지속적으로 넘어서면 다음 해 체류성과 지표가 하락 전환한다'는 조기경보 패턴을 도출, 지자체 숙박 인허가 총량 관리·투자 유치 판단에 활용 가능한 간단한 정량 기준을 제시",
  ],
  outcome: [
    "방문자수 증가율만으로는 파악할 수 없던 '숙박 공급 과잉 조짐'을, 양양군 사례에서 실제 성과 하락 1년 전 시차 패턴으로 검증(TOUR-GAP 128pt 초과 → 이듬해 숙박방문자비율 -3.0%p, 체류시간 -11.5%)",
    "신안군처럼 수요 증가가 안정적인데도 공급이 낮은 지역은 TOUR-GAP이 낮게 유지되며 체류성과가 오히려 개선됨을 확인 - '공급 부족'이 항상 나쁜 신호가 아니라 투자 여력이 있는 신호일 수 있음을 데이터로 뒷받침",
    "이 방법론은 데이터랩 공개 메뉴(방문자, 숙박업종별 세부현황, 숙박/체류시간)만으로 재현 가능해 전국 228개 시군구에 동일 적용 가능하며, 지자체 숙박 인허가 총량제·투자유치 우선순위 결정에 활용 가능",
    "향후 전국 시군구로 확장해 TOUR-GAP 조기경보 임계값을 통계적으로 정교화하면, '숙박시설 증설이 필요한 지역'과 '이미 과잉인 지역'을 사전 스크리닝하는 대시보드로 발전 가능",
  ],
};

const FIGURES = [
  { path: "report/figures/fig1_tourgap_index.png", caption: "그림1. TOUR-GAP 지수 추이 (양양군 vs 신안군)" },
  { path: "report/figures/fig2_lodging_ratio.png", caption: "그림2. 숙박방문자 비율 추이 (양양군 vs 신안군, 전국 평균 대비)" },
];

(async () => {
  await buildForm1_1(V);
  await buildForm2(V);
  await buildForm3(V);
  await buildForm4(V, SECTIONS, FIGURES);
})();
