import type { Era, Hotspot, Site, TimelineEvent } from "@/data";

export type Language = "id" | "en";

export function localizeEvent(
  event: TimelineEvent,
  _lang?: Language
): {
  title: string;
  narrative: string;
  dateLabel: string;
  isFallbackId: boolean;
} {
  return {
    title: event.title,
    narrative: event.narrative,
    dateLabel: event.dateLabel,
    isFallbackId: false,
  };
}

export function localizeSite(
  site: Site,
  _lang?: Language
): {
  name: string;
  summary: string;
} {
  return {
    name: site.name,
    summary: site.summary,
  };
}

export function localizeEra(
  era: Era,
  _lang?: Language
): {
  name: string;
  intro: string;
} {
  return {
    name: era.name,
    intro: era.intro,
  };
}

export function localizeHotspot(
  hotspot: Hotspot,
  _lang?: Language
): {
  title: string;
  body: string;
} {
  return {
    title: hotspot.title,
    body: hotspot.body,
  };
}
