import { useState } from "react";
import type { Episode, Profile, Recommendations } from "../engine/types";
import { simulateMA, rsi } from "../engine/tasks";
import { resources } from "../engine/recommend";
import { Chart } from "./Chart";
import pack from "../data/episodes.pack.json";
const pct = (v: number) => (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "%";
export function TaskView({
  profile,
  recommendations,
  onBack,
}: {
  profile: Profile;
  recommendations: Recommendations;
  onBack: () => void;
}) {
  const task = recommendations.nextTask;
  const [fast, setFast] = useState(10),
    [slow, setSlow] = useState(30),
    [selected, setSelected] = useState<string | null>(null),
    [done, setDone] = useState(false),
    [answers, setAnswers] = useState<number[]>([]),
    [copied, setCopied] = useState(false);
  const episodes = task.data.map(
    (id) => pack.episodes.find((e) => e.id === id) as Episode,
  );
  const resource = resources.find((r) => r.id === task.resourceId)!;
  const first =
      task.id === "T-trend"
        ? episodes.find((e) => e.id === selected) || episodes[0]
        : episodes[0],
    simulation = first
      ? simulateMA([...first.before, ...first.after], fast, slow)
      : null;
  const prompt = `我是量化新手，量权测评人设是${profile.persona.name}。请带我做一个10分钟的${task.title}入门练习。明确数据来源与时间、解释风险与样本限制，不给实盘买卖指令。`;
  const selectedEpisode = episodes.find((e) => e.id === selected);
  return (
    <section className="paper-screen task-screen">
      <button className="text-button" onClick={onBack}>
        ← 返回画像
      </button>
      <div className="eyebrow">YOUR FIRST STEP · 约 {task.minutes} 分钟</div>
      <h1>{task.title}</h1>
      <p className="muted">把你的方向，变成一次亲手完成的探索。</p>
      {task.id === "T-trend" && first && (
        <>
          <div className="sample-tabs">
            {episodes.map((e, i) => (
              <button
                key={e.id}
                className={first.id === e.id ? "chosen" : ""}
                onClick={() => {
                  setSelected(e.id);
                  setDone(false);
                }}
              >
                样本 {i + 1} · {e.id}
              </button>
            ))}
          </div>
          <Chart before={first.before} after={first.after} />
          <div className="task-controls">
            <label>
              快线 MA {fast}
              <input
                aria-label="快线周期"
                type="range"
                min="5"
                max="30"
                value={fast}
                onChange={(e) => {
                  const v = +e.target.value;
                  setFast(v);
                  if (v >= slow) setSlow(v + 1);
                  setDone(false);
                }}
              />
            </label>
            <label>
              慢线 MA {slow}
              <input
                aria-label="慢线周期"
                type="range"
                min="20"
                max="60"
                value={slow}
                onChange={(e) => {
                  const v = +e.target.value;
                  setSlow(v);
                  if (v <= fast) setFast(v - 1);
                  setDone(false);
                }}
              />
            </label>
          </div>
          <div className="stat-row">
            <span>
              模拟收益<strong>{pct(simulation!.ret)}</strong>
            </span>
            <span>
              仓位切换<strong>{simulation!.trades} 次</strong>
            </span>
          </div>
          <p className="small">
            基于 {first.id} 的 81
            个交易日收盘价样本，仅作示意。昨日信号决定今日仓位；不含手续费、滑点、分红及实盘约束，无预测意义。
          </p>
          <button className="primary" onClick={() => setDone(true)}>
            我已比较参数，完成练习
          </button>
        </>
      )}
      {task.id === "T-value" && (
        <>
          <p>
            只依据下表的历史波动和回撤，你认为哪段价格路径更平稳？这些是混合资产的价格样本，不是股息率或基本面排名。
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>样本</th>
                  <th>日波动</th>
                  <th>60 日回撤</th>
                  <th>选择</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((e, i) => (
                  <tr key={e.id}>
                    <td>样本 {String.fromCharCode(65 + i)}</td>
                    <td>{(e.hint.volatility60 * 100).toFixed(2)}%</td>
                    <td>{pct(e.hint.maxDD60)}</td>
                    <td>
                      <button
                        aria-label={`选择样本${i + 1}`}
                        className={selected === e.id ? "chosen" : ""}
                        onClick={() => setSelected(e.id)}
                      >
                        选它
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            disabled={!selected}
            className="primary"
            onClick={() => setDone(true)}
          >
            揭晓这段旅程
          </button>
          {done && selectedEpisode && (
            <div className="result-note">
              <strong>
                {selectedEpisode.name} · {selectedEpisode.decisionDate}
              </strong>
              <p>
                后20日实际涨跌 {pct(selectedEpisode.outcome.ret20)}
                。波动较低不保证未来收益更高；你的选择依据是事前价格风险。
              </p>
              <Chart
                before={selectedEpisode.before}
                after={selectedEpisode.after}
              />
            </div>
          )}
        </>
      )}
      {task.id === "T-reversal" && (
        <>
          <p>
            比较两个真实样本的
            RSI(14)。小于30常被用作超跌线索，但不会自动带来反弹。先选择你想观察的样本。
          </p>
          {episodes.map((e, i) => (
            <button
              className={`option ${selected === e.id ? "chosen" : ""}`}
              key={e.id}
              onClick={() => setSelected(e.id)}
            >
              样本 {i + 1} · RSI(14) = {rsi(e.before).toFixed(1)}
            </button>
          ))}
          <button
            disabled={!selected}
            className="primary"
            onClick={() => setDone(true)}
          >
            观察其后 20 日
          </button>
          {done && selectedEpisode && (
            <>
              <Chart
                before={selectedEpisode.before}
                after={selectedEpisode.after}
              />
              <p>
                {selectedEpisode.name} · {selectedEpisode.decisionDate}，后20日{" "}
                {pct(selectedEpisode.outcome.ret20)}
                ；一个样本不足以验证反转策略。
              </p>
            </>
          )}
        </>
      )}
      {task.id === "T-starter" && (
        <>
          <p>无需代码，先把三个基础概念放进工具箱。</p>
          {[
            ["历史收益能保证未来吗？", "不能，需要独立检验", "可以保证"],
            ["最大回撤关注什么？", "从高点到低点的损失", "只看最后一天"],
            ["数据来源不清楚时怎么办？", "先核实来源和口径", "先按图交易"],
          ].map(([q, a, b], i) => (
            <div className="quiz-item" key={q}>
              <h3>{q}</h3>
              {[a, b].map((text, j) => (
                <button
                  className={`option ${answers[i] === j ? "chosen" : ""}`}
                  key={text}
                  onClick={() =>
                    setAnswers((old) => {
                      const next = [...old];
                      next[i] = j;
                      return next;
                    })
                  }
                >
                  {text}
                </button>
              ))}
              {answers[i] !== undefined && (
                <p className="small">
                  {answers[i] === 0 ? "正确。" : "再想一想。"}
                  {a}。
                </p>
              )}
            </div>
          ))}
          <button
            className="primary"
            disabled={answers.filter((a) => a === 0).length < 3}
            onClick={() => setDone(true)}
          >
            完成三道入门题
          </button>
        </>
      )}
      {done && (
        <div className="completion">
          <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#d8ad5c"/><path d="M6.5 12.5l3.6 3.6 7.4-8" fill="none" stroke="#1a1405" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div>
            <strong>第一步，已经迈出。</strong>
            <p>下一站：{resource.name}</p>
            <a href={resource.url} target="_blank" rel="noreferrer">
              打开真实资源 ↗
            </a>
            <p className="small">
              {resource.status === "reachable"
                ? "链接已检查可访问；功能与账号权限以资源页面为准。"
                : "链接待校验。"}
            </p>
          </div>
        </div>
      )}
      <details className="prompt">
        <summary>复制一段适合我的 Qube 提示词</summary>
        <p>{prompt}</p>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompt);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "已复制" : "复制提示词"}
        </button>
        <p className="small">只复制文本，尚未在 Qube 中执行。</p>
      </details>
      <p className="small">
        数据：Panda Data · 样本 {task.data.join("、") || "概念入门，无行情计算"}{" "}
        · 资源等级、风格与时长为团队标注。
      </p>
    </section>
  );
}
