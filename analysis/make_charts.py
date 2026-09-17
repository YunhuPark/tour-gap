"""차트 2개 생성: TOUR-GAP 지수 추이, 숙박방문자비율 추이 (양양군 vs 신안군)"""
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import os

plt.rcParams["font.family"] = "Malgun Gothic"
plt.rcParams["axes.unicode_minus"] = False

# dataviz skill 팔레트: slot1 blue(양양군), slot2 orange(신안군), muted gray(전국평균)
BLUE = "#2a78d6"
ORANGE = "#eb6834"
MUTED = "#898781"
INK = "#0b0b0b"
SECONDARY_INK = "#52514e"
GRID = "#e1e0d9"
SURFACE = "#fcfcfb"

os.makedirs("report/figures", exist_ok=True)

gap = pd.read_csv("data/tourgap_index_merged.csv")

def style_ax(ax):
    ax.set_facecolor(SURFACE)
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color(GRID)
    ax.tick_params(colors=SECONDARY_INK, labelsize=10)
    ax.grid(axis="y", color=GRID, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)

# ---- Chart 1: TOUR-GAP 지수 추이 ----
fig, ax = plt.subplots(figsize=(7.2, 4.2), dpi=200)
fig.patch.set_facecolor(SURFACE)
style_ax(ax)

for region, color in [("양양군", BLUE), ("신안군", ORANGE)]:
    d = gap[gap.region == region].sort_values("year")
    ax.plot(d.year, d.tour_gap, color=color, linewidth=2.4, marker="o", markersize=5, label=region, zorder=3)
    last = d.iloc[-1]
    ax.annotate(f"{region} {last.tour_gap:.0f}", (last.year, last.tour_gap),
                xytext=(6, 0), textcoords="offset points", color=color,
                fontsize=10, fontweight="bold", va="center")

ax.axhline(0, color=MUTED, linewidth=1, linestyle="--", zorder=1)
ax.set_title("TOUR-GAP 지수 추이 (공급압력지수 - 수요압력지수, 2019=100 기준)",
             fontsize=12, color=INK, loc="left", pad=12)
ax.set_xlabel("연도", fontsize=10, color=SECONDARY_INK)
ax.set_ylabel("TOUR-GAP (지수pt)", fontsize=10, color=SECONDARY_INK)
ax.set_xticks(range(2019, 2026))
ax.legend(frameon=False, fontsize=10, loc="upper left")
fig.tight_layout()
fig.savefig("report/figures/fig1_tourgap_index.png", facecolor=SURFACE)
plt.close(fig)

# ---- Chart 2: 숙박방문자비율 추이 ----
fig, ax = plt.subplots(figsize=(7.2, 4.2), dpi=200)
fig.patch.set_facecolor(SURFACE)
style_ax(ax)

for region, color in [("양양군", BLUE), ("신안군", ORANGE)]:
    d = gap[(gap.region == region) & gap.lodging_visitor_ratio_pct.notna()].sort_values("year")
    ax.plot(d.year, d.lodging_visitor_ratio_pct, color=color, linewidth=2.4, marker="o", markersize=5, label=region, zorder=3)

nat = gap[(gap.region == "양양군") & gap.national_avg_ratio_pct.notna()].sort_values("year")
ax.plot(nat.year, nat.national_avg_ratio_pct, color=MUTED, linewidth=1.6, linestyle="--", label="전국 기초지자체 평균", zorder=2)

ax.set_title("숙박방문자 비율(외지인) 추이", fontsize=12, color=INK, loc="left", pad=12)
ax.set_xlabel("연도", fontsize=10, color=SECONDARY_INK)
ax.set_ylabel("숙박방문자 비율 (%)", fontsize=10, color=SECONDARY_INK)
ax.set_xticks(range(2020, 2026))
ax.legend(frameon=False, fontsize=10, loc="upper left")
fig.tight_layout()
fig.savefig("report/figures/fig2_lodging_ratio.png", facecolor=SURFACE)
plt.close(fig)

print("saved: report/figures/fig1_tourgap_index.png, report/figures/fig2_lodging_ratio.png")
