import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import base64
import json
import random
from datetime import datetime
import plotly.io as pio

st.set_page_config(page_title="❤️ 情侣恋爱观测试", page_icon="💞", layout="wide")

# ---------- 自定义CSS（手机端文字强制黑色） ----------
st.markdown("""
<style>
    .stApp {
        background: linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%);
    }
    .css-1r6slb0, .css-1aumxhk, .stButton>button {
        border-radius: 20px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
    }
    h1 {
        font-size: 2.5rem !important;
        background: linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb);
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        font-weight: 800 !important;
    }
    /* 强制滑块标签黑色（PC+手机） */
    .stSlider label, .stSlider p, .stSlider div[data-testid="stMarkdownContainer"] p {
        color: black !important;
        font-weight: 500 !important;
    }
    @media (max-width: 640px) {
        .stSlider label, .stSlider p {
            color: black !important;
        }
    }
    .stSlider > div > div > div {
        background: linear-gradient(90deg, #ff9a9e, #fad0c4, #fbc2eb) !important;
        height: 8px !important;
        border-radius: 4px !important;
    }
    .stSlider > div > div > div > div {
        background: #ff6b6b !important;
        border: 2px solid white !important;
        box-shadow: 0 0 8px #ff6b6b80 !important;
    }
    .stButton>button {
        background: linear-gradient(135deg, #ff6b6b, #ee5a24) !important;
        color: #2d2d2d !important;
        font-weight: bold !important;
        border: none !important;
        padding: 0.5rem 2rem !important;
        border-radius: 50px !important;
        transition: all 0.3s;
        box-shadow: 0 4px 10px rgba(238, 90, 36, 0.3) !important;
    }
    .stButton>button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 14px rgba(238, 90, 36, 0.5) !important;
    }
    [data-testid="metric-container"] {
        background: rgba(255,255,255,0.8) !important;
        backdrop-filter: blur(10px);
        border-radius: 20px !important;
        padding: 1rem !important;
        border: 1px solid rgba(0,0,0,0.1);
        color: #000 !important;
    }
    .stProgress > div > div > div {
        background: linear-gradient(90deg, #feca57, #ff6b6b) !important;
        border-radius: 20px !important;
    }
    @media (max-width: 640px) {
        .stColumns {
            flex-direction: column !important;
        }
    }
</style>
""", unsafe_allow_html=True)

# ---------- 题目数据 ----------
QUESTIONS = [
    ("我希望伴侣是我最重要的情感依靠。", "亲密需求"),
    ("我希望每天和伴侣保持高频联系。", "亲密需求"),
    ("一天没聊天会让我失落。", "亲密需求"),
    ("我希望伴侣参与我大部分生活。", "亲密需求"),
    ("我喜欢两个人一起行动。", "亲密需求"),
    ("恋爱后我仍需要大量个人空间。", "独立需求"),
    ("伴侣不应干涉我的社交圈。", "独立需求"),
    ("我接受长期亲密的异性好友。", "独立需求"),
    ("我接受伴侣有其他情感支持系统。", "独立需求"),
    ("恋爱不应该成为生活重心。", "独立需求"),
    ("发生矛盾时我倾向立即沟通。", "冲突处理"),
    ("我不喜欢冷战。", "冲突处理"),
    ("即使生气也愿意修复关系。", "冲突处理"),
    ("争吵时更关注解决问题。", "冲突处理"),
    ("我能接受观点不同。", "冲突处理"),
    ("频繁联系让我更有安全感。", "安全感"),
    ("公开关系会让我更安心。", "安全感"),
    ("伴侣优先考虑我会让我安心。", "安全感"),
    ("我会在意伴侣与异性的亲密程度。", "安全感"),
    ("我希望自己是伴侣最特殊的人。", "安全感"),
    ("恋爱最终应以长期承诺为目标。", "长期关系"),
    ("价值观比兴趣爱好更重要。", "长期关系"),
    ("生活习惯差异可以磨合。", "长期关系"),
    ("我希望深度绑定未来规划。", "长期关系"),
    ("我愿意为关系做妥协。", "长期关系"),
    ("精神共鸣比现实条件更重要。", "灵魂伴侣"),
    ("伴侣应该是最懂我的人。", "灵魂伴侣"),
    ("我相信灵魂伴侣存在。", "灵魂伴侣"),
    ("遇到高度契合的人很难忽视。", "灵魂伴侣"),
    ("我希望现实与共鸣兼得。", "灵魂伴侣"),
]

