"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

let registered = false;

export function ensureGSAPRegistered(): void {
  if (typeof window !== "undefined" && !registered) {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
    ScrollTrigger.config({
      ignoreMobileResize: true,
    });
    registered = true;
  }
}

ensureGSAPRegistered();

export { gsap, ScrollTrigger, useGSAP };
