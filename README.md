# TOUR-GAP

> 관광객이 많으면 숙박시설도 늘려야 할까?
> 수요·공급압력·실제 체류성과를 교차 검증하는 지역관광 의사결정 시스템

**2026 한국관광 데이터랩 활용 경진대회** 출품 프로젝트 (개인 참가)

## 공모전 개요

- 주최/주관: 문화체육관광부 / 한국관광공사
- 접수기간: 2026.8.4(화) ~ 9.30(수) 14:00
- 참가구분: 개인
- 심사: 서면심사(1차, 100점) → 발표심사(2차, 서면 상위 9명 대상, 100점)
- 심사기준(서면): 창의성·혁신성 20 / 데이터 활용도 30 / 효과성·성과창출도 30 / 사회경제적 파급력 20
- 제출물: 참가신청서(서식1) + 개인정보동의서(서식2) + 유의사항확인서(서식3) + **활용사례 보고서(서식4, 2~3장, 함초롱바탕 11pt, 줄간격160)** + (선택) 참고자료 zip
- 원본 공모요강/서식: [`docs/contest/`](docs/contest/)

자세한 내용은 [`docs/contest/guideline.pdf`](docs/contest/guideline.pdf) 참고.

## 프로젝트 컨셉 (v2)

강원 18개 시군을 대상으로 세 축을 percentile 지표로 만들어 교차 진단한다:

1. **Stay Demand(체류수요)**: 외지인 방문·숙박 목적지 검색·외지인 관광지출을 percentile로 변환해 평균
2. **Supply Coverage(공급커버리지)**: 일반 숙박업(시설+객실) 및 관광숙박업 영업시설 percentile의 평균 → **Consensus Gap = Stay Demand − Supply Coverage**
3. **Observed Stay Depth(실제 체류깊이)**: 산식에 쓰지 않은 평균 체류시간·평균 숙박일수 percentile 평균 — Gap이 맞았는지 검증하는 독립 outcome

Gap의 부호 × Stay Depth 고저로 고수요 지역을 4개 **Decision Type**(균형/효율, 공급압력+체류양호, 체류깊이개선, 혼합병목우선진단)으로 분류하고, Spearman 상관·108개 민감도 조합으로 강건성을 검증한다. 실제로 원주·평창 판단을 데이터로 교정했고, 홍천을 혼합병목 우선진단으로 짚어냈는데 분석 종료 후 홍천군이 실제 야간·체류형 사업을 시행해 방향이 일치함을 확인했다(정책효과 실증은 아니며 외적 정합성 근거).

**Production 웹 대시보드**: https://tour-gap-dashboard.vercel.app — 강원 18개 시군을 선택·비교 가능

> **v1(양양군 vs 신안군 2개 지역, 연도별 TOUR-GAP 지수) 아카이브**: `data/`, `analysis/tourgap_index.py`, `analysis/make_charts.py`, `report/figures/`에 남아 있으나 더 이상 제출 보고서에 반영되지 않음. v2가 데이터 범위(18개 시군 vs 2개), 방법론(3축 percentile + Decision Type vs 단일 지수), 검증(통계적 유의성 검정 포함)에서 더 강한 버전이라 전면 교체함.

## 데이터 소스 (한국관광 데이터랩 + 행정안전부)

- 지역별 분석 > 지역별 현황 > 지역별 관광 현황: 방문자(외지인), 숙박/체류시간(숙박방문자 비율·평균 체류시간·평균 숙박일수)
- 빅데이터 > 내비게이션: 지역별 검색건수(숙박 목적지)
- 빅데이터 > 신용카드: 지역별 관광지출액(외지인)
- 행정안전부 지방행정 인허가 원시데이터: 문화_숙박업, 문화_관광숙박업(인허가일·영업상태·객실수)

## 폴더 구조

```
docs/contest/        공모요강 원본, 참가서류 서식(.hwp)
report/               서식4 보고서 초안(report_draft.md, v2 기준)
submission/           개인정보 포함 제출용 파일 (git 비공개)
data/, analysis/      v1 아카이브 (양양군 vs 신안군 2지역 비교, 더 이상 사용 안 함)
```

## 진행 상황 / TODO

- [x] 공모요강 분석, 제출 요건 파악
- [x] v1: 양양군 vs 신안군 2지역 비교 분석 (아카이브)
- [x] v2: 강원 18개 시군 Stay Demand/Supply Coverage/Observed Stay Depth + Decision Type 모델로 전면 교체
- [x] v2 Production 대시보드 배포 확인 (https://tour-gap-dashboard.vercel.app)
- [x] 서식4 보고서 v2로 재작성 (`report/report_draft.md`)
- [x] 참가신청서 등 제출서류 작성 완료 (서식1-1/2/3/4, 실제 .hwp에 값 입력·서명까지 완료 확인됨)
- [ ] 발표심사 대비: percentile/Consensus Gap/Decision Type/Spearman 검증 로직 본인이 설명 가능하도록 숙지 (`report/report_draft.md` 하단 "발표심사 대비" 참고)
- [ ] 4개 서식 PDF 변환 + 참고자료 zip 준비
- [ ] 9.30(수) 14:00 이전 온라인 신청 폼 제출: https://forms.gle/gHtptTMGw13rTETE8
