import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import base64
import json

st.set_page_config(page_title="情侣恋爱观测试", layout="wide")

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
        if diff <= 2:
            s = 100
        elif diff <= 5:
            s = 80
        elif diff <= 8:
            s = 60
        elif diff <= 11:
            s = 40
        else:
            s = 20
        scores.append(s)
    return round(sum(scores) / len(scores))


# 编码/解码函数
def encode_scores(scores):
    # scores是长度为30的列表
    json_str = json.dumps(scores)
    b64 = base64.b64encode(json_str.encode()).decode()
    return b64


def decode_scores(encoded):
    try:
        json_str = base64.b64decode(encoded.encode()).decode()
        scores = json.loads(json_str)
        if len(scores) != 30:
            return None
        return scores
    except:
        return None


st.title("❤️ 情侣恋爱观兼容性测试")

# 初始化session_state存储滑块值
if 'me_scores' not in st.session_state:
    st.session_state.me_scores = [3] * 30
if 'ta_scores' not in st.session_state:
    st.session_state.ta_scores = [3] * 30

col1, col2 = st.columns(2)

with col1:
    st.header("我")
    # 导出我的答案
    export_me = st.button("📤 导出我的答案（复制编码）", key="export_me")
    if export_me:
        encoded = encode_scores(st.session_state.me_scores)
        st.code(encoded, language="text")
        st.caption("复制上面的编码，发送给伴侣")

    for i, (q, _) in enumerate(QUESTIONS):
        val = st.slider(f"{i + 1}. {q}", 1, 5, value=st.session_state.me_scores[i], key=f"m{i}")
        st.session_state.me_scores[i] = val

with col2:
    st.header("TA")
    # 导入伴侣答案
    st.markdown("**导入伴侣的答案**")
    ta_code = st.text_input("粘贴伴侣导出的编码", key="ta_code_input")
    if st.button("📥 导入", key="import_ta"):
        decoded = decode_scores(ta_code)
        if decoded is not None:
            for i, val in enumerate(decoded):
                st.session_state.ta_scores[i] = val
            st.success("导入成功！滑块已更新")
        else:
            st.error("编码无效，请检查是否完整复制")

    for i, (q, _) in enumerate(QUESTIONS):
        val = st.slider(f"{i + 1}. {q}", 1, 5, value=st.session_state.ta_scores[i], key=f"t{i}")
        st.session_state.ta_scores[i] = val

if st.button("生成报告", type="primary"):
    me_r = calc(st.session_state.me_scores)
    ta_r = calc(st.session_state.ta_scores)

    match = compatibility(me_r, ta_r)

    st.success(f"综合匹配度：{match}%")

    c1, c2 = st.columns(2)
    c1.metric("我的人格", personality(me_r))
    c2.metric("TA的人格", personality(ta_r))

    fig = go.Figure()
    fig.add_trace(go.Scatterpolar(
        r=[me_r[d] for d in DIMS],
        theta=DIMS,
        fill='toself',
        name='我'
    ))
    fig.add_trace(go.Scatterpolar(
        r=[ta_r[d] for d in DIMS],
        theta=DIMS,
        fill='toself',
        name='TA'
    ))
    st.plotly_chart(fig, use_container_width=True)

    df = pd.DataFrame({
        "维度": DIMS,
        "我": [me_r[d] for d in DIMS],
        "TA": [ta_r[d] for d in DIMS]
    })
    st.dataframe(df, use_container_width=True)

    report = f"""
### AI关系分析

匹配度：{match}%

你的类型：{personality(me_r)}
TA的类型：{personality(ta_r)}

#### 主要观察

- 亲密需求差值：{abs(me_r["亲密需求"] - ta_r["亲密需求"])}
- 独立需求差值：{abs(me_r["独立需求"] - ta_r["独立需求"])}
- 安全感差值：{abs(me_r["安全感"] - ta_r["安全感"])}
"""
    if abs(me_r["独立需求"] - ta_r["独立需求"]) > 8:
        report += "\n🔴 边界感冲突风险较高，容易围绕异性朋友、社交自由产生矛盾。\n"

    if abs(me_r["安全感"] - ta_r["安全感"]) > 8:
        report += "\n🔴 安全感来源不同，一方可能需要更多确认与陪伴。\n"

    if match >= 80:
        report += "\n🟢 整体属于高匹配关系。"
    elif match >= 60:
        report += "\n🟡 属于磨合型关系。"
    else:
        report += "\n🔴 核心恋爱观差异较大。"

    st.markdown(report)