DIMS = ["亲密需求", "独立需求", "冲突处理", "安全感", "长期关系", "灵魂伴侣"]

# ---------- 核心函数 ----------
def calc(scores):
    result = {}
    for d in DIMS:
        result[d] = sum(v for v, (q, dim) in zip(scores, QUESTIONS) if dim == d)
    return result

def personality(r):
    if r["灵魂伴侣"] >= 20 and r["独立需求"] >= 18:
        return "灵魂共鸣型探索者"
    if r["安全感"] >= 20:
        return "安全守护者"
    if r["长期关系"] >= 20:
        return "长期建设者"
    return "平衡发展型恋人"

def compatibility(a, b):
    scores = []
    for d in DIMS:
        diff = abs(a[d] - b[d])
        if diff <= 2: s = 100
        elif diff <= 5: s = 80
        elif diff <= 8: s = 60
        elif diff <= 11: s = 40
        else: s = 20
        scores.append(s)
    return round(sum(scores) / len(scores))

def encode_scores(scores):
    return base64.b64encode(json.dumps(scores).encode()).decode()

def decode_scores(encoded):
    try:
        return json.loads(base64.b64decode(encoded.encode()).decode())
    except:
        return None

def generate_detailed_report(me_r, ta_r, match):
    report_lines = []
    report_lines.append("### 🧠 深度关系分析报告\n")

    if match >= 85:
        grade = "🌟 高度契合"
        desc = "你们在绝大多数维度上拥有相似的期望和价值观，这为长期关系奠定了坚实基础。你们更容易彼此理解，冲突较少，是很多人羡慕的“天生一对”类型。"
    elif match >= 70:
        grade = "💡 良好匹配"
        desc = "你们在核心维度上基本同步，同时存在一些有趣且有益的差异。这些差异不是障碍，而是互相学习和成长的空间。保持开放沟通，你们的关系会更加稳固。"
    elif match >= 55:
        grade = "🔄 磨合型"
        desc = "你们在一些关键维度上存在明显差异，这可能会带来摩擦，但也意味着你们有机会通过磨合变得更强。关键是如何看待这些差异——如果愿意包容和调整，关系同样可以走向深度融合。"
    else:
        grade = "🔎 探索型"
        desc = "你们在多个维度上差异较大，这并不意味着不能在一起，而是说明你们需要更多的对话和理解。你们可能来自不同的成长环境，价值观形成路径不同。建议多花时间交流彼此的深层需求。"

    report_lines.append(f"**匹配度评分：{match}%**  —— {grade}")
    report_lines.append(f"> {desc}\n")

    report_lines.append("#### 📊 六大维度逐项解读\n")
    advices = {
        "亲密需求": "你们对关系亲密的渴望程度。如果差异大，一方可能觉得对方冷淡，另一方可能觉得对方窒息。建议约定“陪伴时间”和“独处时间”，让双方都感到舒适。",
        "独立需求": "你们对个人空间的需求。如果差异大，容易在社交自由、异性朋友等问题上产生矛盾。建议坦诚表达自己的社交边界，并尊重对方的边界。",
        "冲突处理": "你们面对矛盾时的应对方式。如果差异大，可能一个喜欢立即沟通，一个喜欢冷静后再说。建议约定一种两人都能接受的冲突解决流程，比如“暂停-冷静-对话”。",
        "安全感": "你们获得安全感的途径。如果差异大，可能一个需要频繁确认，一个认为信任不需要形式。建议明确表达对方哪些行为能让你感到安心，并尝试互相适应。",
        "长期关系": "你们对关系长远规划的态度。如果差异大，可能一个以结婚为前提交往，另一个觉得走一步看一步。建议在关系稳定后，定期讨论未来的共同愿景。",
        "灵魂伴侣": "你们对精神契合的重视程度。如果差异大，可能一个追求精神共鸣，另一个更看重现实适配。建议区分“理想”和“现实”，找到既满足精神又符合实际的方式。"
    }

    for dim in DIMS:
        diff = abs(me_r[dim] - ta_r[dim])
        me_val = me_r[dim]
        ta_val = ta_r[dim]
        if diff <= 2:
            status = "✅ 高度一致"
            detail = "你们在这一维度上几乎同步，很容易产生共鸣，是关系中的强项。"
        elif diff <= 5:
            status = "🟡 温和差异"
            detail = "你们的侧重点有所不同，但可以互补。比如一方更主动，另一方更体贴，这种差异反而让关系更有弹性。"
        else:
            status = "🔴 明显分歧"
            detail = "这是你们需要重点关注的维度。分歧可能导致反复摩擦，但也是深入了解彼此的契机。"

        report_lines.append(f"**{dim}**：你 {me_val} 分，TA {ta_val} 分（差值 {diff}）—— {status}")
        report_lines.append(f"  - {detail}")
        report_lines.append(f"  - 💡 建议：{advices[dim]}\n")

    p1 = personality(me_r)
    p2 = personality(ta_r)
    report_lines.append("#### 👥 人格组合分析\n")
    combo_desc = {
        ("灵魂共鸣型探索者", "灵魂共鸣型探索者"): "你们都是追寻深度连接的探索者，容易在思想和灵魂层面产生强烈共鸣。你们的关系可能充满深度对话和共同成长，但也要注意不要过于理想化，接地气的相处同样重要。",
        ("灵魂共鸣型探索者", "安全守护者"): "一个追求精神共鸣，一个追求稳定安全感。这种组合能形成“互补式安全网”——探索者带来新鲜感，守护者带来稳定感。关键在于双方都能看到对方给予的不同价值。",
        ("灵魂共鸣型探索者", "长期建设者"): "探索者注重当下的情感深度，建设者注重未来的规划和承诺。你们可以形成“梦想+执行”的搭档模式，但需要注意节奏差异，探索者不要嫌建设者太实际，建设者不要嫌探索者太飘。",
        ("安全守护者", "安全守护者"): "你们都非常重视安全感和稳定，关系可能很温暖、可预期，但有时可能缺乏一些冒险和刺激。可以偶尔一起尝试新鲜事物，给关系注入活力。",
        ("安全守护者", "长期建设者"): "守护者提供即时的情感支持，建设者提供长远的未来蓝图。这种搭配很扎实，容易共同建立家庭。守护者要理解建设者有时可能更关注“事”而非“情”，建设者要多给守护者情感确认。",
        ("长期建设者", "长期建设者"): "你们目标一致，都很看重关系的长远发展，是典型的“战友型”伴侣。你们在规划未来上很有默契，但要注意不要忽略当下的情感交流，多创造一些浪漫时刻。",
        ("平衡发展型恋人", "*"): "你是平衡发展型，具有较强的适应能力。你和任何一种类型都能找到相处之道，但要注意不要过度妥协而失去自我。发挥你的灵活性，同时明确自己的核心需求。"
    }
    combo_key = (p1, p2)
    if combo_key in combo_desc:
        combo_text = combo_desc[combo_key]
    elif (p2, p1) in combo_desc:
        combo_text = combo_desc[(p2, p1)]
    else:
        combo_text = "你们的组合较为少见，但每种类型都有独特之处。建议你们多观察彼此的互动模式，找到最适合你们的相处方式。"

    report_lines.append(f"你属于 **{p1}**，TA 属于 **{p2}**。")
    report_lines.append(f"组合特点：{combo_text}\n")

    report_lines.append("#### 🎯 专属于你们的 3 条行动建议\n")
    suggestions = []
    if match >= 70:
        suggestions.append("✅ 保持你们目前良好的沟通习惯，定期回顾彼此的感受，让默契持续深化。")
    else:
        suggestions.append("🔹 安排一个“关系时间”，每周固定一次深度对话，专门讨论你们在差异维度上的感受和需求。")

    if abs(me_r["独立需求"] - ta_r["独立需求"]) > 6:
        suggestions.append("🔹 尝试一起制定“边界合约”，明确哪些社交自由是彼此都能接受的，减少猜疑。")
    else:
        suggestions.append("🔹 你们在独立需求上很协调，可以更加放心地给予对方空间，同时保持联结。")

    suggestions.append("🔹 共同创建一个“快乐清单”——写下你们都喜欢做的活动，定期一起完成，增强情感联结。")

    for s in suggestions:
        report_lines.append(s)

    report_lines.append("\n---\n*报告由 AI 生成，仅供情感参考，真实关系还需用心经营。*")
    return "\n".join(report_lines)

