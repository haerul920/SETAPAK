"use client";

import { memo } from "react";
import type { Cluster } from "@/lib/layout";
import { EventObject } from "./EventObject";

/**
 * Satu klaster: peristiwa di tahun yang sama atau berdekatan tampil berdampingan pada
 * ketinggian yang sama (desktop) atau bertumpuk dengan jarak kecil (mobile).
 * Puncak klaster diletakkan sedikit di atas posisi tahunnya sehingga objek berada di garis acuan
 * saat penghitung menunjukkan tahun itu. Rentang pendek (< 120 px) tidak dibuat batang; label
 * rentangnya sudah ada di dateLabel.
 */
export const ClusterRow = memo(function ClusterRow({ cluster, objectHeight }: { cluster: Cluster; objectHeight: number }) {
  return (
    <div className="absolute inset-x-0" style={{ top: cluster.y - objectHeight * 0.35, height: cluster.height }} data-cluster={cluster.id}>
      {cluster.events.map((pe) => (
        <div key={pe.event.id} className="absolute" style={{ left: `${pe.x * 100}%`, top: pe.dy, transform: "translateX(-50%)" }}>
          <EventObject event={pe.event} y={cluster.y + pe.dy} priority={cluster.index === 0} />
        </div>
      ))}
    </div>
  );
});
