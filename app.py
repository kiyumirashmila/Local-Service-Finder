# =============================================================================
# Service Demand Prediction & Analytics Dashboard
# =============================================================================
# INSTALLATION (run once in terminal):
#   pip install streamlit pandas plotly statsmodels openpyxl
#
# USAGE:
#   Place service_requests_fact.csv in the same folder as this file, then run:
#   streamlit run app.py
# =============================================================================

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from statsmodels.tsa.holtwinters import SimpleExpSmoothing
import warnings
import io

warnings.filterwarnings("ignore")

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Service Demand Intelligence",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
[data-testid="metric-container"] {
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
    border-radius: 14px;
    padding: 18px 20px;
    color: white;
}
[data-testid="metric-container"] label { color: rgba(255,255,255,.75) !important; font-size: 13px; }
[data-testid="metric-container"] [data-testid="metric-value"] { color: white !important; font-size: 2rem; font-weight: 800; }
[data-testid="metric-container"] [data-testid="metric-delta"] { color: rgba(255,255,255,.85) !important; }
.section-header { font-size: 1.15rem; font-weight: 700; color: #1e3a8a;
    border-left: 4px solid #2563eb; padding-left: 10px; margin: 18px 0 12px; }
</style>
""", unsafe_allow_html=True)


# ── 1. DATA LOADING & CLEANING ────────────────────────────────────────────────
@st.cache_data(show_spinner="Loading & cleaning data…")
def load_data(path: str = "service_requests_fact.csv") -> pd.DataFrame:
    df = pd.read_csv(path)

    # Drop duplicate Request_IDs
    df = df.drop_duplicates(subset="Request_ID")

    # Parse Date_Time
    df["Date_Time"] = pd.to_datetime(df["Date_Time"], infer_datetime_format=True, errors="coerce")
    df = df.dropna(subset=["Date_Time"])

    # Fix status typos
    df["Final_Status"] = df["Final_Status"].str.strip()
    df["Final_Status"] = df["Final_Status"].replace({"Completd": "Completed", "Delivered": "Completed"})

    # Numeric coercion
    df["Response_Time_Mins"] = pd.to_numeric(df["Response_Time_Mins"], errors="coerce")
    df["Revenue_Amount"]     = pd.to_numeric(df["Revenue_Amount"],     errors="coerce")
    df["Distance_km"]        = pd.to_numeric(df["Distance_km"],        errors="coerce")
    df["Commission_Earned"]  = pd.to_numeric(df["Commission_Earned"],  errors="coerce")

    # Feature extraction
    df["Date"]    = df["Date_Time"].dt.date
    df["Year"]    = df["Date_Time"].dt.year
    df["Month"]   = df["Date_Time"].dt.month
    df["Week"]    = df["Date_Time"].dt.isocalendar().week.astype(int)
    df["Weekday"] = df["Date_Time"].dt.day_name()
    df["Hour"]    = df["Date_Time"].dt.hour

    return df


# ── Load ──────────────────────────────────────────────────────────────────────
try:
    raw = load_data()
except FileNotFoundError:
    st.error("⚠ `service_requests_fact.csv` not found. Place it in the same directory as `app.py`.")
    st.stop()

# ── 2. SIDEBAR FILTERS ────────────────────────────────────────────────────────
with st.sidebar:
    st.image("https://img.icons8.com/fluency/48/combo-chart.png", width=48)
    st.title("Filters")

    # Date range
    min_d = raw["Date_Time"].min().date()
    max_d = raw["Date_Time"].max().date()
    date_range = st.date_input("Date Range", value=(min_d, max_d), min_value=min_d, max_value=max_d)
    if len(date_range) == 2:
        d_from, d_to = date_range
    else:
        d_from, d_to = min_d, max_d

    # Service multi-select
    all_services = sorted(raw["Service_ID"].dropna().unique())
    sel_services = st.multiselect("Service ID", all_services, default=all_services)

    # Status multi-select
    all_statuses = sorted(raw["Final_Status"].dropna().unique())
    sel_statuses = st.multiselect("Final Status", all_statuses, default=all_statuses)

    st.divider()
    st.caption(f"Raw rows: **{len(raw):,}**")

# ── Apply filters ─────────────────────────────────────────────────────────────
df = raw.copy()
df = df[(df["Date_Time"].dt.date >= d_from) & (df["Date_Time"].dt.date <= d_to)]
if sel_services:
    df = df[df["Service_ID"].isin(sel_services)]
if sel_statuses:
    df = df[df["Final_Status"].isin(sel_statuses)]

# ── HEADER ────────────────────────────────────────────────────────────────────
st.title("📊 Service Demand Intelligence Dashboard")
st.caption(f"Showing **{len(df):,}** records after filters · {d_from} → {d_to}")

# ── 3. KPI CARDS ─────────────────────────────────────────────────────────────
total       = len(df)
completed   = (df["Final_Status"] == "Completed").sum()
comp_rate   = (completed / total * 100) if total else 0
avg_rt      = df["Response_Time_Mins"].mean()
total_rev   = df["Revenue_Amount"].sum()

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Requests",        f"{total:,}")
c2.metric("Completion Rate",       f"{comp_rate:.1f}%", delta=f"{completed:,} completed")
c3.metric("Avg Response Time",     f"{avg_rt:.1f} min"  if pd.notna(avg_rt) else "N/A")
c4.metric("Total Revenue",         f"₹ {total_rev:,.0f}" if pd.notna(total_rev) else "N/A")

st.divider()

# ── 4. VISUALISATIONS ─────────────────────────────────────────────────────────
NAVY = "#1e3a8a"
BLUE = "#2563eb"
PLOTLY_THEME = "plotly_white"

# ── 4a. Daily demand line ─────────────────────────────────────────────────────
st.markdown('<div class="section-header">📈 Daily Service Demand</div>', unsafe_allow_html=True)
daily = df.groupby("Date").size().reset_index(name="Requests")
fig_daily = px.line(daily, x="Date", y="Requests", markers=True,
                    color_discrete_sequence=[BLUE], template=PLOTLY_THEME)
fig_daily.update_layout(xaxis_title="Date", yaxis_title="Requests", height=300, margin=dict(t=20))
st.plotly_chart(fig_daily, use_container_width=True)

# ── 4b. Revenue over time (area) + Status pie — side by side ──────────────────
col_l, col_r = st.columns(2)

with col_l:
    st.markdown('<div class="section-header">💰 Revenue Over Time</div>', unsafe_allow_html=True)
    rev_daily = df.groupby("Date")["Revenue_Amount"].sum().reset_index()
    fig_rev = px.area(rev_daily, x="Date", y="Revenue_Amount",
                      color_discrete_sequence=[BLUE], template=PLOTLY_THEME)
    fig_rev.update_layout(height=320, margin=dict(t=20), yaxis_title="Revenue (₹)")
    st.plotly_chart(fig_rev, use_container_width=True)

with col_r:
    st.markdown('<div class="section-header">🍩 Status Distribution</div>', unsafe_allow_html=True)
    status_ct = df["Final_Status"].value_counts().reset_index()
    status_ct.columns = ["Status", "Count"]
    fig_pie = px.pie(status_ct, names="Status", values="Count", hole=0.45,
                     color_discrete_sequence=px.colors.qualitative.Bold, template=PLOTLY_THEME)
    fig_pie.update_layout(height=320, margin=dict(t=20), legend=dict(orientation="h"))
    st.plotly_chart(fig_pie, use_container_width=True)

# ── 4c. Avg response time per service (top 10 horizontal bar) + Top-10 demand bar
col_l2, col_r2 = st.columns(2)

with col_l2:
    st.markdown('<div class="section-header">⏱ Avg Response Time by Service (Top 10)</div>', unsafe_allow_html=True)
    rt_svc = (df.groupby("Service_ID")["Response_Time_Mins"]
                .mean()
                .dropna()
                .nlargest(10)
                .reset_index())
    rt_svc.columns = ["Service_ID", "Avg RT (min)"]
    fig_rt = px.bar(rt_svc, x="Avg RT (min)", y="Service_ID", orientation="h",
                    color="Avg RT (min)", color_continuous_scale="Blues", template=PLOTLY_THEME)
    fig_rt.update_layout(height=380, margin=dict(t=20), coloraxis_showscale=False,
                         yaxis=dict(autorange="reversed"))
    st.plotly_chart(fig_rt, use_container_width=True)

with col_r2:
    st.markdown('<div class="section-header">🏆 Top 10 Services by Demand</div>', unsafe_allow_html=True)
    top_svc = df["Service_ID"].value_counts().head(10).reset_index()
    top_svc.columns = ["Service_ID", "Requests"]
    fig_top = px.bar(top_svc, x="Service_ID", y="Requests",
                     color="Requests", color_continuous_scale="Blues", template=PLOTLY_THEME)
    fig_top.update_layout(height=380, margin=dict(t=20), coloraxis_showscale=False,
                          xaxis_tickangle=-35)
    st.plotly_chart(fig_top, use_container_width=True)

# ── 4d. Heatmap: weekday vs hour ──────────────────────────────────────────────
st.markdown('<div class="section-header">🗓 Request Heatmap — Weekday × Hour</div>', unsafe_allow_html=True)
WEEKDAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
heat = df.groupby(["Weekday","Hour"]).size().reset_index(name="Requests")
heat_pivot = heat.pivot(index="Weekday", columns="Hour", values="Requests").reindex(WEEKDAY_ORDER).fillna(0)
fig_heat = px.imshow(heat_pivot, aspect="auto",
                     color_continuous_scale="Blues", template=PLOTLY_THEME,
                     labels=dict(x="Hour of Day", y="Weekday", color="Requests"))
fig_heat.update_layout(height=320, margin=dict(t=20))
st.plotly_chart(fig_heat, use_container_width=True)

st.divider()

# ── 5. DEMAND PREDICTION ─────────────────────────────────────────────────────
st.markdown('<div class="section-header">🔮 Demand Forecast (Exponential Smoothing)</div>',
            unsafe_allow_html=True)

fp_col1, fp_col2, fp_col3 = st.columns(3)
with fp_col1:
    target  = st.selectbox("Forecast Target", ["Total Requests", "Completed Requests"])
with fp_col2:
    freq    = st.selectbox("Frequency", ["Daily", "Weekly"])
with fp_col3:
    if freq == "Daily":
        horizon = st.slider("Forecast Days", 7, 30, 14)
    else:
        horizon = st.slider("Forecast Weeks", 2, 8, 4)

# Build time series
if target == "Total Requests":
    if freq == "Daily":
        ts = df.groupby("Date").size()
        ts.index = pd.to_datetime(ts.index)
        ts = ts.asfreq("D", fill_value=0)
    else:
        ts = df.set_index("Date_Time").resample("W").size()
        ts = ts.asfreq("W", fill_value=0)
else:  # Completed only
    sub = df[df["Final_Status"] == "Completed"]
    if freq == "Daily":
        ts = sub.groupby("Date").size()
        ts.index = pd.to_datetime(ts.index)
        ts = ts.asfreq("D", fill_value=0)
    else:
        ts = sub.set_index("Date_Time").resample("W").size()
        ts = ts.asfreq("W", fill_value=0)

if len(ts) < 5:
    st.warning("Not enough data points to generate a forecast. Try widening the date range or removing filters.")
else:
    try:
        model  = SimpleExpSmoothing(ts.values, initialization_method="estimated").fit(optimized=True)
        fc_val = model.forecast(horizon)
        freq_offset = "D" if freq == "Daily" else "W"
        fc_idx = pd.date_range(start=ts.index[-1], periods=horizon + 1, freq=freq_offset)[1:]
        fc_series = pd.Series(fc_val, index=fc_idx)

        # Plot
        fig_fc = go.Figure()
        fig_fc.add_trace(go.Scatter(x=ts.index, y=ts.values, mode="lines",
                                    name="Historical", line=dict(color=NAVY, width=2)))
        fig_fc.add_trace(go.Scatter(x=fc_series.index, y=fc_series.values.clip(0), mode="lines+markers",
                                    name="Forecast", line=dict(color="#f97316", width=2, dash="dash"),
                                    marker=dict(size=6)))
        fig_fc.add_vrect(x0=fc_series.index[0], x1=fc_series.index[-1],
                         fillcolor="rgba(249,115,22,.06)", line_width=0, annotation_text="Forecast Zone")
        fig_fc.update_layout(template=PLOTLY_THEME, height=360, margin=dict(t=30),
                              xaxis_title="Date", yaxis_title=target,
                              legend=dict(orientation="h", y=1.1))
        st.plotly_chart(fig_fc, use_container_width=True)

        # Forecast table
        fc_df = fc_series.clip(0).reset_index()
        fc_df.columns = ["Period", "Predicted Demand"]
        fc_df["Predicted Demand"] = fc_df["Predicted Demand"].round(1)
        st.dataframe(fc_df.style.format({"Predicted Demand": "{:.1f}"}),
                     use_container_width=True, hide_index=True)

    except Exception as e:
        st.error(f"Forecasting error: {e}")

st.divider()

# ── 6. EXPORT ────────────────────────────────────────────────────────────────
st.markdown('<div class="section-header">⬇ Export Filtered Data</div>', unsafe_allow_html=True)
csv_buf = io.StringIO()
df.to_csv(csv_buf, index=False)
st.download_button(
    label=f"Download filtered data ({len(df):,} rows) as CSV",
    data=csv_buf.getvalue().encode("utf-8"),
    file_name="filtered_service_requests.csv",
    mime="text/csv",
)

st.caption("Built with Streamlit · Plotly · statsmodels · pandas")