# ---------- 主界面 ----------
st.title("💞 情侣恋爱观兼容性测试")

# 昵称
col_name1, col_name2 = st.columns(2)
with col_name1:
    my_name = st.text_input("你的昵称（可选）", value="我", max_chars=10)
with col_name2:
    ta_name = st.text_input("伴侣的昵称（可选）", value="TA", max_chars=10)

# 初始化 session_state
if 'me_scores' not in st.session_state:
    st.session_state.me_scores = [3] * 30
if 'ta_scores' not in st.session_state:
    st.session_state.ta_scores = [3] * 30
if 'report_data' not in st.session_state:
    st.session_state.report_data = None

# ---------- 按钮行 ----------
col_btn1, col_btn2, col_btn3, col_btn4 = st.columns([1, 1, 1, 4])
with col_btn1:
    if st.button("🔄 重置所有", use_container_width=True):
        st.session_state.me_scores = [3] * 30
        st.session_state.ta_scores = [3] * 30
        st.toast("✅ 已重置所有答案", icon="🔄")
        st.rerun()  # 强制刷新页面

with col_btn2:
    if st.button("🎲 随机填答", use_container_width=True):
        st.session_state.me_scores = [random.randint(1, 5) for _ in range(30)]
        st.session_state.ta_scores = [random.randint(1, 5) for _ in range(30)]
        st.toast("🎲 已随机填充答案", icon="✨")
        st.rerun()

