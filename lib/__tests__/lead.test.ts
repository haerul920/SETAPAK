import { describe, expect, it } from "vitest";
import { sortedEvents } from "@/data";
import { leadOf } from "@/components/objects/EventObject";

describe("leadOf", () => {
  it("tidak memotong angka berdesimal dan selalu diawali kalimat pertama narasi", () => {
    expect(leadOf("Sekitar pukul 22.00 para tokoh datang. Kalimat kedua.")).toBe("Sekitar pukul 22.00 para tokoh datang. Kalimat kedua.");
    for (const ev of sortedEvents) {
      const lead = leadOf(ev.narrative);
      expect(ev.narrative.startsWith(lead.split(" ").slice(0, 3).join(" "))).toBe(true);
      expect(lead.length).toBeGreaterThan(0);
    }
  });
});
