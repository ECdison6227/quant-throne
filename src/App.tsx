import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import pack from "./data/episodes.pack.json";
import { buildProfile } from "./engine/profile";
import { nextCard } from "./engine/deck";
import { makeDecision } from "./engine/evidence";
import {
  applyDecision,
  ending,
  initialGauges,
} from "./engine/state";
import { recommend } from "./engine/recommend";
import { exportProfile, sendToVivic, shareSummary } from "./engine/export";
import { demoChoice } from "./engine/demo";
import { revisionCards, styleNames } from "./content/cards";
import type {
  Card,
  Decision,
  DimKey,
  Direction,
  Episode,
  Gauges,
  Report,
  Revision,
  SelfReport,
} from "./engine/types";
import { Chart } from "./ui/Chart";
import { SwipeCard, type SwipeHandle } from "./ui/SwipeCard";
import { Gauges as GaugeBar } from "./ui/Gauges";
import { TaskView } from "./ui/TaskView";
import { audio } from "./audio";
import { saveFile, nativePlatform, sendProfileToVivic } from "./platform";
import { parseSession } from "./engine/storage";
import { OnlinePanel } from "./ui/OnlinePanel";
const STORE = "quant-throne.session.v1";
const publicUrl = "https://edsionc.top/game/games/quant-throne/index.html";
const pct = (v: number) => (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "%";
const displayScore = (value: number | string | null) =>
  value === null
    ? "暂不判断"
    : typeof value === "number"
      ? Math.round(value)
      : styleNames[value] ||
        (
          {
            a_share: "A股",
            etf_fund: "ETF / 基金",
            futures: "期货",
            hk_us: "港美股",
          } as Record<string, string>
        )[value] ||
        value;
type Reveal = { card: Card; decision: Decision; episode?: Episode };
type RevisionRun = {
  dim: DimKey;
  before: number | string | null;
  cards: Card[];
  index: number;
};
function loadSaved() {
  try {
    return parseSession(localStorage.getItem(STORE));
  } catch {
    return null;
  }
}
export default function App() {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const demo =
    params.get("demo") === "A" ? "A" : params.get("demo") === "B" ? "B" : null;
  const seed = params.get("seed") || "bamboo-2026";
  const [mode, setMode] = useState<"welcome" | "game" | "profile" | "task">(
    "welcome",
  );
  const [paused, setPaused] = useState(false);
  const [ask, setAsk] = useState<0 | 1 | 2>(0);
  const [online,setOnline]=useState(false),[music,setMusic]=useState(audio.music),[voice,setVoice]=useState(audio.voice);
  const [self, setSelf] = useState<SelfReport>({
    risk: demo === "B" ? "open" : "cautious",
    level: demo === "B" ? 2 : 1,
  });
  const [log, setLog] = useState<Decision[]>([]),
    [gauges, setGauges] = useState<Gauges>(initialGauges),
    [term, setTerm] = useState(1);
  const [pending, setPending] = useState<{
      card: Card;
      direction: Direction;
    } | null>(null),
    [reveal, setReveal] = useState<Reveal | null>(null);
  const [reports, setReports] = useState<Report[]>([]),
    [report, setReport] = useState<Report | null>(null),
    [hold, setHold] = useState<Direction | null>(null);
  const [notice, setNotice] = useState(""),
    [info, setInfo] = useState(false),
    [settings, setSettings] = useState(false),
    [sfx, setSfx] = useState(audio.sfx),
    [auto, setAuto] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]),
    [revision, setRevision] = useState<RevisionRun | null>(null),
    [termEnd, setTermEnd] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState(new Date().toISOString()),
    [hasSaved, setHasSaved] = useState(!!loadSaved());
  const swipeRef = useRef<SwipeHandle>(null);
  const profile = useMemo(() => buildProfile(log, self), [log, self]);
  const recommendations = useMemo(() => recommend(profile), [profile]);
  const exported = useMemo(
    () => exportProfile(profile, recommendations, revisions, createdAt, demo),
    [profile, recommendations, revisions, createdAt, demo],
  );
  const current = revision
    ? revision.cards[revision.index]
    : nextCard(log, profile, seed);
  const episode = current?.episodeId
    ? (pack.episodes.find((e) => e.id === current.episodeId) as Episode)
    : undefined;
  useEffect(() => {
    window.__EDISONC_GAME__ = {
      isReady: () =>
        !!document.querySelector(".app") &&
        Array.from(document.images).every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      pause: () => {
        setPaused(true);
        setAuto(false);
        audio.stop();
      },
      resume: () => {setPaused(false);audio.resume();},
    };
    return () => {
      delete window.__EDISONC_GAME__;
      audio.stop();
    };
  }, []);
  useEffect(() => {
    if (log.length) {
      try {
        localStorage.setItem(
          STORE,
          JSON.stringify({
            version: 1,
            log,
            self,
            gauges,
            term,
            revisions,
            createdAt,
            complete: mode === "profile" || mode === "task",
          }),
        );
        setHasSaved(true);
      } catch {
        setNotice("本机存储不可用，本次进度不会自动保存。");
      }
    }
  }, [log, self, gauges, term, revisions, createdAt, mode]);
  useEffect(() => {
    if (mode === "profile") {
      void audio.play("persona");
      void audio.playVoice("profile","profile-"+createdAt+"-"+log.length);
      if (params.get("embed") === "vivic" && window.parent !== window)
        sendToVivic(exported, window.parent);
    }
  }, [mode, exported, params]);
  useEffect(()=>{if(mode==='game'&&current?.kind==='market')void audio.playVoice('market','market-instructions');},[mode,current?.id]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);
  function begin(resume = false) {
    void audio.unlock();
    void audio.play("start");
    void audio.playVoice("welcome","welcome-"+Date.now());
    if (resume) {
      const saved = loadSaved();
      if (saved) {
        setLog(saved.log);
        setSelf(saved.self);
        setGauges(saved.gauges);
        setTerm(saved.term);
        setRevisions(saved.revisions || []);
        setCreatedAt(saved.createdAt);
        setMode(saved.complete || saved.log.length >= 24 ? "profile" : "game");
        return;
      }
    }
    setLog([]);
    setGauges(initialGauges());
    setTerm(1);
    setRevisions([]);
    setRevision(null);
    setReveal(null);
    setPending(null);
    setCreatedAt(new Date().toISOString());
    setMode("game");
  }
  function afterCard(newLog: Decision[], newGauges: Gauges) {
    setReports([]);
    setReport(null);
    setHold(null);
    if (revision) {
      if (revision.index + 1 >= revision.cards.length) {
        const after = buildProfile(newLog, self).dimensions[revision.dim].score;
        setRevisions((old) => [
          ...old,
          {
            dimension: revision.dim,
            before: revision.before,
            after,
            reason: `新增 ${revision.cards.length} 条针对性观察；${revision.before === after ? "新增线索支持原判断，维持结果" : "依据新选择重新汇总，保留此前证据"}`,
            cards: revision.cards.map((c) => c.id),
          },
        ]);
        setRevision(null);
        setMode("profile");
      } else setRevision({ ...revision, index: revision.index + 1 });
      return;
    }
    const cause = ending(newGauges);
    if (cause) {
      setTermEnd(cause);
      void audio.play("end");
      return;
    }
    if (newLog.length >= 24) {
      setMode("profile");
      setAuto(false);
    } else void audio.play("flip");
  }
  function commit(card: Card, direction: Direction, confidence = 0.65) {
    const e = card.episodeId
      ? (pack.episodes.find((x) => x.id === card.episodeId) as Episode)
      : undefined;
    const decision = makeDecision(
      card,
      direction,
      log.length,
      confidence,
      reports,
      e,
    );
    const newLog = [...log, decision],
      newGauges = applyDecision(gauges, card, decision);
    setLog(newLog);
    setGauges(newGauges);
    setPending(null);
    void audio.play(direction === "left" ? "left" : "right");
    if (card.kind === "market" || card.kind === "knowledge") {
      setReveal({ card, decision, episode: e });
      void audio.play("reveal");
    } else afterCard(newLog, newGauges);
  }
  function choose(direction: Direction) {
    if (!current || pending || reveal || termEnd || info || settings || online || paused)
      return;
    void audio.unlock();
    if (current.kind === "market") setPending({ card: current, direction });
    else commit(current, direction);
  }
  function closeReveal() {
    setReveal(null);
    afterCard(log, gauges);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        mode !== "game" ||
        (e.target as HTMLElement).closest("input,select,textarea")
      )
        return;
      const d =
        e.key === "ArrowLeft"
          ? "left"
          : e.key === "ArrowRight"
            ? "right"
            : e.key === "ArrowUp" && current?.kind === "market"
              ? "up"
              : null;
      if (d) {
        e.preventDefault();
        if (swipeRef.current) swipeRef.current.fling(d);
        else choose(d);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    if (!auto || !demo || mode !== "game" || termEnd || info || settings || online || paused)
      return;
    const timer = setTimeout(() => {
      if (pending)
        commit(pending.card, pending.direction, demo === "A" ? 0.65 : 0.9);
      else if (reveal) closeReveal();
      else if (current) {
        if (demo === "B" && current.report) setReports(["technical"]);
        const d = demoChoice(current, demo);
        if (swipeRef.current) swipeRef.current.fling(d);
        else choose(d);
      }
    }, 900);
    return () => clearTimeout(timer);
  });
  async function copyProfile() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exported, null, 2));
      setNotice("画像 JSON 已复制。");
    } catch {
      download(
        JSON.stringify(exported, null, 2),
        "quant-throne-profile.json",
        "application/json",
      );
    }
  }
  function download(data: BlobPart, name: string, type: string) {
    void saveFile(data, name, type).catch(() =>
      setNotice("文件保存未完成，可重试或复制画像 JSON。"),
    );
  }
  async function share() {
    const summary = shareSummary(profile, recommendations),
      canvas = document.createElement("canvas");
    canvas.width = 750;
    canvas.height = 1050;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f1ebdc";
    ctx.fillRect(0, 0, 750, 1050);
    ctx.fillStyle = "#183b34";
    ctx.fillRect(32, 32, 686, 986);
    ctx.fillStyle = "#efe8d4";
    ctx.font = "22px sans-serif";
    ctx.fillText("QUANT THRONE · 量权内测", 75, 100);
    ctx.font = "54px serif";
    ctx.fillText(summary.persona.name, 75, 210);
    ctx.font = "24px sans-serif";
    ctx.fillText("在真实行情里，认识自己的选择。", 75, 265);
    summary.dimensions.slice(0, 5).forEach((d, i) => {
      ctx.fillStyle = "#a6b99c";
      ctx.fillText(d.label, 75, 350 + i * 70);
      ctx.fillStyle = "#efe8d4";
      ctx.fillText(String(displayScore(d.score)), 390, 350 + i * 70);
    });
    const qr = document.createElement("canvas");
    await QRCode.toCanvas(qr, publicUrl, {
      width: 165,
      margin: 1,
      color: { dark: "#17382fff", light: "#efe8d4ff" },
    });
    ctx.drawImage(qr, 75, 755);
    ctx.font = "20px sans-serif";
    ctx.fillText("扫一扫，来掌舵一局", 275, 815);
    ctx.fillText("游戏测评 · 不构成投资建议", 75, 970);
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#a6b99c";
    ctx.fillText("推荐首站 · " + summary.recommendation.slice(0, 25), 75, 710);
    if (demo) {
      ctx.font = "18px sans-serif";
      ctx.fillText(`模拟演示 ${demo} · 非真实用户记录`, 275, 860);
    }
    canvas.toBlob((blob) => {
      if (blob) download(blob, "量权-人物卡.png", "image/png");
    });
  }
  function revise(dim: DimKey) {
    const list = revisionCards(
      dim,
      log.map((d) => d.cardId),
    );
    setRevision({
      dim,
      before: profile.dimensions[dim].score,
      cards: list,
      index: 0,
    });
    setReports([]);
    setReport(null);
    setAuto(false);
    setMode("game");
    setNotice(
      `补充 ${list.length} 条${profile.dimensions[dim].label}线索，结果可能改变或维持。`,
    );
  }
  function clear() {
    localStorage.removeItem(STORE);
    setHasSaved(false);
    setLog([]);
    setRevisions([]);
    setRevision(null);
    setPending(null);
    setReveal(null);
    setTermEnd(null);
    setAuto(false);
    setInfo(false);
    setMode("welcome");
    audio.stop();
    setNotice("本机逐卡记录与画像进度已清除。");
  }
  const affected =
    hold && current
      ? new Set(
          current.kind === "market"
            ? ["nav", "risk", "research"]
            : hold === "up"
              ? []
              : Object.keys((hold === "left" ? current.left : current.right).delta),
        )
      : new Set<string>();
  const marketsSeen = log.filter((d) => d.kind === "market").length;
  const showHelp =
    !revision && (log.length < 3 || (current?.kind === "market" && marketsSeen === 0));
  const progress = revision
    ? (revision.index + 1) / revision.cards.length
    : Math.min(log.length, 24) / 24;
  const fling = (d: Direction) => {
    if (swipeRef.current) swipeRef.current.fling(d);
    else choose(d);
  };
  const partnerLinks = (
    <div className="partner-links">
      <button onClick={() => setOnline(true)}>PandaAI 在线数据</button>
      <a href="https://edsionc.top/quant-throne/" target="_blank" rel="noreferrer">量权官网</a>
      <a href="https://edsionc.top/vivic/" target="_blank" rel="noreferrer">Vivic</a>
      <a href="https://www.quantskills.ai/" target="_blank" rel="noreferrer">QuantSkills</a>
    </div>
  );
  const kindName =
    current?.kind === "market"
      ? "真实行情"
      : current?.kind === "knowledge"
        ? "研究一问"
        : current?.kind === "tutorial"
          ? "新任须知"
          : "竹林来信";
  return (
    <main className={`app mode-${mode}`}>
      <header className="topbar">
        <button className="brand" onClick={() => setInfo(true)} aria-label="关于量权">
          <img className="brand-icon" src="./assets/art/icon.webp" alt="" />
          <span className="brand-name">
            量权<small>QUANT THRONE</small>
          </span>
        </button>
        {mode === "game" && (
          <div className="progress" aria-label={`进度 ${Math.round(progress * 100)}%`}>
            <span className="progress-label">
              {revision
                ? `补充 ${revision.index + 1}/${revision.cards.length}`
                : `第${term}任 · ${String(Math.min(log.length + 1, 24)).padStart(2, "0")}/24`}
            </span>
            <span className="progress-track">
              <i style={{ width: `${progress * 100}%` }} />
            </span>
          </div>
        )}
        <div className="top-actions">
          <button aria-label="声音设置" className="icon-button" onClick={() => setSettings(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
              {sfx || music ? (
                <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <button aria-label="数据与隐私说明" className="icon-button" onClick={() => setInfo(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 11v6M12 7.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>
      {paused && (
        <div className="pause-strip">
          <span>已暂停</span>
          <button onClick={() => { setPaused(false); audio.resume(); }}>继续 →</button>
        </div>
      )}
      {mode === "welcome" && (
        <section className={`welcome ${ask ? "asking" : ""}`}>
          <div className="welcome-art" />
          <div className="welcome-moon" aria-hidden="true" />
          {!ask ? (
            <div className="welcome-hero" key="hero">
              <h1>量权</h1>
              <p className="welcome-en">QUANT THRONE</p>
              <p className="welcome-line">在真实行情里，看清自己</p>
              <div className="welcome-actions">
                <button className="primary begin" onClick={() => { void audio.unlock(); void audio.play("button"); if (demo) begin(); else setAsk(1); }}>
                  开始掌舵
                </button>
                {hasSaved && (
                  <button className="ghost-button" onClick={() => begin(true)}>继续上一局</button>
                )}
              </div>
              <a className="welcome-partner" href="https://www.pandaaiquant.com/" target="_blank" rel="noreferrer">
                <b>PandaAI</b> 官方授权数据
              </a>
              {demo && <p className="demo-label">模拟演示 {demo} · 非真实用户</p>}
            </div>
          ) : (
            <div className="welcome-ask" key={`ask-${ask}`}>
              <p className="ask-step">{ask} / 2</p>
              <h2>{ask === 1 ? "你更接近？" : "量化基础？"}</h2>
              <div className="ask-options">
                {ask === 1
                  ? ([["cautious", "稳健", "先守住本金"], ["open", "进取", "愿意承担波动"], ["unknown", "说不清", "让游戏来判断"]] as const).map(([v, t, s]) => (
                      <button key={v} className="ask-option" onClick={() => { void audio.play("button"); setSelf({ ...self, risk: v }); setAsk(2); }}>
                        <strong>{t}</strong><span>{s}</span>
                      </button>
                    ))
                  : ([[0, "零基础", "刚开始了解"], [1, "会看图", "看得懂K线"], [2, "读代码", "能改简单脚本"], [3, "做回测", "做过策略研究"]] as const).map(([v, t, s]) => (
                      <button key={v} className="ask-option" onClick={() => { setSelf({ ...self, level: v }); setAsk(0); begin(); }}>
                        <strong>{t}</strong><span>{s}</span>
                      </button>
                    ))}
              </div>
              <button className="ghost-button" onClick={() => setAsk(ask === 1 ? 0 : 1)}>← 返回</button>
            </div>
          )}
        </section>
      )}
      {mode === "game" && current && (
        <section className="game">
          <GaugeBar gauges={gauges} affected={affected} />
          <div className="card-scene">
            <div className="card-back" />
            <SwipeCard
              ref={swipeRef}
              key={current.id}
              onChoice={choose}
              onHold={setHold}
              disabled={!!pending || !!reveal || !!termEnd}
              market={current.kind === "market"}
              held={pending?.direction ?? null}
              labels={{ left: current.left.text, right: current.right.text, up: "观望" }}
            >
              {episode ? (
                <div className="card-head">
                  <img draggable="false" src={`./assets/art/${current.character}.webp`} alt="" />
                  <div>
                    <span className="card-kind">{kindName}</span>
                    <span className="role">{current.role}</span>
                  </div>
                </div>
              ) : (
                <div className="character">
                  <img draggable="false" src={`./assets/art/${current.character}.webp`} alt={current.role} />
                  <span className="card-kind">{kindName}</span>
                </div>
              )}
              <div className="card-content">
                {!episode && <div className="role">{current.role}</div>}
                <h2>{current.title}</h2>
                <p className="card-text">{current.text}</p>
                {episode && <Chart before={episode.before} tall />}
                {current.report && (
                  <div className={`report ${report ? "open" : ""}`}>
                    {report ? (
                      <>
                        <div className="report-tabs">
                          {(["technical", "fundamental", "flow"] as Report[]).map((r) => (
                            <button key={r} className={report === r ? "chosen" : ""}
                              onClick={() => { setReport(r); setReports((old) => (old.includes(r) ? old : [...old, r])); }}>
                              {{ technical: "趋势", fundamental: "风险", flow: "量能" }[r]}
                            </button>
                          ))}
                        </div>
                        <p>
                          {episode
                            ? report === "technical"
                              ? `MA20 在 MA60 ${episode.hint.ma20_vs_ma60 === "above" ? "上方" : "下方"} · 60日 ${pct(episode.hint.ret60)}`
                              : report === "flow"
                                ? `成交量 = 60日均量 × ${episode.hint.vol_ratio.toFixed(2)}`
                                : `日波动 ${(episode.hint.volatility60 * 100).toFixed(2)}% · 最大回撤 ${pct(episode.hint.maxDD60)}`
                            : "当前情境不附额外数据。"}
                        </p>
                      </>
                    ) : (
                      <button className="report-button"
                        onClick={() => { setReport("technical"); setReports((old) => (old.includes("technical") ? old : [...old, "technical"])); }}>
                        调阅数据官报告
                      </button>
                    )}
                  </div>
                )}
              </div>
            </SwipeCard>
          </div>
          <div className={`choices ${episode ? "market" : ""}`}>
            <button className={hold === "left" ? "lean" : ""} onClick={() => fling("left")}>
              <span aria-hidden="true">←</span>{current.left.text}
            </button>
            {episode && (
              <button className={`watch ${hold === "up" ? "lean" : ""}`} onClick={() => fling("up")}>
                <span aria-hidden="true">↑</span>观望
              </button>
            )}
            <button className={hold === "right" ? "lean" : ""} onClick={() => fling("right")}>
              {current.right.text}<span aria-hidden="true">→</span>
            </button>
          </div>
          {showHelp && (
            <p className="gesture-help">
              {episode ? "左右滑调仓 · 上滑观望" : log.length === 1 ? "按住卡片，看哪几项会动" : "拖动卡片，或点下方按钮"}
            </p>
          )}
          {demo && (
            <div className="demo-bar">
              <span>模拟路径 {demo}</span>
              <button onClick={() => { if (demo === "B" && current.report) setReports(["technical"]); fling(demoChoice(current, demo)); }}>下一步</button>
              <button onClick={() => setAuto(!auto)}>{auto ? "暂停" : "自动演示"}</button>
            </div>
          )}
        </section>
      )}
      {mode === "profile" && (
        <section className="paper-screen profile-screen">
          <div className="persona-card">
            <img className="persona-emblem" src={`./assets/art/p-${profile.persona.id}.webp`} alt="" />
            <p className="persona-kicker">本局的你，更像</p>
            <h1>{profile.persona.name}</h1>
            <p className="persona-description">{profile.persona.description}</p>
            <div className="result-summary">
              <span><b>{log.filter((d) => d.kind !== "tutorial").length}</b>条线索</span>
              <span><b>{marketsSeen}</b>次真实行情</span>
              <span><b>{profile.uncertain.length}</b>项待定</span>
            </div>
          </div>
          <button className="primary task-cta" onClick={() => setMode("task")}>
            <small>10 分钟 · 你的第一步</small>
            {recommendations.nextTask.title} →
          </button>
          <h2 className="section-title">画像 <small>点开看依据</small></h2>
          <div className="dimension-list">
            {(Object.entries(profile.dimensions) as [DimKey, typeof profile.dimensions.risk][]).map(([key, dim]) => {
              const revised = revisions.some((r) => r.dimension === key);
              return (
                <details className={`dimension ${dim.uncertain ? "is-uncertain" : ""}`} key={key}>
                  <summary>
                    <span className={`dim-kind ${dim.kind}`}>{dim.kind === "ability" ? "能力" : "偏好"}</span>
                    <strong>{dim.label}</strong>
                    <span className="dimension-score">{displayScore(dim.score)}</span>
                    <span className="dim-track">
                      {typeof dim.score === "number" && <i style={{ width: `${dim.score}%` }} />}
                    </span>
                    <span className={`confidence ${dim.confidence}`} title="线索数量">
                      {dim.uncertain ? "证据不足" : { high: "线索多", mid: "线索中", low: "线索少" }[dim.confidence]}
                    </span>
                  </summary>
                  <div className="dimension-body">
                    {dim.uncertain && <p className="uncertain">证据不足，暂不判断</p>}
                    {dim.evidence.slice(-4).map((e, i) => <p className="evidence" key={i}>{e.text}</p>)}
                    <button className="text-button revision-button" disabled={revised} onClick={() => revise(key)}>
                      {revised ? "已补充观察" : "我不是这样 →"}
                    </button>
                  </div>
                </details>
              );
            })}
          </div>
          {profile.conflicts.length > 0 && (
            <div className="conflict">
              <h3>两条线索并存</h3>
              {profile.conflicts.map((c) => <p key={c.text}>{c.text}</p>)}
            </div>
          )}
          {revisions.length > 0 && (
            <div className="revision-history">
              <h3>修正记录</h3>
              {revisions.map((r, i) => (
                <p key={i}>
                  <strong>{profile.dimensions[r.dimension].label}　{displayScore(r.before)} → {displayScore(r.after)}</strong>
                  <br />{r.reason}
                </p>
              ))}
            </div>
          )}
          <h2 className="section-title">为你挑的下一站</h2>
          <div className="recommendations">
            {recommendations.items.map((r, i) => (
              <article key={r.id}>
                <div className="resource-top">
                  <span>0{i + 1} · {r.type === "skill" ? "QuantSkills" : "PandaAI"}</span>
                  <span>{r.advanced ? "进阶 · " : ""}L{r.minLevel}</span>
                </div>
                <h3><a href={r.url} target="_blank" rel="noreferrer">{r.name} ↗</a></h3>
                <p>{r.summary}</p>
                <details>
                  <summary>为什么是它</summary>
                  <p>{r.reason}</p>
                  <small>{r.status === "reachable" ? "链接可访问" : "链接待校验"} · 等级与风格为团队标注</small>
                </details>
              </article>
            ))}
          </div>
          {recommendations.notRecommended.slice(0, 1).map((r) => (
            <p className="why-not" key={r.id}>暂不推荐：{r.reason}</p>
          ))}
          <div className="online-result-actions">
            {params.get("embed") === "vivic" && window.parent !== window ? (
              <button className="primary ghost" onClick={() => { sendToVivic(exported, window.parent); setNotice("画像已送到 Vivic 面板，点「保存三张卡」即可。"); }}>
                画像已送到 Vivic 面板 ✓
              </button>
            ) : (
              <button className="primary ghost" onClick={() => void sendProfileToVivic(exported).catch(() => setNotice("在线传送暂不可用，可复制画像 JSON 后在 Vivic 导入。"))}>
                带进 Vivic，生成三张卡 ↗
              </button>
            )}
          </div>
          <div className="export-actions">
            <button onClick={() => void share()}>保存人物卡</button>
            <button onClick={copyProfile}>复制画像</button>
            <button onClick={() => download(JSON.stringify(exported, null, 2), "quant-throne-profile.json", "application/json")}>下载 JSON</button>
          </div>
          <p className="small center">profile.v1 只含画像摘要与精选依据；人物卡不含逐卡记录。游戏测评，不构成投资建议。</p>
          <div className="result-bottom">
            <button className="text-button" onClick={() => begin()}>再掌舵一局</button>
            <button className="text-button" onClick={clear}>清除本机记录</button>
          </div>
          {demo && <p className="demo-label">以上为模拟演示路径 {demo}，非真实用户样本。</p>}
          {partnerLinks}
        </section>
      )}
      {mode === "task" && (
        <TaskView profile={profile} recommendations={recommendations} onBack={() => setMode("profile")} />
      )}
      {pending && (
        <div className="modal-backdrop sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setPending(null); }}>
          <section className="modal sheet confidence-modal" role="dialog" aria-modal="true" aria-label="选择判断信心">
            <h2>
              {pending.direction === "right" ? "加仓" : pending.direction === "left" ? "减仓" : "观望"}，有几成把握？
            </h2>
            <div className="confidence-row">
              {([[0.5, "低", "说不准"], [0.65, "中", "有依据"], [0.9, "高", "很确定"]] as const).map(([v, label, text]) => (
                <button className="option" key={v} onClick={() => commit(pending.card, pending.direction, v)}>
                  <strong>{label}</strong>
                  <span>{text}</span>
                </button>
              ))}
            </div>
            <button className="text-button" onClick={() => setPending(null)}>再看一眼</button>
          </section>
        </div>
      )}
      {reveal && (
        <div className="modal-backdrop sheet-backdrop">
          <section className={`modal sheet reveal-modal ${reveal.decision.correct === true ? "win" : reveal.decision.correct === false ? "lose" : ""}`} role="dialog" aria-modal="true" aria-label="决策揭晓">
            {reveal.episode ? (
              <>
                <div className="reveal-meta">{reveal.episode.name} · {reveal.episode.decisionDate}</div>
                <div className={`reveal-number ${reveal.episode.outcome.ret20 >= 0 ? "positive" : "negative"}`}>
                  {pct(reveal.episode.outcome.ret20)}
                  <small>后 20 日</small>
                </div>
                <p className="verdict">
                  {reveal.decision.choice === "up"
                    ? `你选择观望 · 信心 ${Math.round(reveal.decision.confidence * 100)}%`
                    : `你${reveal.decision.label} · ${reveal.decision.correct ? "方向一致" : "方向相反"}`}
                </p>
                <Chart before={reveal.episode.before} after={reveal.episode.after} />
                <details className="story">
                  <summary>当时发生了什么</summary>
                  <p>{reveal.episode.story}</p>
                  <p className="small">区间最大回撤 {pct(reveal.episode.outcome.maxDD20)}。净值按方向 × 20 日涨跌简化换算，非真实组合收益。</p>
                </details>
              </>
            ) : (
              <>
                <div className="reveal-meta">研究一问</div>
                <h2 className="verdict-title">{reveal.decision.correct ? "答对了" : "记下这个概念"}</h2>
                <p>{reveal.card.explanation}</p>
              </>
            )}
            <button className="primary" onClick={closeReveal} autoFocus>
              {log.length >= 24 && !revision ? "查看我的竹林档案" : "继续 →"}
            </button>
          </section>
        </div>
      )}
      {termEnd && (
        <div className="modal-backdrop">
          <section className="modal term-modal" role="dialog" aria-modal="true" aria-label="任期结束">
            <div className="eyebrow">第 {term} 任结束</div>
            <h2>{termEnd}</h2>
            <p>指标走到极端，工作室就会失衡。这不是答错。</p>
            <button className="primary" onClick={() => {
              setTermEnd(null);
              if (term < 2 && log.length < 24) { setTerm(term + 1); setGauges(initialGauges()); void audio.play("start"); }
              else { setMode("profile"); setAuto(false); }
            }}>
              {term < 2 && log.length < 24 ? "开始第二任" : "查看我的画像"}
            </button>
          </section>
        </div>
      )}
      {(info || settings) && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setInfo(false); setSettings(false); } }}>
          <section className="modal" role="dialog" aria-modal="true" aria-label={settings ? "声音设置" : "数据与隐私说明"}>
            <button className="close-modal" aria-label="关闭" onClick={() => { setInfo(false); setSettings(false); }}>×</button>
            {settings ? (
              <>
                <h2>声音</h2>
                {([
                  ["音效", sfx, () => { const on = !sfx; setSfx(on); audio.setSfx(on); if (on) void audio.play("button"); }, "sfx", audio.volume],
                  ["背景音乐", music, () => { const on = !music; setMusic(on); audio.setMusic(on); if (on) void audio.unlock(); }, "music", audio.musicVolume],
                  ["引导语音", voice, () => { const on = !voice; setVoice(on); audio.setVoice(on); if (on) { void audio.unlock(); void audio.playVoice("welcome", "preview-" + Date.now()); } }, "voice", audio.voiceVolume],
                ] as const).map(([name, on, toggle, bus, level]) => (
                  <div className="sound-row" key={bus}>
                    <button className={`switch ${on ? "on" : ""}`} role="switch" aria-checked={on} onClick={toggle}>
                      <span>{name}</span><i />
                    </button>
                    <input aria-label={`${name}音量`} type="range" min="0" max="10" defaultValue={Math.round(level * 10)}
                      onChange={(e) => { audio.setLevel(bus, +e.target.value); if (bus === "sfx") void audio.play("button"); }} />
                  </div>
                ))}
                <p className="small">首次点击后开始播放；切到后台自动停止。</p>
              </>
            ) : (
              <>
                <div className="eyebrow">DATA &amp; PRIVACY · 内测 0.3</div>
                <h2>每条线索，都有来处</h2>
                <h3>真实数据</h3>
                <p>Panda Data 日线，抓取于 {new Date(pack.source.fetchedAt).toLocaleString("zh-CN")}。7 段主线 + 3 段补充行情，没有模拟价格。</p>
                <p className="small">{pack.caliber}。API：get_index_daily、get_stock_daily_pre、get_trade_cal。决策时只显示决策日前的数据。</p>
                <h3>你的记录</h3>
                <p>逐卡记录只存在本机。导出与人物卡不含逐卡记录；只有你选择带入 Vivic 时才传结构化画像。</p>
                <button className="option" onClick={clear}>清除本机记录与进度</button>
                <h3>说明</h3>
                <p className="small">联合 PandaAI · 官方授权数据支持（项目负责人确认）。内测版本。游戏测评不构成投资建议；能力分不是专业测评；资源等级与风格为团队标注；模拟演示不代表真实用户。</p>
                {!nativePlatform && (
                  <a className="apk-link" href="https://edsionc.top/game/games/quant-throne/download/quant-throne.apk" target="_blank" rel="noreferrer">
                    下载 Android 内测包（测试签名）↗
                  </a>
                )}
                {partnerLinks}
              </>
            )}
          </section>
        </div>
      )}
      {online && <OnlinePanel onClose={() => setOnline(false)} taskId={recommendations.nextTask.id} />}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