with col_btn3:
    if st.button("📤 导出我的答案", use_container_width=True):
        encoded = encode_scores(st.session_state.me_scores)
        st.code(encoded, language="text")
        st.caption("复制编码发送给伴侣")

# ---------- 答题区 ----------
col1, col2 = st.columns(2, gap="large")
with col1:
    st.subheader(f"💕 {my_name}")
    progress = sum(1 for v in st.session_state.me_scores if v != 0) / 30
    st.progress(progress, text=f"已答 {int(progress*30)}/30 题")
    for i, (q, _) in enumerate(QUESTIONS):
        val = st.slider(f"{i+1}. {q}", 1, 5, value=st.session_state.me_scores[i], key=f"m_{i}")
        st.session_state.me_scores[i] = val

with col2:
    st.subheader(f"💖 {ta_name}")
    progress_ta = sum(1 for v in st.session_state.ta_scores if v != 0) / 30
    st.progress(progress_ta, text=f"已答 {int(progress_ta*30)}/30 题")
    with st.expander("📥 导入伴侣答案"):
        ta_code = st.text_input("粘贴伴侣导出的编码", key="ta_code_input")
        if st.button("导入", use_container_width=True):
            decoded = decode_scores(ta_code)
            if decoded is not None and len(decoded) == 30:
                st.session_state.ta_scores = decoded
                st.success("导入成功！")
            else:
                st.error("编码无效")
    for i, (q, _) in enumerate(QUESTIONS):
        val = st.slider(f"{i+1}. {q}", 1, 5, value=st.session_state.ta_scores[i], key=f"t_{i}")
        st.session_state.ta_scores[i] = val

