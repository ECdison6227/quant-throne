import pack from "../data/episodes.pack.json";
import type { Profile, Recommendations, Revision } from "./types";
export const VIVIC_ORIGIN = "https://vivic.edsionc.top";
export function exportProfile(
  profile: Profile,
  recommendations: Recommendations,
  revisions: Revision[],
  createdAt: string,
  demonstration: "A" | "B" | null = null,
) {
  // An explicit allowlist prevents future internal log fields leaking through object spreads.
  const dimensions = Object.fromEntries(
    Object.entries(profile.dimensions).map(([key, dim]) => [
      key,
      {
        kind: dim.kind,
        label: dim.label,
        score: dim.score,
        confidence: dim.confidence,
        uncertain: dim.uncertain,
        evidence: dim.evidence
          .slice(-2)
          .map(({ cardId, text, effect }) => ({ cardId, text, effect })),
      },
    ]),
  );
  return {
    schema: "pandaai.profile.v1",
    game: "quant-throne",
    version: "0.3.0",
    createdAt,
    demonstration: demonstration
      ? { path: demonstration, simulatedBehavior: true }
      : null,
    dimensions,
    conflicts: profile.conflicts,
    uncertain: profile.uncertain,
    persona: profile.persona,
    recommendations: recommendations.items.map(
      ({ id, name, url, reason, minLevel, advanced }) => ({
        id,
        name,
        url,
        reason,
        level: minLevel,
        advanced,
      }),
    ),
    notRecommended: recommendations.notRecommended,
    nextTask: recommendations.nextTask,
    revisions: revisions.map(({dimension,before,after,reason,cards})=>({dimension,before,after,reason,cards:[...cards]})),
    dataSource: {
      provider: pack.source.provider,
      fetchedAt: pack.source.fetchedAt,
      caliber: pack.caliber,
    },
    disclaimer: "游戏测评结果，不构成投资建议",
  };
}
export function sendToVivic(
  profile: ReturnType<typeof exportProfile>,
  parent: Pick<Window, "postMessage">,
) {
  parent.postMessage({ type: "pandaai.profile.v1", profile }, VIVIC_ORIGIN);
}
export function shareSummary(
  profile: Profile,
  recommendations: Recommendations,
) {
  return {
    title: "量权",
    persona: profile.persona,
    dimensions: Object.values(profile.dimensions)
      .filter((d) => !d.uncertain)
      .map((d) => ({ label: d.label, score: d.score })),
    recommendation: recommendations.items[0]?.name || "先从量化基础开始",
  };
}
