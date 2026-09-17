"""
TOUR-GAP 지수 계산: 양양군 vs 신안군

세 축을 연도별로 결합해 "공급이 수요를 앞질렀는가"를 정량화한다.
- 수요압력지수: 방문자수(연인원), 2019=100 기준 지수
- 공급압력지수: 숙박시설 누적 신규개업 수(2017년부터 누적), 2019=100 기준 지수
- TOUR-GAP: 공급압력지수 - 수요압력지수 (양(+)이면 공급이 수요보다 빠르게 증가)
- 체류성과: 숙박방문자비율(%), 평균체류시간(분) 실측값 (검증용 결과 변수)
"""
import pandas as pd

visitors = pd.read_csv("data/visitors_yearly.csv")
stay = pd.read_csv("data/stay_performance_yearly.csv")
openings = pd.read_csv("data/lodging_openings_yearly.csv")

results = []
for region in ["양양군", "신안군"]:
    v = visitors[visitors.region == region].set_index("year")["visitors_annual"]
    v_index = (v / v.loc[2019] * 100).round(1)

    op = openings[openings.region == region].groupby("year")["openings"].sum()
    # 2017~2019 누적을 2019년 공급 기준선으로 사용
    cum = op.reindex(range(2017, 2026), fill_value=0).cumsum()
    supply_index = (cum / cum.loc[2019] * 100).round(1)

    for year in range(2019, 2026):
        row = {
            "region": region,
            "year": year,
            "visitor_index": v_index.get(year),
            "supply_cum_openings": int(cum.loc[year]),
            "supply_index": supply_index.get(year),
        }
        row["tour_gap"] = (
            round(row["supply_index"] - row["visitor_index"], 1)
            if row["supply_index"] is not None and row["visitor_index"] is not None
            else None
        )
        results.append(row)

gap_df = pd.DataFrame(results)
merged = gap_df.merge(stay, on=["region", "year"], how="left")

print(merged.to_string(index=False))
merged.to_csv("data/tourgap_index_merged.csv", index=False, encoding="utf-8-sig")
print("\nSaved -> data/tourgap_index_merged.csv")