# ---------- 生成报告 ----------
if st.button("✨ 生成报告", type="primary", use_container_width=True):
    me_r = calc(st.session_state.me_scores)
    ta_r = calc(st.session_state.ta_scores)
    match = compatibility(me_r, ta_r)
    st.session_state.report_data = {
        "me_r": me_r,
        "ta_r": ta_r,
        "match": match,
        "my_name": my_name,
        "ta_name": ta_name,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    st.rerun()

# ---------- 显示报告 ----------
if st.session_state.report_data is not None:
    data = st.session_state.report_data
    me_r = data["me_r"]
    ta_r = data["ta_r"]
    match = data["match"]
    my_name = data["my_name"]
    ta_name = data["ta_name"]
    now = data["timestamp"]

    st.success(f"💯 综合匹配度：{match}%")
    c1, c2 = st.columns(2)
    c1.metric(f"{my_name} 的人格", personality(me_r))
    c2.metric(f"{ta_name} 的人格", personality(ta_r))

    # 雷达图
    fig = go.Figure()
    fig.add_trace(go.Scatterpolar(
        r=[me_r[d] for d in DIMS],
        theta=DIMS,
        fill='toself',
        name=my_name,
        line_color='#FF6B00',
        fillcolor='rgba(255,107,0,0.4)'
    ))
    fig.add_trace(go.Scatterpolar(
        r=[ta_r[d] for d in DIMS],
        theta=DIMS,
        fill='toself',
        name=ta_name,
        line_color='#1E88E5',
        fillcolor='rgba(30,136,229,0.4)'
    ))
    fig.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 25])),
        showlegend=True,
        height=500,
        margin=dict(l=80, r=80, t=40, b=40),
        font=dict(family="WenQuanYi Micro Hei, PingFang SC, Microsoft YaHei, SimHei, sans-serif", size=12)
    )
    st.plotly_chart(fig, use_container_width=True)

    # 表格
    df = pd.DataFrame({
        "维度": DIMS,
        my_name: [me_r[d] for d in DIMS],
        ta_name: [ta_r[d] for d in DIMS],
        "差值": [abs(me_r[d] - ta_r[d]) for d in DIMS]
    })
    st.dataframe(df, use_container_width=True)

    # 文字报告
    detailed_report = generate_detailed_report(me_r, ta_r, match)
    st.markdown(detailed_report)

    # 下载图片
    fig_download = go.Figure()
    fig_download.add_trace(go.Scatterpolar(
        r=[me_r[d] for d in DIMS],
        theta=DIMS,
        fill='toself',
        name=my_name,
        line_color='#FF6B00',
        fillcolor='rgba(255,107,0,0.5)'
    ))
    fig_download.add_trace(go.Scatterpolar(
        r=[ta_r[d] for d in DIMS],
        theta=DIMS,
        fill='toself',
        name=ta_name,
        line_color='#1E88E5',
        fillcolor='rgba(30,136,229,0.5)'
    ))
    title_text = f"❤️ 匹配度：{match}%  |  {my_name}：{personality(me_r)}  |  {ta_name}：{personality(ta_r)}<br><span style='font-size:12px;color:gray'>生成时间：{now}</span>"
    fig_download.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 25])),
        showlegend=True,
        height=600,
        margin=dict(l=80, r=80, t=100, b=60),
        title=dict(
            text=title_text,
            font=dict(family="WenQuanYi Micro Hei, PingFang SC, Microsoft YaHei, SimHei, sans-serif", size=16, color="black"),
            y=0.95
        ),
        paper_bgcolor='white',
        plot_bgcolor='white',
        annotations=[
            dict(
                text="数据维度对比雷达图",
                x=0.5,
                y=-0.12,
                xref="paper",
                yref="paper",
                showarrow=False,
                font=dict(family="WenQuanYi Micro Hei, sans-serif", size=12, color="gray")
            )
        ]
    )
    try:
        img_bytes = pio.to_image(fig_download, format='png', engine='kaleido')
        st.download_button(
            label="📥 下载报告图片（PNG）",
            data=img_bytes,
            file_name=f"恋爱观匹配报告_{now.replace(' ', '_')}.png",
            mime="image/png",
            key="download_img"
        )
    except Exception as e:
        st.error(f"图片生成失败：{e}")
    st.caption("点击上方按钮下载完整报告图片。")

    # ---------- 保存历史记录 ----------
    record = {
        "时间": now,
        "匹配度": match,
        f"{my_name}人格": personality(me_r),
        f"{ta_name}人格": personality(ta_r),
        "亲密需求_我": me_r["亲密需求"],
        "独立需求_我": me_r["独立需求"],
        "冲突处理_我": me_r["冲突处理"],
        "安全感_我": me_r["安全感"],
        "长期关系_我": me_r["长期关系"],
        "灵魂伴侣_我": me_r["灵魂伴侣"],
        "亲密需求_TA": ta_r["亲密需求"],
        "独立需求_TA": ta_r["独立需求"],
        "冲突处理_TA": ta_r["冲突处理"],
        "安全感_TA": ta_r["安全感"],
        "长期关系_TA": ta_r["长期关系"],
        "灵魂伴侣_TA": ta_r["灵魂伴侣"],
    }
    st.components.v1.html(f"""
    <script>
    (function() {{
        var record = {json.dumps(record)};
        var history = JSON.parse(localStorage.getItem('love_test_history')) || [];
        history.push(record);
        localStorage.setItem('love_test_history', JSON.stringify(history));
    }})();
    </script>
    """, height=0)

