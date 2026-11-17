import type { Era, Hotspot, Site, TimelineEvent } from "@/data";

export type Language = "id" | "en";

export function localizeEvent(
  event: TimelineEvent,
  lang: Language
): {
  title: string;
  narrative: string;
  dateLabel: string;
  isFallbackId: boolean;
} {
  if (lang === "en") {
    const hasTitleEn = Boolean(event.titleEn && event.titleEn.trim().length > 0);
    const hasNarrativeEn = Boolean(event.narrativeEn && event.narrativeEn.trim().length > 0);
    return {
      title: hasTitleEn ? event.titleEn! : event.title,
      narrative: hasNarrativeEn ? event.narrativeEn! : event.narrative,
      dateLabel: event.dateLabelEn || event.dateLabel,
      isFallbackId: !hasTitleEn || !hasNarrativeEn,
    };
  }
  return {
    title: event.title,
    narrative: event.narrative,
    dateLabel: event.dateLabel,
    isFallbackId: false,
  };
}

export function localizeSite(
  site: Site,
  lang: Language
): {
  name: string;
  summary: string;
} {
  if (lang === "en") {
    return {
      name: site.nameEn || site.name,
      summary: site.summaryEn || site.summary,
    };
  }
  return {
    name: site.name,
    summary: site.summary,
  };
}

export function localizeEra(
  era: Era,
  lang: Language
): {
  name: string;
  intro: string;
} {
  if (lang === "en") {
    return {
      name: era.nameEn || era.name,
      intro: era.introEn || era.intro,
    };
  }
  return {
    name: era.name,
    intro: era.intro,
  };
}

export function localizeHotspot(
  hotspot: Hotspot,
  lang: Language
): {
  title: string;
  body: string;
} {
  if (lang === "en") {
    return {
      title: hotspot.titleEn || hotspot.title,
      body: hotspot.bodyEn || hotspot.body,
    };
  }
  return {
    title: hotspot.title,
    body: hotspot.body,
  };
}