# ---------- 历史记录显示 ----------
st.markdown("---")
with st.expander("📚 查看历史记录", expanded=False):
    st.components.v1.html("""
    <div id="history-container" style="max-height:800px; overflow:auto;">
        <p>加载历史记录中...</p>
    </div>
    <script>
    (function() {
        function renderHistory() {
            var container = document.getElementById('history-container');
            var history = JSON.parse(localStorage.getItem('love_test_history')) || [];
            if (history.length === 0) {
                container.innerHTML = '<p>暂无历史记录。</p>';
                return;
            }
            var table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.fontSize = '14px';
            var thead = document.createElement('thead');
            var headerRow = document.createElement('tr');
            var headers = ['时间', '匹配度', '我人格', 'TA人格', '亲密需求_我', '独立需求_我', '冲突处理_我', '安全感_我', '长期关系_我', '灵魂伴侣_我', '亲密需求_TA', '独立需求_TA', '冲突处理_TA', '安全感_TA', '长期关系_TA', '灵魂伴侣_TA'];
            headers.forEach(function(h) {
                var th = document.createElement('th');
                th.textContent = h;
                th.style.border = '1px solid #ddd';
                th.style.padding = '8px';
                th.style.backgroundColor = '#f2f2f2';
                th.style.position = 'sticky';
                th.style.top = '0';
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
            var tbody = document.createElement('tbody');
            history.forEach(function(rec) {
                var row = document.createElement('tr');
                headers.forEach(function(h) {
                    var td = document.createElement('td');
                    td.textContent = rec[h] !== undefined ? rec[h] : '';
                    td.style.border = '1px solid #ddd';
                    td.style.padding = '8px';
                    td.style.textAlign = 'center';
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            container.innerHTML = '';
            container.appendChild(table);
            var btnDiv = document.createElement('div');
            btnDiv.style.marginTop = '10px';
            var exportBtn = document.createElement('button');
            exportBtn.textContent = '📥 导出JSON';
            exportBtn.style.marginRight = '10px';
            exportBtn.onclick = function() {
                var dataStr = JSON.stringify(history, null, 2);
                var blob = new Blob([dataStr], {type: 'application/json'});
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = '恋爱观历史记录.json';
                a.click();
                URL.revokeObjectURL(url);
            };
            btnDiv.appendChild(exportBtn);
            var clearBtn = document.createElement('button');
            clearBtn.textContent = '🗑️ 清空所有记录';
            clearBtn.onclick = function() {
                if (confirm('确定要清空所有历史记录吗？')) {
                    localStorage.removeItem('love_test_history');
                    renderHistory();
                }
            };
            btnDiv.appendChild(clearBtn);
            container.appendChild(btnDiv);
        }
        renderHistory();
    })();
    </script>
    """, height=800)