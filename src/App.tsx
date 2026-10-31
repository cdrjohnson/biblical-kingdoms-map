import { Page, Section, Text, Callout, Button, Segmented, Select, Toggle, Table, LinkCards, Status, useGrokTheme, useState, useEffect, useMemo, useRef } from "./kit";
import type { ChangeEvent, KeyboardEvent } from "./kit";

type Pt = [number, number];
type Poly = { pts: Pt[]; soft: boolean };
type Src = { t: string; w: string; g: string; u: string };
type KF = { a: number; b: number; polys: { d: string; soft: boolean; bw: number; c: Pt; pts: Pt[] }[]; note: string; s: string[] };
type King = { id: string; name: string; color: string; dates: string; desc: string; dis?: string; rulers: [number, number, string][]; scr: string[]; src: string[]; kf: KF[] };
type Stop = { n: string; p: Pt; ref?: string };
type Trail = { id: string; kind: string; name: string; color: string; a: number; b: number; dates: string; legs: Pt[][]; stops: Stop[]; desc: string; note?: string; scr: string[]; src: string[]; straight?: boolean };
type Cand = { key: string; text: string; p: Pt; dx: number; dy: number; anchor: "start" | "end" | "middle"; pri: number; size: number; fill: string; italic?: boolean; bold?: boolean; sp?: number; op?: number; nohalo?: boolean; hc?: string };
type Era = { id: string; name: string; a: number; b: number; text: string; scr: string[]; src: string[] };

const P = (s: string): Pt[] => s.trim().split(/\s+/).map((q): Pt => { const a = q.split(","); return [parseFloat(a[0]), parseFloat(a[1])]; });
const pl = (s: string, soft?: boolean): Poly => ({ pts: P(s), soft: !!soft });

/* ---------- projection: real lon/lat -> Mercator -> SVG units ---------- */
const LON0 = 8, LON1 = 58, LAT0 = 12, LAT1 = 44.5, W = 1000;
const SX = W / (LON1 - LON0);
const merc = (lat: number): number => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
const YT = merc(LAT1);
const H = (YT - merc(LAT0)) * SX;
const proj = (p: Pt): Pt => [(p[0] - LON0) * SX, (YT - merc(p[1])) * SX];
const f1 = (n: number): string => n.toFixed(1);
const poly = (pts: Pt[]): string => "M" + pts.map((p) => { const q = proj(p); return f1(q[0]) + " " + f1(q[1]); }).join("L") + "Z";
const line = (pts: Pt[]): string => "M" + pts.map((p) => { const q = proj(p); return f1(q[0]) + " " + f1(q[1]); }).join("L");
const smooth = (pts: Pt[]): string => {
  const q = pts.map(proj);
  if (q.length < 3) return line(pts);
  let d = "M" + f1(q[0][0]) + " " + f1(q[0][1]);
  for (let i = 0; i < q.length - 1; i++) {
    const p0 = q[Math.max(0, i - 1)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(q.length - 1, i + 2)];
    d += "C" + f1(p1[0] + (p2[0] - p0[0]) / 6) + " " + f1(p1[1] + (p2[1] - p0[1]) / 6) + " " + f1(p2[0] - (p3[0] - p1[0]) / 6) + " " + f1(p2[1] - (p3[1] - p1[1]) / 6) + " " + f1(p2[0]) + " " + f1(p2[1]);
  }
  return d;
};
const kf = (a: number, b: number, polys: Poly[], note: string, s?: string[]): KF => ({
  a, b, note, s: s || [],
  polys: polys.map((p) => {
    const q = p.pts.map(proj);
    const xs = q.map((z) => z[0]), ys = q.map((z) => z[1]);
    return { d: poly(p.pts), soft: p.soft, pts: p.pts, bw: Math.max(...xs) - Math.min(...xs), c: [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2] as Pt };
  }),
});

/* ---------- views ---------- */
const VIEWS: Record<string, { b: [number, number, number, number]; rank: number; label: string }> = {
  all: { b: [8, 58, 12, 44.5], rank: 1, label: "Whole region" },
  med: { b: [8, 40, 28, 44.5], rank: 2, label: "Mediterranean" },
  holy: { b: [32, 40, 29.4, 34.6], rank: 3, label: "Holy Land" },
  mes: { b: [36, 58, 24, 40], rank: 2, label: "Mesopotamia and Persia" },
};
/* camera: centre (cx, cy) and visible width w in map units; height = w / FA */
type Cam = { cx: number; cy: number; w: number };
const FA = 1.5, MINW = 14, MAXW = 1300;
const clampCam = (c: Cam): Cam => ({ w: Math.min(MAXW, Math.max(MINW, c.w)), cx: Math.min(W + 100, Math.max(-100, c.cx)), cy: Math.min(H + 100, Math.max(-100, c.cy)) });
const camFor = (k: string, fa: number = FA): Cam => {
  const b = VIEWS[k].b;
  const x0 = (b[0] - LON0) * SX, x1 = (b[1] - LON0) * SX, y0 = (YT - merc(b[3])) * SX, y1 = (YT - merc(b[2])) * SX;
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: Math.max(x1 - x0, (y1 - y0) * fa) * 1.03 };
};

/* ---------- geography (lon,lat) ---------- */
const MED = P("6,43.4 8,43.8 8.9,44.4 9.8,44.2 10.3,43.5 10.9,42.8 11.47,42.37 12.2,41.7 13,41.2 14,40.8 14.9,40.3 15.7,40 16,39.2 16.1,38.7 15.7,38 16.5,38.4 17.1,38.9 16.95,39.5 17.2,40.3 18.5,40.1 17.9,40.7 16.9,41.1 16.2,41.95 14.9,42.1 13.6,43.6 12.6,44.1 12.3,44.5 12.3,46 13.8,46 14.5,44.9 15.3,44 16.4,43.5 17.7,42.9 18.5,42.4 19.4,41.8 19.4,40.4 20,39.8 20.3,39.2 20.7,38.6 21.1,38.3 21.4,37.66 21.7,37 22.4,36.5 23.1,36.5 22.9,37.3 23.3,37.7 24,37.6 23.7,38.4 22.8,39 22.6,40.2 22.9,40.6 23.8,40.2 24.52,40.64 25,40.9 26.2,40.7 26.2,40.1 26.2,39.8 26.2,39.3 26.9,39 26.5,38.3 27.2,38.4 27.3,37.7 27.3,37 28.1,36.7 29.1,36.6 29.4,36.2 30.5,36.2 30.6,36.9 31.8,36.7 32.8,36 33.7,36.2 34.6,36.7 35.5,36.7 36.04,36.54 36,36 35.8,35.5 35.9,34.9 35.7,34.4 35.5,33.9 35.2,33.3 35.07,32.93 34.95,32.8 34.9,32.5 34.75,32.05 34.45,31.5 34.2,31.3 33,31.1 32.3,31.25 31.8,31.5 31,31.55 30.4,31.5 29.9,31.2 29,30.9 27.2,31.35 25.2,31.6 24,32.1 23,32.6 22,32.9 21,32.8 20.07,32.1 19.98,30.78 19,30.3 18.29,30.69 16.6,31.2 15.2,32.3 14,32.7 13.2,32.9 11.92,33.05 11,33.6 10.1,33.9 10.4,34.5 10.8,34.7 11,35.4 10.6,35.8 11,37 10.3,36.8 9.8,37.3 8.6,36.95 8,36.9 6,36.9");
const ISLANDS = [
  P("12.4,37.9 13.4,38.2 14.5,38 15.65,38.25 15.3,37.4 15.1,36.7 14.4,36.8 13,37.4"),
  P("23.5,35.3 24,35.5 25.2,35.4 26.3,35.3 26.2,35 24.9,34.95 23.6,35.1"),
  P("32.3,34.9 33,34.6 33.9,34.95 34.6,35.65 33.8,35.4 33,35.35 32.4,35.2"),
  P("8.2,40.9 8.5,41.2 9.7,41.1 9.7,40.3 9.6,39.2 8.9,38.9 8.4,39.1 8.4,40"),
  P("8.6,42.5 9.4,43 9.6,42 9.2,41.4 8.7,41.6"),
  P("27.7,36.4 28.2,36.45 28.2,35.9 27.8,35.9"),
];
const MED_D = poly(MED) + ISLANDS.map(poly).join("");
const SEAS: string[] = [
  poly(P("28.6,41.3 29.1,41.2 30.5,41.1 31.5,41.2 32.4,41.8 33.6,42 35.1,42.05 36,41.7 36.4,41.3 37.5,41.1 38.4,40.95 39.7,41 40.5,41.05 41.6,41.6 41.7,42.2 40,43.5 38.5,44.6 38.5,46 27,46 28,44.7 28.7,44.3 28,43.2 27.9,42.7 27.5,42.4 28,41.95")),
  poly(P("26.2,40.1 26.9,40.5 27.8,40.95 28.7,41 29.1,41.2 29.9,40.8 29.2,40.4 28.4,40.4 27.6,40.3 26.8,40.05")),
  poly(P("48.9,38.4 49.5,37.5 50.8,36.9 52.7,36.7 53.9,36.9 53.9,37.4 53,38.9 53,39.8 52.8,41.2 53,42 51.5,43.6 51,45 47,45 47.6,43 48.3,42.05 49,41.2 49.9,40.4 49.3,39.5 49,38.9")),
  poly(P("32.35,29.97 32.35,29.55 32.6,29.1 32.95,28.6 33.15,28.2 33.8,27.25 33.95,26.75 34.3,26.1 34.9,25.05 35.5,23.9 36.2,22.6 36.65,22.2 37.3,19.1 38.5,17.9 39.45,15.6 40.2,14.9 41.5,13.8 42.7,13 43.3,12.6 43.25,13.3 42.95,14.8 42.55,16.9 41.5,18.6 40.3,20.1 39.2,21.5 38.05,24.1 37,25.7 36.4,26.6 35.7,27.35 35.1,28 35,28.5 34.9,29.55 34.85,29.45 34.65,29 34.5,28.5 34.3,27.9 34.2,27.75 33.6,28.3 33.2,28.7 32.9,29.2 32.75,29.6")),
  poly(P("48.4,29.95 48,29.4 48.4,28.5 49.6,27 50.2,26.3 50.8,24.75 50.75,25.6 51.25,26.15 51.6,25.3 51.4,24.6 52.6,24.2 53.9,24.15 54.4,24.45 55.3,25.3 56,25.8 56.4,26.4 56.35,25.1 56.7,24.4 58.6,23.6 59.8,22.5 58.7,20.5 57.7,19.6 55.2,17.6 54.1,17 52.2,15.9 51,15.2 49.1,14.5 47,13.6 45,12.8 43.4,12.65 43.4,10 62,10 62,25 60.6,25.3 57.8,25.7 57.4,25.8 56.9,26.8 56.3,27.1 54.9,26.55 53.5,26.8 52.6,27.4 51.3,28.1 50.8,28.95 50.2,29.9 49.2,30.35 48.7,30.05")),
  poly(P("35.5,31.78 35.42,31.55 35.37,31.2 35.42,30.95 35.52,30.95 35.57,31.3 35.6,31.6 35.55,31.78")),
  poly(P("35.55,32.9 35.65,32.85 35.66,32.7 35.58,32.62 35.5,32.7 35.5,32.8")),
];
const RIVERS: { n: string; pts: Pt[] }[] = [
  { n: "Nile", pts: P("32.55,15.6 33.4,16.5 33.97,17.7 33.3,19.5 32.5,19 31.8,18.5 30.5,19.2 30.7,20.5 31.3,21.8 32.2,23 32.9,24.1 32.65,25.7 32.7,26.2 31.2,27.2 31.1,29.1 31.25,30.05") },
  { n: "", pts: P("31.25,30.05 31.1,30.5 30.8,31 30.4,31.5") },
  { n: "", pts: P("31.25,30.05 31.4,30.7 31.8,31.45") },
  { n: "Jordan", pts: P("35.65,33.25 35.6,32.9 35.58,32.7 35.55,32.4 35.5,32 35.53,31.78") },
  { n: "Euphrates", pts: P("41,39.8 39.5,39.7 38.75,38.8 38.3,38.2 38.5,37.5 38,36.9 38.5,35.85 39,35.95 40.15,35.3 40.95,34.45 42.8,33.65 43.8,33.35 44.4,32.55 45.3,31.3 46.25,31.05 47.4,31 48.5,30.1") },
  { n: "Tigris", pts: P("39.4,38.5 40.2,37.9 42.2,37.3 43.15,36.35 43.25,35.45 43.9,34.2 44.4,33.3 44.58,33.1 46,32.5 47.15,31.85 47.45,31") },
];

const CITIES: { n: string; p: Pt; r: number; e?: boolean }[] = [
  { n: "Jerusalem", p: [35.23, 31.78], r: 1 }, { n: "Samaria", p: [35.19, 32.28], r: 1, e: true }, { n: "Damascus", p: [36.3, 33.51], r: 1 }, { n: "Tyre", p: [35.2, 33.27], r: 1, e: true },
  { n: "Nineveh", p: [43.15, 36.36], r: 1 }, { n: "Babylon", p: [44.42, 32.54], r: 1 }, { n: "Susa", p: [48.24, 32.19], r: 1 }, { n: "Memphis", p: [31.25, 29.85], r: 1, e: true },
  { n: "Thebes", p: [32.66, 25.72], r: 1 }, { n: "Persepolis", p: [52.89, 29.93], r: 1 }, { n: "Ur", p: [46.1, 30.96], r: 1 }, { n: "Haran", p: [39.03, 36.86], r: 1 },
  { n: "Hattusa", p: [34.61, 40.02], r: 1 }, { n: "Rome", p: [12.5, 41.9], r: 1 }, { n: "Athens", p: [23.73, 37.98], r: 1 }, { n: "Alexandria", p: [29.92, 31.2], r: 1, e: true },
  { n: "Antioch", p: [36.16, 36.2], r: 1 }, { n: "Ephesus", p: [27.34, 37.94], r: 2, e: true }, { n: "Corinth", p: [22.88, 37.91], r: 2, e: true }, { n: "Tarsus", p: [34.89, 36.92], r: 2 },
  { n: "Gaza", p: [34.47, 31.5], r: 2, e: true }, { n: "Ashur", p: [43.26, 35.46], r: 2 }, { n: "Palmyra", p: [38.27, 34.55], r: 2 }, { n: "Ecbatana", p: [48.51, 34.8], r: 2 },
  { n: "Petra", p: [35.44, 30.33], r: 2, e: true }, { n: "Sidon", p: [35.37, 33.56], r: 2, e: true }, { n: "Caesarea", p: [34.89, 32.5], r: 2, e: true }, { n: "Byblos", p: [35.65, 34.12], r: 2, e: true },
  { n: "Hebron", p: [35.1, 31.53], r: 3, e: true }, { n: "Bethel", p: [35.22, 31.93], r: 3, e: true }, { n: "Shechem", p: [35.28, 32.21], r: 3 }, { n: "Beersheba", p: [34.84, 31.25], r: 3, e: true },
  { n: "Jericho", p: [35.46, 31.86], r: 3 }, { n: "Hazor", p: [35.57, 33.02], r: 3 }, { n: "Capernaum", p: [35.575, 32.88], r: 3 }, { n: "Nazareth", p: [35.3, 32.7], r: 3, e: true },
  { n: "Megiddo", p: [35.18, 32.58], r: 3, e: true }, { n: "Lachish", p: [34.85, 31.56], r: 3, e: true }, { n: "Joppa", p: [34.75, 32.05], r: 3, e: true }, { n: "Kadesh-barnea", p: [34.41, 30.64], r: 3 },
  { n: "Rabbah", p: [35.93, 31.95], r: 3 }, { n: "Dibon", p: [35.78, 31.5], r: 3 }, { n: "Ezion-geber", p: [34.95, 29.55], r: 3, e: true }, { n: "Bozrah", p: [35.6, 30.73], r: 3 },
];
/* finer detail shown only when zoomed in: r = zoom level at which a place appears (4 and 5 are towns) */
const C_ = (n: string, lon: number, lat: number, r: number, e?: boolean): { n: string; p: Pt; r: number; e?: boolean } => ({ n, p: [lon, lat], r, e });
const MORE = [
  C_("Bethlehem", 35.2, 31.705, 4, true), C_("Ashkelon", 34.55, 31.67, 4, true), C_("Ashdod", 34.66, 31.76, 4, true), C_("Ekron", 34.85, 31.78, 4), C_("Gath", 34.84, 31.7, 4), C_("Aphek", 34.93, 32.1, 4), C_("Dor", 34.92, 32.62, 4, true), C_("Acco (Ptolemais)", 35.07, 32.93, 4, true),
  C_("Jezreel", 35.33, 32.56, 4), C_("Beth-shan", 35.5, 32.5, 4), C_("Shiloh", 35.29, 32.06, 4), C_("Gibeon", 35.18, 31.85, 4, true), C_("Arad", 35.13, 31.28, 4, true), C_("En-gedi", 35.39, 31.46, 4, true), C_("Masada", 35.35, 31.31, 4, true),
  C_("Qumran", 35.46, 31.74, 4, true), C_("Medeba", 35.79, 31.72, 4), C_("Gerasa", 35.89, 32.28, 4), C_("Pella", 35.62, 32.45, 4), C_("Tiberias", 35.53, 32.79, 4, true), C_("Sepphoris", 35.28, 32.75, 4, true), C_("Dan", 35.65, 33.25, 4),
  C_("Bosra", 36.48, 32.52, 4), C_("Hamath", 36.75, 35.13, 4), C_("Ugarit", 35.78, 35.6, 4, true), C_("Aleppo", 37.16, 36.2, 4), C_("Carchemish", 38.0, 36.83, 4), C_("Heliopolis (On)", 31.28, 30.13, 4), C_("Tanis", 31.88, 30.98, 4),
  C_("Giza", 31.13, 29.98, 4, true), C_("Amarna", 30.9, 27.65, 4, true), C_("Abydos", 31.92, 26.18, 4, true), C_("Pelusium", 32.55, 31.05, 4), C_("Mari", 40.89, 34.55, 4), C_("Nippur", 45.23, 32.13, 4), C_("Uruk", 45.64, 31.32, 4),
  C_("Calah (Nimrud)", 43.33, 36.1, 4), C_("Arbela", 44.0, 36.19, 4), C_("Edessa", 38.79, 37.16, 4), C_("Ctesiphon", 44.58, 33.09, 4), C_("Pasargadae", 53.17, 30.2, 4), C_("Sardis", 28.04, 38.49, 4, true), C_("Pergamon", 27.18, 39.12, 4, true),
  C_("Smyrna", 27.14, 38.43, 4, true), C_("Troy", 26.24, 39.96, 4, true), C_("Iconium", 32.49, 37.87, 4), C_("Pisidian Antioch", 31.19, 38.3, 4), C_("Gordion", 31.99, 39.65, 4), C_("Thessalonica", 22.94, 40.64, 4, true),
  C_("Philippi", 24.29, 41.01, 4), C_("Delphi", 22.5, 38.48, 4, true), C_("Puteoli", 14.12, 40.82, 4), C_("Syracuse", 15.29, 37.07, 4), C_("Carthage", 10.32, 36.85, 4), C_("Cyrene", 21.86, 32.82, 4), C_("Tayma", 38.55, 27.63, 4),
  C_("Mecca", 39.83, 21.42, 4), C_("Medina", 39.61, 24.47, 4), C_("Dedan", 37.93, 26.62, 4), C_("Najran", 44.13, 17.5, 4), C_("Marib", 45.33, 15.43, 4), C_("Shabwa", 47.01, 15.37, 4),
  C_("Gezer", 34.92, 31.86, 5), C_("Beth-shemesh", 34.98, 31.75, 5, true), C_("Tirzah", 35.34, 32.3, 5), C_("Magdala", 35.52, 32.82, 5, true), C_("Bethsaida", 35.63, 32.91, 5), C_("Chorazin", 35.55, 32.91, 5, true), C_("Kedesh", 35.52, 33.1, 5, true),
  C_("Bethany", 35.26, 31.77, 5, true), C_("Machaerus", 35.64, 31.57, 5), C_("Heshbon", 35.81, 31.8, 5), C_("Kerak (Kir-hareseth)", 35.7, 31.18, 5), C_("Sais", 30.77, 30.97, 5, true), C_("Avaris / Rameses", 31.83, 30.79, 5),
];
const ALLC = CITIES.concat(MORE);
/* region names: shown from zoom level l up to level h */
const REG2: { n: string; p: Pt; l: number; h: number; sp?: number }[] = [
  { n: "Assyria", p: [43.6, 36.0], l: 2, h: 3 }, { n: "Babylonia", p: [45.0, 32.0], l: 2, h: 3 }, { n: "Media", p: [47.5, 35.6], l: 2, h: 3 }, { n: "Persis", p: [53.5, 29.4], l: 2, h: 3 }, { n: "Armenia", p: [43.5, 39.8], l: 2, h: 3 },
  { n: "Cilicia", p: [35.0, 37.25], l: 2, h: 3 }, { n: "Cappadocia", p: [35.4, 38.6], l: 2, h: 3 }, { n: "Phrygia", p: [30.3, 39.1], l: 3, h: 4 }, { n: "Galatia", p: [32.8, 39.6], l: 3, h: 4 }, { n: "Lycia", p: [29.8, 36.85], l: 3, h: 4 },
  { n: "Pontus", p: [37.5, 40.6], l: 3, h: 4 }, { n: "Asia", p: [28.2, 38.7], l: 3, h: 4 }, { n: "Macedonia", p: [22.4, 40.95], l: 2, h: 4 }, { n: "Achaia", p: [22.15, 38.1], l: 3, h: 4 }, { n: "Thrace", p: [25.8, 41.4], l: 3, h: 4 },
  { n: "Cyrenaica", p: [21.7, 32.1], l: 2, h: 4 }, { n: "Sinai", p: [33.7, 29.4], l: 2, h: 4 }, { n: "Midian", p: [36.6, 28.0], l: 2, h: 4 }, { n: "Hejaz", p: [39.6, 23.0], l: 2, h: 3 }, { n: "Saba (Yemen)", p: [45.0, 15.9], l: 2, h: 3 },
  { n: "Upper Egypt", p: [32.2, 26.4], l: 3, h: 4 }, { n: "Nile Delta", p: [31.0, 31.0], l: 2, h: 4 }, { n: "Goshen", p: [32.0, 30.6], l: 4, h: 5 }, { n: "Negev", p: [34.85, 30.85], l: 3, h: 5 },
  { n: "Galilee", p: [35.45, 32.95], l: 3, h: 5 }, { n: "Samaria (hills)", p: [35.25, 32.4], l: 4, h: 5 }, { n: "Judea", p: [35.1, 31.62], l: 3, h: 5 }, { n: "Shephelah", p: [34.93, 31.62], l: 4, h: 5 }, { n: "Sharon plain", p: [34.95, 32.3], l: 4, h: 5 },
  { n: "Jezreel Valley", p: [35.3, 32.6], l: 4, h: 5 }, { n: "Philistine plain", p: [34.7, 31.68], l: 4, h: 5 }, { n: "Gilead", p: [35.92, 32.35], l: 3, h: 5 }, { n: "Bashan", p: [36.1, 32.95], l: 3, h: 5 }, { n: "Hauran", p: [36.55, 32.75], l: 4, h: 5 },
  { n: "Moab", p: [35.95, 31.25], l: 3, h: 5 }, { n: "Edom", p: [35.7, 30.4], l: 3, h: 5 }, { n: "Ammon", p: [36.25, 31.9], l: 4, h: 5 }, { n: "Arabah", p: [35.2, 30.2], l: 4, h: 5 }, { n: "Phoenicia", p: [35.55, 33.75], l: 3, h: 5 }, { n: "Lebanon range", p: [36.0, 34.15], l: 4, h: 5 },
];
/* tribal allotments of Joshua 13 to 21, label positions only (borders not drawn); shown in the judges era when zoomed in */
const TRIBEL: { n: string; p: Pt }[] = [
  { n: "Asher", p: [35.22, 33.0] }, { n: "Naphtali", p: [35.5, 33.12] }, { n: "Zebulun", p: [35.22, 32.8] }, { n: "Issachar", p: [35.42, 32.55] }, { n: "Manasseh (west)", p: [35.05, 32.42] }, { n: "Manasseh (east)", p: [35.92, 32.7] },
  { n: "Ephraim", p: [35.2, 32.12] }, { n: "Benjamin", p: [35.32, 31.93] }, { n: "Dan (first allotment)", p: [34.85, 31.88] }, { n: "Judah", p: [35.0, 31.45] }, { n: "Simeon", p: [34.7, 31.2] },
  { n: "Gad", p: [35.88, 32.05] }, { n: "Reuben", p: [35.75, 31.5] }, { n: "Dan (after migration)", p: [35.6, 33.28] },
];
const WATERL: { n: string; p: Pt; l: number }[] = [
  { n: "Great Sea (Mediterranean)", p: [17.5, 34.4], l: 1 }, { n: "Great Sea", p: [33.4, 32.9], l: 3 }, { n: "Black Sea", p: [34, 43.4], l: 1 }, { n: "Caspian Sea", p: [49.8, 42.7], l: 1 }, { n: "Persian Gulf", p: [51.7, 26.1], l: 1 },
  { n: "Red Sea", p: [37.9, 20.6], l: 1 }, { n: "Arabian Sea", p: [54.5, 14], l: 1 }, { n: "Aegean Sea", p: [25.0, 38.9], l: 3 }, { n: "Gulf of Aqaba", p: [34.78, 28.9], l: 3 }, { n: "Gulf of Suez", p: [32.65, 28.8], l: 3 },
  { n: "Dead Sea (Salt Sea)", p: [35.62, 31.3], l: 3 }, { n: "Sea of Galilee", p: [35.7, 32.78], l: 3 },
];
/* timeline range and slider scale (slider position 0..SL maps to a year) */
const YMIN = -2000, YMAX = 2026, SL = 1000;
/* non-linear scale: the Biblical span keeps 64% of the slider; AD 100 to 1500 is compressed; 1900 to 2026 gets 24% */
const KN: [number, number][] = [[0, -2000], [640, 100], [720, 1500], [760, 1900], [1000, 2026]];
const p2y = (p: number): number => {
  const c = Math.max(0, Math.min(SL, p));
  for (let i = 1; i < KN.length; i++) { if (c <= KN[i][0]) { const a = KN[i - 1], b = KN[i]; return Math.round(a[1] + ((c - a[0]) / (b[0] - a[0])) * (b[1] - a[1])); } }
  return YMAX;
};
const y2p = (y: number): number => {
  const c = Math.max(YMIN, Math.min(YMAX, y));
  for (let i = 1; i < KN.length; i++) { if (c <= KN[i][1]) { const a = KN[i - 1], b = KN[i]; return Math.round(a[0] + ((c - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); } }
  return SL;
};

/* geography layer: ridge lines (hand-drawn mark rows), named peaks, deserts, minor rivers. All positions approximate. l = zoom level at which it appears */
type GR = { n: string; pts: Pt[]; l: number; hill?: boolean; wide?: boolean; nl?: boolean };
const GEO_R: GR[] = [
  { n: "Taurus Mts.", pts: P("30.0,37.2 31.6,37.1 33.0,36.9 34.6,37.3 36.0,37.6 37.5,37.9 39.5,38.4"), l: 1, wide: true },
  { n: "Pontic Mts.", pts: P("33.5,41.3 36.0,41.0 39.0,40.6 41.5,40.8"), l: 2, wide: true },
  { n: "Caucasus", pts: P("40.0,43.8 42.5,43.0 45.0,42.4 47.5,42.0 49.0,41.2"), l: 1, wide: true },
  { n: "Zagros Mts.", pts: P("44.5,37.6 45.4,36.3 46.5,34.7 47.9,33.3 49.5,31.8 51.0,30.3 53.0,28.5 55.5,27.0"), l: 1, wide: true },
  { n: "Elburz Mts.", pts: P("48.8,37.0 50.5,36.5 52.5,36.2 54.5,36.3 56.5,36.8"), l: 2, wide: true },
  { n: "Mt. Lebanon", pts: P("36.15,34.65 36.1,34.3 35.9,33.95 35.7,33.6"), l: 1 },
  { n: "Anti-Lebanon", pts: P("36.55,34.4 36.4,34.0 36.3,33.7 36.05,33.4"), l: 2 },
  { n: "Upper Galilee", pts: P("35.1,33.02 35.35,33.0 35.55,32.95"), l: 3, hill: true },
  { n: "Lower Galilee", pts: P("35.0,32.78 35.25,32.8 35.45,32.75"), l: 3, hill: true },
  { n: "Carmel", pts: P("34.95,32.75 35.1,32.65 35.25,32.58"), l: 3, hill: true, nl: false },
  { n: "Hills of Samaria", pts: P("35.1,32.5 35.22,32.38 35.3,32.2 35.28,32.05"), l: 3, hill: true },
  { n: "Judean hills", pts: P("35.17,31.95 35.17,31.75 35.12,31.55 35.0,31.4 34.95,31.25"), l: 3, hill: true },
  { n: "Transjordan plateau", pts: P("35.88,32.75 35.92,32.35 35.87,31.95 35.85,31.55 35.85,31.15 35.7,30.75 35.5,30.35"), l: 2, hill: true },
  { n: "Sinai mountains", pts: P("33.5,29.0 33.8,28.7 34.0,28.5 34.3,28.15"), l: 2 },
  { n: "Hejaz-Sarawat Mts.", pts: P("36.8,27.3 38.2,24.3 40.3,20.8 42.3,17.8 43.8,15.3"), l: 2 },
  { n: "Pindus", pts: P("20.8,40.6 21.3,39.5 21.9,38.7 22.4,38.2"), l: 2 },
  { n: "Apennines", pts: P("11.0,44.2 12.5,43.2 13.5,42.3 15.0,41.0 16.0,39.6"), l: 1 },
  { n: "Alps", pts: P("8.0,45.9 10.0,46.4 12.0,46.6 13.8,46.4"), l: 1, wide: true },
];
const GEO_P: { n: string; p: Pt; l: number }[] = [
  { n: "Mount Sinai? (Jebel Musa, traditional site; debated)", p: [33.975, 28.54], l: 1 }, { n: "Mt. Ararat", p: [44.3, 39.7], l: 1 }, { n: "Mt. Hermon", p: [35.85, 33.41], l: 2 }, { n: "Mt. Damavand", p: [52.11, 35.95], l: 2 },
  { n: "Mt. Etna", p: [14.99, 37.75], l: 2 }, { n: "Mt. Vesuvius", p: [14.43, 40.82], l: 2 }, { n: "Mt. Olympus", p: [22.35, 40.09], l: 2 }, { n: "Qurnat as-Sawda", p: [36.1, 34.3], l: 3 },
  { n: "Mt. Carmel", p: [35.04, 32.73], l: 3 }, { n: "Mt. Tabor", p: [35.39, 32.69], l: 3 }, { n: "Mt. Gilboa", p: [35.4, 32.48], l: 4 }, { n: "Mt. Gerizim", p: [35.27, 32.2], l: 4 },
  { n: "Mt. Nebo", p: [35.72, 31.77], l: 4 }, { n: "Mt. Meron", p: [35.41, 32.99], l: 4 }, { n: "Mount of Olives", p: [35.245, 31.78], l: 5 },
];
const cen = (pts: Pt[]): Pt => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
const DES = (n: string, s: string, l: number, nl?: boolean) => { const pts = P(s); return { n, pts, d: poly(pts), c: cen(pts), l, nl }; };
const DESERTS = [
  DES("Syrian Desert", "37.0,34.4 40.5,34.8 42.5,33.2 41.5,31.6 38.6,31.4 37.4,32.6", 1), DES("Nafud Desert", "39.0,29.6 42.0,29.6 43.2,28.0 41.6,26.8 39.6,27.4", 1),
  DES("Rub al-Khali (Empty Quarter)", "45.0,20.5 49.0,22.5 52.5,21.0 51.0,18.5 47.0,17.8", 1), DES("Western Desert", "25.0,30.0 29.5,30.0 30.2,28.0 31.0,24.5 25.0,24.5", 1),
  DES("Eastern Desert", "32.0,28.5 32.9,28.0 34.2,26.0 35.0,24.5 33.2,24.2 32.4,26.0", 2), DES("Sinai desert", "32.8,31.0 34.2,30.9 34.6,29.8 34.1,28.4 33.0,29.2 32.8,30.2", 2),
  DES("Negev", "34.4,31.25 35.1,31.0 35.2,30.1 34.85,29.65 34.5,30.3", 9, true), DES("Judean Wilderness", "35.25,31.85 35.5,31.72 35.45,31.3 35.25,31.5", 4),
  DES("Iranian deserts", "54.0,35.2 57.5,34.8 58.0,32.5 56.0,31.0 54.0,32.8", 1),
];
const RIV2: { n: string; pts: Pt[]; l: number }[] = [
  { n: "Orontes", pts: P("36.4,34.2 36.5,34.55 36.72,34.75 36.75,35.13 36.4,35.6 36.2,36.0 36.15,36.2 35.95,36.05"), l: 2 },
  { n: "Litani", pts: P("36.05,33.85 35.8,33.6 35.55,33.4 35.3,33.35 35.2,33.33"), l: 3 },
  { n: "Jabbok", pts: P("36.2,32.0 35.95,32.15 35.7,32.2 35.57,32.18"), l: 3 },
  { n: "Arnon", pts: P("36.0,31.45 35.8,31.47 35.6,31.47 35.55,31.47"), l: 3 },
  { n: "Kishon", pts: P("35.1,32.55 35.0,32.7 34.97,32.8"), l: 3 },
  { n: "Yarmuk", pts: P("36.2,32.7 35.9,32.7 35.65,32.7"), l: 4 },
  { n: "Habor (Khabur)", pts: P("40.0,36.9 40.5,36.0 40.8,35.15"), l: 3 },
  { n: "Halys", pts: P("37.0,39.7 36.0,39.4 34.7,39.6 34.4,40.5 35.0,41.0 35.9,41.7"), l: 2 },
  { n: "Greater Zab", pts: P("43.4,37.0 44.1,36.3"), l: 4 },
];
const REGIONS: { n: string; p: Pt }[] = [
  { n: "EGYPT", p: [29.6, 27] }, { n: "ARABIA", p: [42.5, 26.5] }, { n: "ANATOLIA", p: [31.5, 38.9] }, { n: "MESOPOTAMIA", p: [41.3, 35.1] },
  { n: "PERSIA", p: [51, 33.5] }, { n: "GREECE", p: [21.2, 39.4] }, { n: "ITALIA", p: [11.2, 43.3] }, { n: "LIBYA", p: [17, 28.5] }, { n: "SYRIA", p: [38.5, 33] }, { n: "NUBIA", p: [32.5, 19.5] },
];
const SEALABELS: { n: string; p: Pt }[] = [
  { n: "Great Sea (Mediterranean)", p: [17.5, 34.4] }, { n: "Black Sea", p: [34, 43.4] }, { n: "Caspian Sea", p: [49.8, 42.7] }, { n: "Persian Gulf", p: [51.7, 26.1] }, { n: "Red Sea", p: [37.9, 20.6] }, { n: "Arabian Sea", p: [54.5, 14] },
];

/* ---------- sources (every link checked this session through search results or HTTP fetch) ---------- */
const W_ = (slug: string, t: string): Src => ({ t, w: "Wikipedia (secondary; follow its citations)", g: "Wikipedia articles", u: "https://en.wikipedia.org/wiki/" + slug });
const B_ = (path: string, t: string): Src => ({ t: "Britannica: " + t, w: "Encyclopaedia Britannica (Scholars edition)", g: "Encyclopedias", u: "https://kids.britannica.com/scholars/" + path });
const S: Record<string, Src> = {
  carta: { t: "The Carta Bible Atlas, 5th ed. (Aharoni, Avi-Yonah, Rainey, Notley, Safrai)", w: "Carta Jerusalem, 2011", g: "Bible atlases", u: "https://store.carta-jerusalem.com/49-the-carta-bible-atlas-5th-revised-and-updated-edition-9789652208149.html" },
  sacred: { t: "The Sacred Bridge: Carta's Atlas of the Biblical World (Rainey and Notley)", w: "Carta Jerusalem", g: "Bible atlases", u: "https://store.carta-jerusalem.com/50-the-sacred-bridge-9789652208491.html" },
  oba: { t: "Oxford Bible Atlas, 4th ed. (ed. Adrian Curtis)", w: "Oxford University Press, 2007", g: "Bible atlases", u: "https://doi.org/10.1093/acref/9780191001581.001.0001" },
  brEgypt: { t: "Britannica: ancient Egypt", w: "Encyclopaedia Britannica", g: "Encyclopedias", u: "https://www.britannica.com/place/ancient-Egypt" },
  brAssyria: B_("article/Assyria/9959", "Assyria"), brBab: B_("article/Babylonia/11620", "Babylonia"), brNeoBab: B_("article/Neo-Babylonian-empire/641599", "Neo-Babylonian empire"),
  brCyrus: B_("article/Cyrus-the-Great/28433", "Cyrus the Great"), brDarius: B_("article/Darius-I/28778", "Darius I"), brAch: B_("article/Achaemenian-Dynasty/3517", "Achaemenian dynasty"),
  brSel: B_("article/Seleucid-empire/66667", "Seleucid empire"), brPtol: B_("article/Ptolemaic-dynasty/641962", "Ptolemaic dynasty"), brMacc: B_("article/Maccabees/49631", "Maccabees"),
  brExodus: B_("article/Exodus/33435", "Exodus"), brMoses: B_("article/Moses/108742", "Moses"), brPaul: B_("article/St-Paul-the-Apostle/108605", "St. Paul the Apostle"),
  brPaulMap: B_("assembly/view/101994", "Missionary travels of St. Paul (map)"), brAbr: { t: "Britannica: Abraham", w: "Encyclopaedia Britannica (Students)", g: "Encyclopedias", u: "https://kids.britannica.com/students/article/Abraham/272688" },
  brJesus: B_("article/Jesus/106456", "Jesus"), brGalilee: B_("article/Galilee/35869", "Galilee"), brCapt: B_("article/Babylonian-Captivity/11622", "Babylonian Captivity"),
  brNeh: B_("article/Nehemiah/55197", "Nehemiah"), brEzra: B_("article/Ezra/33496", "Ezra"), brDav: B_("assembly/view/3078", "Palestine under David and Solomon (map)"),
  brPhil: B_("article/Philistine/59701", "Philistine"), brEdom: B_("article/Edom/32019", "Edom"), brMoab: B_("article/Moab/472882", "Moab"), brAmmon: B_("article/Ammonite/7202", "Ammonite"),
  brAram: B_("article/Aram/471772", "Aram"), brHerod: B_("article/Herod/40191", "Herod"), brNab: B_("article/Nabataean/54597", "Nabataean"),
  metAch: { t: "The Achaemenid Persian Empire (550-330 B.C.)", w: "The Metropolitan Museum of Art", g: "Museum and other essays", u: "https://www.metmuseum.org/essays/the-achaemenid-persian-empire-550-330-b-c" },
  metSel: { t: "The Seleucid Empire (323-64 B.C.)", w: "The Metropolitan Museum of Art", g: "Museum and other essays", u: "https://www.metmuseum.org/essays/the-seleucid-empire-323-64-b-c" },
  metTrade: { t: "Trade between the Romans and the Empires of Asia", w: "The Metropolitan Museum of Art", g: "Museum and other essays", u: "https://www.metmuseum.org/essays/trade-between-the-romans-and-the-empires-of-asia" },
  bmAss: { t: "Introducing the Assyrians", w: "British Museum", g: "Museum and other essays", u: "https://www.britishmuseum.org/blog/introducing-assyrians" },
  wIJ: W_("Ancient_Israel_and_Judah", "Ancient Israel and Judah"), wIsr: W_("Kingdom_of_Israel_(Samaria)", "Kingdom of Israel (Samaria)"), wJud: W_("Kingdom_of_Judah", "Kingdom of Judah"),
  wUM: W_("Kingdom_of_Israel_(united_monarchy)", "United monarchy"), wAram: W_("Aram-Damascus", "Aram-Damascus"), wPhil: W_("Philistines", "Philistines"), wMoab: W_("Moab", "Moab"), wEdom: W_("Edom", "Edom"),
  wAmmon: W_("Ammon", "Ammon"), wPhoen: W_("Phoenicia", "Phoenicia"), wHitt: W_("Hittites", "Hittites"), wMedes: W_("Median_Empire", "Median Empire"), wLydia: W_("Lydia", "Lydia"), wElam: W_("Elam", "Elam"),
  wUr3: W_("Third_Dynasty_of_Ur", "Third Dynasty of Ur"), wOB: W_("Old_Babylonian_Period", "Old Babylonian Period"), wHam: W_("Hammurabi", "Hammurabi"), wKass: W_("Kassites", "Kassites"),
  wOA: W_("Old_Assyrian_Period", "Old Assyrian Period"), wMA: W_("Middle_Assyrian_Empire", "Middle Assyrian Empire"), wNA: W_("Neo-Assyrian_Empire", "Neo-Assyrian Empire"), wNB: W_("Neo-Babylonian_Empire", "Neo-Babylonian Empire"),
  wAch: W_("Achaemenid_Empire", "Achaemenid Empire"), wSel: W_("Seleucid_Empire", "Seleucid Empire"), wPtol: W_("Ptolemaic_Kingdom", "Ptolemaic Kingdom"), wHasm: W_("Hasmonean_dynasty", "Hasmonean dynasty"),
  wHerod: W_("Herodian_kingdom", "Herodian kingdom"), wRomE: W_("Roman_Empire", "Roman Empire"), wRomR: W_("Roman_Republic", "Roman Republic"), wJudea: W_("Judaea_(Roman_province)", "Judaea (Roman province)"),
  wNab: W_("Nabataean_Kingdom", "Nabataean Kingdom"), wParth: W_("Parthian_Empire", "Parthian Empire"), wMK: W_("Middle_Kingdom_of_Egypt", "Middle Kingdom of Egypt"), wSIP: W_("Second_Intermediate_Period_of_Egypt", "Second Intermediate Period"),
  wNK: W_("New_Kingdom_of_Egypt", "New Kingdom of Egypt"), wTIP: W_("Third_Intermediate_Period_of_Egypt", "Third Intermediate Period"), wLate: W_("Late_Period_of_ancient_Egypt", "Late Period of Egypt"),
  wSea: W_("Sea_Peoples", "Sea Peoples"), wMern: W_("Merneptah_Stele", "Merneptah Stele"), wMesha: W_("Mesha_Stele", "Mesha Stele"), wDan: W_("Tel_Dan_Stele", "Tel Dan Stele"),
  wSenn: W_("Sennacherib%27s_Annals", "Sennacherib's Annals"), wQarqar: W_("Battle_of_Qarqar", "Battle of Qarqar"), wJudges: W_("Book_of_Judges", "Book of Judges"), wExodus: W_("Exodus", "Exodus"),
  wAbr: W_("Abraham", "Abraham"), wChron: W_("Biblical_chronology", "Biblical chronology"), wJChron: W_("Chronology_of_Jesus", "Chronology of Jesus"), wMin: W_("Ministry_of_Jesus", "Ministry of Jesus"),
  wPaul: W_("Paul_the_Apostle", "Paul the Apostle"), wReturn: W_("Return_to_Zion", "Return to Zion"), wEzra: W_("Ezra", "Ezra"), wNeh: W_("Nehemiah", "Nehemiah"), wCapt: W_("Babylonian_captivity", "Babylonian captivity"),
  wViaM: W_("Via_Maris", "Via Maris"), wKH: W_("King%27s_Highway_(ancient)", "King's Highway (ancient)"), wInc: W_("Incense_trade_route", "Incense trade route"), wSilk: W_("Silk_Road", "Silk Road"),
  wAlex: W_("Alexander_the_Great", "Alexander the Great"), wDiad: W_("Wars_of_the_Diadochi", "Wars of the Diadochi"), wMaccRev: W_("Maccabean_Revolt", "Maccabean Revolt"), wSiege63: W_("Siege_of_Jerusalem_(63_BC)", "Siege of Jerusalem (63 BC)"),
  wPanium: W_("Battle_of_Panium", "Battle of Panium"), wFJRW: W_("First_Jewish%E2%80%93Roman_War", "First Jewish-Roman War"), wAgrippaII: W_("Herod_Agrippa_II", "Herod Agrippa II"), wHerodG: W_("Herod_the_Great", "Herod the Great"),
  wAntipas: W_("Herod_Antipas", "Herod Antipas"), wAgrippaI: W_("Herod_Agrippa_I", "Herod Agrippa I"), wPilate: W_("Pontius_Pilate", "Pontius Pilate"), wCarch: W_("Battle_of_Carchemish", "Battle of Carchemish"),
  wFallNin: W_("Fall_of_Nineveh", "Fall of Nineveh"), wAssCapt: W_("Assyrian_captivity", "Assyrian captivity"), wAssEg: W_("Assyrian_conquest_of_Egypt", "Assyrian conquest of Egypt"), wShosh: W_("Shoshenq_I", "Shoshenq I"),
  wCylinder: W_("Cyrus_Cylinder", "Cyrus Cylinder"), wSinai: W_("Mount_Sinai_(Bible)", "Mount Sinai (Bible)"), wHell: W_("Hellenistic_period", "Hellenistic period"), wHezekiah: W_("Hezekiah", "Hezekiah"), wJosiah: W_("Josiah", "Josiah"),
  wCanaan: W_("Canaan", "Canaan"), wGaug: W_("Battle_of_Gaugamela", "Battle of Gaugamela"), wApamea: W_("Treaty_of_Apamea", "Treaty of Apamea"), wHist: W_("Historicity_of_the_Bible", "Historicity of the Bible"),
  wMitanni: W_("Mitanni", "Mitanni"), wUr: W_("Ur", "Ur"), wHarran: W_("Harran", "Harran"), wIdumea: W_("Idumea", "Idumea"), wSyria: W_("Roman_Syria", "Roman Syria"),
  /* later periods */
  wSas: W_("Sasanian_Empire", "Sasanian Empire"), wByz: W_("Byzantine_Empire", "Byzantine Empire"), wRash: W_("Rashidun_Caliphate", "Rashidun Caliphate"), wUmay: W_("Umayyad_Caliphate", "Umayyad Caliphate"), wAbb: W_("Abbasid_Caliphate", "Abbasid Caliphate"),
  wFat: W_("Fatimid_Caliphate", "Fatimid Caliphate"), wSelj: W_("Seljuk_Empire", "Seljuk Empire"), wGSelj: W_("Great_Seljuk_Empire", "Great Seljuk Empire"), wCrus: W_("Crusader_states", "Crusader states"), wKJer: W_("Kingdom_of_Jerusalem", "Kingdom of Jerusalem"),
  wAyy: W_("Ayyubid_dynasty", "Ayyubid dynasty"), wMam: W_("Mamluk_Sultanate", "Mamluk Sultanate"), wOtt: W_("Ottoman_Empire", "Ottoman Empire"), wSyriaPal: W_("Syria_Palaestina", "Syria Palaestina"), wBarK: W_("Bar_Kokhba_revolt", "Bar Kokhba revolt"),
  wMusl: W_("Muslim_conquest_of_the_Levant", "Muslim conquest of the Levant"), wBSW: W_("Byzantine%E2%80%93Sasanian_War_of_602%E2%80%93628", "Byzantine-Sasanian War of 602 to 628"), wMPers: W_("Muslim_conquest_of_Persia", "Muslim conquest of Persia"), wMEgy: W_("Muslim_conquest_of_Egypt", "Muslim conquest of Egypt"),
  wManz: W_("Battle_of_Manzikert", "Battle of Manzikert"), wConst: W_("Fall_of_Constantinople", "Fall of Constantinople"), wLatinE: W_("Latin_Empire", "Latin Empire"), wHattin: W_("Battle_of_Hattin", "Battle of Hattin"), wAcre: W_("Siege_of_Acre_(1291)", "Siege of Acre (1291)"),
  wSelimI: W_("Selim_I", "Selim I"), wOMW: W_("Ottoman%E2%80%93Mamluk_War_(1516%E2%80%931517)", "Ottoman-Mamluk War (1516 to 1517)"), wKhed: W_("Khedivate_of_Egypt", "Khedivate of Egypt"), wAEW: W_("Anglo-Egyptian_War", "Anglo-Egyptian War (1882)"),
  wSykes: W_("Sykes%E2%80%93Picot_Agreement", "Sykes-Picot Agreement"), wBalf: W_("Balfour_Declaration", "Balfour Declaration"), wSanR: W_("San_Remo_conference", "San Remo conference"), wLaus: W_("Treaty_of_Lausanne", "Treaty of Lausanne"),
  wMandP: W_("Mandatory_Palestine", "Mandatory Palestine"), wTrans: W_("Emirate_of_Transjordan", "Emirate of Transjordan"), wFrM: W_("French_Mandate_for_Syria_and_the_Lebanon", "French Mandate for Syria and the Lebanon"), wGrLeb: W_("Greater_Lebanon", "Greater Lebanon"),
  wMIraq: W_("Mandatory_Iraq", "Mandatory Iraq"), wKIraq: W_("Kingdom_of_Iraq", "Kingdom of Iraq"), wSaudi: W_("Saudi_Arabia", "Saudi Arabia"), wKEgypt: W_("Kingdom_of_Egypt", "Kingdom of Egypt"), wSaf: W_("Safavid_Iran", "Safavid Iran"), wQaj: W_("Qajar_Iran", "Qajar Iran"),
  wHistTr: W_("History_of_Turkey", "History of Turkey"), wTL46: W_("Treaty_of_London_(1946)", "Treaty of London (1946)"), wPart: W_("United_Nations_Partition_Plan_for_Palestine", "United Nations Partition Plan for Palestine"),
  w48: W_("1948_Arab%E2%80%93Israeli_War", "1948 Arab-Israeli War"), wArm: W_("1949_Armistice_Agreements", "1949 Armistice Agreements"), wGreen: W_("Green_Line_(Israel)", "Green Line (Israel)"), wJordAnn: W_("Jordanian_annexation_of_the_West_Bank", "Jordanian annexation of the West Bank"),
  wSDW: W_("Six_Day_War", "Six-Day War"), wSinaiOcc: W_("Israeli_occupation_of_the_Sinai_Peninsula", "Israeli occupation of the Sinai Peninsula"), wEIT: W_("Egypt%E2%80%93Israel_peace_treaty", "Egypt-Israel peace treaty"), wCamp: W_("Camp_David_Accords", "Camp David Accords"),
  wGolan: W_("Golan_Heights", "Golan Heights"), wGolanLaw: W_("Golan_Heights_Law", "Golan Heights Law"), wJerLaw: W_("Jerusalem_Law", "Jerusalem Law"), wIJT: W_("Israel%E2%80%93Jordan_peace_treaty", "Israel-Jordan peace treaty"),
  wOslo: W_("Oslo_Accords", "Oslo Accords"), wOslo2: W_("Oslo_II_Accord", "Oslo II Accord"), wGazaJ: W_("Gaza%E2%80%93Jericho_Agreement", "Gaza-Jericho Agreement"), wAreaC: W_("Area_C_(West_Bank)", "Area C (West Bank)"), wDisen: W_("Israeli_disengagement_from_Gaza", "Israeli disengagement from Gaza"),
  wGaza: W_("Gaza_Strip", "Gaza Strip"), wWB: W_("West_Bank", "West Bank"), wStPal: W_("State_of_Palestine", "State of Palestine"),
  /* geography layer */
  wTaurus: W_("Taurus_Mountains", "Taurus Mountains"), wZagros: W_("Zagros_Mountains", "Zagros Mountains"), wMtLeb: W_("Mount_Lebanon", "Mount Lebanon"), wAntiLeb: W_("Anti-Lebanon_Mountains", "Anti-Lebanon Mountains"), wHermon: W_("Mount_Hermon", "Mount Hermon"),
  wCarmel: W_("Mount_Carmel", "Mount Carmel"), wTabor: W_("Mount_Tabor", "Mount Tabor"), wJudMts: W_("Judaean_Mountains", "Judaean Mountains"), wSamHills: W_("Samarian_Hills", "Samarian Hills"), wTransj: W_("Transjordan_(region)", "Transjordan (region)"),
  wSyrDes: W_("Syrian_Desert", "Syrian Desert"), wNegev: W_("Negev", "Negev"), wSinaiP: W_("Sinai_Peninsula", "Sinai Peninsula"), wOrontes: W_("Orontes_River", "Orontes River"), wLitani: W_("Litani_River", "Litani River"), wZarqa: W_("Zarqa_River", "Zarqa River (biblical Jabbok)"),
  wMujib: W_("Wadi_Mujib", "Wadi Mujib (biblical Arnon)"), wKishon: W_("Kishon_River", "Kishon River"), wDeadSea: W_("Dead_Sea", "Dead Sea"), wGalSea: W_("Sea_of_Galilee", "Sea of Galilee"), wDelta: W_("Nile_Delta", "Nile Delta"), wJordR: W_("Jordan_River", "Jordan River"),
  wElburz: W_("Elburz", "Alborz (Elburz)"), wPontic: W_("Pontic_Mountains", "Pontic Mountains"), wSarawat: W_("Sarawat_Mountains", "Sarawat Mountains"), wJebelMusa: W_("Jebel_Musa", "Jebel Musa"), wNebo: W_("Mount_Nebo", "Mount Nebo"), wAraratM: W_("Mount_Ararat", "Mount Ararat"),
  wRubK: W_("Rub_al_Khali", "Rub' al Khali"), wWDes: W_("Western_Desert_(Egypt)", "Western Desert (Egypt)"), wJudDes: W_("Judaean_Desert", "Judaean Desert"), wKavir: W_("Dasht-e_Kavir", "Dasht-e Kavir"), wNefud: W_("Nefud_Desert", "Nefud Desert"),
  /* encyclopedia, later periods */
  brOtt: B_("article/Ottoman-Empire/111081", "Ottoman Empire"), brByz: B_("article/Byzantine-Empire/106111", "Byzantine Empire"), brSas: B_("article/Sasanian-dynasty/65824", "Sasanian dynasty"), brCrus: B_("article/Crusades/110241", "Crusades"), brKJer: B_("article/kingdom-of-Jerusalem/43563", "kingdom of Jerusalem"),
  brPal: B_("article/Palestine/108522", "Palestine (region)"), brCamp: B_("article/Camp-David-Accords/19831", "Camp David Accords"), brOslo: B_("article/Oslo-Accords/634577", "Oslo Accords"), brAIW: B_("article/Arab-Israeli-wars/8143", "Arab-Israeli wars"), brSinaiP: B_("article/Sinai-Peninsula/67889", "Sinai Peninsula"),
  brUmay: B_("article/Umayyad-dynasty/74193", "Umayyad dynasty"), brCal: B_("article/Caliphate/18681", "Caliphate"), brAbb: B_("article/%CA%BFAbbasid-caliphate/3236", "Abbasid caliphate"), brFat: B_("article/Fatimid-dynasty/33823", "Fatimid dynasty"), brMam: B_("article/Mamluk/50404", "Mamluk"),
  brSelj: B_("article/Seljuq/66688", "Seljuq"), brAyy: B_("article/Ayyubid-dynasty/11523", "Ayyubid dynasty"),
  /* UN documents, treaty texts, UN reports */
  unGA181: { t: "UN General Assembly resolution 181 (II), Future government of Palestine (partition plan), 29 November 1947", w: "United Nations document A/RES/181(II)", g: "UN documents and treaty texts", u: "https://undocs.org/A/RES/181(II)" },
  unGA181t: { t: "Palestine plan of partition with economic union: resolution 181 (II) (text with the plan's description of the boundaries)", w: "UN Question of Palestine (UNISPAL)", g: "UN documents and treaty texts", u: "https://www.un.org/unispal/document/auto-insert-185393/" },
  unSC242: { t: "UN Security Council resolution 242 (1967), 22 November 1967", w: "United Nations document S/RES/242(1967)", g: "UN documents and treaty texts", u: "https://undocs.org/S/RES/242(1967)" },
  avSC242: { t: "UN Security Council Resolution 242 (text)", w: "Avalon Project, Yale Law School", g: "UN documents and treaty texts", u: "https://avalon.law.yale.edu/20th_century/un242.asp" },
  avSC338: { t: "UN Security Council Resolution 338 (text), 1973", w: "Avalon Project, Yale Law School", g: "UN documents and treaty texts", u: "https://avalon.law.yale.edu/20th_century/un338.asp" },
  unSC478: { t: "UN Security Council resolution 478 (1980), on the status of Jerusalem", w: "UN Digital Library", g: "UN documents and treaty texts", u: "https://digitallibrary.un.org/record/25618?ln=en" },
  unSC497: { t: "UN Security Council resolution 497 (1981), on the Golan Heights", w: "United Nations document S/RES/497(1981)", g: "UN documents and treaty texts", u: "https://docs.un.org/en/S/RES/497(1981)" },
  avMandate: { t: "The Palestine Mandate (League of Nations, 24 July 1922)", w: "Avalon Project, Yale Law School", g: "UN documents and treaty texts", u: "https://avalon.law.yale.edu/20th_century/palmanda.asp" },
  avArm1: { t: "Egyptian-Israeli General Armistice Agreement, 24 February 1949", w: "Avalon Project, Yale Law School", g: "UN documents and treaty texts", u: "https://avalon.law.yale.edu/20th_century/arm01.asp" },
  avArm2: { t: "Lebanese-Israeli General Armistice Agreement, 23 March 1949", w: "Avalon Project, Yale Law School", g: "UN documents and treaty texts", u: "https://avalon.law.yale.edu/20th_century/arm02.asp" },
  avArm3: { t: "Jordanian-Israeli General Armistice Agreement, 3 April 1949", w: "Avalon Project, Yale Law School", g: "UN documents and treaty texts", u: "https://avalon.law.yale.edu/20th_century/arm03.asp" },
  avArm4: { t: "Israeli-Syrian General Armistice Agreement, 20 July 1949", w: "Avalon Project, Yale Law School", g: "UN documents and treaty texts", u: "https://avalon.law.yale.edu/20th_century/arm04.asp" },
  avEgIsr: { t: "Israel-Egypt Treaty of Peace, 26 March 1979 (text)", w: "Avalon Project, Yale Law School", g: "UN documents and treaty texts", u: "https://avalon.law.yale.edu/20th_century/isregypt.asp" },
  peaceDOP: { t: "Declaration of Principles on Interim Self-Government Arrangements (Oslo Accords), 13 September 1993", w: "UN Peacemaker", g: "UN documents and treaty texts", u: "https://peacemaker.un.org/en/node/9432" },
  unDOPt: { t: "Declaration of Principles, official text as circulated to the UN (A/48/486, S/26560)", w: "UN Question of Palestine (UNISPAL)", g: "UN documents and treaty texts", u: "https://www.un.org/unispal/document/auto-insert-195501/" },
  peaceOsloII: { t: "Israeli-Palestinian Interim Agreement on the West Bank and the Gaza Strip (Oslo II), 28 September 1995", w: "UN Peacemaker", g: "UN documents and treaty texts", u: "https://peacemaker.un.org/en/node/9434" },
  peaceJor: { t: "Treaty of Peace between the State of Israel and the Hashemite Kingdom of Jordan, 26 October 1994", w: "UN Peacemaker", g: "UN documents and treaty texts", u: "https://peacemaker.un.org/en/node/9431" },
  unispalH: { t: "Origins and evolution of the Palestine problem, Part I (1917 to 1947)", w: "UN Question of Palestine (UNISPAL)", g: "UN documents and treaty texts", u: "https://www.un.org/unispal/history2/origins-and-evolution-of-the-palestine-problem/part-i-1917-1947/" },
  ocha26: { t: "Humanitarian Situation Report, 15 October 2026 (Gaza Strip and West Bank)", w: "UN OCHA occupied Palestinian territory", g: "UN documents and treaty texts", u: "https://www.ochaopt.org/content/humanitarian-situation-report-15-october-2026" },
  unNews26: { t: "'Where do we go?': How Israel's 'yellow line' is closing in on Palestinians (September 2026)", w: "UN News", g: "UN documents and treaty texts", u: "https://news.un.org/en/story/2026/09/1168320" },
  ckNE: { t: "Natural Earth 1:10m land and country polygons", w: "Natural Earth (public domain); used to draw coasts and modern borders", g: "Reference maps and data checked", u: "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/" },
  ckPleiades: { t: "Pleiades: a gazetteer of past places (ancient place coordinates)", w: "Pleiades, CC BY 3.0; used to check city coordinates", g: "Reference maps and data checked", u: "https://pleiades.stoa.org/" },
  ckCr35: { t: "Map Crusader states 1135-en.svg", w: "MapMaster, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_Crusader_states_1135-en.svg" },
  ckCr90: { t: "Map Crusader states 1190-en.svg", w: "MapMaster, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_Crusader_states_1190-en.svg" },
  ckSelj92: { t: "Map of the Seljuk Empire (1092).png", w: "Ktrinko and MapMaster, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_of_the_Seljuk_Empire_(1092).png" },
  ckRash: { t: "Rashidun expansion 632-661.png", w: "Geworg D. Baboomian, CC0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Rashidun_expansion_632-661.png" },
  ckCal750: { t: "Caliphate 750.jpg", w: "W. R. Shepherd, Historical Atlas (1911), public domain, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Caliphate_750.jpg" },
  ckAbb850: { t: "Abbasid Caliphate 850AD.png", w: "Cattette, CC BY 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Abbasid_Caliphate_850AD.png" },
  ckByz565: { t: "Byzantime Empire around 565 AD.svg", w: "Public domain (after ArdadN), Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Byzantime_Empire_around_565_AD.svg" },
  ckByz717: { t: "717 byzantium (no asia minor).PNG", w: "Gabr-el, public domain, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:717_byzantium_(no_asia_minor).PNG" },
  ckByz1025: { t: "Map Byzantine Empire 1025-pl.svg", w: "N\u00e9cropotame and Cplakidas, CC BY 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_Byzantine_Empire_1025-pl.svg" },
  ckByz1076: { t: "Map Byzantine Empire 1076-fr.svg", w: "Odejea, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_Byzantine_Empire_1076-fr.svg" },
  ckByz1265: { t: "Byzantine Empire 1265 AD.png", w: "Ichthyovenator, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Byzantine_Empire_1265_AD.png" },
  ckByz1355: { t: "Byzantine empire 1355.jpg", w: "W. R. Shepherd, public domain, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Byzantine_empire_1355.jpg" },
  ckIs830: { t: "Kingdoms around Israel 830 map.svg", w: "CC BY-SA 3.0, Wikimedia Commons (after Oldtidens Israel)", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Kingdoms_around_Israel_830_map.svg" },
  ckAss: { t: "Neo-Assyrian map 824-671 BC.png", w: "Nigyou, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Neo-Assyrian_map_824-671_BC.png" },
  ckNab: { t: "Neo-Babylonian Empire under Nabonidus map.png", w: "Ichthyovenator (S\u00e9mhur base map), CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Neo-Babylonian_Empire_under_Nabonidus_map.png" },
  ckAch: { t: "Achaemenid Empire En.svg", w: "Anton Gutsunaev and Uirauna, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Achaemenid_Empire_En.svg" },
  ckRome: { t: "Extent of the Roman Republic and the Roman Empire between 218 BC and 117 AD.png", w: "Varana, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Extent_of_the_Roman_Republic_and_the_Roman_Empire_between_218_BC_and_117_AD.png" },
  ckSaf: { t: "Safavid Empire 1501 1722 AD.png", w: "Arab League (English Wikipedia), public domain, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Safavid_Empire_1501_1722_AD.png" },
  ckZand: { t: "Map of the Zand dynasty.png", w: "Arab League and Arab Hafez, edited by HistoryofIran; public domain, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_of_the_Zand_dynasty.png" },
  ckAfs: { t: "Afsharid dynasty (greatest extent).svg", w: "Ali Zifan, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Afsharid_dynasty_(greatest_extent).svg" },
  ckFat: { t: "Fatimid Caliphate.PNG", w: "Omar-toons, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Fatimid_Caliphate.PNG" },
  ckFat2: { t: "Fatimid Islamic Caliphate.png", w: "Yenemus (English Wikipedia), public domain, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Fatimid_Islamic_Caliphate.png" },
  ckAyy93: { t: "Ayyubid Sultanate 1193 AD.jpg", w: "Ro4444, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Ayyubid_Sultanate_1193_AD.jpg" },
  ckAyy88: { t: "Ayyubid Greatest Extent 1188.png", w: "Arab League (original), altered version, public domain, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Ayyubid_Greatest_Extent_1188.png" },
  ckMam17: { t: "Mamluk Sultanate of Cairo 1317 AD.jpg", w: "Ro4444, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Mamluk_Sultanate_of_Cairo_1317_AD.jpg" },
  wKCyp: W_("Kingdom_of_Cyprus", "Kingdom of Cyprus"),
  wEzion: W_("Ezion-Geber", "Ezion-Geber"),
  ckHit: { t: "Map Hittite rule en.svg (maximum area of Hittite rule, and the rule c. 1350 to 1300 BC)", w: "Sémhur base map, Ikonact, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_Hittite_rule_en.svg" },
  ckMit: { t: "Carte du Mitanni.png (Mitanni at its maximal extension, with its heartland)", w: "Sémhur base map, Zunkir, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Carte_du_Mitanni.png" },
  ckNK: { t: "Hitt Egypt 1450 bc.svg (the Egyptian Empire c. 1450 BC)", w: "ArdadN, public domain, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Hitt_Egypt_1450_bc.svg" },
  ckMKE: { t: "Ancient Egypt old and middle kingdom-en.svg (the Old Kingdom area, the fertile Nile, and Lower Nubia annexed in the Middle Kingdom)", w: "RedTony, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Ancient_Egypt_old_and_middle_kingdom-en.svg" },
  ckTIP: { t: "Third Intermediate Period map.svg (the Delta and Valley split among local rulers)", w: "Jeff Dahl, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Third_Intermediate_Period_map.svg" },
  ckKush: { t: "Egypt kush.svg (the Kushite Empire, a blurred schematic)", w: "Lommes, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Egypt_kush.svg" },
  ckMed: { t: "Median Empire-en.svg (the Median Empire at its height)", w: "Szajci and WillemBK, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Median_Empire-en.svg" },
  ckMedB: { t: "Median Empire.svg (a second Median map that disagrees: smaller in the west)", w: "Crates, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Median_Empire.svg" },
  ckLyd: { t: "Lydian kingdom-pt.svg (Lydia under Croesus)", w: "Szajci, CC BY 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Lydian_kingdom-pt.svg" },
  ckPar94: { t: "Map of the Parthian Empire under Mithridates II.svg (the empire in 94 BC)", w: "Ro4444 (original) and a Commons editor, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_of_the_Parthian_Empire_under_Mithridates_II.svg" },
  ckParFr: { t: "Map Parthian Empire-fr.png (an undated extent of the empire; no title or legend on the image)", w: "Fabienkhan, CC BY-SA 2.5, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_Parthian_Empire-fr.png" },
  ckSel: { t: "Seleucid Empire 200-64 BC - ru.svg (the state c. 200 BC, after Apamea in 188 BC, c. 100 BC and before 64 BC)", w: "Kaidor, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Seleucid_Empire_200-64_BC_-_ru.svg" },
  ckPtol: { t: "Ptolemaic Kingdom III-II century BC.svg (Egypt in the 3rd and 2nd centuries BC)", w: "Kaidor, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Ptolemaic_Kingdom_III-II_century_BC_-_ru.svg" },
  ckHasm: { t: "Map Hasmonean Kingdom-es.svg (annexations from Judas Maccabeus to Alexander Jannaeus)", w: "Redtony, CC BY-SA 3.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Map_Hasmonean_Kingdom-es.svg" },
  ckHyr2: { t: "Hyrcanus II Map.png (Judea after Pompey, a simplified illustration)", w: "Rh0809, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Hyrcanus_II_Map.png" },
  ckHerod: { t: "Herodian Kingdom.png (a simplified illustration)", w: "Rh0809, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Herodian_Kingdom.png" },
  ckNab85: { t: "Nabatean Kingdom map.jpg (limits of the kingdom at its maximal extension, around 85 BC)", w: "F. Villeneuve and L. Nehm\u00e9 (IFPO), CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Nabatean_Kingdom_map.jpg" },
  ckB05: { t: "Biblica Open Bible Map 05, The Twelve Tribes of Israel (tribal allotments)", w: "Biblica, Inc. and Biblica Open Study Bible Resources, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Biblica_Open_Bible_Map_05_The_Twelve_Tribes_of_Israel.png" },
  ckB06: { t: "Biblica Open Bible Map 06, The Kingdoms of Saul, David and Solomon", w: "Biblica, Inc. and Biblica Open Study Bible Resources, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Biblica_Open_Bible_Map_06_The_Kingdoms_of_Saul_David_and_Solomon.png" },
  ckB07: { t: "Biblica Open Bible Map 07, The Kingdoms of Israel and Judah", w: "Biblica, Inc. and Biblica Open Study Bible Resources, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Biblica_Open_Bible_Map_07_The_Kingdoms_of_Israel_and_Judah.png" },
  ckPhil: { t: "Philistie Fer II.svg (Philistine sites, Iron Age I and II)", w: "Zunkir, on Eric Gaba's relief base, CC BY-SA 4.0, Wikimedia Commons", g: "Reference maps and data checked", u: "https://commons.wikimedia.org/wiki/File:Philistie_Fer_II.svg" },
  wRiseOtt: W_("Rise_of_the_Ottoman_Empire", "Rise of the Ottoman Empire"),
  wInterreg: W_("Ottoman_Interregnum", "Ottoman Interregnum"),
  wAfsh: W_("Afsharid_dynasty", "Afsharid dynasty"),
  wZand: W_("Zand_dynasty", "Zand dynasty"),
  wHotak: W_("Hotak_dynasty", "Hotak dynasty"),
  wTurkm: W_("Treaty_of_Turkmenchay", "Treaty of Turkmenchay"),
  wAmasya: W_("Peace_of_Amasya", "Peace of Amasya"),
  wCons1590: W_("Treaty_of_Constantinople_(1590)", "Treaty of Constantinople (1590)"),
  wZuhab: W_("Treaty_of_Zuhab", "Treaty of Zuhab (1639)"),
  wChald: W_("Battle_of_Chaldiran", "Battle of Chaldiran"),
  wLachishL: W_("Lachish_letters", "Lachish letters"),
  wJaffa29: W_("Treaty_of_Jaffa_(1229)", "Treaty of Jaffa (1229)"),
  wAcre91: W_("Siege_of_Acre_(1291)", "Siege of Acre (1291)"),
  wKomn: W_("Komnenian_restoration", "Komnenian restoration"),
  wNicaea: W_("Empire_of_Nicaea", "Empire of Nicaea"),
  wJustRec: W_("Reconquest_of_Italy_by_Justinian", "Reconquest of Italy by Justinian"),
  wBSW2: W_("Byzantine%E2%80%93Sasanian_War_of_602%E2%80%93628", "Byzantine\u2013Sasanian War of 602 to 628"),
};
/* ---------- city and town entries (details panel). Years use the page convention: -586 = 586 BC. Third value 1 = approximate. ---------- */
type CEv = [number, string, number?];
type CInfo = { a: string; m: string; c: string; d: string; ev: CEv[]; bib?: string; scr: string[]; src: string[]; minor?: boolean };
const CT: Record<string, string> = {
  IL: "Israel", WB: "West Bank (status disputed)", GZ: "Gaza Strip (status disputed)", JO: "Jordan", LB: "Lebanon", SY: "Syria", TR: "Turkey", IQ: "Iraq", IR: "Iran", EG: "Egypt", GR: "Greece", IT: "Italy",
  SA: "Saudi Arabia", YE: "Yemen", TN: "Tunisia", LY: "Libya", TSB: "Turkey-Syria border area", AIB: "Jordan-Israel border area (Aqaba-Eilat)",
  JER: "Jerusalem: administered by Israel, which treats it as its capital; Palestinians claim East Jerusalem as the capital of a future state, and the UN Security Council (resolution 478, 1980) declared Israel's measures changing the city's status null and void. Status disputed.",
};
const CINFO: Record<string, CInfo> = {};
const addC = (n: string, a: string, m: string, ct: string, d: string, ev: CEv[], scr: string[], bib: string, src: string[]) => { CINFO[n] = { a, m, c: CT[ct] || ct, d, ev, scr, bib, src }; };
const mn = (n: string, a: string, m: string, ct: string, d: string, slug: string, scr: string, ev: CEv[]) => { CINFO[n] = { a, m, c: CT[ct] || ct, d, ev, scr: scr ? scr.split(";") : [], src: [slug], minor: true }; };
/* archaeology: excavations, dated finds, what they show, and whether the identification is certain or debated; sources are Wikipedia article slugs opened and checked */
type Arch = { sites: string; id: string; idn: string; finds: string[][]; src: string[] };
const DIG: Record<string, Arch> = {};
const addA = (n: string, sites: string, id: string, idn: string, finds: string[][], src: string[]) => { DIG[n] = { sites, id, idn, finds, src }; };
addA("Jerusalem", "City of David ridge (R. A. S. Macalister 1923 to 1925; Kathleen Kenyon 1961 to 1967; Yigal Shiloh 1978 to 1985; Ronny Reich and Eli Shukron 1995 onward; Eilat Mazar 2005 onward); Jewish Quarter (Nahman Avigad 1969 to 1978). The Temple Mount itself has not been excavated.", "Certain", "The city has kept its name and site. What is debated is the size and character of the 10th century BC city, not where it stood.", [
  ["c. 1350 BC", "Amarna letters from Abdi-Heba of Urusalim", "Clay tablets found in Egypt show a Canaanite city-state with its own king that appealed to Pharaoh, so a city stood here before David."],
  ["10th c. BC (debated)", "'Large Stone Structure' and the claimed palace of David", "Eilat Mazar identified a monumental building as David's palace (2005); others date it earlier or later. Whether it proves a powerful united monarchy is disputed."],
  ["8th c. BC", "Broad Wall in the Jewish Quarter (Avigad)", "A wall about 7 m thick around the western hill shows the city expanding sharply, often linked to refugees after 722 BC and to Hezekiah's defences (2 Chronicles 32:5)."],
  ["c. 700 BC", "Siloam Tunnel and its Hebrew inscription (found 1880)", "A tunnel of about 530 m brought spring water inside the walls; the inscription describes the two digging teams meeting. It is usually connected with Hezekiah (2 Kings 20:20)."],
  ["586 BC", "Burnt buildings and arrowheads in the City of David", "Shiloh's excavations found burnt houses and arrowheads of the type used by the Babylonian army, matching the destruction described in 2 Kings 25."],
  ["AD 70", "Burnt House and toppled stones", "Burnt houses of the Herodian city in the Jewish Quarter agree in outline with Josephus's account of the Roman destruction."]
], ["City_of_David_(archaeological_site)", "Amarna_letters", "Large_Stone_Structure", "Broad_Wall_(Jerusalem)", "Siloam_inscription", "Hezekiah%27s_Tunnel", "Burnt_House"]);
addA("Samaria", "Harvard Expedition (George Reisner, Clarence Fisher and others, 1908 to 1910); Joint Expedition (John Crowfoot, Kathleen Kenyon and others, 1931 to 1935).", "Certain", "The village of Sebastia keeps the name of Herod's Sebaste, and the hill matches the account of Omri's purchase (1 Kings 16:24).", [
  ["9th c. BC", "Royal quarter on the summit", "Fine ashlar masonry and a walled acropolis fit the founding of Omri's capital; the exact phasing is debated."],
  ["9th to 8th c. BC", "Carved ivory panels", "Phoenician-style ivories show the luxury behind 1 Kings 22:39 ('the house of ivory') and Amos 6:4."],
  ["8th c. BC", "Samaria ostraca", "About 100 inscribed potsherds record deliveries of wine and oil, showing an administration in the northern kingdom."],
  ["c. 722 BC", "Assyrian-period layers", "Evidence for the Assyrian conquest and settlement is consistent with 2 Kings 17 and with Sargon II's claims."],
  ["c. 27 BC", "Temple of Augustus and Roman Sebaste", "Herod's temple platform and city show the rebuilding named in Josephus."]
], ["Samaria_(ancient_city)", "Samaria_ostraca", "Sargon_II"]);
addA("Shechem", "Tell Balata: Ernst Sellin (1913 to 1914, 1926 to 1927); G. Ernest Wright, Lawrence Toombs and others (Drew-McCormick expedition, 1956 to 1973).", "Certain", "Tell Balata beside Nablus is accepted as Shechem. The 'Sychar' of John 4:5 is a separate, debated identification.", [
  ["14th c. BC", "Amarna letters of Lab'ayu", "The letters show a local ruler based at Shechem who controlled much of the hill country."],
  ["c. 1650 BC", "Middle Bronze fortifications and 'Fortress Temple'", "One of the largest temples known from Canaan; some link a later phase with the 'house of El-berith' (Judges 9:4, 46), which is a proposal, not a proof."],
  ["c. 1100 BC", "Destruction level", "A burnt level fits Abimelech's destruction of the city (Judges 9:45) but the link is uncertain."],
  ["c. 107 BC", "Destruction by John Hyrcanus", "The end of the Hellenistic city agrees with Josephus."]
], ["Tell_Balata", "Shechem", "Amarna_letters"]);
addA("Hebron", "Tell Rumeida (Philip Hammond 1964 to 1966; later Israeli teams in the 1980s). The Herodian enclosure of the Cave of the Patriarchs is a standing monument, not excavated beneath.", "Certain for the city; not verifiable for the tomb", "Tell Rumeida is generally accepted as Bronze and Iron Age Hebron. No excavation has identified the burials of the patriarchs.", [
  ["c. 1750 BC", "Middle Bronze city wall on Tell Rumeida", "A fortified Canaanite town existed in the period traditionally linked with the patriarchs."],
  ["8th to 7th c. BC", "lmlk ('belonging to the king') jar handles", "Royal jar stamps naming Hebron, with Ziph, Socoh and one more town, record Judah's royal administration, usually dated to Hezekiah's reign."],
  ["1st c. BC", "Herodian walls of the Cave of the Patriarchs", "Herod's massive enclosure shows the site was already revered; the tradition is older than the building."]
], ["Tel_Rumeida", "Lmlk_seal", "Cave_of_the_Patriarchs"]);
addA("Bethlehem", "Ancient Bethlehem lies under the modern town and is little excavated. The main excavated monument is the Church of the Nativity (work under the floor in the 1930s).", "Certain for the town; the birthplace is a tradition", "The town is secure. Archaeology cannot prove or disprove the cave of the Nativity, only that it was venerated by the 4th century.", [
  ["c. AD 330 to 339", "Constantine's basilica over the venerated cave", "Remains of the first church show the site was already treated as the birthplace of Jesus in the early 4th century."],
  ["AD 6th c.", "Justinian's rebuilding", "The standing basilica largely dates from this rebuilding; the church is a UNESCO World Heritage Site."]
], ["Church_of_the_Nativity", "Bethlehem"]);
addA("Nazareth", "Franciscan work by Bellarmino Bagatti beneath the Church of the Annunciation (1950s to 1960s); Yardenna Alexandre for the Israel Antiquities Authority (2006 to 2009); Ken Dark's Nazareth Archaeological Project at the Sisters of Nazareth convent (2006 to 2015).", "Certain for the town; debated for particular houses", "The town's location is certain. Which buildings stood in Jesus's day, and how large the village was, are debated.", [
  ["1st c. BC to 1st c. AD", "Cisterns, silos, wine presses and terraces", "Remains of a small farming village on the hillside, consistent with the Gospels' picture of an obscure place."],
  ["1st c. AD", "Excavated dwelling (announced 2009)", "The IAA described walls, a courtyard and pottery of the early Roman period as the first dwelling of that date found in Nazareth. No link to Jesus's family can be shown."],
  ["1st c. AD", "Rock-cut burial caves", "Tombs around the village reflect Jewish burial customs of the period."]
], ["Nazareth", "Church_of_the_Annunciation"]);
addA("Capernaum", "Gaudenzio Orfali (1921); Virgilio Corbo and Stanislao Loffreda for the Franciscans (1968 to 1986); earlier German work by Kohl and Watzinger (1905 to 1907).", "Certain for the site; debated for particular buildings", "Tell Hum is accepted as Capernaum (Kfar Nahum). Whether a venerated house was Peter's and when the synagogue was built are debated.", [
  ["1st c. AD", "Basalt house block with a venerated room (the 'House of Peter')", "Corbo found a room that was plastered and revered early; the Franciscans identify it as Peter's house, which is a tradition, not provable."],
  ["4th to 5th c. AD (debated)", "White limestone synagogue", "Built over earlier basalt walls; the excavators dated it to the 4th century, while pottery and coin evidence led others to the 5th, so it is not the synagogue of the Gospels."],
  ["5th c. AD", "Octagonal church over the house", "Shows the room was treated as holy by the Byzantine period."]
], ["Capernaum"]);
addA("Jericho", "Tell es-Sultan: Ernst Sellin and Carl Watzinger (1907 to 1909); John Garstang (1930 to 1936); Kathleen Kenyon (1952 to 1958); Italian-Palestinian expedition (1997 onward). Hasmonean and Herodian palaces at Tulul Abu el-Alayiq (Ehud Netzer, 1973 to 1987).", "Certain for the site; the conquest in Joshua 6 is debated", "Tell es-Sultan is accepted as Jericho. Whether the walls fell as in Joshua 6 is disputed because the dating of the destruction layers is.", [
  ["c. 8000 BC", "Neolithic stone tower and wall", "Among the earliest monumental structures known, showing settled life here long before the Bible."],
  ["c. 1550 BC (debated)", "Last Bronze Age destruction (City IV)", "Kenyon dated it to c. 1550 BC and found little Late Bronze occupation; Garstang dated it c. 1400 BC and others have supported that. Radiocarbon work points to the 16th century. The date matters for linking it to Joshua."],
  ["1st c. BC", "Hasmonean and Herodian winter palaces", "Palaces with pools and a theatre agree with Josephus on Herod's building at Jericho."]
], ["Tell_es-Sultan", "Jericho", "Tulul_Abu_el-Alayiq"]);
addA("Megiddo", "University of Chicago Oriental Institute (1925 to 1939); Yigael Yadin (1960s); Tel Aviv University expedition (Israel Finkelstein, David Ussishkin and others, 1992 onward).", "Certain", "Tell el-Mutesellim is accepted as Megiddo. The debate is over the date of its Iron Age buildings.", [
  ["1457 BC", "Thutmose III's siege (Karnak records)", "Egyptian annals describe the capture of Megiddo in detail, one of the earliest well-documented battles."],
  ["14th to 12th c. BC", "Carved ivories from the Late Bronze palace", "Show the wealth and Egyptian and Aegean contacts of a Canaanite city-state."],
  ["10th c. BC (debated)", "Six-chambered gate and palaces", "Yadin attributed them to Solomon (1 Kings 9:15); Finkelstein and others redate them to the 9th century (Omri and Ahab). This is the 'high versus low chronology' dispute."],
  ["c. 925 BC", "Fragment of a stele of Shoshenq I", "Supports the campaign of the pharaoh usually identified with Shishak (1 Kings 14:25)."]
], ["Tel_Megiddo", "Battle_of_Megiddo_(15th_century_BC)", "Shoshenq_I"]);
addA("Hazor", "Yigael Yadin (1955 to 1958, 1968 to 1969); Amnon Ben-Tor for the Hebrew University (1990 to 2017).", "Certain", "Tel Hazor is accepted as Hazor and is named in the Mari and Amarna texts.", [
  ["c. 1700 to 1300 BC", "Large Canaanite lower city, palace and temples", "The largest city in Canaan supports Joshua 11:10, which calls Hazor 'the head of all those kingdoms'."],
  ["c. 1300 to 1200 BC (debated)", "Destruction by fire, with defaced statues", "Yadin and Ben-Tor linked it to the Israelite conquest (Joshua 11:11); others point to Canaanite rivals, Egypt or the Sea Peoples."],
  ["10th c. BC (debated)", "Casemate wall and six-chambered gate (Stratum X)", "Yadin attributed them to Solomon (1 Kings 9:15); the dating is disputed, as at Megiddo."],
  ["732 BC", "Destruction by Tiglath-pileser III", "Matches 2 Kings 15:29."]
], ["Tel_Hazor", "Amarna_letters"]);
addA("Dan", "Avraham Biran (1966 to 1999), continued by Hebrew Union College teams.", "Certain", "Tel Dan is accepted as Laish, later Dan (Judges 18:29).", [
  ["c. 1750 BC", "Mudbrick arched gate", "One of the oldest known arched gates, from the Canaanite city of Laish."],
  ["c. 850 BC", "Tel Dan Stele", "Aramaic victory inscription found in 1993 and 1994 that most scholars read as naming the 'House of David', the earliest mention of David's dynasty outside the Bible. A few scholars dispute the reading."],
  ["9th c. BC", "Israelite cultic platform and gate complex", "Consistent with the shrine set up at Dan in 1 Kings 12:29, though the link is an interpretation."],
  ["3rd to 2nd c. BC", "Greek and Aramaic dedication 'to the god who is in Dan'", "Shows worship continued here into the Hellenistic period."]
], ["Tel_Dan", "Tel_Dan_Stele"]);
addA("Beersheba", "Tel Beersheba: Yohanan Aharoni (1969 to 1976) for Tel Aviv University.", "Certain for Iron Age Beersheba; the patriarchal wells cannot be located", "Tel Beersheba is accepted as the Judahite town. Its earlier layers do not show a Bronze Age city, so the patriarchal stories cannot be placed from archaeology.", [
  ["10th to 8th c. BC", "Planned town with gate, storehouses and water system", "A fortified Judahite border town fits the phrase 'from Dan to Beersheba' (Judges 20:1)."],
  ["8th c. BC (debated)", "Horned altar of dressed stones, re-used in a wall", "The dismantling is sometimes linked with the reforms of Hezekiah (2 Kings 18:4), but this is debated."],
  ["c. 701 BC", "Destruction of Stratum II", "Usually attributed to Sennacherib's campaign in Judah."]
], ["Tel_Be%27er_Sheva", "Beersheba"]);
addA("Ashkelon", "Leon Levy Expedition (Lawrence Stager 1985 to 2006, then Daniel Master to 2016); earlier John Garstang (1920 to 1921).", "Certain", "Tel Ashkelon on the coast is accepted as the Philistine city.", [
  ["c. 1850 to 1550 BC", "Canaanite port with huge earthen ramparts", "Shows a large fortified harbour city in the Middle Bronze Age."],
  ["c. 1550 BC", "Silver-plated bronze calf in a shrine", "Calf imagery is found in Canaanite religion, the background of the 'calf' stories in the Bible."],
  ["12th to 8th c. BC", "Philistine houses, pottery and a cemetery", "A Philistine burial ground was found in 2016, and DNA studies on early Iron Age burials found European-linked ancestry that faded in a few generations."]
], ["Ashkelon", "Philistines"]);
addA("Ashdod", "Moshe Dothan (1962 to 1972).", "Certain", "Tel Ashdod is accepted as the Philistine city.", [
  ["12th c. BC", "Mycenaean-style local pottery and the 'Ashdoda' figurine", "A seated goddess figurine mixing Aegean and Canaanite forms supports an Aegean element in Philistine culture."],
  ["712 BC", "Fragments of a stele of Sargon II (found 1963)", "The Assyrian monument for the capture of Ashdod matches Isaiah 20:1, the only biblical mention of Sargon by name."]
], ["Ashdod", "Tel_Ashdod", "Sargon_II"]);
addA("Joppa", "Jacob Kaplan (1955 to 1974); the Jaffa Cultural Heritage Project (Aaron Burke, 2007 onward).", "Certain", "Old Jaffa has kept the name Yafo.", [
  ["c. 1450 BC", "Egyptian tale of the capture of Joppa (Papyrus Harris 500)", "A literary story of Thutmose III's general taking the town shows Egyptian interest in the port."],
  ["13th c. BC", "Gate of Ramesses II and Egyptian fortress", "Excavation uncovered an Egyptian fortified gateway, showing Egyptian rule of the port in the Late Bronze Age."]
], ["Jaffa", "Capture_of_Joppa", "Papyrus_Harris_500"]);
addA("Caesarea", "Italian expedition (1959 to 1960); Joint Expedition (Robert Bull, Kenneth Holum and others, from 1971); Caesarea Ancient Harbour Excavation Project (Avner Raban, Robert Hohlfelder, from 1980).", "Certain", "Caesarea Maritima is accepted as Herod's foundation and the Roman capital of Judaea.", [
  ["22 to 10 BC", "Herod's harbour Sebastos, theatre, palace and aqueduct", "Underwater work shows great concrete harbour works poured into the sea, confirming Josephus's description."],
  ["AD 26 to 36", "The Pilate Stone (found 1961 in the theatre)", "A Latin dedication naming Pontius Pilate as prefect of Judaea, reused in a later building; the best-known inscription naming him."]
], ["Caesarea_Maritima", "Pilate_stone", "Sebastos"]);
addA("Tyre", "Lebanese Department of Antiquities (Maurice Chehab, 1947 to 1975, and later teams) on the island city and at the Al-Bass cemetery; UNESCO World Heritage Site (1984).", "Certain", "Tyre has kept its name and its site.", [
  ["10th to 8th c. BC", "Al-Bass Phoenician cremation cemetery", "Burial urns from the age of Hiram I (1 Kings 5) show the wealth and trade of Phoenician Tyre."],
  ["332 BC", "Alexander's causeway", "His siege mole turned the island into a peninsula, still seen in the shoreline; Arrian and Diodorus describe the siege."],
  ["2nd to 3rd c. AD", "Roman hippodrome, arch and necropolis", "Show the scale of the Roman city."]
], ["Tyre,_Lebanon"]);
addA("Sidon", "Temple of Eshmun (Maurice Dunand, 1963 onward); British Museum Sidon excavations (Claude Doumet-Serhal, 1998 onward).", "Certain", "Sidon has kept its name and site.", [
  ["7th to 4th c. BC", "Temple of Eshmun", "A Phoenician sanctuary of the healing god, rebuilt by Sidonian kings and used into Roman times."],
  ["6th to 5th c. BC", "Sarcophagi of Tabnit and Eshmunazar II", "Phoenician inscriptions name Sidon's kings under Persian rule and curse anyone who disturbs the tombs."]
], ["Sidon", "Eshmun", "Tabnit", "Sarcophagus_of_Eshmunazar_II"]);
addA("Damascus", "Mostly beneath the modern city, so little can be excavated; the Old City is a UNESCO World Heritage Site (1979). The Umayyad Mosque stands on a Roman temple of Jupiter.", "Certain", "Damascus is among the oldest continuously inhabited cities, with the same name.", [
  ["2nd millennium BC", "Egyptian lists name Dimashqa", "Shows Damascus was a known town long before the Aramean kingdom."],
  ["c. 850 BC", "Stele of Bar-Hadad (Melqart stele)", "Found near Aleppo; names an Aramean king usually identified with the Ben-Hadad of 1 Kings 15:18-20 (which Ben-Hadad is debated)."],
  ["Roman period", "Line of the Straight Street", "The street named in Acts 9:11 survives in the Old City's main east-west axis."]
], ["Damascus", "Ancient_City_of_Damascus", "Melqart_stele"]);
addA("Antioch", "Princeton University-led Committee for the Excavation of Antioch (1932 to 1939) with the Louvre and others; the city lies under modern Antakya.", "Certain", "Antakya is accepted as Antioch on the Orontes.", [
  ["2nd to 6th c. AD", "Mosaics of villas and baths", "Hundreds of mosaics (now in Antakya, the Louvre and US museums) show the wealth of a city among the largest in the Roman Empire."],
  ["6th c. AD (debated)", "Chalice of Antioch", "Once claimed to be the Holy Grail; scholars date it to the 4th to 6th century and the Grail claim has no support."]
], ["Antioch", "Chalice_of_Antioch"]);
addA("Babylon", "German Oriental Society under Robert Koldewey (1899 to 1917); Iraqi State Board of Antiquities (from the 1950s); UNESCO World Heritage Site (2019).", "Certain", "The mounds at Hillah are accepted as Babylon.", [
  ["c. 575 BC", "Ishtar Gate and Processional Way", "The glazed-brick gate of Nebuchadnezzar II shows the city of Daniel 4:30 ('Is not this great Babylon?'); it was rebuilt in Berlin."],
  ["597 BC", "Babylonian chronicle (BM 21946)", "A cuneiform tablet records the capture of Jerusalem in Adar of Nebuchadnezzar's seventh year, matching 2 Kings 24:10-17."],
  ["c. 592 BC", "Ration tablets naming Jehoiachin of Judah", "Found by Koldewey; record oil for the king of Judah and his sons, matching 2 Kings 25:27-30."],
  ["6th c. BC (debated)", "Etemenanki ziggurat foundation", "The huge tower base is often linked with the Tower of Babel; the link is a proposal."],
  ["Debated", "Hanging Gardens", "No remains have been found at Babylon; Stephanie Dalley argued they were at Nineveh."]
], ["Babylon", "Ishtar_Gate", "Jerusalem_Chronicle", "Jehoiachin%27s_Rations_Tablets", "Etemenanki", "Hanging_Gardens_of_Babylon"]);
addA("Nineveh", "Austen Henry Layard (1845 to 1851); Hormuzd Rassam (1850s); George Smith (1870s); Leonard King and R. Campbell Thompson (early 1900s); Iraqi teams since; damaged by ISIL in 2014 to 2016.", "Certain", "Kuyunjik and Nabi Yunus beside Mosul are accepted as Nineveh.", [
  ["c. 700 BC", "Lachish reliefs from Sennacherib's palace", "Wall reliefs of the siege of Lachish (British Museum) match 2 Kings 18:13-17 and the destruction found at Lachish."],
  ["c. 691 BC", "Taylor Prism", "Sennacherib's annals claim Hezekiah was shut up 'like a bird in a cage' and paid tribute; 2 Kings 18-19 tells the end of the siege differently."],
  ["7th c. BC", "Library of Ashurbanipal", "About 30,000 tablets, including the Epic of Gilgamesh with its flood story, a Mesopotamian parallel to Genesis 6 to 9."],
  ["612 BC", "Fall of Nineveh", "Burnt palace layers and the Babylonian chronicle record the fall foretold in Nahum."]
], ["Nineveh", "Lachish_reliefs", "Taylor_Prism", "Library_of_Ashurbanipal", "Fall_of_Nineveh"]);
addA("Ur", "Leonard Woolley for the British Museum and the Penn Museum (1922 to 1934).", "Debated", "Tell el-Muqayyar is certainly the Sumerian city of Ur. Whether it is the 'Ur of the Chaldeans' of Genesis 11:28 is debated: some scholars propose Urfa in the north, and Chaldeans are attested only from about 900 BC.", [
  ["c. 2600 to 2500 BC", "Royal Cemetery and the tomb of Queen Puabi", "About 1,800 burials, including royal tombs rich in gold and lapis, show Sumerian wealth long before Abraham's traditional date."],
  ["c. 2500 BC", "Standard of Ur", "A mosaic box showing war and banquet scenes, a source for Sumerian society."],
  ["c. 2100 BC", "Great Ziggurat", "The temple tower of the moon-god Nanna built by Ur-Nammu, one of the best preserved in Mesopotamia."],
  ["1929", "Woolley's 'flood layer'", "Woolley claimed it as evidence of the Genesis flood; later work shows it was a local flood."]
], ["Ur", "Royal_Cemetery_at_Ur", "Standard_of_Ur", "Great_Ziggurat_of_Ur"]);
addA("Haran", "British excavations led by Seton Lloyd with William Brice (1950s); Turkish teams since the 2000s; much of the site is unexcavated.", "Certain", "Modern Harran in Turkey keeps the name and is generally taken to be the Haran of Genesis 11:31.", [
  ["6th c. BC", "Stelae of Adda-guppi, mother of Nabonidus", "Found in 1956 at the Great Mosque; they describe the moon-god Sin's temple in Harran and Nabonidus's rebuilding of it."],
  ["8th c. AD", "Umayyad Great Mosque", "Remains of one of the oldest mosques in Anatolia."]
], ["Harran"]);
addA("Susa", "French Delegation in Persia: Marcel Dieulafoy (1884 to 1886), Jacques de Morgan (1897 to 1912), Roland de Mecquenem, Roman Ghirshman; Iranian teams since.", "Certain", "Shush in Khuzestan is accepted as Shushan (Esther 1:2; Daniel 8:2). The biblical palace is usually placed at the Persian Apadana.", [
  ["c. 1750 BC", "Stele of the Code of Hammurabi (found 1901)", "Carried to Susa as Elamite war booty; its laws are often compared with Exodus 21 to 22."],
  ["c. 515 BC", "Palace of Darius I and his foundation text", "The text lists materials and workers from across the empire, including Lebanese cedar and Ionian craftsmen, and gives the setting of Esther and Nehemiah 1:1."]
], ["Susa", "Code_of_Hammurabi", "Apadana"]);
addA("Persepolis", "Ernst Herzfeld (1931 to 1934); Erich Schmidt for the University of Chicago Oriental Institute (1934 to 1939); Italian and Iranian teams since.", "Certain", "Persepolis is not named in the Bible. It is listed as the ceremonial centre of the empire that ruled Judah after Cyrus (Ezra 1 and 6).", [
  ["c. 518 to 450 BC", "Terrace, Apadana and reliefs", "Reliefs show delegations from across the empire bringing gifts, giving the imperial setting of Ezra and Nehemiah."],
  ["509 to 493 BC", "Persepolis Fortification Tablets", "Thousands of Elamite tablets record rations and travel in the empire's administration, a background to the decrees in Ezra."],
  ["330 BC (debated)", "Burning by Alexander", "Ash and burnt layers match ancient accounts; whether the fire was deliberate is debated."]
], ["Persepolis", "Persepolis_Fortification_Archive", "Apadana"]);
addA("Memphis", "W. M. Flinders Petrie (1908 to 1913); the Egypt Exploration Society and the University of Pennsylvania; the Saqqara necropolis beside it.", "Certain", "Mit Rahina is accepted as Memphis, the biblical Noph (Isaiah 19:13; Jeremiah 44:1).", [
  ["c. 1250 BC", "Colossus of Ramesses II and the Ptah temple", "Shows Ramesses II's building in the northern capital. Exodus 1:11 names Pithom and Raamses, not Memphis."],
  ["New Kingdom to Late Period", "Serapeum of Saqqara", "Burials of sacred Apis bulls show the cult of Ptah at Memphis."],
  ["Old Kingdom", "Memphite pyramid fields", "The necropolis stretching from Giza to Dahshur lies behind the 'Memphis shall bury them' of Hosea 9:6."]
], ["Memphis,_Egypt", "Colossus_of_Ramesses_II", "Serapeum_of_Saqqara"]);
addA("Thebes", "Karnak and Luxor temples (Georges Legrain from 1895; Franco-Egyptian Centre since 1967); Valley of the Kings (Howard Carter, 1922).", "Certain", "Luxor and Karnak are accepted as Thebes, the 'No' and 'No-Amon' of Nahum 3:8 and Ezekiel 30:14-16.", [
  ["c. 1208 BC", "Merneptah Stele (found 1896 by Petrie)", "The earliest known mention of 'Israel' outside the Bible, naming it as a people in Canaan; what 'Israel' meant then is debated."],
  ["c. 925 BC", "Bubastite Portal at Karnak", "Shoshenq I's list of towns he claimed includes Megiddo. He is usually identified with Shishak (1 Kings 14:25), though Jerusalem is not preserved on the list."],
  ["663 BC", "Assyrian sack of Thebes", "Ashurbanipal's records of the sack are the background of Nahum 3:8-10."]
], ["Thebes,_Egypt", "Merneptah_Stele", "Bubastite_Portal", "Karnak"]);
addA("Alexandria", "Underwater work in the harbour (Jean-Yves Empereur and Franck Goddio from the 1990s); the Polish Centre of Mediterranean Archaeology at Kom el-Dikka (from 1960); the modern city covers most of the ancient one.", "Certain", "Alexandria has kept its name and site. The location of the Great Library is not certain.", [
  ["3rd c. BC", "Pharos lighthouse blocks on the seabed", "Huge granite blocks and statues found near Fort Qaitbay are thought to belong to the Pharos, one of the Seven Wonders."],
  ["3rd c. BC (debated)", "The Library and Museum", "No certain remains have been identified. The library is the setting of the Septuagint translation tradition."],
  ["AD 2nd to 3rd c.", "Catacombs of Kom el-Shoqafa and Pompey's Pillar", "Roman-era monuments; the Pillar was set up for Diocletian about AD 297."]
], ["Alexandria", "Lighthouse_of_Alexandria", "Library_of_Alexandria", "Catacombs_of_Kom_El_Shoqafa", "Pompey%27s_Pillar"]);
addA("Ephesus", "John Turtle Wood (1863 to 1874, found the Artemision); Austrian Archaeological Institute (since 1895).", "Certain", "The ruins near Selcuk are accepted as Ephesus.", [
  ["6th c. BC, rebuilt 4th c. BC", "Temple of Artemis", "Foundations of the huge temple of the goddess in Acts 19:24-35 ('Great is Artemis of the Ephesians')."],
  ["c. AD 114 to 135", "Library of Celsus", "Shows the wealth of the Roman provincial capital in which Paul's later letters and Revelation 2:1-7 are set."],
  ["AD 6th c.", "Basilica of St John", "Built over a tomb venerated as John's; the tradition cannot be proved."]
], ["Ephesus", "Temple_of_Artemis", "Library_of_Celsus", "Basilica_of_St._John"]);
addA("Corinth", "American School of Classical Studies at Athens (since 1896).", "Certain", "Ancient Corinth beside the modern village is accepted as the city of Paul. The identification of particular monuments is debated.", [
  ["c. AD 50 (debated)", "Bema (rostrum) in the forum", "Identified as the 'judgment seat' of Gallio (Acts 18:12-17); probable, but not proven."],
  ["AD 51 to 52", "Gallio inscription from Delphi", "Names Gallio as proconsul of Achaea, a fixed anchor date for Paul's stay in Corinth."],
  ["c. AD 50 to 60 (debated)", "Erastus pavement inscription", "An aedile named Erastus paid for a pavement; some identify him with the 'city treasurer' of Romans 16:23, which is debated."]
], ["Ancient_Corinth", "Lucius_Junius_Gallio_Annaeanus", "Erastus_of_Corinth"]);
addA("Athens", "American School of Classical Studies (Agora excavations from 1931); the Greek Archaeological Service (Acropolis).", "Certain", "The identification of Athens is certain. The altar 'to an unknown god' of Acts 17:23 has not been found.", [
  ["1st c. AD", "Areopagus (Mars Hill)", "The rock hill where Paul spoke (Acts 17:19-31)."],
  ["1980s", "Painted Stoa (Stoa Poikile) found", "The colonnade where the Stoics met, background to the Stoic and Epicurean philosophers of Acts 17:18."],
  ["2nd c. AD (debated)", "'Altars of unknown gods'", "Pausanias reports such altars at Athens, but none inscribed as in Acts has been found, so the identification is debated."]
], ["Ancient_Agora_of_Athens", "Areopagus", "Stoa_Poikile", "Unknown_god"]);
addA("Rome", "Roman Forum and Colosseum (state excavations since the 19th century); Vatican excavations under St Peter's (1940s); Jewish catacombs (Monteverde and Villa Torlonia).", "Certain", "The identification of Rome is certain; claims about tombs of Peter and Paul are debated.", [
  ["AD 81", "Arch of Titus", "A relief of soldiers carrying the Temple menorah and spoils in the triumph after the fall of Jerusalem in AD 70, matching Josephus."],
  ["AD 70 to 80", "Colosseum", "Often said to be funded by spoils of the Jewish War; a reconstructed inscription is cited for this and the reading is disputed."],
  ["3rd to 4th c. AD", "Jewish catacombs", "Show the Jewish community in Rome of Acts 28:17 and Romans 16."],
  ["1940s (debated)", "Excavations beneath St Peter's", "Found a 2nd-century shrine and burials; whether bones found are Peter's is debated."]
], ["Arch_of_Titus", "Colosseum", "Catacombs_of_Rome", "Vatican_Necropolis"]);
const pip = (p: Pt, pts: Pt[]): boolean => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const holders = (p: Pt, y: number): { k: King; soft: boolean }[] => {
  const out: { k: King; soft: boolean }[] = [];
  KINGS.forEach((k) => {
    const f = k.kf.find((x) => y >= x.a && y < x.b);
    if (!f) return;
    let solid = false, soft = false;
    f.polys.forEach((pp) => { if (pip(p, pp.pts)) { if (pp.soft) soft = true; else solid = true; } });
    if (solid) out.push({ k, soft: false }); else if (soft) out.push({ k, soft: true });
  });
  return out;
};

addC("Jerusalem", "Urusalim (Amarna letters), Salem (Genesis 14:18), Jebus (Judges 19:10), the City of David (the earliest core), Aelia Capitolina (Roman, from about AD 130)", "Jerusalem (Hebrew Yerushalayim; Arabic al-Quds)", "JER",
  "A hill city between the Mediterranean and the Dead Sea that became the political and religious centre of Israel and Judah and is sacred to Judaism, Christianity and Islam. Its earliest settled core lay on the ridge south of the later Temple Mount. It has been conquered, destroyed and rebuilt many times.",
  [[-1340, "Amarna letters from a ruler of Urusalim to Egypt show a Canaanite city-state here", 1], [-1000, "David takes the city and makes it his capital (traditional date)", 1], [-960, "Solomon builds the Temple (traditional date)", 1], [-701, "Sennacherib of Assyria besieges Jerusalem under Hezekiah; the city is not taken"],
   [-586, "Babylonians under Nebuchadnezzar II destroy the city and the Temple (587 or 586 BC)"], [-516, "Second Temple completed after the return from exile"], [-445, "Nehemiah rebuilds the walls (traditional date)", 1], [-167, "Antiochus IV desecrates the Temple; rededicated under Judas Maccabeus in 164 BC"],
   [-63, "Pompey captures the city for Rome"], [-20, "Herod the Great begins rebuilding the Temple", 1], [70, "Titus destroys the city and Temple at the end of the First Jewish-Roman War"], [130, "Hadrian refounds it as Aelia Capitolina", 1], [638, "Taken by Arab Muslim forces (Caliph Umar)"],
   [1099, "Crusaders capture Jerusalem; Kingdom of Jerusalem founded"], [1187, "Saladin retakes the city"], [1517, "Passes to the Ottoman Empire"], [1917, "British forces enter the city in December"], [1948, "Divided by the armistice line after the 1948 war"], [1967, "Whole city comes under Israeli control; Israel extends its law to East Jerusalem (Jerusalem Law, 1980)"]],
  ["2 Samuel 5:6-9", "1 Kings 6:1", "2 Kings 25:8-10", "Ezra 3:8-13", "Nehemiah 2:11-18", "Luke 19:41-44", "Acts 2:1-6"],
  "Capital of David and Solomon and site of the Temple; the city of the prophets' warnings and hopes; the setting of Jesus's final week, crucifixion and resurrection, and of the first Christian community.",
  ["Jerusalem", "History_of_Jerusalem", "Siege_of_Jerusalem_(70_CE)", "Aelia_Capitolina", "@unSC478"]);
addC("Samaria", "Shomron (Hebrew); Sebaste (renamed by Herod the Great)", "Sebastia (village near Nablus)", "WB",
  "Founded by King Omri as the capital of the northern kingdom of Israel and held until the Assyrian conquest. Herod the Great rebuilt it as Sebaste in honour of Augustus. Its ruins lie at the village of Sebastia.",
  [[-880, "Omri buys the hill and founds the capital (c. 880 BC)", 1], [-722, "Assyrians under Sargon II take Samaria and deport much of the population (722 or 721 BC)"], [-331, "Macedonian settlers installed after a revolt against Alexander's governor (c. 331 BC)", 1], [-108, "John Hyrcanus destroys the city (c. 108 BC)", 1], [-27, "Herod rebuilds it as Sebaste (c. 27 BC)", 1]],
  ["1 Kings 16:23-24", "2 Kings 17:5-6", "Acts 8:5-8"],
  "Capital of the northern kingdom, denounced by the prophets; its fall in 722 BC ends the kingdom of Israel. Acts has Philip preaching in 'a city of Samaria' (the city is not named).",
  ["Samaria_(ancient_city)", "Sebastia,_Nablus"]);
addC("Shechem", "Shechem; Sychar (John 4:5, identification debated); later Flavia Neapolis", "Tell Balata, beside Nablus", "WB",
  "A Canaanite city-state in the pass between Mount Gerizim and Mount Ebal and an early centre of Israelite life. Jeroboam I made it his first capital. The Roman town of Neapolis (modern Nablus) was founded nearby in AD 72.",
  [[-1800, "Large Middle Bronze Age fortifications built (c. 1800 to 1550 BC)", 1], [-1340, "Amarna letters mention a ruler named Labayu, associated with Shechem", 1], [-930, "Jeroboam I fortifies Shechem as his capital (c. 930 BC)", 1], [-111, "John Hyrcanus destroys the Samaritan temple on Mount Gerizim; Shechem is abandoned soon after (c. 111 to 107 BC)", 1], [72, "Flavia Neapolis founded nearby by Vespasian"]],
  ["Genesis 12:6-7", "Joshua 24:1-28", "Judges 9:1-6", "1 Kings 12:1", "1 Kings 12:25", "John 4:5-6"],
  "Abraham's first stop in Canaan; Jacob buys land here; Joshua renews the covenant here; Abimelech's rule ends in violence; the northern tribes crown Jeroboam. The woman of John 4 meets Jesus at 'Sychar' near Jacob's well.",
  ["Shechem", "Tell_Balata", "Nablus"]);
addC("Hebron", "Kiriath-arba (Genesis 23:2), Hebron", "Hebron (Arabic al-Khalil)", "WB",
  "One of the oldest continuously inhabited cities, in the Judean hills. Tradition places the Cave of Machpelah, which Abraham bought as a burial place, here; David was anointed king of Judah at Hebron. Herod the Great built the massive enclosure over the Cave of the Patriarchs.",
  [[-1010, "David anointed king of Judah and reigns here for seven years (traditional date)", 1], [-20, "Herod the Great builds the enclosure over the Cave of the Patriarchs (c. 37 to 4 BC)", 1], [1099, "Crusaders take Hebron"], [1967, "Comes under Israeli control in the Six-Day War"], [1997, "Hebron Protocol divides the city into areas under Palestinian Authority and Israeli control"]],
  ["Genesis 23:1-20", "2 Samuel 2:1-4", "2 Samuel 5:1-5", "Joshua 14:13-15"],
  "Burial place of Sarah, Abraham and other patriarchs and matriarchs in the Genesis tradition; David's first capital.",
  ["Hebron", "Cave_of_the_Patriarchs", "Hebron_Protocol"]);
addC("Bethlehem", "Bethlehem (of Judah); Ephrathah", "Bethlehem (Arabic Bayt Lahm)", "WB",
  "A small town south of Jerusalem, David's hometown and in Christian tradition the birthplace of Jesus. The Church of the Nativity was begun under Constantine and rebuilt by Justinian.",
  [[-1010, "Samuel anoints David here (traditional date)", 1], [-5, "Birth of Jesus, according to Matthew and Luke (c. 6 to 4 BC)", 1], [327, "Construction of the first Church of the Nativity begins under Constantine", 1], [565, "Justinian's rebuilding of the church completed (c. AD 565)", 1], [1099, "Crusaders take Bethlehem"], [1995, "Passes to Palestinian Authority control (December 1995)"], [2012, "Church of the Nativity inscribed as a UNESCO World Heritage Site"]],
  ["Micah 5:2", "Ruth 1:1-2", "1 Samuel 16:1-13", "Matthew 2:1-12", "Luke 2:1-7"],
  "Setting of the book of Ruth; David's birthplace; Micah's prophecy of a ruler from Bethlehem; the birthplace of Jesus in Matthew and Luke.",
  ["Bethlehem", "Church_of_the_Nativity"]);
addC("Nazareth", "Nazareth", "Nazareth (Arabic an-Nasira; Hebrew Natzrat)", "IL",
  "A small village in Galilee in Jesus's time, not mentioned in the Old Testament or by Josephus. The Gospels say Jesus grew up here. It is now the largest Arab city in Israel.",
  [[-100, "Small village in the Hellenistic and Roman periods (archaeology, c. 2nd century BC to 1st century AD)", 1], [28, "Jesus is rejected in the synagogue (Luke 4:16-30; c. AD 28)", 1], [1099, "Crusader principality of Galilee gives the town to Tancred"], [1263, "Mamluk sultan Baybars destroys the church"], [1948, "Captured by Israeli forces in July 1948"], [1969, "Basilica of the Annunciation consecrated"]],
  ["Luke 1:26-38", "Luke 2:39", "Luke 4:16-30", "Matthew 2:23", "John 1:45-46"],
  "The hometown of Mary and Joseph and the place where Jesus was raised; Luke places the Annunciation here.",
  ["Nazareth", "Basilica_of_the_Annunciation"]);
addC("Capernaum", "Capernaum (Kfar Nahum, 'village of Nahum')", "Kfar Nahum (Tell Hum)", "IL",
  "A fishing town on the north-west shore of the Sea of Galilee that served as Jesus's base in Galilee according to the Gospels. Excavations show a 1st-century village, a white limestone synagogue of the 4th to 5th century and an octagonal church over a house venerated as Peter's.",
  [[28, "Jesus makes Capernaum his base (Matthew 4:13; c. AD 28 to 30)", 1], [350, "White limestone synagogue built (4th to 5th century AD)", 1], [450, "Octagonal church built over the venerated house (5th century AD)", 1], [1894, "Franciscans acquire the site; excavations from 1905"]],
  ["Matthew 4:13", "Mark 1:21-28", "Mark 2:1-12", "Luke 7:1-10", "Matthew 11:23"],
  "The centre of Jesus's Galilean ministry: Peter's house, the healing of the paralytic and of the centurion's servant, and teaching in the synagogue.",
  ["Capernaum"]);
addC("Jericho", "Jericho; City of Palms (Deuteronomy 34:3)", "Jericho (Arabic Ariha)", "WB",
  "One of the oldest continuously inhabited places known, beside a spring in the Jordan valley below sea level. Tell es-Sultan preserves Neolithic remains including a stone tower. In the Bible it is the first city Israel takes after crossing the Jordan; Herod the Great later built a winter palace nearby.",
  [[-8000, "Neolithic settlement with a stone tower at Tell es-Sultan (c. 8000 BC)", 1], [-1400, "Traditional setting of Joshua's conquest (c. 1400 or c. 1250 BC); archaeologists dispute whether a walled city then existed", 1], [-30, "Herod the Great builds winter palaces nearby (c. 35 to 4 BC)", 1], [1967, "Comes under Israeli control in the Six-Day War"], [1994, "Palestinian Authority takes over under the Gaza-Jericho Agreement (May 1994)"]],
  ["Joshua 6:1-27", "2 Kings 2:4-5", "Luke 10:30", "Luke 19:1-10", "Mark 10:46-52"],
  "The first city taken in Joshua's account; setting of Elijah and Elisha stories, the parable of the Good Samaritan, and the encounters with Zacchaeus and blind Bartimaeus.",
  ["Jericho", "Tell_es-Sultan"]);
addC("Megiddo", "Megiddo; Armageddon (Har Megiddo, Revelation 16:16)", "Tel Megiddo (Tell el-Mutesellim)", "IL",
  "A fortified hill city commanding the pass of the Via Maris into the Jezreel Valley and the site of many battles. Excavations reveal more than twenty occupation layers with monumental gates and palaces. The name 'Armageddon' in Revelation derives from Har Megiddo.",
  [[-1457, "Thutmose III of Egypt defeats a Canaanite coalition here (c. 1457 BC; some chronologies 1479)", 1], [-960, "Solomon fortifies Megiddo (1 Kings 9:15); the dating of the Iron Age gates to his time is debated", 1], [-732, "Tiglath-pileser III captures it; it becomes an Assyrian provincial capital", 1], [-609, "King Josiah is killed in battle with Necho II of Egypt"], [1918, "Battle of Megiddo, British victory over Ottoman forces (September 1918)"], [2005, "Tel Megiddo inscribed as a UNESCO World Heritage Site"]],
  ["Judges 5:19", "1 Kings 9:15", "2 Kings 23:29-30", "Revelation 16:16"],
  "Fortified by Solomon; Josiah dies here; its name gives 'Armageddon', the site of the final battle in Revelation.",
  ["Megiddo", "Tel_Megiddo", "Battle_of_Megiddo_(15th_century_BC)", "Battle_of_Megiddo_(1918)"]);
addC("Hazor", "Hazor", "Tel Hazor", "IL",
  "The largest city in Canaan in the Bronze Age, in the upper Galilee. Yigael Yadin's excavations uncovered a huge lower city and a palace destroyed by fire in the 13th century BC. Joshua 11 says Israel burned Hazor; archaeologists debate who destroyed it.",
  [[-1750, "Large Middle Bronze Age lower city (18th century BC)", 1], [-1250, "Canaanite city destroyed by fire (13th century BC); the Israelites, Sea Peoples, Egyptians and internal revolt have all been proposed", 1], [-960, "Solomon fortifies Hazor (1 Kings 9:15); the date of the Iron Age gate is debated", 1], [-732, "Tiglath-pileser III destroys Hazor"], [2005, "Tel Hazor inscribed as a UNESCO World Heritage Site"]],
  ["Joshua 11:1-13", "Judges 4:2", "1 Kings 9:15", "2 Kings 15:29"],
  "Joshua defeats its king Jabin and burns the city; a later Jabin and Sisera oppress Israel in Judges 4; Solomon fortifies it; Assyria takes it in 732 BC.",
  ["Hazor", "Tel_Hazor"]);
addC("Dan", "Laish or Leshem (Judges 18:7, Joshua 19:47), Dan", "Tel Dan (Tel el-Qadi)", "IL",
  "The northern limit of Israel in the phrase 'from Dan to Beersheba'. It was the Canaanite city of Laish until the tribe of Dan took it. Jeroboam I set up a shrine with a golden calf here. The Aramaic Tel Dan stele, found in 1993 and 1994, is often read as mentioning the 'house of David'.",
  [[-1750, "Middle Bronze Age mudbrick gateway at Tel Dan (c. 18th century BC)", 1], [-1100, "Tribe of Dan conquers Laish (Judges 18; traditional date)", 1], [-930, "Jeroboam I sets up a calf shrine at Dan (c. 930 BC)", 1], [-840, "Aramean king (probably Hazael) sets up the Tel Dan stele (c. 840 to 800 BC)", 1], [-732, "Tiglath-pileser III's campaign devastates the region"]],
  ["Judges 18:27-31", "1 Kings 12:28-30", "2 Kings 15:29", "Genesis 14:14"],
  "Northern boundary of Israel; the Danite migration story; Jeroboam's rival shrine.",
  ["Dan_(ancient_city)", "Tel_Dan", "Tel_Dan_Stele"]);
addC("Beersheba", "Beer-sheba ('well of the oath' or 'of seven')", "Tel Beer-sheba (ancient site); Beersheba (Be'er Sheva), the modern city nearby", "IL",
  "The southern limit of Israel in the phrase 'from Dan to Beersheba' and linked in Genesis with Abraham, Isaac and Jacob and their wells. Tel Beer-sheba, east of the modern city, is a fortified Iron Age administrative town with a reconstructed horned altar (UNESCO, 2005).",
  [[-1000, "Iron Age settlement begins at Tel Beer-sheba (c. 12th to 10th century BC)", 1], [-701, "Stratum II town destroyed, usually attributed to Sennacherib's campaign (701 BC)"], [1917, "Battle of Beersheba, 31 October 1917 (Australian Light Horse)"], [1948, "Captured by Israeli forces in October 1948"], [2005, "Tel Beer-sheba inscribed as a UNESCO World Heritage Site"]],
  ["Genesis 21:22-34", "Genesis 26:23-33", "Genesis 46:1", "1 Kings 19:3", "Amos 5:5"],
  "Abraham and Abimelech's covenant over a well; Isaac's and Jacob's camps; Elijah flees here; the southern marker of the land.",
  ["Beersheba", "Tel_Be%27er_Sheva", "Battle_of_Beersheba_(1917)"]);
addC("Gaza", "Gaza (Hebrew Azzah)", "Gaza City", "GZ",
  "One of the five Philistine cities and, since the Bronze Age, a major stop on the coastal road between Egypt and Canaan. It has been held by Egypt, Assyria, Persia, Alexander (after a siege in 332 BC), the Ptolemies, Hasmoneans, Romans and many later powers.",
  [[-1457, "Egyptian administrative centre in Canaan in the Late Bronze Age (Thutmose III's campaigns)", 1], [-1050, "Samson's story set here (Judges 16; traditional date)", 1], [-332, "Alexander the Great captures Gaza after a siege"], [-96, "Alexander Jannaeus destroys the city (c. 96 BC)", 1], [635, "Taken by Arab Muslim forces (c. 635 to 637)", 1], [1948, "Administered by Egypt after the 1949 armistice"], [1967, "Comes under Israeli administration after the Six-Day War"], [1994, "Palestinian Authority takes over most of the Strip (Gaza-Jericho Agreement)"], [2005, "Israel withdraws settlements and forces from inside the Strip"], [2025, "Ceasefire takes effect on 10 October 2025 after the war that began in October 2023; see UN OCHA reports"]],
  ["Judges 16:1-3", "Judges 16:21-30", "Joshua 11:22", "1 Samuel 6:17", "Acts 8:26"],
  "Samson is blinded and dies in a Philistine temple at Gaza; one of the five Philistine cities that returned the Ark with offerings; Philip is sent on the road from Jerusalem 'to Gaza' (Acts 8:26).",
  ["Gaza_City", "History_of_Gaza", "Siege_of_Gaza_(332_BC)", "@ocha26", "@unNews26"]);
addC("Ashkelon", "Ashkelon (Ascalon)", "Tel Ashkelon (national park); modern Ashkelon", "IL",
  "A major Mediterranean port and one of the five Philistine cities, with a large Canaanite rampart. Excavations found a Philistine quarter destroyed by Nebuchadnezzar in 604 BC.",
  [[-1850, "Massive Middle Bronze Age rampart and gate (c. 1850 BC)", 1], [-1175, "Philistines settle here (c. 1175 BC)", 1], [-604, "Nebuchadnezzar II destroys the city"], [1153, "Crusaders capture Ascalon after a siege"], [1270, "Baybars razes the port"]],
  ["Judges 14:19", "Judges 1:18", "1 Samuel 6:17", "Jeremiah 47:5-7", "Zephaniah 2:4"],
  "Samson kills thirty men of Ashkelon; one of the five Philistine cities; named in prophecies of judgement.",
  ["Ashkelon"]);
addC("Ashdod", "Ashdod; Azotus (Hellenistic and Roman)", "Tel Ashdod (Isdud); modern Ashdod, founded 1956", "IL",
  "A Philistine city where the captured Ark of the Covenant was placed in the temple of Dagon. It was called Azotus in the Hellenistic and Roman periods. The modern port city of Ashdod was founded in 1956.",
  [[-1175, "Philistine settlement", 1], [-711, "Sargon II of Assyria captures Ashdod (c. 712 to 711 BC)"], [-147, "Jonathan Maccabeus burns the temple of Dagon (1 Maccabees 10:84; c. 147 BC)", 1], [1956, "Modern city of Ashdod founded"]],
  ["1 Samuel 5:1-8", "Isaiah 20:1", "Nehemiah 13:23-24", "Acts 8:40", "Amos 1:8"],
  "The Ark in Dagon's temple (1 Samuel 5); named in Isaiah 20 for Sargon's siege; Philip appears at Azotus after baptizing the Ethiopian official.",
  ["Ashdod"]);
addC("Joppa", "Joppa; Yapho (Joshua 19:46); Egyptian Yapu", "Jaffa (Hebrew Yafo), now part of Tel Aviv-Yafo", "IL",
  "An old port on the Mediterranean coast and the main sea gateway to Jerusalem. Cedar for Solomon's and Zerubbabel's temples came ashore here. Jonah sailed from Joppa, and in Acts Peter raises Tabitha and sees his vision here.",
  [[-1450, "Egyptian conquest of Joppa under Thutmose III (c. 1450 BC)", 1], [-701, "Sennacherib's campaign against the coastal cities includes Joppa"], [-142, "Simon Maccabeus captures Joppa (1 Maccabees 13:11; c. 142 BC)", 1], [66, "Burned by Cestius Gallus at the start of the Jewish revolt (Josephus; c. AD 66)", 1], [1799, "Napoleon's army captures Jaffa (March 1799)"], [1909, "Tel Aviv founded just north of Jaffa"], [1948, "Jaffa taken by Israeli forces in May 1948; merged with Tel Aviv in 1950"]],
  ["2 Chronicles 2:16", "Ezra 3:7", "Jonah 1:3", "Acts 9:36-43", "Acts 10:9-16"],
  "Port for the Temple cedar; Jonah's flight to Tarshish; Peter's raising of Tabitha and his rooftop vision that opens the gospel to Gentiles.",
  ["Jaffa"]);
addC("Caesarea", "Caesarea Maritima; earlier Strato's Tower", "Caesarea (Qesarya); Horbat Qesari", "IL",
  "Harbour city built by Herod the Great from about 22 BC on the site of Strato's Tower and named for Augustus. It was the seat of the Roman governors of Judea, including Pontius Pilate, whose name is on a stone found here. Paul was imprisoned here for two years.",
  [[-22, "Herod the Great begins building the city and harbour (dedicated about 10 BC)", 1], [6, "Becomes capital of the Roman province of Judea"], [26, "Pontius Pilate governs from Caesarea; his inscribed stone dates from his term (AD 26 to 36)", 1], [57, "Paul imprisoned in Caesarea (c. AD 57 to 59; Acts 23 to 26)", 1], [66, "Dispute at Caesarea helps trigger the Jewish revolt (Josephus)", 1], [640, "Taken by Arab Muslim forces (c. 640)", 1], [1101, "Crusaders capture the city"], [1265, "Baybars destroys the Crusader town"]],
  ["Acts 8:40", "Acts 10:1-48", "Acts 12:19-23", "Acts 21:8", "Acts 23:23-35", "Acts 25:1-12"],
  "The centurion Cornelius is baptized by Peter here, the first Gentile conversion in Acts; Herod Agrippa I dies here; Paul is tried before Felix and Festus.",
  ["Caesarea_Maritima", "Pilate_stone"]);
addC("Tyre", "Tyre (Hebrew Tsor)", "Tyre (Arabic Sour)", "LB",
  "The leading Phoenician port, founded on an island just off the coast and later joined to the mainland by Alexander's causeway. King Hiram supplied cedar and craftsmen for Solomon's Temple, and Tyrian colonists founded Carthage according to tradition.",
  [[-980, "Hiram I of Tyre allies with David and Solomon (10th century BC)", 1], [-814, "Traditional date for Tyrian colonists founding Carthage", 1], [-585, "Nebuchadnezzar II besieges Tyre for many years (c. 585 to 572 BC; Josephus)", 1], [-332, "Alexander the Great takes the island city after a seven-month siege and builds a causeway"], [1124, "Crusaders capture Tyre"], [1291, "Mamluks take Tyre"], [1984, "Inscribed as a UNESCO World Heritage Site"]],
  ["2 Samuel 5:11", "1 Kings 5:1-12", "Isaiah 23:1-18", "Ezekiel 26:1-21", "Matthew 11:21-22", "Mark 7:24"],
  "Hiram's gifts to David and Solomon; Isaiah and Ezekiel announce its fall; Jesus mentions Tyre and Sidon in his woes and visits the region.",
  ["Tyre,_Lebanon", "Siege_of_Tyre_(332_BC)"]);
addC("Sidon", "Sidon (Hebrew Tsidon)", "Sidon (Arabic Saida)", "LB",
  "A Phoenician port city, a rival of Tyre, famed for glass and purple dye. In the Bible it is the homeland of Jezebel's father, King Ethbaal. Jesus visited its region, and Paul landed here on his way to Rome.",
  [[-677, "Esarhaddon of Assyria destroys Sidon (c. 677 BC)", 1], [-351, "Revolt against Persia crushed and the city destroyed (c. 351 BC)", 1], [-333, "Surrenders to Alexander the Great"], [1110, "Crusaders capture Sidon (December 1110)"]],
  ["1 Kings 16:31", "Isaiah 23:2", "Mark 7:31", "Luke 6:17", "Acts 27:3"],
  "Jezebel's Sidonian origin (1 Kings 16:31); crowds come from Tyre and Sidon to hear Jesus; Paul visits friends at Sidon on the voyage to Rome.",
  ["Sidon"]);
addC("Damascus", "Damascus (Hebrew Dammesek; Aramaic Dimashq)", "Damascus (Arabic Dimashq)", "SY",
  "Among the oldest continuously inhabited cities, capital of an Aramean kingdom that fought Israel in the 9th and 8th centuries BC. Paul's conversion happened on the road to Damascus. It was the Umayyad capital from AD 661 and is the capital of modern Syria.",
  [[-1450, "Appears in Thutmose III's list of conquered places (c. 1450 BC)", 1], [-840, "Hazael of Aram-Damascus dominates Israel and Judah (c. 842 to 800 BC)", 1], [-732, "Tiglath-pileser III captures Damascus"], [-64, "Pompey annexes Syria; Damascus comes under Rome"], [36, "Paul's conversion and escape over the wall (c. AD 35 to 37)", 1], [635, "Taken by Arab Muslim forces (634 to 635)", 1], [661, "Becomes the Umayyad capital"], [1920, "French mandate begins; independence follows in 1946"]],
  ["Genesis 14:15", "2 Samuel 8:5-6", "1 Kings 20:34", "2 Kings 5:12", "Isaiah 7:8", "Acts 9:1-25", "2 Corinthians 11:32-33"],
  "Capital of Aram, Israel's frequent rival (Naaman, Hazael, Ben-hadad); Isaiah's prophecies against it; Saul becomes Paul on the road to Damascus.",
  ["Damascus"]);
addC("Antioch", "Antioch on the Orontes (Syrian Antioch)", "Antakya (Hatay Province)", "TR",
  "Founded about 300 BC by Seleucus I on the Orontes, capital of the Seleucid Empire and later a leading city of Roman Syria. The disciples were first called Christians here, and it was the base for Paul's missionary journeys.",
  [[-300, "Founded by Seleucus I Nicator"], [-64, "Becomes the capital of the Roman province of Syria"], [115, "Great earthquake (AD 115)"], [540, "Sasanian king Khosrow I sacks the city"], [638, "Taken by Arab Muslim forces"], [1098, "Crusaders capture Antioch; Principality of Antioch founded"], [1268, "Baybars captures the city"], [1939, "Hatay joins Turkey"], [2023, "Severe damage in the February 2023 earthquakes"]],
  ["Acts 11:19-26", "Acts 13:1-3", "Acts 14:26-28", "Acts 15:35", "Galatians 2:11"],
  "Where the followers of Jesus are first called Christians; the church that sends Paul and Barnabas on their first journey; Paul's confrontation with Peter (Galatians 2).",
  ["Antioch"]);
addC("Babylon", "Babylon (Akkadian Babili); Babel (Genesis 11:9)", "Babylon (ruins near Hillah, Babil Governorate)", "IQ",
  "Capital of Hammurabi's kingdom and later of the Neo-Babylonian Empire under Nebuchadnezzar II. Judeans were exiled here in 597 and 586 BC. Cyrus of Persia took it in 539 BC, and Alexander the Great died here in 323 BC.",
  [[-1792, "Hammurabi becomes king; Babylon rises"], [-1595, "Hittites under Mursili I sack the city", 1], [-689, "Sennacherib of Assyria destroys Babylon"], [-626, "Nabopolassar founds the Neo-Babylonian dynasty"], [-597, "First deportation of Judeans under Nebuchadnezzar II"], [-539, "Cyrus the Great of Persia takes Babylon"], [-323, "Alexander the Great dies in Babylon"], [2019, "Inscribed as a UNESCO World Heritage Site"]],
  ["Genesis 11:1-9", "2 Kings 24:10-16", "2 Kings 25:1-21", "Psalm 137:1-4", "Daniel 1:1-4", "Daniel 5:1-31", "Jeremiah 29:4-7", "Revelation 18:2"],
  "The tower of Babel; the place of exile for Judah; the setting of Daniel; in Revelation 'Babylon' becomes a symbol of oppressive power.",
  ["Babylon"]);
addC("Nineveh", "Nineveh (Akkadian Ninua)", "Kuyunjik and Nebi Yunus, opposite Mosul", "IQ",
  "A great Assyrian city on the Tigris. Sennacherib made it his capital and Ashurbanipal's library of clay tablets was found here. It fell to a Babylonian and Median force in 612 BC.",
  [[-705, "Sennacherib makes Nineveh the capital and builds the 'Palace Without a Rival' (c. 705 BC)", 1], [-668, "Ashurbanipal begins his reign and assembles the library (668 to c. 631 BC)", 1], [-612, "Babylonians and Medes sack Nineveh"], [1850, "Austen Henry Layard and Hormuzd Rassam excavate the Library of Ashurbanipal (1849 to 1851)", 1]],
  ["Genesis 10:11-12", "2 Kings 19:36", "Jonah 1:1-2", "Jonah 3:1-10", "Nahum 3:1-7", "Luke 11:30-32"],
  "Jonah is sent to preach to Nineveh and the city repents; Nahum and Zephaniah announce its fall; Sennacherib withdraws here after his campaign against Judah.",
  ["Nineveh"]);
addC("Ur", "Ur of the Chaldeans (Genesis 11:28)", "Tell el-Muqayyar, near Nasiriyah (Dhi Qar Governorate)", "IQ",
  "A Sumerian city-state where the Third Dynasty of Ur (c. 2112 to 2004 BC) built a great ziggurat. Leonard Woolley's excavations (1922 to 1934) uncovered the Royal Cemetery. Genesis names Ur as Abraham's birthplace.",
  [[-2600, "Royal Cemetery burials (c. 2600 to 2500 BC)", 1], [-2100, "Ur-Nammu builds the ziggurat (c. 2100 BC)", 1], [-2004, "Elamites sack Ur and end the Third Dynasty (c. 2004 BC)", 1], [-539, "Falls to Cyrus of Persia along with Babylon"], [1922, "Leonard Woolley begins excavations (to 1934)"], [2016, "Ahwar of Southern Iraq, including Ur, inscribed as a UNESCO World Heritage Site"]],
  ["Genesis 11:27-31", "Genesis 15:7", "Nehemiah 9:7"],
  "Abraham's family leaves Ur for Canaan, stopping at Haran. Some scholars have proposed a northern Mesopotamian Ur instead; the southern city is the usual identification.",
  ["Ur"]);
addC("Haran", "Haran; Harran; Carrhae (Greek and Roman)", "Harran (Sanliurfa Province)", "TR",
  "A northern Mesopotamian city on the Balikh river where Abraham's family settled according to Genesis. It was a centre of the moon-god Sin, and the last Assyrian stand took place here in 610 to 609 BC.",
  [[-1800, "Appears in early second-millennium BC texts as a trading city", 1], [-610, "Babylonians and Medes defeat the last Assyrian remnant at Haran (610 to 609 BC)"], [-53, "Parthians defeat Crassus nearby at the Battle of Carrhae"], [744, "Capital of the Umayyad caliph Marwan II (744 to 750)"], [1260, "Mongols destroy the city"]],
  ["Genesis 11:31-32", "Genesis 12:4-5", "Genesis 28:10", "Genesis 29:4-5", "2 Kings 19:12"],
  "Abraham's family settles here; Jacob flees to Haran and marries Leah and Rachel.",
  ["Harran"]);
addC("Susa", "Susa (Elamite Susan; Shushan, Esther 1:2)", "Shush (Khuzestan Province)", "IR",
  "An ancient capital of Elam and later a winter capital of the Persian kings. The books of Esther, Nehemiah and Daniel place scenes at 'Shushan the citadel'. French excavators found the stele of Hammurabi's laws here in 1901 and 1902.",
  [[-4200, "City founded (c. 4200 BC)", 1], [-646, "Ashurbanipal of Assyria sacks Susa"], [-521, "Darius I builds the palace and makes Susa an administrative capital (c. 521 BC)", 1], [-324, "Alexander the Great holds the mass 'Susa weddings'"], [1901, "Hammurabi stele found by French excavators (1901 to 1902)"], [2015, "Susa inscribed as a UNESCO World Heritage Site"]],
  ["Nehemiah 1:1", "Esther 1:2", "Esther 2:5", "Daniel 8:1-2", "Ezra 4:9"],
  "Nehemiah serves the king here; Esther is set in the palace at Susa; Daniel's vision of the ram and goat.",
  ["Susa"]);
addC("Persepolis", "Parsa (Old Persian); Persepolis (Greek)", "Takht-e Jamshid (Fars Province)", "IR",
  "A ceremonial capital of the Achaemenid Persian Empire, begun by Darius I and enlarged by Xerxes and Artaxerxes. Alexander the Great's army burned the palace in 330 BC.",
  [[-518, "Darius I begins the terrace and palaces (c. 518 BC)", 1], [-330, "Alexander the Great's army burns the palace"], [1931, "Oriental Institute excavations begin (1931 to 1939)"], [1979, "Inscribed as a UNESCO World Heritage Site"]],
  ["Ezra 1:1-4", "Esther 1:1"],
  "Persepolis is not named in the Bible. It was built by the Persian kings who are: Cyrus (Ezra 1), Darius, Xerxes (Ahasuerus in Esther) and Artaxerxes.",
  ["Persepolis"]);
addC("Memphis", "Men-nefer (Egyptian); Noph or Moph (Hebrew, Isaiah 19:13); Memphis (Greek)", "Mit Rahina, south of Cairo and Giza", "EG",
  "The capital of Egypt in the Old Kingdom and a major city for 3,000 years, near the Giza and Saqqara pyramids. Tradition credits the first king, Menes (Narmer), with founding it.",
  [[-3100, "Traditionally founded by the first pharaoh (Menes or Narmer)", 1], [-2600, "Old Kingdom capital; pyramids built nearby", 1], [-671, "Esarhaddon of Assyria captures Memphis"], [-525, "Cambyses II of Persia takes it"], [-332, "Alexander the Great is received here after entering Egypt"], [641, "Arab conquest; Fustat founded nearby (641 to 642)"], [1979, "Memphis and its Necropolis inscribed as a UNESCO World Heritage Site"]],
  ["Isaiah 19:13", "Jeremiah 2:16", "Jeremiah 44:1", "Jeremiah 46:14", "Ezekiel 30:13", "Hosea 9:6"],
  "Named (as Noph or Memphis) among the places where fleeing Judeans settled and in prophecies against Egypt.",
  ["Memphis,_Egypt"]);
addC("Thebes", "Waset (Egyptian); No or No-amon (Hebrew, Nahum 3:8); Thebes (Greek)", "Luxor and Karnak", "EG",
  "The religious capital of Egypt and its political centre for much of the Middle and New Kingdoms, with the temples of Karnak and Luxor and the Valley of the Kings across the river.",
  [[-2055, "Mentuhotep II reunifies Egypt from Thebes (c. 2055 BC)", 1], [-1550, "Ahmose I expels the Hyksos and founds the New Kingdom (c. 1550 BC)", 1], [-1346, "Akhenaten moves the capital to Amarna (c. 1346 BC)", 1], [-663, "Ashurbanipal of Assyria sacks Thebes"], [1922, "Howard Carter finds Tutankhamun's tomb"], [1979, "Ancient Thebes inscribed as a UNESCO World Heritage Site"]],
  ["Nahum 3:8-10", "Jeremiah 46:25", "Ezekiel 30:14-16"],
  "Nahum cites the Assyrian sack of Thebes as a warning to Nineveh; Jeremiah and Ezekiel name it in oracles against Egypt.",
  ["Thebes,_Egypt"]);
addC("Alexandria", "Alexandria (Greek Alexandreia)", "Alexandria (Arabic al-Iskandariyya)", "EG",
  "Founded by Alexander the Great in 331 BC and capital of Ptolemaic Egypt, with the Library and Museum and the largest Jewish community of the diaspora. The Septuagint, the Greek translation of the Hebrew Bible, was made here.",
  [[-331, "Founded by Alexander the Great"], [-285, "Library and Museum founded under the early Ptolemies (c. 3rd century BC)", 1], [-250, "Translation of the Torah into Greek begins (Septuagint tradition, 3rd century BC)", 1], [-48, "Julius Caesar besieged; fire damages part of the library district"], [-30, "Octavian takes Alexandria after Antony and Cleopatra's deaths"], [38, "Anti-Jewish riots in Alexandria"], [115, "Jewish revolt across Egypt and Cyrenaica (AD 115 to 117)"], [642, "Arab conquest of Alexandria (641 to 642)"], [1882, "British bombardment and occupation"]],
  ["Acts 6:9", "Acts 18:24-28", "Acts 27:6", "Acts 28:11"],
  "Home of the Septuagint, the Bible of the early church; Apollos of Alexandria teaches in Ephesus; Paul sails on Alexandrian ships.",
  ["Alexandria", "Library_of_Alexandria", "Septuagint"]);
addC("Ephesus", "Ephesus (Greek Ephesos)", "Ephesus ruins near Selcuk, Izmir Province", "TR",
  "A Greek port city in Asia Minor with the great temple of Artemis, one of the Seven Wonders, and from 129 BC the leading city of the Roman province of Asia. Paul spent about three years here, and Revelation addresses its church first.",
  [[-1000, "Ionian Greek colonists settle (traditional, c. 1000 BC)", 1], [-550, "Croesus of Lydia captures it and sponsors the Artemision (c. 550 BC)", 1], [-356, "The Temple of Artemis is burned (356 BC)"], [52, "Paul's ministry in Ephesus (c. AD 52 to 55)", 1], [262, "Goths sack the city and Artemision (c. AD 262)", 1], [431, "Council of Ephesus"], [1304, "Taken by the Turkish Aydinids"], [2015, "Inscribed as a UNESCO World Heritage Site"]],
  ["Acts 19:1-41", "Ephesians 1:1", "1 Corinthians 15:32", "1 Timothy 1:3", "Revelation 2:1-7"],
  "Paul's longest stay on his journeys, with the riot of the silversmiths; the letter to the Ephesians; the first of the seven churches in Revelation.",
  ["Ephesus", "Temple_of_Artemis"]);
addC("Corinth", "Corinth (Greek Korinthos)", "Ancient Corinth (Archaia Korinthos), Peloponnese", "GR",
  "A wealthy Greek trading city on the isthmus between the Peloponnese and mainland Greece. Rome destroyed it in 146 BC and Julius Caesar refounded it as a colony in 44 BC. Paul founded the church here and spent eighteen months in the city.",
  [[-146, "Romans under Mummius destroy Corinth"], [-44, "Julius Caesar refounds it as a Roman colony"], [51, "Paul in Corinth (c. AD 50 to 52); Gallio is proconsul of Achaea", 1], [1858, "Old town destroyed by earthquake; new Corinth founded nearby"], [1893, "Corinth Canal opens"]],
  ["Acts 18:1-18", "1 Corinthians 1:2", "2 Corinthians 1:1", "Romans 16:23"],
  "Paul's two letters to the Corinthians address the church he founded here; he hears the charge against him before Gallio.",
  ["Corinth", "Ancient_Corinth"]);
addC("Athens", "Athens (Greek Athenai)", "Athens (Greek Athina)", "GR",
  "The leading city of classical Greece, home of democracy, the Parthenon and the schools of philosophy. Under Rome it remained a cultural centre. Paul preached to Athenian philosophers at the Areopagus.",
  [[-508, "Cleisthenes' reforms establish democracy (508 to 507 BC)"], [-480, "Persians sack and burn Athens"], [-447, "Construction of the Parthenon begins"], [-399, "Socrates is condemned and executed"], [-86, "Sulla sacks Athens"], [51, "Paul preaches at the Areopagus (c. AD 50 to 51)", 1], [529, "Justinian closes the philosophical schools"], [1458, "Ottomans capture Athens"], [1834, "Becomes the capital of independent Greece"]],
  ["Acts 17:15-34", "1 Thessalonians 3:1"],
  "Paul's speech to the Areopagus ('To an unknown god') is Luke's model of preaching to educated Greeks.",
  ["Athens"]);
addC("Rome", "Roma (Latin)", "Rome (Italian Roma)", "IT",
  "Capital of the Roman Republic and Empire, the city where Paul was taken as a prisoner and, by early tradition, where Peter and Paul were executed. The Great Fire of AD 64 and Nero's persecution of Christians are described by Tacitus.",
  [[-753, "Traditional date for the founding of Rome (settlement at the site is older)", 1], [-509, "Traditional date for the founding of the Republic", 1], [-27, "Augustus becomes the first emperor"], [64, "Great Fire of Rome; Nero blames Christians"], [71, "Titus's triumph celebrates the fall of Jerusalem"], [80, "Colosseum opened"], [330, "Constantine dedicates Constantinople as a second capital"], [410, "Visigoths sack Rome"], [476, "End of the Western Roman Empire"], [1871, "Becomes the capital of unified Italy"]],
  ["Acts 28:14-31", "Romans 1:7", "Romans 16:3-5", "2 Timothy 1:16-17"],
  "Paul's letter to the Romans; the end of Acts finds him under guard in Rome.",
  ["Rome"]);

/* smaller towns and sites: one-line description, dates and a Wikipedia entry */
mn("Hattusa", "Hattusa", "Bogazkale (Hattusa ruins)", "TR", "Capital of the Hittite Empire in central Anatolia, from the 17th century BC until its abandonment about 1200 BC.", "Hattusa", "", [[-1650, "Becomes the Hittite capital under Hattusili I (c. 1650 BC)", 1], [-1200, "Abandoned in the Late Bronze Age collapse (c. 1200 BC)", 1]]);
mn("Tarsus", "Tarsus", "Tarsus (Mersin Province)", "TR", "Cilician city, birthplace of Paul, settled since the Neolithic and a Roman provincial centre.", "Tarsus,_Mersin", "Acts 21:39;Acts 22:3", [[-41, "Antony and Cleopatra meet at Tarsus"]]);
mn("Ashur", "Ashur (Assur)", "Qal'at Sherqat", "IQ", "The first capital and religious centre of Assyria, on the Tigris, occupied from the third millennium BC and sacked by the Medes in 614 BC.", "Assur", "", [[-614, "Sacked by the Medes"], [2003, "Inscribed as a UNESCO World Heritage Site"]]);
mn("Palmyra", "Tadmor (2 Chronicles 8:4, traditional identification); Palmyra", "Palmyra (Arabic Tadmur)", "SY", "Caravan city in the Syrian Desert; under Queen Zenobia it broke away from Rome until Aurelian took it in AD 272.", "Palmyra", "2 Chronicles 8:4", [[272, "Aurelian captures Palmyra and ends Zenobia's rule"], [2015, "Temples damaged during the Islamic State occupation"]]);
mn("Ecbatana", "Ecbatana (Hagmatana); Achmetha (Ezra 6:2)", "Hamadan", "IR", "Capital of the Medes and a summer residence of the Persian kings, where Ezra 6:2 says Cyrus's decree was found.", "Ecbatana", "Ezra 6:2", [[-550, "Cyrus II takes Ecbatana from the Median king Astyages (c. 550 BC)", 1]]);
mn("Petra", "Rekem; Petra (identification with biblical Sela uncertain)", "Petra", "JO", "Rock-cut capital of the Nabataeans and a caravan trade hub, annexed by Rome in AD 106.", "Petra", "2 Kings 14:7", [[106, "Annexed by Rome as part of Arabia Petraea"], [1812, "Rediscovered for Europeans by Johann Burckhardt"], [1985, "Inscribed as a UNESCO World Heritage Site"]]);
mn("Byblos", "Gebal; Gubla; Byblos", "Jbeil", "LB", "Phoenician port, among the oldest continuously inhabited towns, whose papyrus trade gave the Greek word for book.", "Byblos", "1 Kings 5:18;Ezekiel 27:9", [[-1000, "Ahiram sarcophagus with a Phoenician inscription (c. 1000 BC; date debated)", 1], [1984, "Inscribed as a UNESCO World Heritage Site"]]);
mn("Bethel", "Bethel; Luz", "Beitin", "WB", "Early cult site where Jacob dreamed (Genesis 28) and a royal sanctuary of the northern kingdom.", "Beitin", "Genesis 28:10-22;1 Kings 12:28-33;Amos 7:13", [[-930, "Jeroboam I sets up a calf shrine at Bethel (c. 930 BC)", 1], [-622, "Josiah destroys the altar at Bethel (2 Kings 23:15; c. 622 BC)", 1]]);
mn("Lachish", "Lachish", "Tel Lachish", "IL", "Major Judean fortress whose siege by Sennacherib in 701 BC is shown on reliefs at Nineveh.", "Lachish", "2 Kings 18:13-17;Jeremiah 34:7", [[-701, "Sennacherib takes Lachish"], [-588, "Babylonians destroy the city (c. 588 to 586 BC)", 1]]);
mn("Kadesh-barnea", "Kadesh-barnea", "Ain el-Qudeirat (usual identification)", "EG", "Oasis in the northern Sinai where Israel camped for many years in the wilderness account; Tell el-Qudeirat is the usual identification.", "Kadesh_Barnea", "Numbers 13:26;Numbers 20:1-14;Deuteronomy 1:46", [[-1250, "Traditional wilderness base (date follows the debated date of the Exodus)", 1]]);
mn("Rabbah", "Rabbah of the Ammonites; Philadelphia (Hellenistic)", "Amman", "JO", "Capital of the Ammonites, besieged by David's army, refounded as Philadelphia about 250 BC and now the capital of Jordan.", "Amman", "2 Samuel 11:1;2 Samuel 12:26-31;Amos 1:14", [[-1000, "David's army besieges Rabbah (traditional date)", 1], [-250, "Refounded as Philadelphia under Ptolemy II (c. 250 BC)", 1], [1921, "Becomes the capital of the Emirate of Transjordan"]]);
mn("Dibon", "Dibon", "Dhiban", "JO", "Moabite capital where the Mesha Stele (c. 840 BC) was found in 1868.", "Dhiban", "Numbers 21:30;Isaiah 15:2;Jeremiah 48:18", [[-840, "King Mesha sets up the Mesha Stele (c. 840 BC)", 1], [1868, "Stele discovered by F. A. Klein"]]);
mn("Ezion-geber", "Ezion-geber", "Tell el-Kheleifeh (location debated)", "AIB", "Red Sea port of Solomon's fleet at the head of the Gulf of Aqaba; its exact site is debated.", "Ezion-Geber", "1 Kings 9:26;1 Kings 22:48;Numbers 33:35", [[-960, "Solomon builds a fleet here (10th century BC, traditional)", 1]]);
mn("Bozrah", "Bozrah", "Buseirah", "JO", "Capital of Edom, with remains of the 8th to 6th centuries BC at Buseirah.", "Buseirah", "Genesis 36:33;Isaiah 34:6;Amos 1:12", [[-700, "Prosperous Edomite capital under Assyrian overlordship (8th to 7th century BC)", 1]]);
mn("Ekron", "Ekron", "Tel Miqne", "IL", "Philistine city of the Pentapolis, where the captured Ark was sent and where an inscription names its ruler Ikausu (Achish).", "Tel_Miqne", "1 Samuel 5:10;1 Samuel 17:52;2 Kings 1:2", [[-604, "Destroyed by Nebuchadnezzar II"]]);
mn("Gath", "Gath of the Philistines", "Tell es-Safi", "IL", "Large Philistine city and home of Goliath; excavations show destruction about 830 BC.", "Tell_es-Safi", "1 Samuel 17:4;1 Samuel 21:10-15;2 Kings 12:17", [[-830, "Destroyed by Hazael of Aram (c. 830 BC)", 1]]);
mn("Aphek", "Aphek; Antipatris (Herod)", "Tel Afek (Antipatris)", "IL", "Strategic site at the sources of the Yarkon river where the Philistines gathered before the battle of Ebenezer; Herod rebuilt it as Antipatris.", "Antipatris", "1 Samuel 4:1-11;Acts 23:31", [[-1050, "Philistines defeat Israel and capture the Ark nearby (c. 1050 BC)", 1], [-10, "Herod the Great rebuilds it as Antipatris", 1]]);
mn("Dor", "Dor; Dora", "Tel Dor", "IL", "Coastal Canaanite and Phoenician port where Sea Peoples settled; a Solomonic district centre in 1 Kings 4:11.", "Dor,_Israel", "Joshua 11:2;1 Kings 4:11", [[-1100, "Sikil (Sea Peoples) settle at Dor (c. 1100 BC)", 1], [-732, "Becomes an Assyrian provincial capital"]]);
mn("Acco (Ptolemais)", "Acco; Ptolemais; Acre", "Acre (Hebrew Akko)", "IL", "Coastal port, renamed Ptolemais under the Ptolemies, capital of the Crusader kingdom as Acre until its fall in 1291.", "Acre,_Israel", "Judges 1:31;Acts 21:7", [[-250, "Renamed Ptolemais under the Ptolemies (3rd century BC)", 1], [1191, "Crusaders capture Acre (Third Crusade)"], [1291, "Mamluks take Acre and end Crusader rule on the mainland"], [2001, "Old City inscribed as a UNESCO World Heritage Site"]]);
mn("Jezreel", "Jezreel", "Zir'in (Tel Jezreel)", "IL", "Royal residence of Ahab and Jezebel, with the story of Naboth's vineyard and Jehu's coup.", "Tel_Jezreel", "1 Kings 21:1-24;2 Kings 9:30-37", [[-841, "Jehu overthrows the house of Ahab at Jezreel (c. 841 BC)", 1]]);
mn("Beth-shan", "Beth-shean; Scythopolis", "Beit She'an", "IL", "Egyptian garrison town in the Late Bronze Age, where Saul's body was displayed; later the Decapolis city of Scythopolis.", "Beit_She%27an", "1 Samuel 31:10-12;Judges 1:27", [[-1010, "Saul's body displayed on the wall after Gilboa (traditional date)", 1], [-63, "Scythopolis becomes part of the Decapolis after Pompey's settlement", 1], [749, "Earthquake of AD 749 destroys much of the city"]]);
mn("Shiloh", "Shiloh", "Khirbet Seilun (Tel Shiloh)", "WB", "Israel's main sanctuary in the period of the judges, where the tabernacle and Ark stood.", "Shiloh_(biblical_city)", "Joshua 18:1;1 Samuel 1:1-3;1 Samuel 4:3-11;Jeremiah 7:12", [[-1050, "Destroyed (archaeology, c. 1050 BC); the Bible links this to the Philistine victory at Ebenezer", 1]]);
mn("Gibeon", "Gibeon", "al-Jib", "WB", "Canaanite city that made a treaty with Joshua; its high place is where Solomon's dream took place.", "Gibeon_(ancient_city)", "Joshua 9:3-27;1 Kings 3:4-5", [[1956, "James Pritchard excavates Gibeon (1956 to 1962)"]]);
mn("Arad", "Arad", "Tel Arad", "IL", "Canaanite city and Judean border fortress in the Negev, with a small sanctuary and inscribed ostraca.", "Tel_Arad", "Numbers 21:1-3;Judges 1:16", [[-586, "Judean fortress destroyed in the Babylonian invasions (c. 597 to 586 BC)", 1]]);
mn("En-gedi", "En-gedi", "Ein Gedi (Tel Goren)", "IL", "Oasis on the west shore of the Dead Sea where David hid from Saul; later site of a village and a synagogue with mosaics.", "Ein_Gedi", "1 Samuel 24:1-3;Song of Songs 1:14", [[-1000, "David shelters in the wilderness of En-gedi (traditional date)", 1]]);
mn("Masada", "Masada (Metzada)", "Masada", "IL", "Herodian fortress-palace on a cliff above the Dead Sea; the last Jewish rebel stronghold, which fell in AD 73 or 74.", "Masada", "", [[-37, "Herod the Great fortifies Masada and builds palaces (c. 37 to 31 BC)", 1], [73, "Fall of Masada to Rome (AD 73 or 74, Josephus)"], [2001, "Inscribed as a UNESCO World Heritage Site"]]);
mn("Qumran", "Khirbet Qumran", "Qumran", "WB", "Settlement above the Dead Sea near the caves where the Dead Sea Scrolls were found.", "Qumran", "", [[-100, "Settlement flourishes (2nd to 1st century BC)", 1], [68, "Destroyed by Roman forces (AD 68)"], [1947, "First scrolls found in a cave by a Bedouin shepherd (1946 or 1947)"]]);
mn("Medeba", "Medeba", "Madaba", "JO", "Moabite and Israelite town; in the Byzantine period famous for its 6th-century mosaic map of the Holy Land.", "Madaba", "Numbers 21:30;Joshua 13:9;Isaiah 15:2", [[-840, "Mesha of Moab takes Medeba from Israel (Mesha Stele, c. 840 BC)", 1], [560, "Madaba Map mosaic made (c. AD 560 to 565)", 1]]);
mn("Gerasa", "Gerasa", "Jerash", "JO", "Decapolis city with exceptionally well-preserved Roman remains; the 'country of the Gerasenes' of Mark 5:1 is of uncertain location.", "Jerash", "Mark 5:1-20;Luke 8:26-39", [[-63, "Joins the Decapolis after Pompey's settlement", 1], [130, "Emperor Hadrian visits (AD 129 to 130)", 1], [749, "Earthquake of AD 749 destroys much of the city"]]);
mn("Pella", "Pella", "Tabaqat Fahl", "JO", "Decapolis city east of the Jordan where, according to Eusebius, Jerusalem's Christians fled before AD 70.", "Pella,_Jordan", "", [[66, "Tradition: Christians of Jerusalem flee to Pella (AD 66 to 70; historicity debated)", 1], [635, "Battle of Fahl between Muslim and Byzantine armies (c. 635)", 1]]);
mn("Tiberias", "Tiberias", "Tiberias", "IL", "Founded about AD 18 to 20 by Herod Antipas on the Sea of Galilee and named for Tiberius; a centre of Jewish learning after the Bar Kokhba revolt.", "Tiberias", "John 6:23;John 21:1", [[20, "Founded by Herod Antipas (c. AD 18 to 20)", 1], [749, "Earthquake of AD 749 damages the city"]]);
mn("Sepphoris", "Sepphoris (Tzippori)", "Zippori", "IL", "Capital of Galilee under Herod Antipas before Tiberias, about 6 km from Nazareth.", "Sepphoris", "", [[-4, "Burned by Varus during the unrest after Herod's death (4 BC)"], [363, "Earthquake of AD 363 damages the city"]]);
mn("Bosra", "Bostra; Nova Trajana Bostra", "Bosra (Busra al-Sham)", "SY", "Capital of the Roman province of Arabia with a well-preserved Roman theatre.", "Bosra", "", [[106, "Becomes capital of Roman Arabia"], [634, "Taken by Arab Muslim forces (c. 634)", 1]]);
mn("Hamath", "Hamath", "Hama", "SY", "Aramean and Neo-Hittite city on the Orontes, named as the northern limit of Israel ('the entrance of Hamath').", "Hama", "Numbers 13:21;2 Kings 18:34;Amos 6:2", [[-720, "Sargon II of Assyria captures Hamath (720 BC)"]]);
mn("Ugarit", "Ugarit", "Ras Shamra", "SY", "Late Bronze Age port kingdom whose alphabetic tablets (found 1929) include texts parallel to Hebrew poetry.", "Ugarit", "", [[-1185, "Destroyed in the Late Bronze Age collapse (c. 1185 BC)", 1], [1929, "Excavations begin after the 1928 discovery"]]);
mn("Aleppo", "Halab; Beroea (Hellenistic)", "Aleppo (Arabic Halab)", "SY", "One of the oldest continuously inhabited cities, capital of the Bronze Age kingdom of Yamhad.", "Aleppo", "", [[-1800, "Capital of the kingdom of Yamhad (c. 18th century BC)", 1], [1986, "Ancient City of Aleppo inscribed as a UNESCO World Heritage Site"]]);
mn("Carchemish", "Carchemish", "Jarabulus / Karkamis", "TSB", "Hittite and Neo-Hittite city on the Euphrates where Nebuchadnezzar II defeated Necho II in 605 BC.", "Carchemish", "Jeremiah 46:2;Isaiah 10:9;2 Chronicles 35:20", [[-717, "Sargon II of Assyria captures Carchemish"], [-605, "Nebuchadnezzar II defeats the Egyptians here"]]);
mn("Heliopolis (On)", "On; Iunu; Heliopolis", "Ain Shams (north-east Cairo)", "EG", "Egypt's ancient centre of sun worship; Joseph marries Asenath, the daughter of its priest (Genesis 41:45).", "Heliopolis_(ancient_Egypt)", "Genesis 41:45;Genesis 46:20;Ezekiel 30:17", [[-1450, "Thutmose III sets up a pair of obelisks (c. 1450 BC)", 1]]);
mn("Tanis", "Zoan; Djanet", "San el-Hagar", "EG", "Capital of Egypt in the 21st and 22nd dynasties, identified with the biblical Zoan; royal tombs found in 1939.", "Tanis", "Numbers 13:22;Psalm 78:12;Isaiah 19:11", [[-1070, "Becomes the capital of the 21st dynasty (c. 1070 BC)", 1], [1939, "Pierre Montet finds the royal tombs"]]);
mn("Giza", "Giza", "Giza", "EG", "Site of the three great pyramids built for Khufu, Khafre and Menkaure.", "Giza_pyramid_complex", "", [[-2560, "Great Pyramid built for Khufu (c. 2560 BC)", 1]]);
mn("Amarna", "Akhetaten", "Tell el-Amarna", "EG", "Akhenaten's new capital (c. 1346 to 1332 BC) where the Amarna letters, including letters from Canaanite rulers, were found.", "Amarna", "", [[-1346, "Founded by Akhenaten (c. 1346 BC)", 1], [1887, "Amarna tablets discovered"]]);
mn("Abydos", "Abdju; Abydos", "Abydos (near al-Balyana)", "EG", "Sacred city of Osiris with the tombs of the earliest pharaohs.", "Abydos,_Egypt", "", [[-3100, "Royal tombs of the earliest dynasties (c. 3100 BC)", 1]]);
mn("Pelusium", "Pelusium; Sin (Ezekiel 30:15)", "Tell el-Farama", "EG", "Fortress on the eastern edge of the Nile Delta where Cambyses II defeated Egypt in 525 BC.", "Pelusium", "Ezekiel 30:15-16", [[-525, "Battle of Pelusium: Persians defeat the Egyptians"]]);
mn("Mari", "Mari", "Tell Hariri", "SY", "Amorite city on the Euphrates whose archive of about 25,000 tablets (found 1933) mentions Hazor and Laish.", "Mari,_Syria", "", [[-1761, "Hammurabi of Babylon destroys Mari (c. 1761 BC)", 1], [1933, "Excavations begin under Andre Parrot"]]);
mn("Nippur", "Nippur", "Nippur (Nuffar)", "IQ", "Sumerian religious centre of the god Enlil; the 'river Chebar' of Ezekiel 1:1 was a canal near Nippur.", "Nippur", "Ezekiel 1:1", [[1889, "University of Pennsylvania expeditions begin (1889 to 1900)"]]);
mn("Uruk", "Uruk; Erech (Genesis 10:10)", "Warka", "IQ", "Sumerian city of Gilgamesh, one of the first cities and the site of early writing.", "Uruk", "Genesis 10:10;Ezra 4:9", [[-3300, "Earliest proto-cuneiform tablets (c. 3300 BC)", 1], [2016, "Ahwar of Southern Iraq, including Uruk, inscribed as a UNESCO World Heritage Site"]]);
mn("Calah (Nimrud)", "Calah; Kalhu", "Nimrud", "IQ", "Assyrian capital from about 879 BC under Ashurnasirpal II; the Black Obelisk of Shalmaneser III, showing Jehu of Israel bowing, was found here.", "Nimrud", "Genesis 10:11-12", [[-879, "Ashurnasirpal II makes Calah the capital (c. 879 BC)", 1], [-612, "Destroyed with the fall of the Assyrian Empire"], [2015, "Remains damaged by the Islamic State"]]);
mn("Arbela", "Arbela", "Erbil (Arabic Arbil, Kurdish Hewler)", "IQ", "Assyrian city of Ishtar of Arbela and one of the oldest continuously inhabited places; the Battle of Gaugamela was fought nearby.", "Erbil", "", [[-331, "Battle of Gaugamela fought nearby; Alexander takes the region"], [2014, "Erbil Citadel inscribed as a UNESCO World Heritage Site"]]);
mn("Edessa", "Edessa (Osroene)", "Sanliurfa (Urfa)", "TR", "Hellenistic and Roman city, capital of the kingdom of Osroene and an early Christian centre; first Crusader county.", "%C5%9Eanl%C4%B1urfa", "", [[-132, "Osroene founded with Edessa as capital (c. 132 BC)", 1], [1098, "Baldwin of Boulogne takes Edessa and founds the County of Edessa"], [1144, "Zengi captures Edessa, prompting the Second Crusade"]]);
mn("Ctesiphon", "Ctesiphon (Taq Kasra)", "Salman Pak area, near Baghdad", "IQ", "Winter capital of the Parthian and Sasanian empires on the Tigris, with the Taq Kasra arch.", "Ctesiphon", "", [[637, "Taken by Arab Muslim forces"]]);
mn("Pasargadae", "Pasargadae", "Pasargadae (Fars Province)", "IR", "First capital of the Achaemenid Empire, built by Cyrus the Great, who is buried here.", "Pasargadae", "", [[-546, "Cyrus the Great builds his capital (c. 546 BC)", 1], [2004, "Inscribed as a UNESCO World Heritage Site"]]);
mn("Sardis", "Sardis", "Sart (Salihli, Manisa Province)", "TR", "Capital of Lydia under Croesus and an early coin-minting centre; one of the seven churches of Revelation.", "Sardis", "Revelation 3:1-6", [[-546, "Cyrus the Great captures Sardis (c. 546 BC)", 1], [17, "Great earthquake of AD 17"]]);
mn("Pergamon", "Pergamum; Pergamon", "Bergama (Izmir Province)", "TR", "Capital of the Attalid kingdom with a great library and altar; one of the seven churches of Revelation.", "Pergamon", "Revelation 2:12-17", [[-133, "Attalus III bequeaths the kingdom to Rome"], [2014, "Inscribed as a UNESCO World Heritage Site"]]);
mn("Smyrna", "Smyrna", "Izmir", "TR", "Aegean port city and one of the seven churches of Revelation; Polycarp was bishop here.", "Smyrna", "Revelation 2:8-11", [[155, "Martyrdom of Polycarp (c. AD 155 to 160; date debated)", 1], [1922, "Great Fire of Smyrna (September 1922)"]]);
mn("Troy", "Troy; Ilion; Troas (nearby Alexandria Troas)", "Hisarlik (Canakkale Province)", "TR", "Bronze Age city by the Dardanelles linked to the Trojan War; Paul passed through nearby Troas.", "Troy", "Acts 16:8-11;2 Corinthians 2:12", [[-1180, "Troy VIIa destroyed (c. 1180 BC); sometimes linked with Homer's Troy", 1], [1871, "Heinrich Schliemann begins excavations"], [1998, "Inscribed as a UNESCO World Heritage Site"]]);
mn("Iconium", "Iconium", "Konya", "TR", "Phrygian and Roman city visited by Paul and Barnabas; capital of the Seljuk Sultanate of Rum from 1097.", "Konya", "Acts 13:51;Acts 14:1-6;2 Timothy 3:11", [[47, "Paul and Barnabas preach in Iconium (c. AD 46 to 48)", 1], [1097, "Becomes the Seljuk capital of the Sultanate of Rum"]]);
mn("Pisidian Antioch", "Antioch of Pisidia", "near Yalvac", "TR", "Roman colony in Galatia where Paul preached in the synagogue on his first journey.", "Antioch_of_Pisidia", "Acts 13:14-52", [[-25, "Augustus makes it a Roman colony", 1], [47, "Paul and Barnabas preach here (c. AD 46 to 48)", 1]]);
mn("Gordion", "Gordion", "Yassihoyuk (Ankara Province)", "TR", "Phrygian capital with the Midas Mound; Alexander cut the Gordian knot here in 333 BC.", "Gordion", "", [[-740, "Midas Mound tumulus built (c. 740 BC)", 1], [-333, "Alexander the Great cuts the Gordian knot"], [2023, "Inscribed as a UNESCO World Heritage Site"]]);
mn("Thessalonica", "Thessalonica", "Thessaloniki", "GR", "Founded in 315 BC by Cassander on the Via Egnatia; Paul founded a church here.", "Thessaloniki", "Acts 17:1-9;1 Thessalonians 1:1;Philippians 4:16", [[-315, "Founded by Cassander"], [50, "Paul in Thessalonica (c. AD 50)", 1], [1430, "Ottomans capture the city"]]);
mn("Philippi", "Philippi", "Philippi (near Kavala)", "GR", "City refounded by Philip II of Macedon in 356 BC, site of the battle of 42 BC and of Paul's first European church.", "Philippi", "Acts 16:11-40;Philippians 1:1", [[-356, "Philip II of Macedon takes and refounds the city"], [-42, "Battle of Philippi: Antony and Octavian defeat Brutus and Cassius"], [50, "Paul founds a church (c. AD 49 to 50)", 1]]);
mn("Delphi", "Delphi", "Delphi", "GR", "Sanctuary of Apollo and seat of the oracle; an inscription found here names Gallio and helps date Paul's stay in Corinth.", "Delphi", "", [[52, "Inscription naming Gallio, proconsul of Achaea, dated to AD 52, used to date Paul's stay in Corinth (Acts 18:12)", 1]]);
mn("Puteoli", "Puteoli", "Pozzuoli", "IT", "Main port for the grain ships from Alexandria; Paul landed here on his way to Rome.", "Pozzuoli", "Acts 28:13-14", [[-194, "Becomes a Roman colony"], [60, "Paul lands at Puteoli (c. AD 60 to 61)", 1]]);
mn("Syracuse", "Syracuse (Greek Syrakousai)", "Siracusa", "IT", "Greek colony founded from Corinth in 734 BC and Sicily's greatest city; Paul stopped here for three days.", "Syracuse,_Sicily", "Acts 28:12", [[-734, "Founded by Corinthian colonists (traditional date)", 1], [-212, "Romans capture the city; Archimedes is killed"], [2005, "Syracuse and Necropolis of Pantalica inscribed by UNESCO"]]);
mn("Carthage", "Carthage; Qart-hadasht", "Carthage (Tunis)", "TN", "Phoenician colony from Tyre, traditionally founded in 814 BC and destroyed by Rome in 146 BC.", "Carthage", "", [[-814, "Traditional founding by Tyrian colonists", 1], [-146, "Romans destroy Carthage at the end of the Third Punic War"], [439, "Vandals capture the city"], [698, "Arab conquest"]]);
mn("Cyrene", "Cyrene", "Shahat", "LY", "Greek colony founded about 631 BC with a large Jewish community; Simon of Cyrene carried Jesus's cross.", "Cyrene,_Libya", "Mark 15:21;Acts 2:10;Acts 11:20", [[-631, "Founded by colonists from Thera (c. 631 BC)", 1], [115, "Jewish revolt in Cyrenaica (AD 115 to 117)"], [1982, "Inscribed as a UNESCO World Heritage Site"]]);
mn("Tayma", "Tayma; Tema", "Tayma", "SA", "Oasis in north-west Arabia where the Babylonian king Nabonidus lived for about ten years.", "Tayma", "Genesis 25:15;Isaiah 21:14;Jeremiah 25:23", [[-553, "Nabonidus settles at Tayma (c. 553 BC)", 1]]);
mn("Mecca", "Mecca (Makkah)", "Mecca", "SA", "Trading town and sacred centre of Arabia and birthplace of Muhammad (c. AD 570); the destination of the Islamic pilgrimage.", "Mecca", "", [[570, "Birth of Muhammad (traditional date, c. AD 570)", 1], [630, "Muhammad takes Mecca"]]);
mn("Medina", "Yathrib; Medina", "Medina (Madinah)", "SA", "Oasis city where Muhammad settled in 622; the first Islamic community.", "Medina", "", [[622, "Muhammad's hijra to Medina"]]);
mn("Dedan", "Dedan; Dadan", "al-Ula", "SA", "Oasis capital of the Dadanites and Lihyanites; named with trading peoples of Arabia in the Bible.", "AlUla", "Genesis 10:7;Isaiah 21:13;Ezekiel 27:20", [[-500, "Dadanite and Lihyanite kingdoms (c. 6th to 2nd century BC)", 1]]);
mn("Najran", "Najran", "Najran", "SA", "Oasis city with an early Christian community; persecuted about AD 523 under the Himyarite king Dhu Nuwas.", "Najran", "", [[523, "Persecution of Najran's Christians (c. AD 523)", 1]]);
mn("Marib", "Marib", "Marib", "YE", "Capital of Saba (Sheba), with the Great Dam; the Queen of Sheba's visit to Solomon is recounted in 1 Kings 10.", "Marib", "1 Kings 10:1-13;Isaiah 60:6", [[-700, "Great Marib Dam built in the first millennium BC (often placed in the 8th to 7th century BC)", 1], [570, "Final collapse of the dam (c. AD 570)", 1]]);
mn("Shabwa", "Shabwa", "Shabwa", "YE", "Capital of the Hadramawt kingdom and a centre of the incense trade.", "Shabwa", "Genesis 10:26", [[300, "Conquered by Himyar (c. AD 300)", 1]]);
mn("Gezer", "Gezer", "Tel Gezer", "IL", "Canaanite city guarding the road to Jerusalem; a pharaoh gave it to Solomon as a dowry (1 Kings 9:16).", "Tel_Gezer", "Joshua 10:33;1 Kings 9:15-17", [[-1208, "Listed on the Merneptah stele (c. 1208 BC)", 1]]);
mn("Beth-shemesh", "Beth-shemesh", "Tel Beth-Shemesh", "IL", "Border town between Judah and Philistia where the Ark returned from Philistine territory.", "Beth_Shemesh", "1 Samuel 6:9-15;2 Kings 14:11", [[-1050, "Ark returns to Beth-shemesh (traditional date)", 1]]);
mn("Tirzah", "Tirzah", "Tell el-Far'ah (north), near Nablus", "WB", "Capital of the northern kingdom under Jeroboam I and his successors until Omri moved to Samaria.", "Tirzah", "1 Kings 14:17;1 Kings 15:21;1 Kings 16:23", [[-880, "Omri moves the capital to Samaria (c. 880 BC)", 1]]);
mn("Magdala", "Magdala; Taricheae", "Migdal", "IL", "Fishing town on the Sea of Galilee and hometown of Mary Magdalene; a 1st-century synagogue was found in 2009.", "Magdala", "Luke 8:2;Matthew 15:39", [[67, "Romans take Taricheae in the First Jewish Revolt (AD 67)"], [2009, "1st-century synagogue discovered"]]);
mn("Bethsaida", "Bethsaida; Julias", "et-Tell (identification debated)", "IL", "Fishing village north-east of the Sea of Galilee, home of Peter, Andrew and Philip; rebuilt as Julias by Herod Philip. The site is debated (et-Tell or el-Araj).", "Bethsaida", "Mark 8:22-26;Luke 9:10;John 1:44", [[30, "Herod Philip raises it to a city named Julias (c. AD 30)", 1]]);
mn("Chorazin", "Chorazin", "Khirbet Karazeh", "IL", "Galilean town rebuked by Jesus, with remains of a basalt synagogue of the 3rd to 4th century AD.", "Chorazin", "Matthew 11:21;Luke 10:13", [[250, "Basalt synagogue built (3rd to 4th century AD)", 1]]);
mn("Kedesh", "Kedesh (in Naphtali)", "Tel Kedesh", "IL", "City of refuge in Naphtali and Barak's hometown; excavations found a Persian-Hellenistic administrative building.", "Tel_Kedesh", "Joshua 20:7;Judges 4:6-10;2 Kings 15:29", [[-732, "Tiglath-pileser III captures Kedesh"]]);
mn("Bethany", "Bethany", "al-Eizariya", "WB", "Village on the slope of the Mount of Olives, home of Mary, Martha and Lazarus.", "Al-Eizariya", "John 11:1-44;Mark 11:1;Luke 24:50", [[30, "Raising of Lazarus in John 11 (c. AD 30)", 1]]);
mn("Machaerus", "Machaerus", "Mukawir", "JO", "Hasmonean fortress rebuilt by Herod the Great; Josephus places John the Baptist's imprisonment and death here; it fell to Rome about AD 72.", "Machaerus", "Mark 6:17-29", [[-90, "Fortress built by Alexander Jannaeus (c. 90 BC)", 1], [72, "Roman forces take Machaerus (c. AD 72)", 1]]);
mn("Heshbon", "Heshbon", "Tall Hisban", "JO", "Capital of the Amorite king Sihon in Numbers 21:25-30.", "Tall_Hisban", "Numbers 21:25-30;Isaiah 15:4", [[1968, "Heshbon Expedition excavations (1968 to 1976)"]]);
mn("Kerak (Kir-hareseth)", "Kir-hareseth; Kerak", "al-Karak", "JO", "Moabite stronghold of Kir-hareseth, later site of a major Crusader castle.", "Al-Karak", "2 Kings 3:25;Isaiah 16:7", [[-850, "Israelite siege of Kir-hareseth during Mesha's revolt (2 Kings 3, c. 850 BC)", 1], [1142, "Crusader castle of Kerak begun"], [1188, "Saladin captures Kerak"]]);
mn("Sais", "Sais", "Sa el-Hagar", "EG", "Capital of the 26th dynasty (664 to 525 BC), to which Pharaoh Necho II belonged.", "Sais,_Egypt", "", [[-664, "Psamtik I founds the 26th dynasty"], [-525, "Persian conquest of Egypt"]]);
mn("Avaris / Rameses", "Avaris; Pi-Ramesses; Raamses (Exodus 1:11)", "Tell el-Dab'a and Qantir", "EG", "Hyksos capital Avaris and, nearby, Ramesses II's Pi-Ramesses; the store-city Raamses of Exodus 1:11 is usually linked with the latter.", "Avaris", "Exodus 1:11;Exodus 12:37", [[-1550, "Ahmose I expels the Hyksos from Avaris (c. 1550 BC)", 1], [-1270, "Ramesses II develops Pi-Ramesses (13th century BC)", 1]]);

const bgUrl = (r: string): string => "https://www.biblegateway.com/passage/?search=" + encodeURIComponent(r) + "&version=NRSVUE";
const dash = (r: string): string => r.replace(/-/g, "\u2013");
const yr = (y: number): string => (y < 0 ? -y + " BC" : y === 0 ? "1 BC" : "AD " + y);
/* one-year stepping that skips year 0 (1 BC is followed by AD 1); the year is stored as -n for n BC, so 0 is treated as 1 BC */
const stepYear = (y0: number, d: number): number => {
  const y = y0 === 0 ? -1 : y0;
  let n = y + d;
  if (y < 0 && n >= 0) n += 1;
  else if (y > 0 && n <= 0) n -= 1;
  return Math.max(YMIN, Math.min(YMAX, n));
};
/* typed years: "586 BC", "586 BCE", "-586", "AD 70", "70", "70 CE", "1948". A bare positive number is AD/CE; there is no year 0. Same convention as yr(): 586 BC is stored as -586. */
const parseYear = (raw: string): { y?: number; err?: string; note?: string } => {
  const s = raw.toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return { err: "Type a year, for example 586 BC or AD 70." };
  const m = s.match(/^([+-])?\s*(\d+)\s*(BCE|BC|CE|AD)?$/) || s.match(/^()(?:()(BCE|BC|CE|AD)\s*(\d+))$/);
  let sign = "", num = "", era = "";
  if (s.match(/^([+-])?\s*(\d+)\s*(BCE|BC|CE|AD)?$/)) { const a = s.match(/^([+-])?\s*(\d+)\s*(BCE|BC|CE|AD)?$/) as RegExpMatchArray; sign = a[1] || ""; num = a[2]; era = a[3] || ""; }
  else { const b = s.match(/^(BCE|BC|CE|AD)\s*(\d+)$/); if (!b) return { err: "Could not read that year. Try 586 BC, -586, AD 70, 70 CE or 1948." }; era = b[1]; num = b[2]; }
  if (!m && !era) return { err: "Could not read that year. Try 586 BC, -586, AD 70, 70 CE or 1948." };
  const n = parseInt(num, 10);
  if (!isFinite(n) || num.length > 6) return { err: "That number is too large." };
  if (n === 0) return { err: "There is no year 0 (1 BC is followed by AD 1)." };
  const bc = era === "BC" || era === "BCE";
  const ad = era === "AD" || era === "CE";
  if (sign === "-" && ad) return { err: "A minus sign and AD/CE contradict each other." };
  const neg = sign === "-" || bc;
  let y = neg ? -n : n;
  if (y < YMIN) return { y: YMIN, note: "Clamped to " + yr(YMIN) + " (earliest year on the map)." };
  if (y > YMAX) return { y: YMAX, note: "Clamped to " + yr(YMAX) + " (latest year on the map)." };
  return { y };
};

/* ---------- polygons ---------- */
const EGY = pl("29.95,31.17 29.86,31.2 30.1,31.41 30.24,31.35 30.41,31.55 30.88,31.62 30.76,31.49 30.94,31.5 31.11,31.69 31.58,31.51 31.9,31.59 31.93,31.38 31.87,31.35 32.09,31.27 32.11,31.16 31.71,30.85 32.57,30.79 32.57,30.9 32.33,30.92 32.37,31.12 32.52,31.16 32.65,31.02 32.8,31.09 32.93,31.05 32.94,30.96 34,30.98 34.38,31.29 34.5,31.22 34.77,31.27 34.78,31.48 34.62,31.58 34.62,31.78 34.73,31.76 34.84,31.38 34.92,30.65 35.08,30.24 35.2,30.23 35.4,29.8 34.86,28.82 34.8,28.97 34.6,28.97 34.45,28.76 34.33,28.22 34.36,27.91 34.08,27.72 33.56,28.27 33.15,28.99 33.15,29.12 32.98,29.17 32.86,29.72 32.78,29.76 32.7,30.06 32.5,30.04 32.45,29.32 32.5,28.88 32.63,28.86 33.26,27.99 33.46,27.86 33.42,27.6 33.58,27.44 33.68,27.09 33.83,26.9 33.92,26.44 34.14,25.98 34.75,25.1 34.79,24.83 35.1,24.27 35.48,24.07 33.18,24.02 33.29,24.06 33.29,24.17 33.12,24.3 32.95,24.31 32.95,24.06 32.84,24.04 32.82,24.32 32.75,24.32 32.79,24.18 32.65,24.15 32.55,24.01 30.39,24.01 29.18,23.93 26.29,24.25 26.28,24.19 27.85,23.9 26.2,23.87 26.25,24.14 26.01,24.23 25.94,24.36 25.9,25.26 25.72,25.79 25.19,26.38 24.15,27.29 23.73,27.91 23.58,28.28 23.53,28.79 23.73,29.58 23.61,31.92 23.75,32.37 24.02,32.24 25.19,32.02 25.35,31.71 26.72,31.51 27.34,31.26 27.49,31.07 27.84,31.1 28.63,30.8 29.31,30.7 29.83,31.01 30.08,30.85 30.16,31.03 29.92,31.08");
const EGYLN = pl("23.53,28.79 23.73,29.58 23.61,31.92 23.75,32.37 24.02,32.24 25.19,32.02 25.37,31.71 26.72,31.51 27.34,31.26 27.5,31.07 27.84,31.1 28.63,30.8 29.3,30.7 29.83,31.01 30.09,30.89 30.13,31.02 29.92,31.08 29.86,31.2 30.1,31.41 30.24,31.36 30.41,31.55 30.88,31.62 30.84,31.53 30.93,31.5 31.11,31.69 31.58,31.51 31.9,31.59 31.93,31.34 32.09,31.27 32.11,31.16 31.81,30.93 31.83,30.84 32.54,30.8 32.54,30.9 32.33,30.92 32.37,31.12 32.52,31.16 32.64,31.04 32.8,31.09 32.98,30.96 33.99,30.98 34.38,31.29 34.51,31.22 34.76,31.28 34.77,31.47 34.62,31.58 34.62,31.78 34.73,31.76 34.92,30.64 35.07,30.26 35.2,30.23 35.4,29.8 34.86,28.82 34.79,28.96 34.62,28.97 34.45,28.76 34.33,28.22 34.36,27.91 34.08,27.72 33.56,28.27 33.14,29.11 32.98,29.17 32.86,29.7 32.67,30.06 32.5,30 32.5,28.91 32.63,28.86 33.26,27.99 33.46,27.86 33.43,27.6 33.58,27.44 33.68,27.09 33.83,26.9 33.92,26.43 34.75,25.1 34.79,24.83 35.1,24.28 35.88,23.85 35.56,23.99 35.31,23.91 35.33,23.68 35.77,22.99 35.8,22.77 36.14,22.54 36.52,22.5 36.73,22.29 36.2,21.91 34.51,21.66 31.47,21.66 31.35,21.57 30.41,21.55 30.38,21.64 29.17,21.67 28.4,21.53 26.73,21.75 26.31,22.41 26.31,23.28 26.2,23.69 26.24,24.12 26.01,24.23 25.94,24.36 25.9,25.26 25.75,25.71 25.28,26.28 24.15,27.29 23.73,27.91 23.58,28.28");
const EGYNK = pl("24,31.9 25,31.84 26,31.5 28,30.98 29,30.82 30,31.34 31,31.44 32,31.2 33,31.14 34,31.24 34.44,31.88 34.85,32.6 35.3,33.2 35.3,33.8 35.85,34.4 35.88,37.2 36.5,37.4 37,37.48 37.8,36.5 38,36.16 38,35.88 37.3,34.4 36.6,33.2 36.35,32.6 35.65,32 35.35,30.8 35.3,29.6 34.9,28.4 34.5,28 33.45,27.2 34.5,25.4 34.75,24.8 35.1,24.2 35.55,23 36.65,22.4 36.6,21.8 37.05,20.6 37.05,19.4 37.6,19.04 37.63,18.93 37.76,18.92 37.96,18.78 38.35,18.2 38.45,17.6 38.85,17 38.95,16.4 39.35,15.8 40.45,15.33 40.5,15.22 40.81,15.06 40.91,14.91 41.3,14.79 41.81,14.13 42.07,14.02 42.2,13.87 42.28,13.84 42.49,13.59 42.54,13.43 42.67,13.38 43.2,12.8 42.35,12.2 42.5,11.92 41,12.24 40.25,12.32 39.5,12.98 38.75,14.16 38,14.92 37.25,14.88 36.5,14.54 35.75,14.02 35,13.72 34.25,14.1 33.5,14.62 32.75,14.98 32,14.74 31.25,14.8 30.5,15.2 29.75,16.4 29,17 28.35,17.6 27.25,18.8 26.8,19.4 26.5,20 26.4,21.2 26.2,22.4 26.2,23 26.55,24.2 26.5,24.8 26.35,25.4 25.9,26 25.15,26.6 24.55,27.2 24.15,27.8 24,28.4 24.05,29.6 23.75,30.8 23.7,31.4");
const EGYEMP = pl("23.53,28.79 23.73,29.58 23.61,31.92 23.75,32.37 24.02,32.24 25.19,32.02 25.37,31.71 26.72,31.51 27.34,31.26 27.5,31.07 27.84,31.1 28.63,30.8 29.29,30.7 29.78,30.98 29.86,31.2 30.1,31.41 30.24,31.36 30.41,31.55 31.11,31.69 31.58,31.51 31.9,31.59 31.94,31.42 32.4,31.3 34.19,31.3 34.5,31.6 34.8,32.1 35,32.9 35.7,34.2 36.4,34.7 36.7,34 36,32.4 36,31.3 35.7,30.5 35.37,29.91 35.4,29.8 34.86,28.82 34.79,28.96 34.69,28.94 34.36,27.91 34.08,27.72 33.63,28.2 33.4,28.3 32.68,29.29 32.59,29.27 32.57,28.89 33.26,27.99 33.46,27.86 33.43,27.6 33.58,27.44 33.68,27.09 33.83,26.9 33.92,26.44 34.14,25.98 34.75,25.1 34.79,24.83 35.1,24.28 35.48,24.07 33.4,23.99 33.3,23.2 32.8,21.9 33.3,20.3 34,19.4 33.5,18.7 32,18.1 31,18.1 30.5,19.4 31.2,22.8 31.79,23.79 31.77,24 29.18,23.93 26.82,24.19 26.81,24.09 27.85,23.9 26.2,23.87 26.24,24.13 26.01,24.23 25.94,24.36 25.9,25.26 25.72,25.79 25.19,26.38 24.15,27.29 23.73,27.91 23.58,28.28");
const EGYKUSH = pl("23.53,28.79 23.73,29.59 23.61,31.92 23.75,32.37 25.19,32.02 25.41,31.7 26.72,31.51 27.52,31.09 27.84,31.1 28.63,30.8 29.26,30.71 29.8,31 29.86,31.2 30.1,31.41 31.11,31.69 31.56,31.52 31.9,31.59 31.96,31.35 32.23,31.11 32.52,31.16 33.08,30.96 33.97,30.98 34.59,31.34 34.62,31.78 34.73,31.76 34.93,30.63 35.4,29.8 34.86,28.82 34.65,28.93 34.46,28.78 34.36,27.91 34.08,27.72 33.62,28.07 33.12,29.07 32.98,29.17 32.8,29.75 32.51,29.72 32.45,29.32 32.52,28.94 33.25,28.01 33.47,27.92 33.44,27.61 33.83,26.9 33.93,26.42 34.75,25.1 35.07,24.32 35.48,24.07 35.15,24.05 35.03,23.88 35.49,22.45 34.91,19.51 34.63,15.96 28.79,15.97 28.8,16.5 28.31,18.19 28.28,19.68 28.44,20.28 28.72,20.74 28.65,21.15 28.96,21.41 29.24,21.46 29.49,21.83 30.04,23.84 29.88,23.97 29.18,23.93 28.05,24.05 27.85,23.9 26.2,23.87 26.2,24.11 25.94,24.36 25.9,25.25 25.72,25.79 24.15,27.29 23.73,27.91");
const EGYNECHO = pl("23.53,28.79 23.73,29.58 23.61,31.92 23.75,32.37 24.02,32.24 25.19,32.02 25.37,31.71 26.72,31.51 27.34,31.26 27.5,31.07 27.84,31.1 28.63,30.8 29.29,30.7 29.78,30.98 29.86,31.2 30.1,31.41 30.24,31.36 30.41,31.55 31.11,31.69 31.58,31.51 31.9,31.59 31.94,31.42 32.4,31.3 34.19,31.3 34.5,31.6 34.8,32.1 35,32.9 35.7,34.2 36.2,36.4 38,36.9 38.6,36 39,34.8 38,33.5 37,32.5 36,31.3 35.7,30.5 35.37,29.91 35.4,29.8 34.86,28.82 34.79,28.96 34.69,28.94 34.36,27.91 34.08,27.72 33.63,28.2 33.4,28.3 32.68,29.29 32.59,29.27 32.57,28.89 33.26,27.99 33.46,27.86 33.43,27.6 33.58,27.44 33.68,27.09 33.83,26.9 33.92,26.44 34.14,25.98 34.75,25.1 34.79,24.83 35.1,24.28 35.48,24.07 33.18,24.02 33.29,24.15 33.18,24.24 33,24 32.62,24.07 32.55,24.01 30.39,24.01 29.18,23.93 26.82,24.19 26.81,24.09 27.85,23.9 26.2,23.87 26.24,24.13 26.01,24.23 25.94,24.36 25.9,25.26 25.72,25.79 25.19,26.38 24.15,27.29 23.73,27.91 23.58,28.28");
const HITTOLD = pl("32,39.8 34,41 37,41 39,40 39,38.2 36.5,37.4 34,37 32.2,37.5 31.5,38.8");
const HITL = pl("33.15,41.03 34.1,41.1 34.8,41 35.25,40.8 35.6,40.6 36.1,40.4 37.55,40.3 38.2,40.05 38.65,39.8 39,39.55 39.1,39.3 39.05,39.05 39.05,38.8 39.65,37.55 39.4,36.3 39.4,36.05 39.35,35.8 38.05,35.55 37.65,35.3 37.35,35.05 37.25,34.8 37.1,34.55 36.7,34.3 36.2,34.2 36.05,34.55 36,34.8 36,35.3 35.85,35.55 35.95,35.8 36.1,36.05 35.9,36.3 36.25,36.55 36.3,36.85 36,37 35,37 34.6,36.8 34.25,36.55 33.35,36.55 32.05,37.3 31.8,37.55 31.7,37.8 31.55,38.05 31.5,38.3 31.5,38.55 31.7,38.8 32.2,39.3 32.2,39.8 32,40.05 32.7,40.55 32.85,40.8");
const HITM = pl("29.5,41.2 30.73,41.32 30.85,41.28 31.17,41.29 31.2,41.37 33,41.6 35.5,41.6 37,41.1 37.85,40.9 40.85,40.8 40.85,40.5 40.9,40.2 40.85,39.9 40.7,39.6 40.7,39.3 40.65,39 39.9,38.7 40.35,38.4 39.65,37.5 39.55,37.2 39.55,36.9 39.45,36.6 39.4,36 39.3,35.7 37.85,35.4 37.4,35.1 37.25,34.8 37.05,34.5 36.3,34.1 36.05,34.5 36,34.8 36,35.4 35.9,35.7 35.9,36.3 36,36.9 34.9,36.8 34.3,36.6 33.7,36.3 32.3,36.3 31.85,36.6 30.65,36.9 30.15,37.5 29.95,37.8 29.95,38.1 29.5,38.4 29.6,38.7 29.25,39 29.15,39.3 29.15,40.8");
const CANAAN = pl("34.4,31.3 34.9,32.5 35.2,33.3 35.55,34 36,33.4 35.9,32.6 35.6,31.6 35.4,31 34.9,31");
const TRIBES = pl("35.95,33.4 36.2,33.05 36.2,32.85 35.95,31.98 35.88,31.9 35.93,31.75 35.9,31.42 35.7,31.38 35.55,31.42 35.4,31.55 35.37,31.35 35.42,31 35.35,30.93 35.1,30.85 34.75,30.55 34.45,30.52 34.1,30.6 34.1,31.2 34.04,31.45 34.3,31.67 34.44,31.88 34.8,32.8 35.2,33.2 35.45,33.35 35.6,33.4");
const SAUL = pl("35.73,33.3 35.72,33.2 35.62,33.1 35.56,32.78 35.72,32.75 36.03,32.95 36.9,32.9 36.92,32.8 36.83,32.5 36.25,32.39 36.1,32.32 35.88,31.92 36.05,31.7 36.02,31.42 35.8,31.4 35.6,31.45 35.58,31.75 35.45,31.82 35.38,31.7 35.38,31.3 35.3,31.2 34.78,30.95 34.68,31.05 34.75,31.45 34.95,31.72 35,32 35.08,32.1 35.2,32.65 35.17,32.8 35.42,33.1 35.52,33.32");
const DAVID = pl("38.65,34.5 37.6,34 37.25,33.75 37,33.25 36.8,32.5 36.5,31.75 35.35,29.75 35.1,29.5 34.95,29.5 34.8,29.75 34.6,30.25 34.3,30.5 34.15,30.75 34.1,31.25 34.8,31.75 34.9,32 34.85,32.25 34.95,32.5 34.95,32.75 35.1,33 35.35,33.25 36.1,34.25 36.45,34.62 38.4,34.65");
const SOLSPH = pl("36.5,34.6 36.5,35.3 36.6,35.6 36.9,35.9 37.5,36.1 38.4,36.1 39.1,36 39.4,35.7 39.4,35.5 39.3,35.2 39.05,34.8 38.3,34.6", true);
const ISR1 = pl("35.35,32.9 35.4,33.1 35.55,33.31 35.75,33.31 35.6,33 35.6,32.9 35.52,32.8 35.6,32.74 35.75,32.77 36.02,32.73 36.07,32.6 36.06,32.45 35.93,32.05 36.1,31.8 36.18,31.76 35.56,31.76 35.52,31.83 35.36,31.89 34.88,31.9 34.8,32.05 34.95,32.6 34.95,32.77 35.25,32.79");
const ISROMRI = pl("36.37,31.6 36.37,31.45 36.27,31.22 35.98,31.4 35.65,31.45 35.58,31.5 35.56,31.76 36.18,31.76 36.3,31.7", true);
const ISRHAZ = pl("35.62,33.38 35.56,33.08 35.55,32.59 35.74,32.23 35.82,31.76 35.73,31.62 35.45,31.80 35.06,31.89 34.73,31.91 34.71,32.15 34.97,32.75 35.14,32.87 35.28,33.03 35.34,33.38");
const ISRJER = pl("35,33.2 35.1,33.7 36,34.3 36.6,34 36.7,33 36.4,32 36,31.5 35.55,31.2 35.4,31.7 35.2,31.95 35,32.3");
const ISRRUMP = pl("35.05,32.7 35.45,32.75 35.55,32.1 35.4,31.95 35.15,32 35,32.3");
const JUD1 = pl("35.09,31.90 35.42,31.88 35.48,31.76 35.43,31.59 35.44,31.37 35.36,31.23 35.24,31.10 35.06,31.02 34.83,31.03 34.66,31.23 34.60,31.39 34.61,31.53 34.81,31.88");
const JUDELATH = pl("34.7,30.9 35.3,30.9 35.3,30 34.95,29.55 34.5,30.2 34.5,30.7", true);
const JUD2 = pl("34.7,31.05 34.95,31.6 35.15,31.95 35.25,32 35.45,31.85 35.5,31.3 35.3,30.9 35.05,30.75");
const JUDJOS = pl("34.75,30.9 34.85,31.6 35,32 35,32.5 35.35,32.55 35.55,32 35.5,31.3 35.3,30.9 35,30.65");
const PHIL1 = pl("34.55,31.35 34.38,31.38 34.34,31.45 34.35,31.53 34.72,32.12 34.79,32.17 34.87,32.17 34.94,32.09 35.01,31.7 34.87,31.48");
const PHIL2 = pl("34.68,31.76 34.62,31.62 34.59,31.23 34.33,31.25 34.08,31.21 34.45,31.53 34.63,31.81 34.7,31.87 34.7,31.95 34.97,31.95 34.97,31.62 34.7,31.62 34.7,31.77");
const MOAB = pl("36.24,31.2 36.21,30.97 36,30.95 35.45,31.15 35.51,31.31 35.48,31.47 36.08,31.47 36.06,31.31");
const MOABM = pl("35.82,31.66 36.07,31.73 36.09,31.59 36.06,31.31 36.24,31.20 36.21,30.97 36.00,30.95 35.45,31.15 35.51,31.31 35.48,31.48 35.54,31.63");
const AMMON = pl("35.82,32.58 36.06,32.59 36.27,32.51 36.38,32.34 36.34,31.84 35.94,31.69 35.82,31.71 35.73,31.84 35.76,31.99 35.67,32.17 35.68,32.53");
const EDOM = pl("35.15,29.47 34.9,29.5 34.92,29.85 34.78,30.13 34.48,30.38 34.42,30.64 34.72,31.06 35.12,31.14 35.45,31.15 35.82,31.03 35.97,30.94 35.99,30.69 35.85,30.52 35.73,30.3 35.51,30.09 35.45,29.62");
const ARAM1 = pl("36.67,33.03 36.7,32.86 36.43,32.75 36.41,32.7 35.56,32.7 35.59,33.19 35.59,34.07 36.3,34.07 36.34,33.25");
const ARAMHAZ = pl("36.30,34.07 36.34,33.25 36.67,33.03 36.70,32.86 36.43,32.75 36.37,32.59 35.82,32.57 35.68,32.53 35.55,32.59 35.59,33.19 35.59,34.07");
const PHOEN = pl("35.32,33.19 35.26,32.92 35.15,32.89 35.10,33.03 35.12,33.59 35.18,33.64 35.28,33.85 35.27,33.94 35.33,34.04");
const ASHUR = pl("42.2,36.8 44.2,36.9 44.4,35.3 43.2,34.8 41.8,35.3 41.6,36.2");
const ASSMID = pl("40.5,37.3 44.5,37.6 45,35.8 44.2,34.3 41.5,34.5 39.8,35.5 39.5,36.6");
const ASSNA1 = pl("36.2,36.5 38.5,37.8 42,38 45.6,37 46,35.2 44.5,33.8 41.5,34.4 39,35.2 36.8,35.6");
const ASSNA2 = pl("36.2,36.5 38,37.8 42,38.1 46,37 47.5,34 48,31.5 48.5,30.3 46.5,30.5 44,30.8 41,31.8 38,32 36.2,31 34.2,31.1 34.5,31.5 35,32.7 35.2,33.3 35.8,34.8 35.9,36");
const ASSHARRAN = pl("38.2,36.4 39.8,36.4 39.8,37.3 38.2,37.3");
const BABOLD1 = pl("44,33.2 45,33 45.2,32 44.2,31.8 43.8,32.4");
const BABHAM = pl("40.8,34.8 43,35.8 44.5,35.8 46.5,34 47.8,32 48,30.8 46,30.2 44,31 42.5,32.5 41,33.8");
const BABS = pl("43.8,33.8 45.5,33.8 47.5,32.5 48.3,30.8 47,30.2 45.2,30.3 44,31.2 43.5,32.5");
const BABNB1 = pl("42,36.8 44.5,36.9 46,35 47.8,32.5 48.3,30.8 46.5,30.2 44,30.8 43,32.3 42,34 41,35.2");
const ELAM = pl("47,32.8 48.5,33.6 50,32.8 51.5,31.2 52,29.8 50.8,29.3 49,30.5 47.8,31.2");
const MEDES = pl("34.8,40 42,40.2 47.5,39 49.5,37.7 53,36.8 60,36.5 60,32 54,31.5 50.5,32 48,33.5 46,34.8 44.8,36.7 42,37.6 38.5,37.9 36,38.5");
const MEDA = pl("33.48,40.07 33.67,40.3 34.11,40.35 34.7,40.63 34.88,40.85 34.66,41.08 35.01,41.31 35.34,41.21 35.76,41.32 35.94,41.63 36.05,41.64 36.12,41.42 36.39,41.25 36.83,41.31 37.4,41.05 37.73,41.08 37.7,40.28 37.87,39.93 39.07,39.57 39.79,39.62 41.02,40.05 41.61,40.09 41.78,40.23 44.86,40.53 45.13,40.36 45.23,40.12 45.49,40.12 45.49,39.92 45.32,39.85 45.32,39.71 45.56,39.66 45.85,39.76 46.55,38.93 47.52,38.08 48.94,37.35 49.34,37.28 49.78,37.42 50.16,37.38 50.4,37.06 50.98,36.74 51.83,36.56 53.17,36.75 53.46,36.87 53.97,36.81 54.07,36.99 53.81,37.89 53.87,38.37 54.52,38.66 55.37,39.26 56.99,39.81 59.28,40.1 62.57,39.99 63,39.71 63.08,39.51 63.51,39.39 63.94,39.12 64.26,38.67 64.06,38.3 62.5,37.36 62.15,37.03 61.97,36.65 62.08,35.83 63.3,33.37 63.32,32.69 63.04,31.6 62.75,31.44 62.78,30.93 61.71,28.65 60.57,26.64 59.55,25.19 58.91,25.23 58.55,25.39 58.03,25.37 57.21,25.61 56.97,26.03 56.85,26.74 56.53,27.01 56.01,27.01 55.92,26.93 55.94,26.71 55.76,26.57 55.59,26.6 55.54,26.78 55.14,26.74 54.62,26.39 54.39,26.39 54.1,26.58 53.39,26.66 53.23,26.88 52.52,27.2 52.31,27.55 51.92,27.75 51.46,27.78 51.26,27.89 50.83,28.82 50.82,29 50.66,29.09 50.57,29.42 50.1,29.87 50.06,30.34 49.45,30.73 48.61,30.83 47.83,32.45 47.16,33.13 47.14,33.27 46.93,33.46 46.67,33.52 45.61,34.57 42.16,36.32 40.88,36.61 38.12,36.67 37.89,37.05 37.89,37.32 38.49,37.45 38.88,37.66 39.23,38.07 39.13,38.27 38.54,38.47 37.51,38.48 36.46,38.74 36.17,38.66 35.85,38.22 35.7,38.21 34.85,38.74 34.46,38.79 33.56,39.24");
const LYD = pl("26.1,39.52 26.26,40.03 26.71,40.42 27.18,40.48 27.47,40.34 27.87,40.55 28.11,40.42 28.69,40.38 29.21,40.77 29.09,41.07 29.15,41.21 31.24,41.1 31.54,41.35 32.22,41.64 35.11,41.87 35.51,41.6 35.87,41.64 35.75,41.36 34.92,41.28 34.75,41.1 34.83,40.83 34.71,40.7 33.67,40.31 33.41,40 33.45,39.26 34.45,38.74 34.75,38.44 34.84,38.1 34.71,37.77 34.08,37.18 34.16,36.47 33.75,36.19 32.66,36.04 32.41,36.12 31.96,36.55 31.22,36.83 30.72,36.85 30.14,37.39 29.5,37.11 29.09,36.72 28.77,36.71 28.37,36.86 28.05,36.82 27.9,37 27.46,37.02 27.48,37.28 27.2,37.38 27.18,37.97 26.38,38.27 26.33,38.66 26.73,38.75 26.82,39.07 26.68,39.5 26.43,39.58");
const PERS1 = pl("34.8,40 42,40.2 47.5,39 49.5,37.7 53,36.8 62,37 62,26 56.3,27.1 54.9,26.55 52.6,27.4 50.8,28.95 49.2,30.3 48,31.5 46,34.5 44.5,36.5 42,37.6 38.5,37.9 36,38.5");
const PERS = pl("26.3,40.1 29,41.1 35.1,42 41.5,41.6 46.5,41 49.9,40.4 49.5,37.5 53,36.8 62,37 62,26 56.3,27.1 54.9,26.55 52.6,27.4 50.8,28.95 49.2,30.3 48.6,30 46,30.5 42,31.5 38.5,32 37.2,31 35.7,31.2 34.4,31.3 34.5,31.6 34.8,32.1 35,32.9 35.3,33.4 35.7,34.2 35.9,36 34.6,36.8 32.8,36 30.7,36.9 29.4,36.2 27.4,37 26.7,38.5");
const PERSE = pl("40.5,38.5 46.5,41 49.9,40.4 49.5,37.5 53,36.8 62,37 62,26 56.3,27.1 54.9,26.55 52.6,27.4 50.8,28.95 49.2,30.3 48.6,30 46,30.5 42,31.5 40,33 40,36");
const PERSW = pl("26.3,40.1 29,41.1 35.1,42 40.5,41.5 40.5,38.5 40,36 40,33 38.5,32 37.2,31 35.7,31.2 34.4,31.3 34.5,31.6 34.8,32.1 35,32.9 35.3,33.4 35.7,34.2 35.9,36 34.6,36.8 32.8,36 30.7,36.9 29.4,36.2 27.4,37 26.7,38.5");
const ANATW = pl("26.3,40.1 29,41.1 33,41.5 33,38 30,36.5 29.4,36.2 27.4,37 26.7,38.5");
const GREECE = pl("20,42 26.5,42.2 26.5,40 24.2,37.5 22.5,36.5 20.8,38.5 19.8,40");
const PTCS = pl("34.45,31.5 34.8,32 35.2,33 35.7,33.85 36.15,33.8 36.05,33.5 35.95,33 36.85,32.5 36.35,31.5 35.9,31 34.2,31");
const PTEGY = pl("32.5,31.35 32.65,31.26 32.76,31.3 34.15,31 34.4,30.5 33.45,30 32.35,29.5 32.85,28.5 33.3,28 33.85,27 33.95,26.5 34.6,25.5 35.1,24.5 35.55,24 35.5,23.5 33.85,23.5 31.1,23.1 29,23.1 28.55,23.5 27.85,24.5 27.55,25 27.35,25.5 26.8,26.5 26.3,27 25.15,28 23.8,29 21.17,30.6 25.15,30.6 25.15,31.69 27.49,31.5 27.55,31.41 27.68,31.39 27.89,31.44 27.99,31.39 28.05,31.29 28.48,31.28 28.9,31.14 29.07,31.03 29.41,31.13 29.95,31.5");
const PTCYR = pl("23.1,32.6 23.7,32.2 25.15,31.69 25.15,30.6 21.17,30.6 20.45,31 20.2,31.5 20.2,32 20.45,32.5 21.5,33");
const MITM = pl("36,34.3 36.05,35.3 35.95,36.3 36.3,36.55 36.3,37 35.05,37.05 34.9,36.94 35.5,38.14 35.8,38.6 36,38.66 36.5,38.42 37,38.36 39,38.38 41,38.04 41.5,37.9 42,37.72 44,36.42 44.5,35.9 44.7,35.55 44.5,35.28 44,35.48 43.5,35.88 43,35.92 42.5,36.04 42,36.06 41.5,35.82 40.5,35.44 39.5,35.7 38.5,35.76 38,35.68 37.5,35.44 37.15,34.8 36.8,34.3 36.55,34.05 36.25,34.05");
const MITH = pl("40.75,36.15 39.7,36.5 39.25,36.8 39.15,37.05 39.3,37.3 39.5,37.4 40.2,37.5 41,37.4 41.4,37.3 41.75,37.1 42,36.9 42.05,36.7 41.9,36.5 41.65,36.3");
const CYR = pl("19.8,32 21,33 24,32.7 25.2,31.8 25.2,30.3 20.5,30.5");
const CYPRUS = pl("34.54,35.63 34.14,35.42 34.04,35.32 33.97,35.32 33.92,35.28 33.9,35.16 34.1,34.97 33.96,34.98 33.86,34.94 33.76,34.98 33.68,34.97 33.61,34.82 33.4,34.77 33.4,34.75 33.26,34.7 33.09,34.69 33.01,34.62 33.03,34.57 32.94,34.57 32.91,34.66 32.71,34.65 32.46,34.72 32.33,34.89 32.28,35.05 32.29,35.1 32.37,35.04 32.45,35.06 32.55,35.18 32.87,35.16 32.93,35.23 32.92,35.4 33.43,35.33 33.66,35.36 34.04,35.47 34.18,35.55 34.59,35.69");
const SEL1 = pl("44,34 46.5,38 49.5,38.5 53,37 62,37.5 62,28 54,27 50,29 48.5,30.2 46,31 43.5,32");
const SEL2 = pl("30.5,38.5 34.5,40 40,39.8 46,40 49.5,40 53,37 62,37.5 62,28 54,27 50,29 48.5,30.2 46,31 41,32.5 38.5,33 36.5,33.8 35.9,35 35.9,36 34,36.8 31.5,36.6 30,37.5");
const SEL5 = pl("34,36.8 36,37.8 40.5,37.5 44.5,36 46,33.5 44,31.5 41,32.5 38.5,33 36.5,33.8 35.9,35 35.9,36 34.6,36.8");
const PARTH1 = pl("53,37 62,37.8 62,33 55,33.2 52.5,34.5");
const PARTH2 = pl("40.5,36 42,37.5 46,39 49,40 53,37 62,37.5 62,27 56.3,27 50.8,29 48.5,30.3 46,31 42.5,32.5 40.5,34.5");
const PAR94 = pl("37.51,36.96 37.54,37.9 38.3,38.22 38.86,38.3 39.37,38.58 39.7,38.95 39.78,39.66 40.16,40.13 41.53,40.68 42.37,41.52 43.14,41.6 43.36,42.15 43.58,42.28 44.47,42.18 45.67,41.7 46.56,40.76 48.74,40.08 49.03,39.79 49,39.11 48.79,38.76 48.79,38.06 48.95,37.62 49.24,37.43 50.1,37.3 50.29,37.01 50.91,36.7 51.9,36.49 52.87,36.7 53.38,36.52 53.84,36.6 54,36.81 53.87,37.64 55.24,37.91 57.16,39.64 57.94,39.77 58.96,39.69 59.69,40.11 59.93,40.11 60.31,39.85 60.84,39.85 62.24,40.32 62.57,39.72 63.13,39.22 63.88,38.83 64.39,38.2 65.38,37.86 65.63,37.54 66.19,37.23 67,37.28 67.32,36.57 67.32,36 67.59,35.66 69.47,35.13 70.06,34.69 70.41,34.16 70.41,33.56 70.59,33.09 71.26,32.49 70.72,31.44 70.58,29.24 70.37,29 69.75,28.76 68.84,27.93 68.78,27.61 67.97,26.72 67.91,26.43 68.23,25.94 68.29,25.41 67.53,24.31 67.4,24.31 67.08,24.99 66.75,25.07 66.75,25.36 66.48,25.67 64.49,25.46 63.61,25.57 63.44,25.41 62.48,25.46 61.88,25.3 61.24,25.3 60.49,25.59 58.98,25.62 58.81,25.75 57.34,25.96 57.1,26.4 57.07,26.8 56.67,27.32 56.19,27.29 56,26.95 55.51,27.01 54.76,26.69 54.01,26.93 53.6,26.9 52.74,27.37 52.34,27.79 51.96,27.97 51.37,28.03 50.76,29.29 49.79,30.28 49.12,30.31 48.45,30.07 47.99,29.5 48.04,29.15 48.82,27.76 48.52,27.82 46.13,29.47 43.37,32.16 41.11,34 40.09,34.71 38.29,35.6 37.62,36.54");
const PARFR = pl("37.96,36.85 38.01,37.06 38.96,37.32 39.38,37.79 39.25,38.04 38.57,38.29 38.98,38.56 38.9,38.87 38.7,39.05 39.33,39.35 40.29,39.15 40.48,39.25 40.61,39.48 41.28,39.5 43.01,40.36 44.02,41.31 44.53,41.39 45.14,41.11 46.92,39.02 47.38,38.67 48.09,38.35 48.96,38.15 49.06,38.05 48.99,37.45 49.17,37.03 50.24,36.78 50.5,36.46 51.32,36.13 52.17,36.01 53.5,36.24 54.1,36.19 54.19,36.34 54.09,36.7 54.14,37.15 55.91,37.49 57.69,37.58 61.78,37.51 62.92,37.09 63.49,36.55 63.96,35.56 63.98,34.66 63.84,33.26 63.96,32.1 65.8,28.42 66.06,27.65 64.67,27.45 63.62,27.51 63.45,27.42 62.61,27.44 62.41,27.34 61.85,27.27 61.6,27.33 61.4,27.25 60.65,27.41 59.09,27.38 58.8,27.49 58.14,27.46 57.36,27.58 56.99,28.35 56.8,28.52 56.08,28.55 56.09,28.29 55.99,28.21 55.38,28.06 55.26,28.16 54.79,28.01 54.01,28.16 53.74,28.13 52.81,28.43 52.44,28.77 51.42,28.95 51.05,29.32 51,29.54 50.61,29.89 50.56,30.11 50.06,30.49 49.95,30.71 49.5,30.59 49.08,30.75 48.84,30.75 48.26,30.42 48.1,30.15 47.86,30.14 47.8,30.05 48.4,29.19 48.35,29.09 48.57,28.84 49.09,27.78 49.84,27.45 49.89,27.31 49.81,27.14 50.31,26.79 50.4,26.43 50.72,26.47 50.9,26.2 51.23,26.36 51.48,26.26 51.14,26.01 50.73,25.98 49.02,27.17 46.91,29.62 44.97,30.49 44.04,31.25 42.84,32.54 41.21,33.88 39.29,35.33 38.68,35.66 38.13,35.7 38.1,35.87 38.35,36.31");
const HASM1 = pl("35.06,31.58 35,31.68 34.88,31.7 34.98,31.82 35,31.9 35.38,32 35.45,32.07 35.53,32.05 35.56,31.87 35.54,31.8 35.45,31.72 35.42,31.65");
const HASMJA = pl("35.3,31.27 35.2,31.62 35.42,31.63 35.38,31.27");
const HASMJB = pl("35.56,32 35.6,32.12 35.74,32.12 35.82,32.02 35.84,31.9 35.72,31.78 35.56,31.78");
const HASMJC = pl("34.84,32 35,32.1 35.34,32.1 35.36,32 34.84,31.85");
const HASM2 = pl("35.2,31.17 34.95,31.26 34.68,31.28 34.6,31.4 34.74,31.5 34.72,31.6 34.76,31.7 34.66,31.8 34.72,32 34.84,32.2 35.25,32.4 35.4,32.52 35.57,32.55 35.57,32.3 35.62,32.18 35.78,32.1 35.85,31.95 35.86,31.82 35.55,31.78 35.44,31.72 35.38,31.22 35.3,31.17");
const HASMPOSSD = pl("35.22,32.55 35.15,32.6 35.15,32.88 35.3,32.95 35.56,32.95 35.57,32.58 35.4,32.52", true);
const HASMPOSS = pl("35.22,32.55 35.15,32.6 35.15,32.88 35.3,32.95 35.56,32.95 35.57,32.58 35.4,32.52");
const HASMGAL = pl("35.26,33 35.42,33.12 35.6,33.12 35.62,33 35.58,32.95 35.3,32.95");
const HASM3 = pl("34,31.2 34.47,31.5 34.72,31.75 34.68,31.85 34.95,32.55 34.95,32.7 35,32.82 35.45,33.1 35.58,33.12 35.6,33.28 35.7,33.36 35.79,33.3 35.82,33.1 35.9,32.95 35.92,32.82 36.05,32.7 35.84,32.6 35.92,32.45 36.07,32.35 36.06,32.28 35.88,32.2 35.76,32.1 35.85,31.95 35.86,31.82 35.46,31.73 35.42,31.62 35.37,31.2 35.22,31.16 35,31.22 34.66,31.26 34.28,31.17");
const HASMMOAB = pl("35.55,31.15 35.5,31.3 35.6,31.4 35.58,31.55 35.6,31.7 35.82,31.72 35.9,31.3 35.8,31.2 35.75,31.1 35.5,31");
const HASM4 = pl("34.76,31.18 34.73,31.31 34.98,31.51 34.99,31.59 34.84,31.68 34.77,31.8 34.84,32.02 35.09,32.23 35.31,32.23 35.52,32.01 35.55,31.85 35.45,31.5 35.47,31.3 35.42,31.18 35.21,31.08 34.97,31.08");
const HASMPER = pl("35.61,31.69 35.58,31.8 35.6,32.41 35.75,32.41 35.88,31.9 35.85,31.59 35.71,31.53");
const HASMGALIL = pl("35.11,32.8 35.17,33.01 35.37,33.23 35.72,33.23 35.63,32.67 35.14,32.67");
const HEROD = pl("34.5,31.17 34.4,31.4 34.42,31.5 34.72,32 34.88,32.5 35.04,32.6 35.12,32.75 35.18,33 35.36,33.2 35.72,33.3 35.72,33.5 35.78,33.62 36.02,33.6 35.98,33.4 35.86,33.2 35.8,33 36,32.95 36.2,33 36.64,33.02 36.96,32.95 36.96,32.8 36.74,32.5 36.42,32.3 36.42,32.2 36.24,32.1 35.84,32.05 35.84,31.95 35.78,31.8 35.46,31.72 35.42,31.6 35.38,31.2 35.2,31.12");
const HERODM = pl("35.78,31.78 35.8,31.6 35.68,31.45 35.56,31.45 35.6,31.74");
const PALEST = pl("34.4,31.3 34.75,32.05 34.95,32.7 35.1,33.2 35.65,33.35 36.4,33.1 36.8,32.7 36.4,32 36,31.5 35.6,31 35.1,30.8 34.6,31");
const ARCH = pl("34.4,31.3 34.75,32.05 35.1,32.4 35.5,32.3 35.55,31.3 35.1,30.8 34.6,31");
const GALPER = pl("35.1,32.4 35.1,33.2 35.65,33.3 35.9,32.8 36,32 35.55,31.3 35.5,32.3");
const PHILT = pl("35.6,33.3 36.4,33.1 36.8,32.7 36.4,32.2 35.9,32.8 35.65,33");
const AGR2 = pl("35.1,32.7 35.2,33.3 35.9,33.8 36.6,33.2 36.8,32.7 36,32.4 35.55,32.3");
const NAB1 = pl("34.3,30.7 35.7,31.1 36.5,30.3 36.8,29 35.2,28.8 34.9,29.5 34.2,29.8");
const NAB2 = pl("34.3,30.7 35.6,31.2 36.4,31 36.8,30 38.1,27.6 37.5,26.5 36.3,27.5 35,28.5 34.8,29.5 34.2,29.8");
const NAB85 = pl("34.62,31.45 34.55,31.05 34.91,31.01 35.33,31.2 35.4,31.45 35.65,31.78 35.97,32.02 36.08,32.27 35.99,33.03 36.09,33.18 36.21,33.77 36.68,33.78 36.88,33.69 37.04,33.5 37.19,33.2 37.62,32 37.97,31.45 38.59,31.06 39.62,30.66 39,27.34 38.49,27.01 37.62,26.68 36.95,26.1 36.65,25.91 34.9,28.8 34.95,29.5 34.6,28.5 34.25,27.75 33.6,28.3 32.55,29.95 32.61,30.03 32.73,30.53 32.55,31.04 33.5,31.2 34,31.2 34.25,31.29 34.47,31.52");
const ITALY = pl("8,46 14,46 16,42.5 19,40.5 17,38.5 15.6,37.8 13,41 10.5,43.5 8,44.2");
const SICILY = pl("12,37 15.8,37 15.8,38.4 12,38.4");
const SARD = pl("8,39 9.8,39 9.8,41.3 8,41.3");
const AFRICA = pl("8,37.5 11.5,37.5 11.5,33 9.5,33 8,34");
const ANATN = pl("29,41.1 35.1,42 40,41 40.5,39 36,38 33,37.5 30.5,37.5 30.5,40");
const SYR = pl("35.9,36 36,37 38,37 40.5,36 40,34 38,33 36.5,33.8 35.9,35");
const ROMEEMP = pl("8,46 28.5,46 30,45 41.8,42.5 41,40.5 39,40.2 38.4,38.3 38,36.8 38.5,35.5 38.3,34.5 37.5,33.7 36.3,33.4 35,33.35 34.2,31.6 34.3,31.2 34.9,29.6 33.5,28 33,24 31.5,24 29.5,26.5 25,28.5 20,30.3 16,30.8 12,32 8,32.5");

/* ---------- later periods: simplified outlines (approximate; see each panel's notes) ---------- */
const LEV = pl("34.2,31.3 35.2,33.4 35.8,35 36,36.5 38,36.5 38.5,33 36,31 35.7,30.5 35.3,29.8 34.9,29.5");
const SASAN = pl("40,36 40,37.4 43,41 49.5,40.5 53,37 62,37.5 62,26 56.3,27.1 54.9,26.55 51,28.9 48.6,29.8 46,31 42.5,32.5 40.5,34.5");
const BYZ395 = pl("19,44.5 28.5,45 30,45 41.8,42.5 41,40.5 39,40.2 38.4,38.3 38,36.8 38.5,35.5 38.3,34.5 37.5,33.7 36.3,33.4 35,33.35 34.2,31.6 34.3,31.2 34.9,29.6 33.5,28 33,24 25,24 25,29 20,30.3 19,31 19.5,40");
const BYZ636 = pl("20,42 28.5,44.5 41.8,42.5 41,40.5 39,40.2 38.4,38.3 37,38.0 35.5,37.6 34.0,37.0 30,36.5 26,36 22,36.3 19.8,40");
const SITALY = pl("15.5,41 18.5,40.5 16.5,38.2 15.8,39.5");
const BYZ1071 = pl("20,42 28.5,44.5 32,41.8 33,39 31,37.2 30,36.5 26,36 22,36.3 19.8,40");
const BYZLATE = pl("22,41 28.5,42.5 29,40.5 26,39 22.5,38");
const RASH = pl("25,31.7 34.2,31.3 35.8,35 36,37 40,37.5 44,40 49,40 53,37 62,37.5 62,26 57,24 59,22.5 55,17 44,12.5 43.3,12.7 42.5,15 39.5,21.5 35.6,24 33,24 25,24");
const IRQABB = pl("40,36.5 44,37.5 46,36 49,34 48.5,30 44,29.5 40,32");

const SELJ = pl("32,40 41,41.5 46,41 49,40 53,37 62,37.5 62,28 56,27 51,28.9 48.4,30 46,31.5 42,32.5 38,33.5 36.5,36.5 34,37 30.5,37.5 30.5,39");
const CR1 = pl("34.3,31.2 35.5,31.2 35.6,32.6 35.9,33.4 36.3,34.5 36.5,35.4 36.5,36.5 38.9,37.2 39.0,36.3 37.8,36.3 36.7,36.0 36.0,35.0 35.5,34.0 35.3,33.0 34.8,32.2");
const CR2 = pl("34.5,31.5 34.9,32.0 35.2,33.3 35.6,34.3 36.0,35.2 36.1,36.2 35.9,36.0 35.5,34.9 35.4,33.8 35.1,32.8 34.9,32.1");
const OTTCORE = pl("26,42 28.5,42 41.6,42 43.5,41.1 44.8,39.7 44.2,37.2 46,35 47.5,32.5 48.5,30 47,29.2 44,29.2 41.5,27 41.5,19 39.4,21.4 37,25.5 35,29.4 34.27,31.22 31,36 26,36.5");
const EGYOTT = pl("25,31.7 34.1,31.7 34.27,31.22 34.9,29.5 35.6,24 32.9,23.9 25,23.9");
const LIBOTT = pl("11,33 25,31.7 25,28 11,28");
const BALK = pl("19,44.5 28.5,44.5 28.5,42 26,42 26,40 24,36.5 21.5,36.5 19.5,40");
const BALKE = pl("20.5,40 21,42 26,42 26,40.2");
const IRANP = pl("44.81,39.64 45.44,39 46.13,38.86 46.55,38.89 47.1,39.31 47.97,39.7 48.34,39.38 48.11,39.27 48.29,39 47.99,38.85 48.31,38.6 48.42,38.62 48.61,38.4 48.87,38.43 48.94,37.9 49.13,37.62 50.2,37.39 50.32,37.15 51,36.77 51.91,36.58 53.61,36.88 54.01,36.82 53.91,37.34 54.65,37.44 54.79,37.52 54.83,37.74 55.13,37.95 55.71,38.12 56.3,38.08 56.44,38.26 57.04,38.19 57.17,38.28 57.35,37.97 58.16,37.79 58.36,37.63 58.8,37.69 59.31,37.53 59.46,37.21 60.02,37.03 60.34,36.64 61.17,36.64 61.22,36.12 61.13,35.97 61.24,35.89 61.29,35.55 61.11,35.28 61.07,34.81 60.7,34.52 60.89,34.32 60.64,34.31 60.49,34.14 60.51,33.64 60.92,33.51 60.56,33.06 60.83,32.25 60.82,31.49 61.69,31.37 61.83,31.01 61.8,30.85 60.84,29.86 61.34,29.37 61.57,28.87 61.89,28.54 62.36,28.42 62.58,28.23 62.76,28.25 62.81,27.49 62.74,27.27 63.18,27.26 63.32,27.12 63.23,27.07 63.16,26.65 62.42,26.56 62.29,26.5 62.27,26.36 61.83,26.23 61.75,25.82 61.66,25.77 61.62,25.29 61.41,25.06 60.63,25.27 60.55,25.45 60.4,25.38 60.47,25.29 59.45,25.46 59.04,25.4 58.83,25.56 58.42,25.61 58.07,25.56 57.96,25.69 57.77,25.64 57.76,25.74 57.31,25.78 56.97,27 56.81,27.14 56.12,27.16 55.94,27.03 55.67,27 55.52,26.78 55.27,26.79 54.79,26.5 54.31,26.71 53.72,26.71 53.44,26.98 52.6,27.35 52.67,27.45 52.46,27.63 52.01,27.83 51.4,27.93 51.06,28.74 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.14,29.94 50.07,30.2 49.53,30.02 49.48,30.16 49.25,30.16 49.22,30.26 48.92,30.38 49.2,30.35 49.21,30.51 48.98,30.52 49.04,30.43 48.93,30.42 48.86,30.35 48.92,30.04 48.46,29.99 48.4,30.22 48.01,30.46 48.01,30.99 47.67,30.99 47.68,31.41 47.83,31.81 47.49,32.15 47.41,32.4 47.09,32.47 46.48,32.89 46.1,32.95 46.12,33.06 46.03,33.11 46.17,33.17 46.16,33.26 45.97,33.49 45.85,33.49 45.89,33.63 45.73,33.58 45.38,33.97 45.54,34.14 45.56,34.31 45.42,34.44 45.5,34.59 45.7,34.55 45.67,34.81 45.85,34.91 45.91,35.09 46.15,35.11 46.12,35.32 45.96,35.49 46,35.67 46.33,35.8 45.75,35.81 45.54,35.99 45.32,35.99 45.24,36.4 45.07,36.42 44.99,36.53 45.04,36.69 44.82,36.81 44.89,37.02 44.75,37.1 44.8,37.29 44.57,37.43 44.6,37.72 44.2,37.9 44.46,38.34 44.29,38.38 44.28,38.84 44.01,39.37 44.39,39.41 44.46,39.7 44.57,39.77");
const TURK = pl("43.38,41.19 43.72,40.76 43.56,40.48 43.67,40.11 44.33,40.03 44.81,39.64 44.57,39.77 44.39,39.41 44.01,39.37 44.28,38.84 44.29,38.38 44.46,38.34 44.2,37.9 44.6,37.72 44.57,37.45 44.8,37.29 44.77,37.14 44.61,37.18 44.28,36.97 44.18,37.09 44.24,37.24 44.09,37.31 43.81,37.2 42.78,37.38 42.55,37.14 42.36,37.11 42.21,37.32 42.01,37.18 41.48,37.08 40.71,37.1 39.77,36.74 39.24,36.66 38.73,36.69 38.22,36.91 37.45,36.63 37.05,36.62 36.96,36.75 36.64,36.83 36.53,36.48 36.67,36.24 36.37,36.23 36.36,35.99 36.14,35.82 35.91,35.92 35.98,36.02 35.79,36.3 36.21,36.64 36.19,36.8 36.02,36.93 35.61,36.74 35.71,36.72 35.62,36.6 35.35,36.54 34.69,36.81 34.28,36.59 33.96,36.21 33.87,36.31 33.69,36.14 32.8,36.03 32.37,36.18 32.02,36.55 31.34,36.81 30.69,36.89 30.57,36.78 30.43,36.23 30.16,36.3 29.67,36.12 29.1,36.39 29.11,36.55 29.01,36.55 29.1,36.67 28.94,36.75 28.83,36.6 28.45,36.88 28.4,36.79 28.26,36.85 28.3,36.72 28.04,36.56 27.96,36.6 28.09,36.64 27.97,36.69 28.12,36.8 27.92,36.74 27.72,36.76 27.67,36.66 27.4,36.67 27.65,36.81 28.03,36.78 28.04,36.94 28.17,36.91 28.33,37.04 27.26,36.96 27.25,37.12 27.57,37.13 27.62,37.27 27.46,37.25 27.41,37.41 27.19,37.36 27.21,37.6 27.01,37.67 27.25,37.74 27.24,37.99 26.87,38.04 26.76,38.22 26.59,38.1 26.23,38.28 26.51,38.43 26.39,38.45 26.41,38.68 26.63,38.52 26.67,38.31 26.7,38.43 26.8,38.36 27.16,38.45 26.94,38.43 26.72,38.65 27.06,38.89 26.81,38.95 26.88,39.09 26.61,39.28 26.94,39.57 26.07,39.5 26.17,39.97 26.74,40.4 27.29,40.47 27.45,40.32 27.76,40.32 27.88,40.39 27.68,40.5 27.76,40.54 28.03,40.47 27.94,40.37 29.05,40.37 29.15,40.43 28.79,40.55 29.94,40.74 29.25,40.81 29.01,41.03 29.17,41.23 31.23,41.09 31.4,41.32 32.26,41.72 33.32,42.02 34.69,41.95 35.02,42.09 35.22,42.02 35.09,41.93 35.3,41.72 35.58,41.63 36.04,41.7 36.13,41.46 36.4,41.26 36.76,41.37 37.52,41.04 37.69,41.14 37.9,40.98 38.33,40.92 39.43,41.11 40.14,40.92 41.52,41.51 42.46,41.43 42.66,41.59 42.82,41.57 42.77,41.5 43.18,41.3 43.1,41.25 43.23,41.17");
const SYRP = pl("35.76,32.74 35.89,32.94 35.76,33.33 35.92,33.46 35.93,33.53 36.04,33.57 35.92,33.64 35.95,33.71 36.14,33.85 36.36,33.82 36.37,33.86 36.27,33.91 36.29,33.95 36.39,34.04 36.48,34.05 36.6,34.2 36.53,34.42 36.32,34.51 36.44,34.63 36.31,34.69 36.26,34.63 35.97,34.65 35.87,34.92 35.89,35.11 35.96,35.2 35.92,35.42 35.72,35.58 35.84,35.75 35.8,35.85 35.98,35.93 36,35.87 36.16,35.82 36.2,35.95 36.36,35.99 36.37,36.23 36.66,36.23 36.53,36.48 36.64,36.83 36.96,36.75 37.05,36.62 37.24,36.66 37.45,36.63 38.22,36.91 38.48,36.86 38.73,36.69 39.24,36.66 39.77,36.74 40.71,37.1 41.48,37.08 42.01,37.18 42.21,37.32 42.35,37.24 42.38,37.06 41.84,36.62 41.39,36.52 41.28,36.35 41.24,36.06 41.35,35.83 41.36,35.66 41.26,35.49 41.2,35.24 41.2,34.79 40.97,34.4 40.69,34.33 38.77,33.37 36.82,32.32 36.39,32.38 36.18,32.53 36.07,32.52 35.94,32.69");
const LEBP = pl("35.11,33.09 35.2,33.22 35.19,33.28 35.22,33.31 35.27,33.46 35.35,33.51 35.44,33.71 35.48,33.82 35.47,33.9 35.57,33.91 35.61,33.99 35.64,34 35.63,34.2 35.67,34.31 35.71,34.32 35.75,34.39 35.81,34.41 35.82,34.43 35.81,34.46 35.9,34.48 35.98,34.54 35.97,34.65 36.04,34.63 36.26,34.63 36.31,34.69 36.37,34.63 36.44,34.63 36.44,34.6 36.39,34.6 36.38,34.55 36.32,34.51 36.34,34.49 36.43,34.49 36.53,34.42 36.52,34.35 36.58,34.3 36.56,34.26 36.6,34.2 36.48,34.05 36.39,34.04 36.29,33.95 36.28,33.9 36.37,33.86 36.37,33.84 36.34,33.82 36.23,33.85 36.17,33.83 36.14,33.85 36.05,33.82 35.95,33.71 35.92,33.64 36.03,33.6 36.04,33.57 35.93,33.53 35.92,33.46 35.6,33.24 35.55,33.28 35.48,33.09 35.35,33.06 35.28,33.1");
const IRAQP = pl("44.61,37.18 44.89,37.02 44.83,36.79 45.05,36.67 44.99,36.53 45.08,36.41 45.24,36.4 45.32,35.99 45.54,35.99 45.75,35.81 46.06,35.86 46.33,35.8 46,35.67 45.96,35.49 46.12,35.32 46.15,35.11 45.91,35.09 45.85,34.91 45.67,34.81 45.63,34.72 45.7,34.55 45.5,34.59 45.42,34.44 45.56,34.31 45.54,34.14 45.38,33.97 45.49,33.94 45.73,33.58 45.89,33.63 45.93,33.55 45.85,33.49 45.97,33.49 46.16,33.26 46.17,33.17 46.03,33.11 46.12,33.06 46.1,32.95 46.48,32.89 47.09,32.47 47.41,32.4 47.49,32.15 47.83,31.81 47.68,31.41 47.67,30.99 48.01,30.99 48.01,30.46 48.31,30.31 48.45,30 48.56,29.95 48.12,30.04 47.97,30 47.93,30.11 47.95,29.99 47.67,30.1 47.2,30.03 46.85,29.44 46.53,29.1 46.36,29.06 44.69,29.2 42.08,31.08 40.42,31.92 39.15,32.12 39.29,32.24 39.24,32.35 39.03,32.33 38.98,32.47 39.06,32.5 38.77,33.37 40.69,34.33 40.97,34.4 41.2,34.79 41.2,35.24 41.36,35.66 41.24,36.06 41.28,36.35 41.39,36.52 41.84,36.62 42.38,37.06 42.36,37.11 42.56,37.15 42.72,37.36 43.11,37.37 43.81,37.2 44.09,37.31 44.24,37.24 44.18,37.09 44.28,36.97");
const SAUDI = pl("50.56,25.05 50.98,24.57 51.5,24.58 51.28,24.31 51.57,24.26 51.59,24.08 52.56,22.94 55.11,22.62 55.19,22.7 55.64,21.98 54.98,20 51.98,19 49.04,18.58 48.16,18.15 47.43,17.09 47.16,16.95 46.97,16.96 46.71,17.28 46.32,17.22 45.17,17.43 43.92,17.3 43.41,17.52 43.17,17.33 43.18,16.66 42.79,16.37 42.71,16.73 42.36,17.18 42.36,17.02 42.3,17.45 41.49,18.22 41.44,18.47 41.21,18.7 41.18,19.07 40.74,19.78 40.08,20.28 39.76,20.35 39.17,21.11 39.11,21.75 38.93,22.01 39.14,22.4 38.45,23.78 37.95,24.21 37.87,24.15 37.43,24.37 37.15,24.85 37.26,24.87 37.24,25.18 36.94,25.65 36.7,25.78 36.7,26.02 36.51,26.11 35.22,28.05 34.57,28.11 34.8,28.53 34.95,29.35 36.07,29.2 36.48,29.49 36.73,29.85 37.47,29.99 37.65,30.33 37.98,30.5 36.96,31.49 39.16,32.12 40.37,31.94 42.08,31.08 44.69,29.2 47.43,28.99 47.67,28.53 48.49,28.5 48.65,28.05 48.88,27.83 48.83,27.61 49.24,27.55 49.31,27.45 49.12,27.44 49.26,27.41 49.37,27.15 49.57,27.19 49.7,26.96 50.16,26.66 49.99,26.72 50.22,26.32 50.14,26.04 50.03,26.2 49.99,26 50.47,25.44");
const EGYFULL = pl("34.2,31.31 34.89,29.49 34.74,29.31 34.62,28.74 34.41,28.32 34.43,27.98 34.21,27.79 34.26,27.73 33.76,28.02 33.23,28.57 33.18,28.99 32.72,29.46 32.58,30.01 32.34,29.59 32.58,29.37 32.63,28.97 32.87,28.58 33.55,27.9 33.59,27.79 33.47,27.82 33.59,27.65 33.5,27.65 34,26.9 33.94,26.65 34.55,25.73 35.14,24.5 35.79,23.9 35.49,23.95 35.49,23.5 35.62,23.14 35.85,22.76 36.23,22.64 36.44,22.36 36.9,22.07 36.88,22 31.44,22 31.49,22.17 31.42,22.23 31.25,21.99 24.98,22 24.98,29.18 24.69,30.18 24.99,30.79 24.85,31.35 25.09,31.61 25.15,31.66 25.19,31.53 25.4,31.5 25.97,31.62 27.32,31.38 27.45,31.22 27.85,31.24 27.93,31.1 28.42,31.08 29.03,30.83 29.5,30.96 30.07,31.33 30.17,31.22 30.29,31.24 30.18,31.28 30.31,31.35 30.34,31.5 30.4,31.44 30.36,31.51 30.54,31.46 30.97,31.59 30.54,31.4 30.73,31.39 31.12,31.49 30.98,31.58 31.1,31.61 31.56,31.44 31.87,31.54 31.94,31.52 32.2,31.3 31.89,31.53 31.77,31.28 32.04,31.22 32.11,31.05 32.28,31.14 32.21,31.3 32.6,31.06 32.93,31.16 32.7,31.04 33.01,31.06 33.06,31.13 32.95,31.11 33.11,31.2 33.13,31.05 33.41,31.16 33.59,31.11");
const EGYW = pl("32.49,29.95 32.34,29.59 32.59,29.35 32.63,28.97 33.52,27.83 33.59,27.65 33.5,27.65 34,26.9 33.94,26.65 34.55,25.73 35.14,24.5 35.79,23.9 35.51,23.98 35.48,23.92 35.49,23.5 35.68,22.97 35.89,22.74 36.23,22.64 36.44,22.36 36.9,22.07 36.88,22 31.44,22 31.49,22.17 31.42,22.23 31.25,21.99 24.98,22 24.98,29.18 24.69,30.14 24.99,30.79 24.86,31.38 25.15,31.66 25.19,31.53 25.3,31.51 25.97,31.62 27.32,31.38 27.45,31.22 27.85,31.24 27.93,31.1 28.42,31.08 29.03,30.83 29.5,30.96 30.07,31.33 30.17,31.22 30.29,31.24 30.18,31.28 30.31,31.35 30.34,31.5 30.4,31.44 30.36,31.51 30.54,31.46 30.97,31.59 30.54,31.4 30.73,31.39 31.12,31.49 30.98,31.58 31.1,31.61 31.56,31.44 31.87,31.54 31.91,31.53 32.2,31.3 31.89,31.53 31.77,31.28 32.04,31.22 32.04,31.09 32.27,31.12 32.21,31.3 32.4,31.22 32.4,30");
const TRANSJ = pl("35.56,32.64 35.77,32.75 35.9,32.71 36,32.66 36.07,32.52 36.18,32.53 36.39,32.38 36.81,32.31 38.77,33.37 39.06,32.5 38.98,32.47 39.03,32.33 39.24,32.35 39.29,32.24 38.96,31.99 36.96,31.49 37.98,30.5 37.65,30.33 37.47,29.99 36.73,29.85 36.48,29.49 36.02,29.19 34.95,29.35 35,29.52 34.96,29.59 35.09,30.03 35.15,30.12 35.14,30.43 35.44,31.1 35.4,31.26 35.45,31.4 35.48,31.64 35.56,31.77 35.52,32.06 35.57,32.24");
const PALMANP = "34.2,31.31 34.48,31.58 34.71,31.95 34.84,32.28 34.95,32.81 34.97,32.84 35.03,32.83 35.06,32.86 35.1,33.09 35.28,33.1 35.34,33.06 35.48,33.09 35.53,33.24 35.56,33.28 35.58,33.1 35.56,32.9 35.58,32.68 35.61,32.68 35.56,32.64 35.58,32.56 35.55,32.52 35.58,32.49 35.55,32.41 35.57,32.24 35.52,32.06 35.55,31.94 35.52,31.92 35.56,31.77 35.48,31.64 35.45,31.4 35.4,31.26 35.44,31.1 35.39,31.02 35.39,30.96 35.32,30.89 35.32,30.82 35.21,30.62 35.14,30.43 35.16,30.36 35.13,30.24 35.15,30.12 35.09,30.03 34.99,29.65 34.91,29.49 34.89,29.49 34.86,29.55 34.82,29.74 34.74,29.94 34.73,30.01 34.6,30.34 34.53,30.41 34.54,30.48 34.48,30.65";
const PALMAN = pl(PALMANP), PALMANS = pl(PALMANP, true);
const ISR49P = "34.25,31.21 34.35,31.29 34.35,31.36 34.37,31.39 34.56,31.54 34.48,31.58 34.61,31.77 34.71,31.95 34.84,32.28 34.94,32.72 34.95,32.81 34.97,32.84 35.03,32.83 35.06,32.86 35.1,33.09 35.28,33.1 35.35,33.06 35.48,33.09 35.51,33.15 35.53,33.24 35.56,33.28 35.58,33.1 35.56,32.9 35.58,32.68 35.61,32.68 35.56,32.64 35.58,32.56 35.56,32.55 35.55,32.52 35.58,32.49 35.55,32.41 35.56,32.39 35.41,32.42 35.39,32.49 35.36,32.51 35.27,32.51 35.19,32.54 35.04,32.43 35.02,32.35 35,32.32 34.99,32.28 35.01,32.25 34.96,32.19 35,32.03 34.99,31.97 35.04,31.91 35.03,31.86 34.98,31.83 35.07,31.85 35.14,31.81 35.19,31.81 35.2,31.82 35.22,31.81 35.21,31.73 35.18,31.72 35.13,31.73 34.95,31.61 34.93,31.49 34.87,31.4 34.88,31.36 34.93,31.34 35.17,31.36 35.39,31.49 35.46,31.49 35.45,31.4 35.4,31.26 35.44,31.16 35.44,31.1 35.39,31.02 35.39,30.96 35.32,30.89 35.32,30.82 35.28,30.78 35.21,30.62 35.14,30.43 35.16,30.36 35.13,30.24 35.15,30.12 35.09,30.03 34.99,29.65 34.95,29.55 34.91,29.49 34.89,29.49 34.86,29.55 34.82,29.74 34.74,29.94 34.73,30.01 34.6,30.34 34.53,30.41 34.54,30.48 34.5,30.53 34.48,30.65";
const ISR49 = pl(ISR49P), ISR49S = pl(ISR49P, true);
const WB49P = "34.87,31.4 34.93,31.49 34.94,31.58 34.97,31.63 35.13,31.73 35.21,31.73 35.22,31.81 35.2,31.82 35.19,31.81 35.14,31.81 35.07,31.85 34.98,31.83 35.03,31.86 35.04,31.91 34.99,31.97 35.01,32.03 34.96,32.19 35.01,32.25 34.99,32.28 35,32.34 35.02,32.35 35.06,32.46 35.19,32.54 35.27,32.51 35.36,32.51 35.39,32.49 35.41,32.42 35.56,32.38 35.57,32.37 35.57,32.24 35.54,32.11 35.55,32.09 35.52,32.06 35.55,31.94 35.53,31.92 35.56,31.77 35.48,31.64 35.46,31.49 35.39,31.49 35.16,31.36 34.93,31.34 34.88,31.36";
const WB49 = pl(WB49P), WB49S = pl(WB49P, true);
const GAZAP = "34.48,31.58 34.56,31.54 34.37,31.39 34.35,31.36 34.35,31.29 34.25,31.21 34.2,31.31 34.35,31.44";
const GAZA = pl(GAZAP), GAZAS = pl(GAZAP, true);
const GOLAN = pl("35.57,33.28 35.6,33.24 35.62,33.27 35.65,33.28 35.7,33.32 35.77,33.34 35.82,33.41 35.81,33.36 35.76,33.33 35.8,33.31 35.77,33.27 35.8,33.25 35.81,33.2 35.83,33.19 35.81,33.11 35.85,33.1 35.86,32.99 35.89,32.94 35.85,32.9 35.83,32.83 35.76,32.74 35.64,32.68 35.58,32.68 35.56,32.9 35.58,33.1", true);
const JEWA = pl("35.4,33.06 35.62,33.28 35.65,32.75 35.55,32.4 35.3,32.5 35.38,32.8", true);
const JEWB = pl("34.9,32.85 35.1,32.7 35.0,32.35 35.0,32.0 34.85,31.8 34.6,31.8 34.6,32.9", true);
const JEWC = pl("34.27,31.22 34.65,31.7 35.0,31.65 35.35,31.3 35.3,30.7 35.0,29.55", true);
const ARBA = pl("35.1,33.09 35.4,33.06 35.38,32.8 35.1,32.7 34.95,32.85", true);
const ARBB = pl("35.05,32.7 35.55,32.4 35.55,31.3 35.2,31.3 35.0,31.65 35.0,32.35", true);
const ARBC = pl("34.2,31.3 34.65,31.65 34.4,31.2", true);
const JERSEP = pl("35.12,31.9 35.32,31.9 35.32,31.68 35.12,31.68", true);
/* ---------- atlas-checked outlines (see docs/ATLAS_CHECK.md) ---------- */
const plm = (a: string[], soft?: boolean): Poly[] => a.map((s) => pl(s, soft));
const SEL200 = plm([
  "25.29,38.54 25.74,38.39 27.47,38.55 28.96,38.49 29.53,38.27 29.72,37.85 30.24,37.71 32.57,38.6 33.1,38.32 33.36,37.87 33.75,37.71 34.35,37.68 38.07,38.33 40.52,37.61 41.64,37.52 44.2,38.12 44.6,37.96 45.78,36.7 46.62,36.24 47.43,36.03 48.79,36.1 49.8,36.51 50.44,36.96 51.78,36.53 52.69,36.59 52.48,35.2 52.17,34.36 53.48,31.81 53.43,31.08 53.82,30.79 55.78,30.85 57.3,31.35 59.96,31.66 60.62,31.95 61.07,32.48 62.67,32.89 63.36,33.31 64.55,33.44 66.36,34.14 68.27,34.17 69.92,33.93 70.22,32.81 70.02,31.56 68.87,29.95 68.13,28.61 67.8,28.27 67.14,28.33 66.74,28.15 65.62,26.24 65.24,25.07 64.86,25.23 63.28,24.97 62.55,25.12 62.16,24.95 61.3,25.01 61.08,24.95 60.53,25.1 59.88,25.13 59.4,25.25 59.01,25.2 58.73,25.36 58.14,25.35 57.19,25.62 56.97,26.03 56.85,26.74 56.67,26.93 56.56,26.73 56.4,26.64 56.12,26.96 55.76,26.93 55.34,26.5 54.29,26.33 54.26,26.45 54.08,26.3 53.41,26.6 53.12,26.63 52.96,26.79 52.95,26.92 52.43,27.24 52.37,27.45 51.96,27.64 51.5,27.67 51.26,27.79 50.91,28.58 50.57,29 50.55,29.37 50.03,29.93 48.58,30.2 48.29,29.92 48.33,29.54 47.76,29.32 46.74,29.81 44.32,31.45 41.05,33.83 40.07,34.33 39.54,34.22 38.3,33.18 37.34,31.86 36.78,31.38 35.85,30.95 35.17,30.87 34.44,31 34.18,31.29 34.54,31.71 34.81,32.73 35.77,34.52 35.68,35.01 35.72,35.3 35.59,35.41 35.56,35.58 35.72,36.05 35.59,36.38 34.46,36.71 34.17,36.68 33.58,36.2 32.27,36 31.94,36.36 31.24,36.62 30.39,36.81 29.98,36.71 29.79,36.24 29.14,36.14 28.95,36.25 28.88,36.4 28.45,36.58 28.42,36.29 28.03,36.61 27.61,36.71 27.13,36.64 26.6,37.07 26.42,37.12 26.33,37.38 26.17,37.35 26.06,37.84 26.42,37.88 26.47,37.94 26.23,38.06 26.06,37.96 25.89,37.98 25.7,38.14 25.67,38.34 25.39,38.36",
  "56.41,26.58 56.61,26.52 56.71,26.37 56.65,25.9 56.53,25.69 56.57,25.52 56.5,25.54",
]);
const SEL188 = pl("32.92,36.49 34.33,37.29 35.55,37.46 37.48,38.24 38.07,38.33 39.92,37.77 41.17,37.52 41.85,37.54 43.52,38.05 44.38,38.09 45.57,36.85 46.21,36.43 47.29,36.05 48.23,36 48.79,36.1 49.8,36.51 50.44,36.96 51.78,36.53 52.69,36.59 52.48,35.2 52.17,34.36 53.48,31.81 53.48,30.98 53.69,30.81 54.14,30.75 54.53,29.95 54.58,29.52 54.34,29.08 54.26,28.22 53.79,27.52 53.5,26.56 53.12,26.63 52.96,26.79 52.95,26.92 52.43,27.24 52.37,27.45 51.96,27.64 51.57,27.65 51.26,27.79 50.87,28.62 50.76,28.67 50.57,29 50.55,29.37 49.93,29.97 49.52,29.95 49.09,30.18 48.58,30.2 48.29,29.92 48.33,29.54 47.76,29.32 46.74,29.81 44.32,31.45 41.05,33.83 40.07,34.33 39.54,34.22 38.3,33.18 37.34,31.86 36.78,31.38 35.85,30.95 35.17,30.87 34.44,31 34.18,31.29 34.54,31.71 34.81,32.73 35.77,34.52 35.68,35.01 35.72,35.3 35.59,35.41 35.56,35.58 35.72,36.05 35.58,36.39 35.44,36.36 35.34,36.48 34.46,36.71 33.89,36.53 33.58,36.2 33.29,36.17");
const SEL100 = pl("32.92,36.49 34.19,37.23 34.63,37.32 35.42,37.12 36.18,37.13 36.55,36.87 37.06,36.75 37.67,36.85 38.04,36.54 38.09,35.88 38.37,35.75 38.89,35.82 39.75,35.61 40.35,35.11 40.46,34.77 40.09,34.4 39.36,34.12 38.44,33.3 37.01,32.89 36.27,32.3 35.53,32.29 35.27,32.57 34.81,32.56 35.77,34.52 35.68,35.01 35.72,35.3 35.59,35.41 35.56,35.58 35.72,36.05 35.59,36.38 34.46,36.71 33.89,36.53 33.58,36.2 33.29,36.17");
const SEL64 = pl("35.5,34.19 35.79,34.6 35.68,35.04 35.72,35.3 35.6,35.4 35.56,35.58 35.62,35.94 35.72,36.04 35.66,36.14 35.7,36.38 35.99,36.56 36.56,36.57 37.67,36.85 38.06,36.41 37.85,35.55 37.06,35.09 36.21,34.15 35.54,33.99");
const RASHN = plm([
  "42.5,41 44.2,41.7 48.4,42.2 49.74,40.8 50.5,40.5 50.31,40.04 49.69,40.04 49.58,39.2 49.06,38.76 49.19,37.84 49.84,37.66 50.5,37 52,36.4 54.5,36.6 57,37.8 60,38.3 63,38.3 63,25.02 61.74,24.81 57.71,25.44 57.15,25.67 56.67,26.94 56.47,26.66 55.48,26.39 55.38,26.06 55.12,26.15 55.11,26.46 54.75,26.3 54.74,25.82 54.47,25.71 54.32,26.42 53.93,26.29 53.12,26.63 52.37,27.45 51.26,27.79 50.87,28.63 50.13,29.12 50.31,29.47 49.93,29.99 49.57,29.82 49.12,30 48.56,29.73 48.59,29.33 48.35,29.09 49.08,27.79 49.84,27.45 49.8,27.15 50.31,26.79 50.4,26.43 50.76,26.45 50.87,26.15 51.3,26.35 51.73,26.01 51.91,24.43 52.3,24.74 52.85,24.35 53.4,24.61 53.96,24.44 55.75,25.9 56.07,26.42 56.56,26.55 56.71,26.33 56.56,25.08 56.77,24.62 57.27,24.12 58.87,23.71 59.56,22.8 59.98,22.64 60.02,22.22 59.5,21.32 59,20.92 59.15,20.49 58.88,20.09 58.05,20.14 57.99,18.89 56.93,18.58 56.7,18 56.14,17.74 56.2,17.35 55.74,17.32 55.77,17.7 55.6,17.67 55.11,16.83 54.16,16.81 52.63,16.27 52.38,15.98 52.39,15.5 51.76,15.16 49.44,14.46 48.75,13.85 48.03,13.85 46.75,13.24 45.74,13.15 45.12,12.57 43.64,12.53 43.6,11.98 43,12.4 41.97,14.07 42.54,13.43 43.09,13.09 42.98,13.87 42.83,13.51 42.49,13.64 42.52,14.12 42.84,14.26 42.68,14.98 42.18,15.68 42.28,15.92 42.64,15.99 42.52,16.64 42.38,16.76 42.35,16.47 42.12,16.39 41.49,16.8 41.63,17.16 42.17,16.99 42.11,17.34 41.33,18.11 40.74,19.37 39.14,20.81 38.73,21.98 38.88,22.51 38.28,23.65 37.27,24.25 36.88,24.9 36.98,25.16 36.34,25.5 36.39,25.95 35,27.89 34.47,27.73 34.04,27.25 34.2,26.68 35.39,24.54 35.97,24 35.71,23.71 35.96,22.94 36.39,22.93 37.06,22.18 37.07,21.88 24,22 21,26 11.5,31.5 11.08,34.03 11.53,33.38 12.38,33.03 13.38,33.1 15.26,32.58 15.86,31.57 17.92,31.11 19.07,30.47 19.53,30.6 19.92,31.02 19.72,31.77 19.93,32.31 20.47,32.74 21.71,33.15 23.19,32.82 23.35,32.42 25.06,32.15 25.35,31.71 27.01,31.64 29.07,31.03 30.3,31.7 31.09,31.81 31.97,31.73 32.65,31.26 33.09,31.44 33.8,31.36 34.44,31.88 34.78,32.93 35.75,34.66 35.52,35.56 35.74,36.04 35.6,36.39 34.73,36.61 34.17,36.15 34.7,36.9 40.5,39.6"
]);
const UMAYN = plm([
  "48.4,42.2 49.74,40.8 50.5,40.5 50.31,40.04 49.69,40.04 49.58,39.2 49.06,38.76 49.19,37.84 49.84,37.66 50.5,37 52,36.4 54.5,36.6 57,37.8 60,38.3 63,38.3 63,25.02 61.74,24.81 57.71,25.44 57.15,25.67 56.67,26.94 56.47,26.66 55.48,26.39 55.38,26.06 55.12,26.15 55.11,26.46 54.75,26.3 54.74,25.82 54.47,25.71 54.32,26.42 53.93,26.29 53.12,26.63 52.37,27.45 51.26,27.79 50.87,28.63 50.13,29.12 50.31,29.47 49.93,29.99 49.57,29.82 49.12,30 48.56,29.73 48.59,29.33 48.35,29.09 49.08,27.79 49.84,27.45 49.8,27.15 50.31,26.79 50.4,26.43 50.76,26.45 50.87,26.15 51.3,26.35 51.73,26.01 51.91,24.43 52.3,24.74 52.85,24.35 53.4,24.61 53.96,24.44 55.75,25.9 56.07,26.42 56.56,26.55 56.71,26.33 56.56,25.08 56.77,24.62 57.27,24.12 58.87,23.71 59.56,22.8 59.98,22.64 60.02,22.22 59.5,21.32 59,20.92 59.15,20.49 58.88,20.09 58.05,20.14 57.99,18.89 56.93,18.58 56.7,18 56.14,17.74 56.2,17.35 55.74,17.32 55.77,17.7 55.6,17.67 55.11,16.83 54.16,16.81 52.63,16.27 52.38,15.98 52.39,15.5 51.76,15.16 49.44,14.46 48.75,13.85 48.03,13.85 46.75,13.24 45.74,13.15 45.12,12.57 43.64,12.53 43.6,11.98 43,12.4 41.97,14.07 42.54,13.43 43.09,13.09 42.98,13.87 42.83,13.51 42.49,13.64 42.52,14.12 42.84,14.26 42.68,14.98 42.18,15.68 42.28,15.92 42.64,15.99 42.52,16.64 42.38,16.76 42.35,16.47 42.12,16.39 41.49,16.8 41.63,17.16 42.17,16.99 42.11,17.34 41.33,18.11 40.74,19.37 39.14,20.81 38.73,21.98 38.88,22.51 38.28,23.65 37.27,24.25 36.88,24.9 36.98,25.16 36.34,25.5 36.39,25.95 35,27.89 34.47,27.73 34.04,27.25 34.2,26.68 35.39,24.54 35.97,24 35.71,23.71 35.96,22.94 36.39,22.93 37.06,22.18 37.07,21.88 24,22 23.25,23 18,26 12,27.5 5,28 5,37.02 5.34,36.85 6.41,37.29 8.47,37.11 8.92,37.31 8.7,37.53 8.94,37.74 9.13,37.42 9.76,37.54 10.33,37.38 10.47,37.04 10.75,37.33 11.14,37.26 11.31,36.77 10.68,36.13 11.23,35.72 11.22,35.02 11.5,34.7 10.78,34.47 10.26,34.16 10.3,33.99 10.52,33.85 11.01,34.08 11.32,33.49 12.37,33.03 13.38,33.1 15.26,32.58 15.86,31.57 17.92,31.11 19.02,30.47 19.53,30.6 19.92,31.02 19.72,31.77 19.93,32.31 20.47,32.74 21.71,33.15 23.19,32.82 23.35,32.42 25.06,32.15 25.35,31.71 27.01,31.64 29.07,31.03 30.3,31.7 31.09,31.81 31.97,31.73 32.65,31.26 33.09,31.44 33.63,31.32 34.44,31.88 34.78,32.93 35.75,34.66 35.52,35.56 35.74,36.04 35.6,36.39 34.73,36.61 34.17,36.15 34.7,36.9 40.5,39.6 42.5,41 44.2,41.7"
]);
const ABBN = plm([
  "42.5,41 44.2,41.7 48.4,42.2 49.74,40.8 50.83,40.3 50.42,40.02 49.69,40.04 49.58,39.2 49.06,38.76 49.19,37.84 50.29,37.57 51.09,36.95 51.92,36.79 53.77,37.1 53.64,38.66 54.5,38.2 57,37.8 60,38.3 63,38.3 63,25.02 61.74,24.81 57.71,25.44 57.15,25.67 56.67,26.94 56.47,26.66 55.48,26.39 55.38,26.06 55.12,26.15 55.11,26.46 54.75,26.3 54.74,25.82 54.47,25.71 54.32,26.42 53.93,26.29 53.12,26.63 52.37,27.45 51.26,27.79 50.87,28.63 50.13,29.12 50.31,29.47 49.93,29.99 49.57,29.82 49.12,30 48.56,29.73 48.59,29.33 48.35,29.09 49.08,27.79 49.84,27.45 49.8,27.15 50.31,26.79 50.4,26.43 50.76,26.45 50.87,26.15 51.3,26.35 51.73,26.01 51.91,24.43 52.3,24.74 52.85,24.35 53.4,24.61 53.96,24.44 55.75,25.9 56.07,26.42 56.56,26.55 56.71,26.33 56.56,25.08 56.77,24.62 57.27,24.12 58.87,23.71 59.56,22.8 59.98,22.64 60.02,22.22 59.5,21.32 59,20.92 59.15,20.49 58.88,20.09 58.05,20.14 57.99,18.89 56.93,18.58 56.7,18 56.14,17.74 56.2,17.35 55.74,17.32 55.77,17.7 55.6,17.67 55.11,16.83 54.16,16.81 52.63,16.27 52.38,15.98 52.39,15.5 51.76,15.16 49.44,14.46 48.75,13.85 48.03,13.85 46.75,13.24 45.74,13.15 45.12,12.57 43.64,12.53 43.6,11.98 43,12.4 41.97,14.07 42.54,13.43 43.09,13.09 42.98,13.87 42.83,13.51 42.49,13.64 42.52,14.12 42.84,14.26 42.68,14.98 42.18,15.68 42.28,15.92 42.64,15.99 42.52,16.64 42.38,16.76 42.35,16.47 42.12,16.39 41.49,16.8 41.63,17.16 42.17,16.99 42.11,17.34 41.33,18.11 40.74,19.37 39.14,20.81 38.73,21.98 38.88,22.51 38.28,23.65 37.27,24.25 36.88,24.9 36.98,25.16 36.34,25.5 36.39,25.95 35,27.89 34.47,27.73 34.04,27.25 34.2,26.68 35.39,24.54 35.97,24 35.71,23.71 35.96,22.94 36.39,22.93 37.06,22.18 37.07,21.88 24,22 19.5,26 19.5,30.6 19.95,31.1 19.74,31.99 20.22,32.58 20.99,32.96 22.18,33.15 23.2,32.81 23.35,32.42 25.06,32.15 25.35,31.71 27.01,31.64 29.07,31.03 30.3,31.7 31.07,31.81 31.97,31.73 32.65,31.26 33.97,31.41 34.44,31.88 34.78,32.93 35.75,34.66 35.52,35.56 35.74,36.04 35.6,36.39 34.73,36.61 34.17,36.15 34.7,36.9 40.5,39.6"
]);
const ABBCORE = plm([
  "46.13,35.29 46.14,35.1 45.91,35.09 45.67,34.81 45.7,34.55 45.5,34.59 45.42,34.44 45.56,34.31 45.54,34.14 45.38,33.97 45.73,33.58 45.89,33.63 45.85,33.49 46.16,33.26 46.03,33.11 46.1,32.95 46.48,32.89 47.09,32.47 47.41,32.4 47.83,31.81 47.67,30.99 48.01,30.99 48.01,30.46 48.31,30.31 48.55,29.93 47.97,30 47.93,30.11 47.95,29.99 47.67,30.1 47.2,30.03 46.53,29.1 44.72,29.19 42.08,31.08 40.42,31.92 39.15,32.12 39.26,32.34 39.03,32.33 38.77,33.37 40.97,34.4 41.2,34.79 41.22,35.3"
]);
const SELJ1 = plm([
  "53.61,36.88 54.01,36.82 53.91,37.34 54.65,37.44 55.13,37.95 56,38.07 56,38.3 63,38.3 63,34 60.9,34 60.69,32.68 60.83,32.17 60.79,32 60.58,32 60.5,31.5 56,31.5 56,32 47.67,32 47.34,32.46 46.1,32.95 46.16,33.26 45.38,33.97 45.56,34.29 45.42,34.44 45.5,34.59 45.7,34.55 45.76,34.91 46.14,35.1 45.96,35.58 46.33,35.8 45.32,35.99 45.24,36.4 45.07,36.42 45.04,36.69 44.82,36.81 44.89,37.02 44.57,37.43 44.6,37.72 44.2,37.9 44.46,38.34 44.29,38.38 44.28,38.84 44.01,39.37 44.39,39.41 44.59,39.77 45.46,38.99 46.53,38.88 47.97,39.7 48.34,39.38 48.11,39.27 48.29,39 47.99,38.85 48.61,38.4 48.87,38.43 49.13,37.62 50.2,37.39 50.32,37.15 51,36.77 51.91,36.58"
]);
const SELJ2 = plm([
  "44.57,39.77 45.44,39 46.13,38.86 47.97,39.7 48.34,39.38 48.11,39.27 48.29,39 47.99,38.85 48.87,38.43 49.13,37.62 50.2,37.39 51,36.77 51.91,36.58 54.01,36.82 53.91,37.34 54.65,37.44 55.13,37.95 56,38.07 56,38.3 63,38.3 63,34 60.9,34 60.69,32.68 60.82,31.49 61.69,31.37 61.83,31.03 60.84,29.86 61.89,28.54 62.76,28.25 62.74,27.27 63.32,27.12 63.16,26.65 61.83,26.23 61.41,25.06 60.55,25.45 60.47,25.29 58.07,25.56 57.31,25.78 56.81,27.14 56.12,27.16 54.62,26.51 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.92,30.38 49.2,30.35 49.21,30.51 48.95,30.5 49.04,30.43 48.93,30.42 48.86,30.35 48.93,30.06 48.55,29.93 47.2,30.03 46.53,29.1 44.72,29.19 42.08,31.08 40.42,31.92 39.15,32.12 39.29,32.24 39.03,32.33 38.77,33.37 40.99,34.43 41.39,36.52 41.82,36.6 42.77,37.37 44.09,37.31 44.28,36.97 44.77,37.14 44.6,37.72 44.2,37.9 44.46,38.34 44.01,39.37 44.39,39.41"
]);
const SELJ3 = plm([
  "44.57,39.77 45.44,39 46.13,38.86 47.97,39.7 48.34,39.38 48.11,39.27 48.29,39 47.99,38.85 48.87,38.43 49.13,37.62 50.2,37.39 51,36.77 51.91,36.58 54.01,36.82 53.91,37.34 54.65,37.44 55.13,37.95 56,38.07 56,38.3 63,38.3 63,34 60.9,34 60.69,32.68 60.82,31.49 61.69,31.37 61.83,31.03 60.84,29.86 61.89,28.54 62.76,28.25 62.74,27.27 63.32,27.12 63.16,26.65 61.83,26.23 61.41,25.06 60.55,25.45 60.47,25.29 58.07,25.56 57.31,25.78 56.81,27.14 56.12,27.16 54.62,26.51 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.92,30.38 49.2,30.35 49.21,30.51 48.95,30.5 49.04,30.43 48.93,30.42 48.86,30.35 48.93,30.06 48.55,29.93 47.2,30.03 46.53,29.1 44.72,29.19 42.08,31.08 40.42,31.92 39.16,32.12 36.96,31.49 37.98,30.5 37.47,29.99 36.73,29.85 36.48,29.5 35.1,29.5 35.1,33.1 35.99,34.55 35.8,35.85 36.16,35.82 36.37,36.23 36.66,36.23 36.64,36.83 37.45,36.63 38.22,36.91 39.24,36.66 42.21,37.32 42.55,37.14 42.78,37.38 44.09,37.31 44.3,36.97 44.8,37.29 44.6,37.72 44.2,37.9 44.46,38.34 44.01,39.37 44.39,39.41"
]);
const SELJA = plm([
  "42.66,41.59 43.72,40.76 43.67,40.11 44.33,40.03 44.81,39.64 44.57,39.77 44.39,39.41 44.01,39.37 44.46,38.34 44.2,37.9 44.6,37.72 44.77,37.14 44.3,36.97 44.09,37.31 42.78,37.38 42.55,37.14 42.21,37.32 39.24,36.66 38.22,36.91 37.45,36.63 36.64,36.83 36.67,36.24 36.37,36.23 36.14,35.82 35.79,36.3 36.21,36.64 36.02,36.93 35.35,36.54 34.69,36.81 33.96,36.21 32.8,36.03 31.34,36.81 30.69,36.89 30.43,36.23 29.67,36.12 29.01,36.55 29,40.65 29.94,40.74 29.25,40.81 29.01,41.03 29.17,41.23 31.23,41.09 32.61,41.84 34.95,42.1 35.49,41.65 36.04,41.7 36.4,41.26 36.76,41.37 38.33,40.92 39.43,41.11 40.14,40.92 41.52,41.51"
]);
const SELJ4 = plm([
  "44.57,39.77 45.44,39 46.13,38.86 47.97,39.7 48.34,39.38 48.11,39.27 48.29,39 47.99,38.85 48.87,38.43 49.13,37.62 50.2,37.39 51,36.77 51.91,36.58 54.01,36.82 53.91,37.34 54.65,37.44 55.13,37.95 56,38.07 56,38.3 63,38.3 63,34 60.9,34 60.69,32.68 60.82,31.49 61.69,31.37 61.83,31.03 60.84,29.86 61.89,28.54 62.76,28.25 62.74,27.27 63.32,27.12 63.16,26.65 61.83,26.23 61.41,25.06 60.55,25.45 60.47,25.29 58.07,25.56 57.31,25.78 56.81,27.14 56.12,27.16 54.62,26.51 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.92,30.38 49.2,30.35 49.21,30.51 48.95,30.5 49.04,30.43 48.93,30.42 48.86,30.35 48.93,30.06 48.55,29.93 47.2,30.03 46.53,29.1 44.72,29.19 42.08,31.08 40.42,31.92 39.15,32.12 39.29,32.24 39.03,32.33 38.77,33.37 40.99,34.43 41.39,36.52 41.82,36.6 42.77,37.37 44.09,37.31 44.28,36.97 44.77,37.14 44.6,37.72 44.2,37.9 44.46,38.34 44.01,39.37 44.39,39.41"
]);
const CRU1 = plm([
  "35.58,34.5 35.75,34.66 35.67,34.9 35.69,35.1 35.89,35.34 35.7,36.55 36,36.8 36.4,36.9 36.7,36.79 36.64,37.12 36.88,37.45 37.44,37.74 37.59,38.32 38.11,38.46 38.66,38.77 39.7,38.41 40.19,38.13 40.56,37.74 40.56,37.31 39.95,37.02 37.99,36.58 37.25,36.63 36.77,36.76 36.95,36.6 36.9,35.4 36.5,35.3 36.3,35.3 36.4,34.7 36.3,34 35.55,34",
  "35.07,32.94 35.25,33.4 35.49,33.4 35.42,33.34 35.26,32.91 35.7,32.85 35.7,32.2 35.5,31.1 35,31.3 34.8,31.6 34.5,31.9 34.78,32.93"
]);
const CRU2 = plm([
  "35.58,34.5 35.75,34.66 35.67,34.9 35.69,35.1 35.89,35.34 35.7,36.55 36,36.8 36.4,36.9 36.7,36.79 36.64,37.12 36.88,37.45 37.44,37.74 37.59,38.32 38.11,38.46 38.66,38.77 39.7,38.41 40.19,38.13 40.56,37.74 40.56,37.31 39.95,37.02 37.99,36.58 37.25,36.63 36.77,36.76 36.95,36.6 36.9,35.4 36.5,35.3 36.3,35.3 36.4,34.7 36.3,34 35.55,34",
  "35.72,32.58 35.96,32.43 36.09,32.02 36.21,31.45 36.21,30.93 36.09,30.41 35.66,29.83 35.19,29.36 34.98,29.52 34.92,30.1 35.05,30.62 35.1,31.2 34.9,31.62 34.6,31.92 34.46,31.92 34.65,32.34 34.77,32.91 34.88,33.02 34.92,33.18 35.09,33.55 35.18,33.64 35.27,33.89 35.84,33.88 35.66,33.5 35.63,32.99"
]);
const CRU3 = plm([
  "35.08,30.99 35.1,31.2 34.9,31.62 34.6,31.92 34.46,31.92 34.65,32.34 34.77,32.91 34.88,33.02 34.92,33.18 35.09,33.55 35.18,33.64 35.27,33.89 35.84,33.88 35.66,33.5 35.63,32.99 35.72,32.58 35.96,32.43 36.09,32.02 36.21,31.45 36.21,30.93 36.09,30.41 35.66,29.83 35.19,29.36 34.98,29.52 34.92,30.1 35.07,30.9 34.6,30.95 34.2,31.2 34.5,31.75 35,31.4",
  "35.58,34.5 35.75,34.66 35.67,34.9 35.69,35.1 35.89,35.34 35.7,36.55 36,36.8 36.4,36.9 36.8,36.75 36.95,36.6 36.9,35.4 36.5,35.3 36.3,35.3 36.4,34.7 36.3,34 35.55,34"
]);
const CRU4 = plm([
  "35.59,34.51 35.75,34.66 35.67,34.9 35.69,35.1 35.86,35.3 36.3,35.3 36.3,34 35.55,34",
  "36.4,36.3 36.3,35.9 35.9,35.9 35.8,36.4 36.1,36.5",
  "35.08,33 35.2,33.22 35.19,33.28 35.27,33.46 35.33,33.5 35.61,33.5 35.36,33"
]);
const FAT1 = plm([
  "40.4,23 40.8,21 41.6,19 42.5,17.2 43.2,16.2 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.28,19.89 39.63,20.2 38.99,21.02 38.88,21.28 38.89,21.62 38.73,21.98 38.88,22.51 38.28,23.65 37.66,24.05 37.41,24.1 37.27,24.25 36.88,24.9 36.98,25.16 36.81,25.18 36.34,25.5 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35,27.89 34.76,27.72 34.47,27.73 34.38,27.57 34.24,27.53 34.2,27.32 34.04,27.25 34.19,26.96 34.2,26.68 35.39,24.54 35.97,24 35.97,23.8 35.86,23.71 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25.2,31.53 25.2,30.5 19.5,30.3 15,30.8 11,31.8 8.3,34.5 8.3,37.15 8.47,37.11 8.8,37.2 8.92,37.31 8.74,37.4 10.26,37.4 10.45,37.27 10.47,37.04 10.6,37.08 10.63,37.24 10.77,37.34 11.22,37.19 11.31,36.77 10.95,36.32 10.68,36.2 10.68,36.13 10.77,35.98 11.23,35.72 11.26,35.41 11.36,35.24 11.22,35.02 11.46,34.94 11.5,34.7 11.42,34.57 11.13,34.44 10.84,34.5 10.26,34.16 10.23,34.06 10.44,33.87 10.54,33.86 10.66,34.07 10.99,34.09 11.24,33.9 11.32,33.49 12.37,33.03 12.79,33 13.38,33.1 14.25,32.9 14.54,32.71 15.26,32.58 15.45,32.42 15.67,31.76 15.86,31.57 16.1,31.47 16.98,31.38 17.92,31.11 19.07,30.47 19.62,30.66 19.92,31.02 19.95,31.15 19.88,31.26 25,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.21,31.32 35,32.5 35.62,34.54 35.75,34.66 35.69,34.84 35.9,35.8 36.2,36.5 36.9,36 37.2,34.6 38,33.8 36.6,31.3 36.4,29.6 37.6,27.3 39.4,25",
]);
const FAT2 = plm([
  "40.4,23 40.8,21 41.6,19 42.5,17.2 43.2,16.2 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.28,19.89 39.63,20.2 38.99,21.02 38.88,21.28 38.89,21.62 38.73,21.98 38.88,22.51 38.28,23.65 37.66,24.05 37.41,24.1 37.27,24.25 36.88,24.9 36.98,25.16 36.81,25.18 36.34,25.5 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35,27.89 34.76,27.72 34.47,27.73 34.38,27.57 34.24,27.53 34.2,27.32 34.04,27.25 34.19,26.96 34.2,26.68 35.39,24.54 35.97,24 35.97,23.8 35.86,23.71 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25.2,31.53 25.2,31 23,30.9 21,31 20,32 20,32.38 20.45,32.72 20.99,32.96 21.35,32.98 21.59,33.13 22.16,33.15 23.2,32.81 23.31,32.7 23.35,32.42 23.88,32.35 24.16,32.21 24.75,32.23 25.07,32.15 25.2,32.03 25.2,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.21,31.32 35,32.5 35.62,34.54 35.75,34.66 35.69,34.84 35.9,35.8 36.3,35.6 36.2,34.5 36.6,33.4 37,32.6 36.6,31.3 36.4,29.6 37.6,27.3 39.4,25",
]);
const FAT3 = plm([
  "34.29,31.67 34.9,31.9 34.8,31.4 34.25,31.31 34.3,31.3 34.2,29.6 35.11,27.81 35,27.89 34.76,27.72 34.47,27.73 34.38,27.57 34.24,27.53 34.2,27.32 34.04,27.21 34.19,26.96 34.29,26.51 35.39,24.54 35.98,23.98 35.92,23.75 35.71,23.71 35.74,23.43 35.91,23.24 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.2,31.32",
]);
const AYY0 = plm([
  "52,15.3 51.44,15.04 50.6,14.85 50.23,14.65 49.44,14.46 49.21,14.32 48.77,13.86 48.19,13.77 48.03,13.85 47.49,13.48 46.75,13.24 45.74,13.15 45.52,12.91 45.27,12.83 45.25,12.71 43.3,12.9 42.77,15.99 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.56,19.58 40.1,20.01 39.63,20.2 39.14,20.81 38.89,21.26 38.93,21.44 38.73,21.98 38.88,22.51 38.45,23.36 38.16,23.76 37.66,24.05 37.43,24.09 37.27,24.25 36.88,24.9 36.98,25.16 36.8,25.19 36.33,25.52 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35.11,27.81 34.93,27.88 34.82,27.74 34.47,27.73 34.38,27.57 34.24,27.53 34.22,27.34 34.04,27.25 34.19,26.96 34.2,26.68 35.39,24.54 35.97,24 35.97,23.8 35.86,23.71 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25.2,31.53 25.2,31 23,30.9 21,31 20,32 20,30.8 19.71,30.76 19.95,31.1 19.72,31.68 19.77,32.07 19.93,32.31 20.47,32.74 20.99,32.96 21.35,32.98 21.57,33.13 22.16,33.15 23.2,32.81 23.31,32.7 23.35,32.42 23.88,32.35 24.16,32.21 24.75,32.23 25.07,32.15 25.2,32.03 25.2,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.3,31.3 35,32.5 35.66,34.6 35.75,34.66 35.71,34.79 36.1,36.4 36.4,37.2 37.6,37.7 39.5,38.2 41.8,38.3 43.2,37.9 44.2,37.3 44,36.3 43,35.5 41.5,34.7 39.5,34.5 38.2,33.9 37.6,33 36.6,32 36.4,31 36,29.8 35.5,29.6 36.4,29.6 37.6,27.3 39.4,25 40.4,23 40.8,21 41.6,19 42.5,17.2 43.07,16.38 44.8,16.3 47.5,15.5 52,15.8",
  "13.5,31.6 10,32 10,34 10.29,34 10.5,33.85 10.57,34 11.13,34 11.24,33.88 11.32,33.49 12.37,33.03 12.79,33 13.38,33.1 14.25,32.9 14.54,32.71 15.26,32.58 15.45,32.42 15.67,31.76 15.86,31.57 16.1,31.47 17.42,31.28 18.27,30.96 18.72,30.63 17,30.4",
]);
const AYY1 = plm([
  "52,15.3 51.44,15.04 50.6,14.85 50.23,14.65 49.44,14.46 49.21,14.32 48.77,13.86 48.19,13.77 48.03,13.85 47.49,13.48 46.75,13.24 45.74,13.15 45.52,12.91 45.27,12.83 45.25,12.71 43.3,12.9 42.77,15.99 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.56,19.58 40.1,20.01 39.63,20.2 39.14,20.81 38.89,21.26 38.93,21.44 38.73,21.98 38.88,22.51 38.45,23.36 38.16,23.76 37.66,24.05 37.43,24.09 37.27,24.25 36.88,24.9 36.98,25.16 36.8,25.19 36.33,25.52 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35.11,27.81 34.93,27.88 34.82,27.74 34.47,27.73 34.38,27.57 34.24,27.53 34.22,27.34 34.04,27.25 34.19,26.96 34.2,26.68 35.39,24.54 35.97,24 35.97,23.8 35.86,23.71 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25.2,31.53 25.2,31 23,30.9 21,31 20,32 20,32.38 20.45,32.72 20.99,32.96 21.35,32.98 21.59,33.13 22.16,33.15 23.2,32.81 23.31,32.7 23.35,32.42 23.88,32.35 24.16,32.21 24.75,32.23 25.07,32.15 25.2,32.03 25.2,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.3,31.3 35,32.5 35.66,34.6 35.75,34.66 35.71,34.79 36.1,36.4 36.4,37.2 37.6,37.7 39.5,38.2 41.8,38.3 43.2,37.9 44.2,37.3 44,36.3 43,35.5 41.5,34.7 39.5,34.5 38.2,33.9 37.6,33 36.6,32 36.4,31 36,29.8 35.5,29.6 36.4,29.6 37.6,27.3 39.4,25 40.4,23 40.8,21 41.6,19 42.5,17.2 43.07,16.38 44.8,16.3 47.5,15.5 52,15.8",
]);
const AYY2 = plm([
  "52,15.3 51.44,15.04 50.6,14.85 50.23,14.65 49.44,14.46 49.21,14.32 48.77,13.86 48.19,13.77 48.03,13.85 47.49,13.48 46.75,13.24 45.74,13.15 45.52,12.91 45.27,12.83 45.25,12.71 43.3,12.9 42.77,15.99 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.56,19.58 40.1,20.01 39.63,20.2 39.14,20.81 38.89,21.26 38.93,21.44 38.73,21.98 38.88,22.51 38.45,23.36 38.16,23.76 37.66,24.05 37.43,24.09 37.27,24.25 36.88,24.9 36.98,25.16 36.8,25.19 36.33,25.52 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35.11,27.81 34.93,27.88 34.82,27.74 34.47,27.73 34.38,27.57 34.24,27.53 34.22,27.34 34.04,27.25 34.19,26.96 34.2,26.68 35.39,24.54 35.97,24 35.97,23.8 35.86,23.71 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.3,31.3 35,32.5 35.66,34.6 35.75,34.66 35.71,34.79 36.1,36.4 36.4,37.2 37.6,37.7 39.5,38.2 41.2,38.2 42,37.5 41.5,36.4 40.5,35.4 39.5,34.6 38.2,33.9 37.6,33 36.6,32 36.4,31 36,29.8 35.5,29.6 36.4,29.6 37.6,27.3 39.4,25 40.4,23 40.8,21 41.6,19 42.5,17.2 43.07,16.38 44.8,16.3 47.5,15.5 52,15.8",
]);
const AYY3 = plm([
  "35.66,34.6 35.75,34.66 35.71,34.79 36.1,36.4 36.4,37.2 37.6,37.7 39.5,38.2 41.2,38.2 42,37.5 41.5,36.4 40.5,35.4 39.5,34.6 38.2,33.9 37.6,33 36.6,32 36.4,31 36,29.8 35.5,29.6 36.4,29.6 37.6,27.3 39.4,25 40.4,23 40.8,21 41.6,19 42.5,17.2 43.2,16.2 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.28,19.89 39.63,20.2 38.99,21.02 38.88,21.28 38.89,21.62 38.73,21.98 38.88,22.51 38.28,23.65 37.66,24.05 37.41,24.1 37.27,24.25 36.88,24.9 36.98,25.16 36.8,25.19 36.33,25.52 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35.11,27.81 34.93,27.88 34.82,27.74 34.47,27.73 34.38,27.57 34.24,27.53 34.22,27.34 34.04,27.25 34.19,26.96 34.2,26.68 35.39,24.54 35.97,24 35.97,23.8 35.86,23.71 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.3,31.3 35,32.5",
]);
const MAM1 = plm([
  "39.4,25 40.4,23 40.8,21 41.6,19 42.5,17.2 43.2,16.2 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.28,19.89 39.63,20.2 38.99,21.02 38.88,21.28 38.89,21.62 38.73,21.98 38.88,22.51 38.28,23.65 37.66,24.05 37.41,24.1 37.27,24.25 36.88,24.9 36.98,25.16 36.8,25.19 36.33,25.52 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35.11,27.81 34.93,27.88 34.82,27.74 34.47,27.73 34.38,27.57 34.24,27.53 34.22,27.34 34.04,27.25 34.19,26.96 34.2,26.68 35.39,24.54 35.97,24 35.97,23.8 35.86,23.71 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.3,31.3 34.2,29.6 35.09,27.83 34.8,28.6 34.9,29.6 36.4,29.6 37.6,27.3",
]);
const MAM2 = plm([
  "35.66,34.6 35.75,34.66 35.71,34.79 36.1,36.4 36,37 37,37.3 40.6,37 41,35.6 40.4,34.8 38.4,34 36.8,32 36,29.8 35.5,29.6 36.4,29.6 37.6,27.3 39.4,25 40.4,23 40.8,21 41.6,19 42.5,17.2 43.2,16.2 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.28,19.89 39.63,20.2 38.99,21.02 38.88,21.28 38.89,21.62 38.73,21.98 38.88,22.51 38.28,23.65 37.66,24.05 37.41,24.1 37.27,24.25 36.88,24.9 36.98,25.16 36.8,25.19 36.33,25.52 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35.11,27.81 34.93,27.88 34.82,27.74 34.47,27.73 34.38,27.57 34.24,27.53 34.22,27.34 34.04,27.25 34.19,26.96 34.2,26.68 35.39,24.54 35.97,24 35.97,23.8 35.86,23.71 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.3,31.3 35,32.5",
]);
const MAM3 = plm([
  "30.4,17.4 29,18.2 28.8,21.5 29.5,22.8 32.8,23.3 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25.2,31.53 25.2,31 23,30.9 21,31 19.8,31.8 19.87,32.23 20.22,32.58 20.97,32.96 21.35,32.98 21.59,33.13 22.16,33.15 23.2,32.81 23.31,32.7 23.35,32.42 23.88,32.35 24.16,32.21 24.75,32.23 25.07,32.15 25.2,32.03 25.2,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.3,31.3 35,32.5 35.66,34.6 35.75,34.66 35.71,34.79 36.1,36.4 36,37 37,37.3 40.6,37 41,35.6 40.4,34.8 38.4,34 36.8,32 36,29.8 35.5,29.6 36.4,29.6 37.6,27.3 39.4,25 40.4,23 40.8,21 41.6,19 42.5,17.2 43.2,16.2 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.56,19.58 40.1,20.01 39.63,20.2 39.14,20.81 38.89,21.26 38.93,21.44 38.73,21.98 38.88,22.51 38.28,23.65 37.66,24.05 37.41,24.1 37.27,24.25 36.88,24.9 36.98,25.16 36.81,25.18 36.34,25.5 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35,27.89 34.76,27.72 34.47,27.73 34.38,27.57 34.24,27.53 34.2,27.32 34.04,27.21 34.19,26.96 34.29,26.51 35.39,24.54 35.98,23.98 35.92,23.75 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.2,23.01 36.36,22.96 36.48,22.63 37.08,22.14 37.1,21.7 37.23,21.46 37.4,18.8 35,17.6",
]);
const MAM4 = plm([
  "40.4,23 40.8,21 41.6,19 42.5,17.2 43.2,16.2 42.4,15.8 42.29,15.93 42.57,15.9 42.64,15.99 42.52,16.64 42.38,16.76 42.34,16.46 42.1,16.39 41.73,16.58 41.45,16.91 41.56,17.13 41.85,17.21 42.04,17.15 42.17,16.99 42.11,17.34 41.65,17.69 41.33,18.11 41.24,18.38 41.03,18.62 40.74,19.37 40.28,19.89 39.63,20.2 38.99,21.02 38.88,21.28 38.89,21.62 38.73,21.98 38.88,22.51 38.28,23.65 37.66,24.05 37.41,24.1 37.27,24.25 36.88,24.9 36.98,25.16 36.81,25.18 36.34,25.5 36.29,25.67 36.39,25.95 36.07,26.51 35.59,27 35.55,27.18 35,27.89 34.76,27.72 34.47,27.73 34.38,27.57 34.24,27.53 34.2,27.32 34.04,27.25 34.19,26.96 34.2,26.68 35.39,24.54 35.97,24 35.97,23.8 35.86,23.71 35.71,23.71 35.7,23.53 35.9,23.28 35.88,23.08 35.96,22.94 36.22,23.01 36.37,22.95 36.48,22.63 37.04,22.21 37.1,22.05 35.4,22.8 32.8,23.3 29.5,22.8 29.5,24 31.6,24 30.4,25 29.8,26 28.8,27 28.4,28 27.8,30 26.4,31.1 25.2,31.53 25.2,31 23,30.9 21,31 19.8,31.8 19.87,32.23 20.22,32.58 20.97,32.96 21.35,32.98 21.59,33.13 22.16,33.15 23.2,32.81 23.31,32.7 23.35,32.42 23.88,32.35 24.16,32.21 24.75,32.23 25.07,32.15 25.2,32.03 25.2,31.6 27.35,31.58 27.55,31.41 27.91,31.43 28.05,31.29 28.48,31.28 29.07,31.03 29.41,31.13 29.96,31.5 30.15,31.52 30.17,31.6 32.13,31.6 32.65,31.26 33.11,31.44 33.57,31.32 33.85,31.37 34.3,31.3 35,32.5 35.66,34.6 35.75,34.66 35.71,34.79 36.1,36.4 36.03,36.85 35.6,36.3 35.6,36.39 35.3,36.35 34.73,36.61 34.36,36.39 34.2,36.8 35.9,37.3 36.3,37.2 36.19,37.06 37,37.3 40.6,37 41,35.6 40.4,34.8 38.4,34 36.8,32 36,29.8 35.5,29.6 36.4,29.6 37.6,27.3 39.4,25",
]);
const CRU5 = plm([
  "36.55,36.84 36.55,35.31 35.9,35.3 35.7,36.55 36,36.8 36.4,36.9",
  "34.73,32 34.84,32.28 34.95,32.81 35.07,32.87 35.1,33.1 35.2,33.22 35.19,33.28 35.27,33.46 35.35,33.51 35.48,33.8 35.47,33.9 35.59,33.95 35.81,33.95 35.65,33.75 35.51,33.43 35.42,33.34 35.27,33.01 35.23,32.79 35.11,32.67 34.92,32",
  "35.63,34.02 35.67,34.31 35.81,34.41 35.81,34.46 35.9,34.48 35.99,34.55 35.87,34.98 36.1,35 36.08,34.93 36.19,34.63 36.16,34.45 35.84,34.17 35.84,34"
]);
const CRU6 = plm([
  "36.55,35.31 35.9,35.3 35.7,36.55 36,36.8 36.4,36.9 36.55,36.84",
  "35.2,31.5 35,31.6 34.8,31.8 34.74,32.06 34.84,32.28 34.95,32.81 35.07,32.87 35.1,33.1 35.2,33.22 35.19,33.28 35.27,33.46 35.35,33.51 35.48,33.8 35.47,33.9 35.59,33.95 35.81,33.95 35.65,33.75 35.51,33.43 35.42,33.34 35.27,33.01 35.23,32.79 35.11,32.67 34.92,32 35.3,31.9 35.35,31.65",
  "35.63,34.02 35.67,34.31 35.81,34.41 35.81,34.46 35.9,34.48 35.99,34.55 35.87,34.98 36.1,35 36.08,34.93 36.19,34.63 36.16,34.45 35.84,34.17 35.84,34",
  "35.2,32.6 35.6,32.9 35.6,32.65 35.3,32.5"
]);
const CRU7 = plm([
  "36.55,36.84 36.55,35.31 35.9,35.3 35.7,36.55 36,36.8 36.4,36.9",
  "34.73,32 34.84,32.28 34.95,32.81 35.07,32.87 35.1,33.1 35.2,33.22 35.19,33.28 35.27,33.46 35.35,33.51 35.48,33.8 35.47,33.9 35.59,33.95 35.81,33.95 35.65,33.75 35.51,33.43 35.42,33.34 35.27,33.01 35.23,32.79 35.11,32.67 34.92,32",
  "35.63,34.02 35.67,34.31 35.81,34.41 35.81,34.46 35.9,34.48 35.99,34.55 35.87,34.98 36.1,35 36.08,34.93 36.19,34.63 36.16,34.45 35.84,34.17 35.84,34"
]);
const CRU8 = plm([
  "34.95,32.81 35.07,32.87 35.1,33.1 35.2,33.22 35.19,33.28 35.27,33.46 35.35,33.51 35.48,33.8 35.48,33.91 35.81,33.95 35.65,33.75 35.51,33.43 35.42,33.34 35.21,32.75 35.11,32.65 34.92,32.65",
  "35.64,34.01 35.67,34.31 35.81,34.41 35.81,34.46 35.9,34.48 35.99,34.55 35.87,34.98 36.1,35 36.08,34.93 36.19,34.63 36.16,34.45 35.84,34.17 35.84,34"
]);
const CRU9 = plm([
  "34.92,32.65 34.96,32.83 35.07,32.87 35.1,33.1 35.2,33.22 35.19,33.28 35.27,33.46 35.35,33.51 35.48,33.8 35.48,33.91 35.81,33.95 35.65,33.75 35.51,33.43 35.42,33.34 35.21,32.75 35.11,32.65"
]);
const BY395 = plm([
  "30.57,46 29.95,45.46 29.75,44.7 28.88,44.27 28.71,43.32 28.12,43.06 27.89,42.51 28.33,41.69 29.01,41.45 31.17,41.29 32.56,42.03 34.96,42.3 35.35,42.18 35.55,41.84 36.14,41.88 36.45,41.49 38.38,41.13 39.43,41.31 40.14,41.13 41.55,41.84 41.31,42.57 40.24,42.96 38.66,44.1 37.4,44.49 36.8,44.91 35.61,44.91 34.17,44.24 33.56,44.24 33.18,44.52 33.39,44.96 32.45,45.15 32.29,45.37 33.13,45.98 34,46 41.8,44 41.5,40.5 41,38.6 41.3,37.6 41,36.8 40.9,35.2 39.5,34.9 38.3,34.3 37,33 36.3,31 35,29.3 33.6,26.5 34.8,25 35.97,24 21,24 19.5,28 19.5,30.6 19.95,31.1 19.74,31.99 20.2,32.56 20.99,32.96 22.16,33.15 23.2,32.81 23.35,32.42 25.06,32.15 25.35,31.71 27.01,31.64 29.07,31.03 30.3,31.7 31.09,31.81 31.97,31.73 32.65,31.26 33.09,31.44 33.63,31.32 34.44,31.88 34.78,32.93 35.75,34.66 35.52,35.58 35.74,36.04 35.6,36.39 34.73,36.61 34.04,36.03 32.72,35.83 31.94,36.36 30.93,36.66 30.5,36.03 29.54,35.92 28.45,36.59 28.24,35.92 27.7,35.71 26.77,36.58 26.34,37.39 25.8,37.42 25.94,37.79 26.49,37.93 25.89,37.98 25.69,38.36 25.31,38.46 25.46,38.79 26.23,38.81 25.65,39.1 25.91,39.63 25.79,39.9 25.24,39.61 25.09,39.29 24.8,39.38 24.88,40.12 25.44,40.24 25.24,40.49 25.44,40.69 25.08,40.77 24.69,40.38 24.2,40.55 24.59,40.11 24.03,39.76 23.29,39.77 23.11,40.08 22.77,40.15 23.45,39.41 24.15,39.63 24.46,39.51 24.45,39.18 24.88,38.79 24.72,38.58 24.4,38.63 24.44,38.36 25.08,38.06 26.65,36.51 26.25,36.32 26.07,36.69 25.86,36.58 25.98,36.2 25.45,36.14 25.17,36.45 24.27,36.46 24.13,37.39 23.51,37.12 23.66,36.85 23.31,36.77 23.25,36.1 23.53,35.8 24.22,35.79 24.43,35.57 26.38,35.51 26.52,35.17 26.18,34.73 24.7,34.73 24.34,34.99 24.27,34.66 23.95,34.68 23.94,35.02 23.35,35.19 23.39,35.64 22.77,36.06 22.73,36.49 22.47,36.19 22.13,36.68 21.6,36.57 21.34,37.02 21.43,37.4 20.47,37.69 20.14,38.21 20.49,38.95 20.11,38.97 19.2,39.76 19.35,40.06 19.06,40.49 19.26,41.68 19,41.83 19,46",
  "32.08,35.01 32.16,35.26 32.72,35.38 32.87,35.59 33.6,35.55 34.58,35.89 34.79,35.74 34.72,35.5 34.19,35.17 34.3,34.98 34.22,34.81 33.8,34.75 33.09,34.38 32.35,34.55",
  "26.65,35.39 27.08,35.99 27.27,36.02 27.41,35.91 27.43,35.43 27.24,35.23 26.89,35.15 26.75,35.19"
]);
const BY533 = plm([
  "8,46 30.57,46 29.95,45.46 29.75,44.7 28.88,44.27 28.76,43.39 28.24,43.21 27.89,42.51 28.32,41.71 30.85,41.28 33.32,42.22 34.96,42.3 35.35,42.18 35.55,41.84 36.14,41.88 36.45,41.49 38.38,41.13 39.43,41.31 40.14,41.13 41.55,41.84 41.31,42.57 40.24,42.96 38.66,44.1 37.4,44.49 36.8,44.91 35.61,44.91 34.17,44.24 33.56,44.24 33.18,44.52 33.39,44.96 32.45,45.15 32.29,45.37 33.13,45.98 34,46 41.8,44 41.5,40.5 41,38.6 41.3,37.6 41,36.8 40.9,35.2 39.5,34.9 38.3,34.3 37,33 36.3,31 35,29.3 33.6,26.5 34.8,25 35.97,24 21,24 19.5,28 19.5,30.6 19.95,31.1 19.74,31.99 20.2,32.56 20.99,32.96 22.16,33.15 23.2,32.81 23.35,32.42 25.06,32.15 25.35,31.71 27.01,31.64 29.07,31.03 30.3,31.7 31.09,31.81 31.97,31.73 32.65,31.26 33.09,31.44 33.8,31.36 34.44,31.88 34.78,32.93 35.75,34.66 35.52,35.56 35.74,36.04 35.6,36.39 34.73,36.61 34.04,36.03 32.79,35.83 31.25,36.62 30.78,36.65 30.51,36.04 29.74,35.92 28.45,36.59 28.24,35.92 27.7,35.71 26.77,36.58 26.34,37.39 25.8,37.42 25.94,37.79 26.49,37.93 25.89,37.98 25.69,38.36 25.31,38.46 25.46,38.79 26.23,38.81 25.65,39.1 25.91,39.63 25.79,39.9 25.24,39.61 25.09,39.29 24.8,39.38 24.88,40.12 25.44,40.24 25.24,40.49 25.44,40.69 25.08,40.77 24.69,40.38 24.2,40.55 24.59,40.11 24.03,39.76 23.29,39.77 23.11,40.08 22.77,40.15 23.45,39.41 24.15,39.63 24.46,39.51 24.45,39.18 24.88,38.79 24.72,38.58 24.4,38.63 24.44,38.36 25.08,38.06 26.65,36.51 26.25,36.32 26.07,36.69 25.86,36.58 25.98,36.2 25.45,36.14 25.17,36.45 24.27,36.46 24.13,37.39 23.51,37.12 23.66,36.85 23.31,36.77 23.25,36.1 23.53,35.8 24.22,35.79 24.43,35.57 26.38,35.51 26.52,35.17 26.18,34.73 24.7,34.73 24.34,34.99 24.28,34.68 24.03,34.63 23.94,35.02 23.36,35.17 23.39,35.64 22.77,36.06 22.73,36.49 22.47,36.19 22.13,36.68 21.6,36.57 21.34,37.02 21.43,37.4 20.72,37.47 20.18,38.06 20.49,38.95 20.11,38.97 19.19,39.8 19.35,40.06 19.06,40.51 19.26,41.68 18.07,42.45 17.14,42.72 16.43,42.56 16.49,42.25 16.16,42.22 16.06,42.44 16.4,42.57 16.32,42.87 15.95,42.76 15.52,42.99 16,43.26 13.62,44.74 13.25,45.53 12.51,45.23 12.73,44.97 12.55,44.35 13.76,43.7 14.16,42.82 14.66,42.4 15.18,42.13 15.49,42.32 16.24,42.09 16.39,41.79 16.23,41.57 18.11,40.82 18.72,40.16 18.33,39.6 17.74,40.09 17.05,40.29 16.77,39.82 17.33,39.5 17.33,38.84 16.75,38.66 16.73,38.31 16.17,37.76 15.53,37.82 15.33,37.45 15.53,36.97 15.24,36.5 14.43,36.6 14.13,36.9 12.56,37.39 11.84,38.04 12.72,38.39 14.48,38.24 14.74,38.36 14.25,38.36 14.19,38.68 14.99,38.73 15.19,39.01 15.44,38.8 15.19,38.46 15.67,38.47 15.66,38.75 15.94,38.92 15.56,39.85 14.79,40.08 14.73,40.45 14.2,40.34 13.76,40.54 13.68,41.04 13.23,41.08 13.25,40.9 13.61,40.89 13.47,40.59 13.23,40.85 12.74,40.76 12.83,41.19 11.47,42.16 10.79,42.17 10.66,42.38 10.81,42.58 10.43,42.51 10.49,42.24 10.25,42.13 9.87,42.49 9.91,42.83 9.68,42.85 9.76,42.12 9.51,41.46 10.03,40.52 9.73,39.03 8.65,38.66 8.09,38.99 8.26,40.2 8,40.45 8,41.03 8.28,41.32 8.54,41.07 8.9,41.29 8.47,41.67 8.37,42.47 9.26,43.18 9.61,43.13 9.8,43.62 10.1,43.51 9.99,43.85 8.78,44.22 8,43.66",
  "12,32.2 8,33 8,37.08 8.8,37.2 8.81,37.7 9.08,37.69 9.13,37.42 10.23,37.42 10.47,37.04 10.79,37.34 11.25,37.14 11.3,36.75 10.68,36.13 11.23,35.72 11.22,35.02 11.5,34.7 10.26,34.16 10.44,33.87 10.99,34.09 11.32,33.49 12.37,33.03 13.38,33.1 15.32,32.55",
  "32.37,34.54 32.07,35.09 32.15,35.25 32.72,35.38 32.87,35.59 33.6,35.55 34.58,35.89 34.79,35.74 34.72,35.5 34.19,35.17 34.3,34.98 34.22,34.81 33.8,34.75 33.09,34.38",
  "26.74,35.54 26.87,35.62 27.06,35.98 27.25,36.03 27.4,35.93 27.43,35.45 27.24,35.23 26.76,35.18 26.65,35.35",
  "13.99,36.04 14.08,36.23 14.36,36.25 14.71,36.01 14.75,35.77 14.58,35.61 14.36,35.63 14.04,35.89"
]);
const BY568 = plm([
  "33.31,46 41.8,44 41.5,40.5 41,38.6 41.3,37.6 41,36.8 40.9,35.2 39.5,34.9 38.3,34.3 37,33 36.3,31 35,29.3 33.6,26.5 34.8,25 35.97,24 21,24 19.5,28 19.5,30.6 19.95,31.1 19.74,31.99 20.2,32.56 20.99,32.96 22.16,33.15 23.2,32.81 23.35,32.42 25.06,32.15 25.35,31.71 27.01,31.64 29.07,31.03 30.3,31.7 31.09,31.81 31.97,31.73 32.65,31.26 33.09,31.44 33.63,31.32 34.44,31.88 34.78,32.93 35.75,34.66 35.52,35.58 35.74,36.04 35.6,36.39 34.73,36.61 34.04,36.03 32.72,35.83 31.94,36.36 30.93,36.66 30.5,36.03 29.54,35.92 28.45,36.59 28.24,35.92 27.7,35.71 26.77,36.58 26.34,37.39 25.8,37.42 25.94,37.79 26.49,37.93 25.89,37.98 25.69,38.36 25.31,38.46 25.46,38.79 26.23,38.81 25.65,39.1 25.91,39.63 25.79,39.9 25.24,39.61 25.09,39.29 24.8,39.38 24.88,40.12 25.44,40.24 25.24,40.49 25.44,40.69 25.08,40.77 24.69,40.38 24.2,40.55 24.59,40.11 24.03,39.76 23.29,39.77 23.11,40.08 22.77,40.15 23.45,39.41 24.15,39.63 24.46,39.51 24.45,39.18 24.88,38.79 24.72,38.58 24.4,38.63 24.44,38.36 25.08,38.06 26.65,36.51 26.25,36.32 26.07,36.69 25.86,36.58 25.98,36.2 25.45,36.14 25.17,36.45 24.27,36.46 24.13,37.39 23.51,37.12 23.66,36.85 23.31,36.77 23.25,36.1 23.53,35.8 24.22,35.79 24.43,35.57 26.38,35.51 26.52,35.17 26.18,34.73 24.7,34.73 24.34,34.99 24.27,34.66 23.95,34.68 23.94,35.02 23.35,35.19 23.39,35.64 22.77,36.06 22.73,36.49 22.47,36.19 22.13,36.68 21.6,36.57 21.34,37.02 21.43,37.4 20.47,37.69 20.14,38.21 20.49,38.95 20.11,38.97 19.2,39.76 19.35,40.06 19.06,40.49 19.26,41.68 19,41.83 19,46 30.57,46 29.95,45.46 29.75,44.7 28.88,44.27 28.76,43.39 28.24,43.21 27.89,42.51 28.32,41.71 28.96,41.46 31.19,41.3 32.56,42.03 34.96,42.3 35.35,42.18 35.55,41.84 36.14,41.88 36.45,41.49 38.38,41.13 39.43,41.31 40.14,41.13 41.55,41.84 41.31,42.57 40.24,42.96 38.66,44.1 37.4,44.49 37.1,44.81 35.61,44.91 33.72,44.2 33.19,44.51 33.39,44.96 32.43,45.16 32.28,45.39",
  "8,32.5 8,37 8.75,37.17 9.15,37.58 9.13,37.42 10.23,37.42 10.47,37.04 10.73,37.33 11.09,37.28 11.33,36.92 10.68,36.13 11.23,35.72 11.22,35.02 11.49,34.68 10.78,34.47 10.26,34.16 10.3,33.99 10.52,33.85 11.01,34.08 11.32,33.49 12.37,33.03 13.29,33.12 14.45,32.78",
  "8.4,42.52 9.17,43.1 9.7,43.1 9.51,41.46 9.9,41.04 9.9,39.85 9.57,38.91 8.29,38.8 8.04,39.09 8.26,40.2 8,40.45 8,41.03 8.28,41.32 8.54,41.07 8.9,41.29 8.47,41.67",
  "17.43,41.12 18.13,40.81 18.49,40.5 18.6,40.2 17.2,40.3 17.19,40.2 17.05,40.29 16.77,39.82 17.1,39.66 17,39 16.32,39.14 16.2,39.5 15.4,40.5 14.5,41.3 13,41.6 13.4,41.9 14.2,42 15.6,41.5",
  "12.2,38.13 12.72,38.39 13.41,38.4 13.77,38.18 14.74,38.36 14.2,38.4 15.9,38.4 15.9,37.73 15.42,37.68 15.52,36.95 15.08,36.46 12.56,37.39 12.2,37.74",
  "12.1,41.6 11.7,42.2 11.9,44 11.9,44.7 12.5,44.45 12.77,44.18 13.71,43.73 14.2,42.6 13.2,42.3 12.6,42",
  "32.37,34.54 32.07,35.09 32.15,35.25 32.72,35.38 32.87,35.59 33.6,35.55 34.58,35.89 34.79,35.74 34.72,35.5 34.19,35.17 34.3,34.98 34.22,34.81 33.8,34.75 33.09,34.38",
  "26.74,35.54 26.87,35.62 27.06,35.98 27.25,36.03 27.4,35.93 27.43,35.45 27.24,35.23 26.76,35.18 26.65,35.35",
  "13.99,36.04 14.08,36.23 14.36,36.25 14.71,36.01 14.75,35.77 14.58,35.61 14.36,35.63 14.04,35.89"
]);
const BY614 = plm([
  "34,46 41.8,44 41.5,40.5 41,38.6 41.3,37.6 41.11,37.1 34.6,37.1 34.6,36.55 34.07,36.05 32.81,35.83 31.25,36.62 30.78,36.65 30.51,36.04 29.74,35.92 28.45,36.59 28.25,35.93 27.74,35.69 26.77,36.58 26.34,37.39 25.8,37.42 25.94,37.79 26.49,37.93 25.89,37.98 25.69,38.36 25.31,38.46 25.46,38.79 26.23,38.81 25.65,39.1 25.91,39.63 25.79,39.9 25.24,39.61 25.09,39.29 24.8,39.38 24.88,40.12 25.44,40.24 25.24,40.49 25.44,40.69 25.08,40.77 24.69,40.38 24.2,40.55 24.59,40.11 24.03,39.76 23.29,39.77 23.11,40.08 22.77,40.15 23.45,39.41 24.15,39.63 24.46,39.51 24.45,39.18 24.88,38.79 24.72,38.58 24.4,38.63 24.44,38.36 25.08,38.06 26.65,36.51 26.25,36.32 26.07,36.69 25.86,36.58 25.98,36.2 25.45,36.14 25.17,36.45 24.27,36.46 24.13,37.39 23.51,37.12 23.66,36.85 23.31,36.77 23.25,36.1 23.53,35.8 24.22,35.79 24.43,35.57 26.38,35.51 26.52,35.17 26.18,34.73 24.7,34.73 24.34,34.99 24.08,34.62 23.86,34.77 23.94,35.02 23.36,35.17 23.39,35.64 22.77,36.06 22.73,36.49 22.47,36.19 22.13,36.68 21.6,36.57 21.34,37.02 21.43,37.4 20.47,37.69 20.14,38.21 20.49,38.95 20.11,38.97 19.19,39.78 19.35,40.06 19.06,40.49 19.26,41.68 19,41.83 19,46 30.57,46 29.95,45.46 29.75,44.7 28.88,44.27 28.76,43.39 28.24,43.21 27.89,42.51 28.32,41.71 28.96,41.46 31.19,41.3 32.56,42.03 34.96,42.3 35.35,42.18 35.55,41.84 36.14,41.88 36.45,41.49 38.38,41.13 39.43,41.31 40.14,41.13 41.55,41.84 41.31,42.57 40.24,42.96 38.66,44.1 37.4,44.49 37.1,44.81 35.61,44.91 33.72,44.2 33.19,44.51 33.39,44.96 32.43,45.16 32.28,45.41 33.31,46",
  "8,37 8.75,37.17 9.15,37.58 9.13,37.42 10.23,37.42 10.47,37.04 10.75,37.33 11.16,37.25 11.31,36.77 10.68,36.13 11.23,35.72 11.22,35.02 11.49,34.68 10.23,34.06 10.5,33.85 10.66,34.07 11.03,34.07 11.32,33.49 12.37,33.03 13.29,33.12 14.45,32.78 8,32.5",
  "8.43,42.54 9.17,43.1 9.7,43.1 9.51,41.46 9.9,41.04 9.9,39.85 9.57,38.91 8.29,38.8 8.03,39.11 8.26,40.2 8,40.45 8,41.03 8.28,41.32 8.54,41.07 8.9,41.29 8.47,41.67",
  "17.45,41.1 18.13,40.81 18.49,40.5 18.6,40.2 17.2,40.3 17.19,40.2 17.05,40.29 16.77,39.82 17.1,39.66 17,39 16.32,39.14 16.2,39.5 15.4,40.5 14.5,41.3 13,41.6 13.4,41.9 14.2,42 15.6,41.5",
  "12.21,38.13 12.72,38.39 13.41,38.4 13.77,38.18 14.74,38.36 14.2,38.4 15.9,38.4 15.9,37.73 15.42,37.68 15.52,36.95 15.08,36.46 12.56,37.39 12.2,37.74",
  "12.1,41.6 11.7,42.2 11.9,44 11.9,44.7 12.5,44.45 12.77,44.18 13.71,43.73 14.2,42.6 13.2,42.3 12.6,42",
  "32.09,34.97 32.15,35.25 32.72,35.38 32.85,35.59 33.6,35.55 34.6,35.89 34.6,35.44 34.19,35.17 34.3,35 34.24,34.82 33.8,34.75 33.69,34.64 33.22,34.5 33.11,34.38 32.9,34.37 32.37,34.54",
  "26.65,35.39 26.87,35.62 27.06,35.98 27.27,36.02 27.41,35.91 27.43,35.43 27.24,35.23 26.89,35.15 26.75,35.19",
  "13.98,36.07 14.09,36.24 14.36,36.25 14.71,36.01 14.74,35.75 14.58,35.61 14.34,35.64 14.03,35.91"
]);
const BY636 = plm([
  "21,41.6 28.09,42.67 27.89,42.51 28.28,41.75 29.01,41.45 31.17,41.29 32.19,41.9 33.2,42.19 35.42,42.04 35.56,41.83 36.14,41.88 36.45,41.49 36.88,41.55 37.52,41.26 40.03,41.18 41.2,40.4 40.6,39.5 34.6,37.4 33.5,36.2 32.44,35.92 31.25,36.62 30.78,36.65 30.51,36.04 29.74,35.92 28.45,36.59 28.24,35.92 27.62,35.75 26.77,36.58 26.34,37.39 25.8,37.42 25.94,37.79 26.49,37.93 25.89,37.98 25.69,38.36 25.31,38.46 25.46,38.79 26.23,38.81 25.65,39.1 25.91,39.63 25.79,39.9 25.24,39.61 25.09,39.29 24.8,39.38 24.88,40.12 25.44,40.24 25.31,40.73 24.99,40.74 24.67,40.37 24.2,40.55 24.59,40.11 24.03,39.76 23.29,39.77 23.11,40.08 22.77,40.15 23.45,39.41 24.15,39.63 24.48,39.5 24.45,39.18 24.88,38.79 24.72,38.58 24.4,38.63 24.44,38.36 25.09,38.05 26.25,36.81 26.6,36.74 26.43,36.33 26.12,36.41 26.09,36.69 25.86,36.58 26.05,36.37 25.87,36.15 25.3,36.17 25.17,36.45 24.25,36.47 24.13,37.39 23.51,37.12 23.58,36.74 23.31,36.77 23.25,36.1 23.53,35.85 23.07,35.89 22.74,36.1 22.71,36.5 22.47,36.19 22.13,36.68 21.58,36.58 21.34,37.02 21.43,37.4 20.72,37.47 20.17,38.08 20.49,38.95 20.13,38.96 19.4,39.6 19.6,41",
  "8.02,37.09 8.75,37.17 8.92,37.31 8.7,37.49 9.16,37.55 10.21,37.43 10.47,37.04 10.73,37.32 11.05,37.29 11.11,36.58 10.68,36.13 11.19,35.77 11.31,34.52 10.84,34.5 10.22,34.11 10.5,33.85 10.66,34.07 11.03,34.07 11.33,33.49 8,32.8",
  "17.19,40.2 17.05,40.29 16.77,39.82 17.1,39.66 17,39 16.32,39.14 16.2,39.5 15.4,40.5 14.5,41.3 13,41.6 13.4,41.9 14.2,42 15.6,41.5 17.43,41.12 18.13,40.81 18.49,40.5 18.6,40.2 17.2,40.3",
  "13.42,38.4 13.77,38.18 14.74,38.36 14.2,38.4 15.9,38.4 15.9,37.73 15.53,37.82 15.33,37.45 15.53,37.01 15.27,36.53 14.41,36.61 14.13,36.9 12.57,37.38 12.2,37.74 12.2,38.13 12.64,38.37",
  "12.1,41.6 11.7,42.2 11.77,43 14.03,43 14.2,42.6 13.2,42.3 12.6,42"
]);
const BY700 = plm([
  "21,41.6 28.09,42.67 27.89,42.51 28.28,41.75 29.01,41.45 31.17,41.29 32.19,41.9 33.2,42.19 35.42,42.04 35.56,41.83 36.14,41.88 36.45,41.49 36.88,41.55 37.52,41.26 40.03,41.18 41.2,40.4 40.6,39.5 34.6,37.4 33.5,36.2 32.44,35.92 31.25,36.62 30.78,36.65 30.51,36.04 29.74,35.92 28.45,36.59 28.24,35.92 27.62,35.75 26.77,36.58 26.34,37.39 25.8,37.42 25.94,37.79 26.49,37.93 25.89,37.98 25.69,38.36 25.31,38.46 25.46,38.79 26.23,38.81 25.65,39.1 25.91,39.63 25.79,39.9 25.24,39.61 25.09,39.29 24.8,39.38 24.88,40.12 25.44,40.24 25.31,40.73 24.99,40.74 24.67,40.37 24.2,40.55 24.59,40.11 24.03,39.76 23.29,39.77 23.11,40.08 22.77,40.15 23.45,39.41 24.15,39.63 24.48,39.5 24.45,39.18 24.88,38.79 24.72,38.58 24.4,38.63 24.44,38.36 25.09,38.05 26.25,36.81 26.6,36.74 26.43,36.33 26.12,36.41 26.09,36.69 25.86,36.58 26.05,36.37 25.87,36.15 25.3,36.17 25.17,36.45 24.25,36.47 24.13,37.39 23.51,37.12 23.58,36.74 23.31,36.77 23.25,36.1 23.53,35.85 23.07,35.89 22.74,36.1 22.71,36.5 22.47,36.19 22.13,36.68 21.58,36.58 21.34,37.02 21.43,37.4 20.72,37.47 20.17,38.08 20.49,38.95 20.13,38.96 19.4,39.6 19.6,41",
  "12.21,38.13 12.72,38.39 13.41,38.4 13.77,38.18 14.74,38.36 14.2,38.4 15.9,38.4 15.9,37.73 15.42,37.68 15.53,36.99 15.28,36.54 14.76,36.5 12.56,37.39 12.2,37.74",
  "17.19,40.2 17.05,40.29 16.77,39.82 17.1,39.66 17,39 16.5,38.61 16.2,39.5 15.4,41 16.8,41.2 17.43,41.12 18.13,40.81 18.49,40.5 18.6,40.2 17.2,40.3"
]);
const BY900 = plm([
  "28,44.3 29.7,45 29.75,44.7 28.88,44.27 28.76,43.39 28.24,43.21 27.89,42.51 28.32,41.71 28.96,41.46 31.17,41.29 32.19,41.9 33.2,42.19 35.42,42.04 35.56,41.83 36.14,41.88 36.45,41.49 38.22,41.14 40.6,41.28 42.5,41 43.3,40 42,38.8 41.5,37.8 38.5,36.5 37,36.3 36.3,35.9 35.9,34.6 35.53,35.54 35.74,36.04 35.6,36.39 34.73,36.61 34.04,36.03 32.81,35.83 31.25,36.62 30.78,36.65 30.51,36.04 29.74,35.92 28.45,36.59 28.24,35.92 27.7,35.71 26.77,36.58 26.34,37.39 25.8,37.42 25.94,37.79 26.49,37.93 25.89,37.98 25.69,38.36 25.32,38.44 25.45,38.79 26.23,38.81 25.65,39.1 25.91,39.63 25.79,39.9 25.24,39.61 25.09,39.29 24.8,39.38 24.86,40.09 25.44,40.24 25.24,40.49 25.44,40.69 24.99,40.74 24.67,40.37 24.2,40.55 24.59,40.11 24.03,39.76 23.29,39.77 22.8,40.21 23.45,39.41 24.15,39.63 24.46,39.51 24.45,39.18 24.88,38.79 24.72,38.58 24.4,38.63 24.44,38.36 25.08,38.06 26.25,36.81 26.66,36.63 26.29,36.31 26.07,36.69 25.86,36.58 26.05,36.41 25.96,36.19 25.33,36.15 25.17,36.45 24.2,36.5 24.17,37.36 23.78,37.33 23.51,37.12 23.62,36.78 23.29,36.69 23.25,36.1 23.53,35.8 25.95,35.41 26.36,35.51 26.52,35.34 26.18,34.73 24.7,34.73 24.34,34.99 24.28,34.68 24.03,34.63 23.94,35.02 23.36,35.17 23.39,35.64 22.77,36.06 22.73,36.49 22.47,36.19 22.13,36.68 21.6,36.57 21.34,37.02 21.43,37.4 20.72,37.47 20.17,38.08 20.49,38.95 20.09,38.98 19.21,39.97 19.3,42.4 20.5,44.6 22.5,44.6 25,44.2",
  "17.46,41.09 18.13,40.81 18.49,40.5 18.6,40.2 17.2,40.3 17.19,40.2 17.05,40.29 16.77,39.82 17.1,39.66 17,39 16.5,38.61 16.2,39.5 15.4,41 16.8,41.2",
  "32.08,34.99 32.15,35.25 32.72,35.38 32.87,35.59 33.6,35.55 34.58,35.89 34.79,35.74 34.72,35.5 34.19,35.17 34.3,34.98 34.22,34.81 33.8,34.75 33.09,34.38 32.35,34.55",
  "26.65,35.39 26.87,35.62 27.06,35.98 27.27,36.02 27.41,35.91 27.43,35.43 27.24,35.23 26.89,35.15 26.75,35.19"
]);
const BY1045 = plm([
  "29.5,45 29.61,44.63 28.88,44.27 28.76,43.39 28.24,43.21 27.89,42.51 28.46,41.63 31.05,41.28 33.2,42.19 35.42,42.04 35.56,41.83 36.14,41.88 36.45,41.49 38.22,41.14 40.6,41.29 44.3,40.8 44.3,39.8 42.8,39 42,38 41,37.2 36.4,36.4 35.9,34.6 35.53,35.54 35.74,36.04 35.6,36.39 34.73,36.61 34.04,36.03 32.81,35.83 31.25,36.62 30.78,36.65 30.51,36.04 29.74,35.92 28.45,36.59 28.24,35.92 27.68,35.72 26.77,36.58 26.34,37.39 25.8,37.42 25.94,37.79 26.49,37.93 25.89,37.98 25.69,38.36 25.32,38.44 25.45,38.79 26.23,38.81 25.65,39.1 25.91,39.63 25.79,39.9 25.24,39.61 25.09,39.29 24.8,39.38 24.86,40.09 25.44,40.24 25.24,40.49 25.44,40.69 24.99,40.74 24.67,40.37 24.32,40.6 24.58,40.09 24.05,39.76 23.31,39.77 22.77,40.15 23.45,39.41 24.15,39.63 24.46,39.51 24.45,39.18 24.88,38.79 24.72,38.58 24.4,38.63 24.44,38.36 25.08,38.06 26.67,36.57 26.27,36.31 26.07,36.69 25.86,36.58 26.05,36.41 25.96,36.19 25.33,36.15 25.17,36.45 24.2,36.5 24.17,37.36 23.78,37.33 23.51,37.12 23.62,36.78 23.29,36.69 23.25,36.1 23.53,35.8 25.95,35.41 26.36,35.51 26.52,35.32 26.18,34.73 24.7,34.73 24.34,34.99 24.27,34.66 23.99,34.65 23.94,35.02 23.35,35.19 23.39,35.64 22.77,36.06 22.73,36.49 22.47,36.19 22.13,36.68 21.6,36.57 21.34,37.02 21.43,37.4 20.47,37.69 20.14,38.21 20.49,38.95 20.11,38.97 19.2,39.76 19.35,40.06 19.2,42.2 20.2,44.4 23,44.6 26.5,44.5",
  "17.46,41.09 18.13,40.81 18.49,40.5 18.6,40.2 17.2,40.3 17.19,40.2 17.05,40.29 16.77,39.82 17.1,39.66 17,39 16.5,38.61 16.2,39.5 15.4,41 16.8,41.2",
  "32.08,34.99 32.15,35.25 32.72,35.38 32.87,35.59 33.6,35.55 34.58,35.89 34.79,35.74 34.72,35.5 34.19,35.17 34.3,34.98 34.22,34.81 33.8,34.75 33.09,34.38 32.35,34.55",
  "26.65,35.39 26.87,35.62 27.06,35.98 27.27,36.02 27.41,35.91 27.43,35.43 27.24,35.23 26.89,35.15 26.75,35.19"
]);
const BY1097 = plm([
  "19.32,39.65 19.3,42.4 20.5,44.6 26.5,44.3 29.5,45 29.61,44.63 28.88,44.27 28.76,43.39 28.24,43.21 27.89,42.51 28.46,41.63 30.33,41.41 31.5,41 30.5,39 30.3,38 30.5,37 32.5,36.4 34,36.3 33.71,35.94 32.63,35.85 31.94,36.36 30.78,36.65 30.5,36.03 29.54,35.92 28.45,36.59 28.24,35.92 27.64,35.74 26.77,36.58 26.34,37.39 25.8,37.42 25.94,37.79 26.49,37.93 25.89,37.98 25.69,38.36 25.31,38.46 25.46,38.79 26.23,38.81 25.65,39.1 25.91,39.63 25.79,39.9 25.24,39.61 25.09,39.29 24.8,39.38 24.88,40.12 25.44,40.24 25.24,40.49 25.44,40.69 25.08,40.77 24.69,40.38 24.2,40.55 24.59,40.11 24.03,39.76 23.29,39.77 23.11,40.08 22.77,40.15 23.45,39.41 24.15,39.63 24.46,39.51 24.45,39.18 24.88,38.79 24.72,38.58 24.4,38.63 24.44,38.36 25.08,38.06 26.65,36.51 26.25,36.32 26.07,36.69 25.86,36.58 25.98,36.2 25.45,36.14 25.17,36.45 24.27,36.46 24.13,37.39 23.51,37.12 23.66,36.85 23.31,36.77 23.25,36.1 23.53,35.8 24.22,35.79 24.43,35.57 26.38,35.51 26.52,35.17 26.18,34.73 24.7,34.73 24.34,34.99 24.29,34.69 24.05,34.63 23.85,34.79 23.94,35.02 23.36,35.17 23.39,35.64 22.77,36.06 22.73,36.49 22.47,36.19 22.13,36.68 21.6,36.57 21.34,37.02 21.43,37.4 20.72,37.47 20.46,37.71 20.16,38.31 20.49,38.95 20.13,38.96",
  "33.42,34.54 33.03,34.37 32.38,34.54 32.14,34.81 32.1,35.18 32.23,35.29 32.72,35.38 32.87,35.59 33.42,35.53 33.79,35.62",
  "26.65,35.39 26.87,35.62 27.06,35.98 27.27,36.02 27.41,35.91 27.43,35.43 27.24,35.23 26.89,35.15 26.75,35.19"
]);
const BYNIC = plm([
  "27,41.1 30.6,41.3 31.8,40.6 31.2,39.2 29.5,37.6 27.5,37.3 26.43,37.88 26.49,37.93 26.39,38 26.19,38.04 26.09,38.79 26.23,38.81 26.09,38.84 26,39.5 26,40.6",
  "19.5,41 20.7,41.2 22,40.8 22.2,39.4 21.6,38.7 20.5,38.4 20.3,38.54 20.49,38.95 20.42,39.02 20.26,38.93 20.11,38.97 19.93,39.21 19.35,39.64",
  "37.26,41.35 37.52,41.26 37.82,41.32 37.97,41.19 38.43,41.12 39.43,41.31 40.14,41.13 41.18,41.52 41.5,41.5 41.4,40.9 38.5,40.7 37,41"
]);
const BY1261 = plm([
  "30.7,39.3 29.5,38.8 28.2,37.8 27,37.6 26.2,38.2 26.11,38.78 26.23,38.81 26.1,38.83 26,39.5 26,40.42 25.5,40.5 25.25,40.43 25.28,40.6 25.44,40.69 25.08,40.77 24.99,40.74 24.92,40.47 24.69,40.38 24.42,40.47 24.32,40.6 24.2,40.55 24.58,40.23 23.8,40 23.69,39.71 23.26,39.79 23.11,40.08 22.8,40.21 23.09,39.73 23.28,39.59 22.5,39.8 21.5,40.3 21.4,41.6 22.8,42 25,42.2 27,42.5 28.21,42.07 28.32,41.71 28.93,41.47 29.18,41.19 30.5,41.1 31.2,40.2",
  "23.2,37.5 23.2,36.4 22.73,36.44 22.71,36.5 22.71,36.44 22.16,36.49 22.13,36.68 22.02,36.58 22.2,37.4"
]);
const BY1350 = plm([
  "23.3,37.9 23.2,37.05 23.2,36.4 22.71,36.4 22.73,36.44 22.71,36.5 22.7,36.4 22.19,36.4 22.13,36.68 21.8,36.5 21.8,37.6",
  "24.2,40.8 24.3,40 22.8,40.21 23.2,40.9",
  "28.41,40.73 28.78,40.76 28.21,40.88 28,40.8 28,41 29.2,41.1 29.2,40.6"
]);
const OT1 = plm([
  "29.4,41.1 30.8,41 31.6,40.5 31.4,39.6 30.3,39.4 29.2,39.4 28.5,39.9 28.6,40.4"
]);
const OT2 = plm([
  "26,40.2 26,42.2 27.5,42.2 29,41.2 28.89,41.14 29.5,41.2 33.6,40.8 33.4,39.6 31.8,38.8 29.5,38.7 27.5,38.4 26.2,39.4 26.35,40.16"
]);
const OT3 = plm([
  "26.3,40 24.87,39.74 24.9,40.15 25.44,40.24 25.24,40.49 25.44,40.69 25.08,40.77 24.92,40.47 24.69,40.38 24.32,40.6 24.2,40.55 24.54,40.31 24.59,40.11 24.03,39.76 23.29,39.77 23.11,40.08 22.8,40.21 23.32,39.55 21,40.2 21.2,42.2 23,42.8 26,43 28.05,42.59 27.89,42.51 28.19,42.12 28.28,41.75 29.06,41.46 29.2,41.2 29.11,41.16 30.64,41.34 31.17,41.29 31.22,41.41 32,41.5 34,41.2 36.5,40.5 36.4,39 34.4,38 28,36.8 26.8,37.8 26.2,39"
]);
const OT4 = plm([
  "26.36,40.02 25.83,39.69 25.79,39.9 25.64,39.92 25.49,39.64 25.24,39.61 25.2,39.4 24.97,39.27 24.78,39.49 24.84,40.05 24.97,40.18 25.44,40.24 25.24,40.47 25.42,40.71 24.99,40.74 24.94,40.49 24.67,40.37 24.32,40.6 24.2,40.55 24.54,40.31 24.59,40.11 24.03,39.76 23.29,39.77 23.11,40.08 22.8,40.21 23.45,39.41 23.75,39.36 24.23,39.62 24.51,39.45 24.45,39.18 24.77,39 24,38.5 21.94,36.54 21.37,36.94 21.43,37.4 21.13,37.55 20.72,37.47 20.46,37.71 20.43,37.93 20.17,38.08 20.17,38.33 20.49,38.95 20.11,38.97 19.2,39.8 19.35,40.06 19.24,40.16 19.5,42.6 21,44 22.5,44.6 25,44.2 28.87,44.2 28.76,43.39 28.55,43.18 28.24,43.21 28.07,42.63 27.89,42.51 28.18,42.14 28.32,41.71 29.18,41.44 29.2,41.26 30.35,41.4 31.19,41.3 31.4,41.53 34,42 37,41.3 38.38,41.13 40.14,41.13 41.5,41.3 42.5,40.6 43,39.5 42,38.2 40,37.9 38.5,38 36.2,36.9 33.5,36.3 31.99,36.3 30.93,36.66 30.78,36.65 30.72,36.31 28.9,36.37 28.45,36.59 28.44,36.39 26.81,36.53 26.71,36.95 26.38,37.16 26.34,37.39 26.24,37.37 26.26,37.88 26.49,37.93 26.27,38.05"
]);
const IR1 = plm([
  "48.97,39.18 48.99,37.78 49.21,37.58 50.2,37.39 51,36.77 51.91,36.58 54.03,36.83 54,38.5 63,38.5 62.99,35.41 63.1,35.86 64.5,36.29 64.5,29.57 62.48,29.41 60.84,29.86 61.89,28.54 62.76,28.25 62.74,27.27 63.32,27.12 63.16,26.65 61.83,26.23 61.41,25.06 60.55,25.45 60.47,25.29 58.07,25.56 57.31,25.78 56.81,27.14 56.12,27.16 54.62,26.51 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.92,30.38 49.2,30.35 49.21,30.51 48.95,30.5 49.04,30.43 48.93,30.42 48.86,30.35 48.93,30.06 48.55,29.93 47.2,30.03 46.53,29.1 44.72,29.19 42.08,31.08 40.42,31.92 39.15,32.12 39.29,32.24 39.03,32.33 38.77,33.37 40.99,34.43 41.39,36.52 41.82,36.6 42.77,37.37 44.09,37.31 44.28,36.97 44.77,37.14 44.6,37.72 44.2,37.9 44.46,38.34 44.01,39.37 44.39,39.41 44.57,39.77 44.81,39.64 44.33,40.03 43.67,40.11 43.72,40.76 43.44,41.11 44.85,41.21 45.28,41.45 46.5,41.04 46.69,41.28 46.18,41.66 46.43,41.89 47.27,41.3 47.83,41.2 48.62,41.82 49.54,40.65 50.24,40.5 50.39,40.24 49.89,40.37 49.49,40.15 49.28,39.52 49.41,39.29 49.08,38.96"
]);
const IR2 = plm([
  "48.97,39.18 48.99,37.78 49.21,37.58 50.2,37.39 51,36.77 51.91,36.58 54.03,36.83 54,38.5 63,38.5 62.99,35.41 63.1,35.86 64.5,36.29 64.5,29.57 62.48,29.41 60.84,29.86 61.89,28.54 62.76,28.25 62.74,27.27 63.32,27.12 63.16,26.65 61.83,26.23 61.41,25.06 60.55,25.45 60.47,25.29 58.07,25.56 57.31,25.78 56.81,27.14 56.12,27.16 54.79,26.5 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.98,30.52 48.92,30.04 48.46,29.99 48.01,30.46 48.01,30.99 47.67,30.99 47.83,31.81 47.41,32.4 46.1,32.95 46.16,33.26 45.38,33.97 45.5,34.59 45.7,34.55 45.67,34.81 46.15,35.11 46,35.67 46.33,35.8 45.32,35.99 44.6,37.72 44.2,37.9 44.46,38.34 44.01,39.37 44.39,39.41 44.57,39.77 44.81,39.64 44.33,40.03 43.67,40.11 43.72,40.76 43.44,41.11 44.85,41.21 45.28,41.45 46.5,41.04 46.69,41.28 46.18,41.66 46.43,41.89 47.27,41.3 47.83,41.2 48.62,41.82 49.54,40.65 50.24,40.5 50.39,40.24 49.89,40.37 49.49,40.15 49.28,39.52 49.41,39.29 49.08,38.96"
]);
const IR3 = plm([
  "48.97,39.18 48.99,37.78 49.21,37.58 50.2,37.39 51,36.77 51.91,36.58 54.03,36.83 54,38.5 63,38.5 62.99,35.41 63.1,35.86 63.81,36 67.5,36 67.5,31.25 66.91,31.31 66.38,30.94 66.28,29.89 65.04,29.54 62.48,29.41 60.84,29.86 61.89,28.54 62.76,28.25 62.74,27.27 63.32,27.12 63.14,26.63 61.83,26.23 61.41,25.06 60.55,25.45 60.47,25.29 59.04,25.4 57.33,25.78 56.81,27.14 56.12,27.16 54.79,26.5 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.98,30.52 48.92,30.04 48.46,29.99 48.01,30.46 48.01,30.99 47.67,30.99 47.83,31.81 47.41,32.4 46.1,32.95 46.16,33.26 45.38,33.97 45.5,34.59 45.7,34.55 45.67,34.81 46.15,35.11 46,35.67 46.33,35.8 45.32,35.99 44.6,37.72 44.2,37.9 44.46,38.34 44.01,39.37 44.39,39.41 44.57,39.77 44.81,39.64 44.33,40.03 43.65,40.14 43.72,40.76 43.44,41.08 43.5,42.86 43.94,42.55 44.86,42.76 45.7,42.51 45.63,42.2 46.74,41.85 47.55,41.21 47.89,41.22 48.58,41.85 49.54,40.65 50.24,40.5 50.39,40.22 49.89,40.37 49.43,40.06 49.41,39.29 49.08,38.96"
]);
const IR4 = plm([
  "49,36.5 54.01,36.82 53.91,37.34 54.65,37.44 55.13,37.95 57.17,38.28 57.35,37.97 59.31,37.53 60.34,36.64 61.17,36.64 61.29,35.55 61.07,34.81 60.7,34.52 60.89,34.32 60.49,34.14 60.51,33.64 60.92,33.51 60.56,33.06 60.82,31.49 61.69,31.37 61.83,31.01 60.84,29.86 61.89,28.54 62.76,28.25 62.74,27.27 63.32,27.12 63.16,26.65 61.83,26.23 61.41,25.06 60.55,25.45 60.47,25.29 58.07,25.56 57.31,25.78 56.81,27.14 56.12,27.16 54.79,26.5 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.98,30.52 48.92,30.04 48.46,29.99 48.01,30.46 48.01,30.99 47.67,30.99 47.83,31.81 47.41,32.4 46.08,32.99 49,33"
]);
const IR5 = plm([
  "48.83,38.87 49.13,37.62 50.2,37.39 51.09,36.74 51.91,36.58 54.01,36.82 53.81,38.03 53.98,38.92 53.56,39.35 53.15,39.34 53.16,39.18 53.09,39.4 53.28,39.66 53.74,39.52 53.42,39.65 53.57,39.97 52.91,40.02 53.04,39.74 52.7,40.31 52.92,41.09 53.12,40.77 53.62,40.89 53.72,40.63 54.4,40.67 54.25,40.89 54.64,40.84 54.77,41.04 54.07,41.49 53.82,42.12 52.96,41.98 52.77,41.68 52.88,41.05 52.44,41.75 52.98,42.13 54.12,42.34 54.91,41.93 55.48,41.27 57.01,41.25 57.16,41.37 56.98,41.9 57.85,42.19 58.02,42.5 58.49,42.3 58.12,42.62 58.59,42.79 59.26,42.35 60.03,42.2 59.91,41.97 60.25,41.78 60.05,41.75 60.09,41.39 61.88,41.12 62.45,40.01 63.71,39.19 65.6,38.24 66.62,37.99 66.52,37.36 67.75,37.23 68.02,36.93 68.89,37.34 69.27,37.11 69.51,37.58 70.16,37.54 70.17,37.95 70.97,38.47 71.36,38.25 71.26,37.93 71.6,37.9 71.43,37.07 71.65,36.69 73.3,37.46 73.75,37.43 73.71,37.22 74.79,37.33 74.37,37.17 74.54,36.96 74.04,36.82 72.17,36.71 71.17,36.05 72,36 72,28.24 71.86,27.95 70.83,27.7 70.34,28.01 69.47,26.81 70.16,26.53 70.08,25.93 70.65,25.67 71.08,24.41 69.97,24.17 68.75,24.33 68.72,23.97 68.16,23.91 68.15,23.69 68.01,23.94 68.01,23.77 67.48,23.89 67.26,24.75 66.65,24.84 66.74,25.18 66.38,25.63 66.09,25.47 66.5,25.4 64.66,25.17 64.05,25.45 63.5,25.19 62.48,25.26 61.75,25.01 61.78,25.19 61.41,25.06 60.55,25.45 60.47,25.29 57.77,25.64 57.31,25.78 56.81,27.14 56.12,27.16 54.62,26.51 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.98,30.52 48.92,30.04 48.49,29.97 47.68,31.24 47.67,31 42.18,31 40.42,31.92 39.15,32.12 39.29,32.24 39.03,32.33 38.77,33.37 40.99,34.43 41.39,36.52 42.29,37 44.89,37.02 44.6,37.72 44.2,37.9 44.46,38.34 44.01,39.37 44.39,39.41 44.57,39.77 44.78,39.69 44.33,40.03 43.67,40.11 43.65,40.91 42.82,41.57 41.52,41.51 41.77,41.91 41.48,42.68 40.34,43.14 39.99,43.39 40.07,43.55 42.83,43.17 43.94,42.55 45.16,42.69 45.74,42.47 45.63,42.2 46.74,41.85 47.55,41.21 47.89,41.22 48.62,41.82 49.54,40.65 50.24,40.5 50.39,40.24 49.89,40.37 49.49,40.15 49.28,39.52 49.41,39.29 49.08,38.96 48.97,39.18",
  "56.27,25.67 56.41,24.9 56.94,24.12 58.76,23.54 59.52,22.56 59.82,22.51 59.81,22.24 58.52,20.42 58.2,20.4 58.21,20.61 57.86,20.26 57.69,19.73 57.82,18.99 56.81,18.75 56.36,17.94 55.45,17.84 55.03,17.01 54.08,17.01 53.09,16.64 51.98,19 54.98,20 55.64,22 55.19,22.7 52.56,22.94 51.57,24.36 51.93,23.96 52.6,24.21 54.12,24.14 55.95,25.77 56.18,26.25 56.4,26.21 56.36,26.39 56.51,26.33"
]);
const IR6 = plm([
  "48.97,39.18 48.99,37.78 49.21,37.58 50.2,37.39 51,36.77 51.91,36.58 54.01,36.82 53.91,37.34 54.65,37.44 55.45,38.08 56.2,38.07 56.2,31.5 61.71,31.36 61.8,30.85 60.84,29.86 61.89,28.54 62.76,28.25 62.74,27.27 63.32,27.12 63.16,26.65 61.83,26.23 61.41,25.06 60.55,25.45 60.47,25.29 58.07,25.56 57.31,25.78 56.81,27.14 56.12,27.16 54.79,26.5 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.98,30.52 48.92,30.04 48.46,29.99 48.01,30.46 48.01,30.99 47.67,30.99 47.83,31.81 47.41,32.4 46.1,32.95 46.16,33.26 45.38,33.97 45.5,34.59 45.7,34.55 45.67,34.81 46.15,35.11 46,35.67 46.33,35.8 45.32,35.99 44.6,37.72 44.2,37.9 44.46,38.34 44.01,39.37 44.39,39.41 44.57,39.77 44.81,39.64 44.33,40.03 43.67,40.11 43.72,40.76 43.44,41.11 44.85,41.21 45.28,41.45 46.5,41.04 46.69,41.28 46.18,41.66 46.43,41.89 47.27,41.3 47.83,41.2 48.62,41.82 49.54,40.65 50.24,40.5 50.39,40.24 49.89,40.37 49.49,40.15 49.28,39.52 49.41,39.29 49.08,38.96"
]);
const IR7 = plm([
  "48.87,38.32 49.21,37.58 50.2,37.39 51,36.77 51.91,36.58 54.01,36.82 53.91,37.34 54.65,37.44 55.13,37.95 57.17,38.28 57.35,37.97 59.31,37.53 60.34,36.64 61.17,36.64 61.29,35.55 61.07,34.81 60.7,34.52 60.89,34.32 60.49,34.14 60.51,33.64 60.92,33.51 60.56,33.06 60.82,31.49 61.69,31.37 61.83,31.01 60.84,29.86 61.89,28.54 62.76,28.25 62.74,27.27 63.32,27.12 63.16,26.65 61.83,26.23 61.41,25.06 60.55,25.45 60.47,25.29 58.07,25.56 57.31,25.78 56.81,27.14 56.12,27.16 54.79,26.5 53.72,26.71 52.46,27.63 51.4,27.93 50.8,28.93 50.93,29.05 50.64,29.14 50.66,29.45 50.07,30.2 49.53,30.02 48.98,30.52 48.92,30.04 48.46,29.99 48.01,30.46 48.01,30.99 47.67,30.99 47.83,31.81 47.41,32.4 46.1,32.95 46.16,33.26 45.38,33.97 45.5,34.59 45.7,34.55 45.67,34.81 46.15,35.11 46,35.67 46.33,35.8 45.32,35.99 44.6,37.72 44.2,37.9 44.46,38.34 44.01,39.37 44.39,39.41 44.57,39.77 44.81,39.64 44.33,40.03 43.65,40.14 43.72,40.76 43.44,41.08 43.5,42.86 43.94,42.55 44.86,42.76 45.7,42.51 45.63,42.2 46.74,41.85 47.55,41.21 47.89,41.22 48.58,41.85 49.54,40.65 50.24,40.5 50.39,40.22 49.89,40.37 49.43,40.06 49.41,39.29 49.08,38.96 48.96,39.18"
]);
const THRP = plm([
  "22.4,41 24,41.8 26,42 28,41.9 28,41 26.4,40 24.84,39.93 24.85,40.07 24.95,40.18 25.44,40.24 25.24,40.49 25.3,40.63 25.44,40.69 25.08,40.77 24.99,40.74 24.92,40.47 24.69,40.38 24.42,40.47 24.32,40.6 24.2,40.55 24.56,40.27 24.59,40.13 24.52,40 23.5,40.2 23.04,40.11 22.8,40.21 22.87,40.07 22.5,40"
]);
const CYRP = plm([
  "25.2,30.2 20.5,30.3 19.93,31.7 19.94,31.96 20.07,32.18 20.56,32.56 21.05,32.77 21.41,32.79 21.62,32.94 22.15,32.95 23.09,32.65 23.15,32.48 23.08,32.33 23.31,32.16 23.3,32.22 23.67,32.18 24,32.09 24.09,32.01 24.73,32.03 25.02,31.95 25.2,31.53"
]);
const ASS824P = plm([
  "35.5,37.5 36.5,37.9 38,38 42,38.5 44,38.3 45.5,37 45.8,36.3 46.2,35 46.4,33.5 46,32.3 45.2,31.8 43.5,33.4 41,35.1 39,35.9 37.8,35.5 37.4,34.6 37.2,33.6 36.3,33.4 36,33.9 35.9,34.9 35.9,36.2 34.9,36.9"
]);
const ASS671P = plm([
  "36,38.8 43.5,38.5 43.74,38.33 44,38.3 45.3,37.2 47,37 49.2,36 49.9,34.5 48.9,31.8 48.6,30.4 46.5,29.9 44.5,29.8 39.9,29.9 37.8,30.4 35.8,30.2 34.2,31.2 34.16,31.55 34.53,32.05 34.77,32.91 35.29,34 35.44,34.11 35.49,34.41 35.75,34.66 35.67,34.92 35.72,35.31 35.52,35.58 35.62,35.93 35.74,36.04 35.6,36.39 35.3,36.35 34.73,36.61 34.41,36.43 34,36.02 33.9,38.6"
]);
const BABNBP = plm([
  "33.61,36.67 39.32,37.9 41.33,37.43 42.8,36.73 46.68,34.57 48.2,33.4 49.48,31.98 49.93,30.49 48.64,30.79 45.16,30.82 43.46,31.03 42.01,31.5 40.24,32.42 39.08,32.75 38.11,32.76 37.3,32.53 36.9,31.87 36.75,31.2 39.69,26.98 39.95,25.71 39.97,24.61 39.4,23.95 38.3,23.82 37.23,24.33 36.88,24.9 36.98,25.16 36.33,25.52 36.39,25.95 35.11,27.81 34.93,27.88 34.76,27.72 34.47,27.73 34.42,27.62 34.37,27.73 34.82,29.87 34.77,31.04 34.53,31.61 34.62,32.27 34.78,32.93 35.29,34 35.44,34.11 35.49,34.41 35.75,34.66 35.72,35.31 35.6,35.41 35.76,36.17 35.61,36.21 35.6,36.39 35.32,36.34 34.73,36.61 34.55,36.51 34.03,36.66 32.68,36.32"
]);
const TURKTH = plm([
  "28.02,41.97 28.04,41.89 27.98,41.89 27.97,41.82 28.23,41.52 29.11,41.24 28.99,41.01 28.63,40.97 28.55,41.08 28.54,40.99 28.17,41.09 27.94,40.97 27.52,40.99 27.29,40.7 26.68,40.46 26.35,40.2 26.38,40.15 26.16,40.06 26.27,40.23 26.22,40.33 26.83,40.6 26.79,40.66 26.51,40.6 26.09,40.61 26.05,40.66 26.03,40.74 26.36,40.96 26.32,41.25 26.63,41.36 26.6,41.61 26.33,41.71 26.33,41.79 26.53,41.82 26.61,41.97 26.94,42 27.05,42.08 27.27,42.09 27.55,41.9 27.69,41.97 27.82,41.95 27.81,41.99"
]);
const SINAIM = pl("34.05,27.81 33.23,28.57 33.19,28.68 33.17,29 32.91,29.22 32.65,29.9 32.57,29.93 32.58,30.01 32.57,29.94 32.4,30 32.4,31.22 32.6,31.06 32.93,31.16 32.7,31.04 32.93,31.11 33.01,31.06 33.06,31.13 32.95,31.11 33.11,31.2 33.13,31.05 33.41,31.16 33.65,31.12 34.2,31.31 34.89,29.49 34.74,29.31 34.62,28.74 34.41,28.32 34.43,27.98 34.21,27.79 34.25,27.73");
const mk = (id: string, name: string, color: string, dates: string, desc: string, src: string[], kfs: KF[], dis?: string): King => ({ id, name, color, dates, desc, dis, rulers: [], scr: [], src, kf: kfs });

/* ---------- kingdoms ---------- */
const KINGS: King[] = [
  { id: "rome", name: "Rome", color: "#8c2f39", dates: "Italy from c. 270 BC; eastern provinces 146 BC; western empire to AD 476 (as shown)", desc: "Rome unified Italy, then took Greece (146 BC), western Anatolia (133 BC), Syria (64 BC) and Egypt (30 BC). Judea was first a client state and later a province. Provinces are drawn as simplified blocks.", rulers: [[-64, -62, "Pompey (general who took Jerusalem, 63 BC)"], [-27, 14, "Augustus (27 BC to AD 14)"], [14, 37, "Tiberius (AD 14 to 37)"], [41, 54, "Claudius (AD 41 to 54)"], [54, 68, "Nero (AD 54 to 68)"], [69, 79, "Vespasian (AD 69 to 79)"]], scr: ["Luke 2", "Luke 3", "Acts 25", "Acts 28", "Romans 13"], src: ["wRomR", "wRomE", "wSiege63", "wSyria"], kf: [
    kf(-270, -241, [ITALY], "Rome holds peninsular Italy.", ["wRomR"]),
    kf(-241, -146, [ITALY, SICILY, SARD], "Italy plus Sicily and Sardinia.", ["wRomR"]),
    kf(-146, -64, [ITALY, SICILY, SARD, GREECE, AFRICA, ANATW, CYR], "Provinces in Greece, North Africa, western Anatolia (Asia) and Cyrene added. Block outlines are approximate.", ["wRomR"]),
    kf(-64, -30, [ITALY, SICILY, SARD, GREECE, AFRICA, ANATN, SYR, CYPRUS, CYR], "Syria (64 BC) and Cyprus (58 BC) added; Judea is a client state outside this block.", ["wRomR", "wSyria", "wSiege63"]),
    kf(-30, 395, [ROMEEMP, SICILY, SARD], "Egypt (30 BC) and the eastern provinces to the Euphrates; client kingdoms such as Herod's are drawn separately on top. Block outline is approximate and does not show later gains and losses.", ["wRomE"]),
    kf(395, 477, [ITALY, SICILY, SARD, AFRICA], "After the empire's division in 395 the eastern half is shown as the Byzantine Empire; the western half survives in Italy and Africa until AD 476.", ["wRomE", "brByz"]),
  ] },
  { id: "persia", name: "Persia (Achaemenid Empire)", color: "#6b4c9a", dates: "559 to 330 BC", desc: "Cyrus II founded the empire; it took Babylon in 539 BC and Egypt in 525 BC. Judah was a small province (Yehud) in the satrapy 'Beyond the River'. Cyrus's policy allowed exiles to return.", dis: "The Cyrus decree is preserved in two differing biblical versions (Ezra 1 and 6); how far it reflects a general policy is debated.", rulers: [[-559, -529, "Cyrus II the Great (559 to 530 BC)"], [-530, -522, "Cambyses II (530 to 522 BC)"], [-522, -486, "Darius I (522 to 486 BC)"], [-486, -465, "Xerxes I (486 to 465 BC), commonly identified with Ahasuerus of Esther"], [-465, -424, "Artaxerxes I (465 to 424 BC)"], [-336, -330, "Darius III (336 to 330 BC)"]], scr: ["Isaiah 45", "2 Chronicles 36", "Ezra 1", "Ezra 6", "Nehemiah 2", "Esther 1", "Daniel 6"], src: ["brCyrus", "brDarius", "brAch", "metAch", "wAch", "wCylinder"], kf: [
    kf(-550, -539, [PERS1], "Persia and Media united under Cyrus (550 BC).", ["brCyrus", "metAch"]),
    kf(-539, -525, [PERS], "Cyrus adds Lydia, Babylon and the Levant.", ["brCyrus", "metAch"]),
    kf(-525, -479, [PERS, EGY, ...THRP, ...CYRP], "Cambyses takes Egypt (525 BC) and Cyrenaica; Darius I adds Thrace and Macedonia (c. 512 to 479 BC): the empire's greatest extent. Checked against the Achaemenid Empire map (Anatolia, Levant, Egypt and Gulf coasts agree; Sogdiana, Bactria and the Indus lie east of this map).", ["metAch", "wAch", "ckAch", "ckNE"]),
    kf(-479, -404, [PERS, EGY, ...CYRP], "Thrace and Macedonia lost after Plataea (479 BC); Egypt remains until 404 BC.", ["metAch", "wAch", "ckAch"]),
    kf(-404, -343, [PERS, ...CYRP], "Egypt independent (404 to 343 BC).", ["wAch", "wLate", "ckAch"]),
    kf(-343, -332, [PERS, EGY, ...CYRP], "Egypt briefly reconquered.", ["wAch", "wLate", "ckAch"]),
    kf(-332, -330, [PERSE], "After Alexander's victories only the east remains (simplified).", ["wAlex", "wGaug"]),
  ] },
  { id: "parthia", name: "Parthia", color: "#9a6b4c", dates: "c. 247 BC to AD 224", desc: "An Iranian empire that took Babylonia from the Seleucids and stood opposite Rome along the Euphrates. Parthians are listed among the pilgrims at Pentecost.", rulers: [[-171, -132, "Mithridates I (c. 171 to 132 BC)"], [-124, -91, "Mithridates II (c. 124 to 91 BC)"], [-57, -38, "Orodes II (57 to 38 BC)"]], dis: "Two open maps disagree about how far Parthia reached. The 94 BC map draws it from Armenia and Commagene (vassals) to Arachosia, Gedrosia and the Paradan coast, while the undated French map stops near Herat and the Hilmand and leaves Armenia out; the two outlines overlap only 0.64. This app draws the first for the reign of Mithridates II and the second for the later centuries. That reading is an interpretation, because the French map gives no date, and it does not settle the question; Parthian borders also shifted constantly.", scr: ["Acts 2"], src: ["wParth", "brSel", "ckPar94", "ckParFr"], kf: [
    kf(-247, -141, [PARTH1], "Early Parthia in the north-east of Iran (mostly beyond this map). Not re-checked: no open map shows it (this outline overlaps the 94 BC map only 0.11).", ["wParth"]),
    kf(-141, -124, [PARTH2], "After taking Media and Babylonia (c. 141 BC) the border runs along the Euphrates; approximate. Not re-checked: no open map shows these years (this outline overlaps the 94 BC map 0.51).", ["wParth", "brSel"]),
    kf(-124, -91, [PAR94], "The empire in 94 BC under Mithridates II, with its vassals (Armenia, Commagene, Characene, Persis and others) as the map shades them. Redrawn from the map (overlap with the old outline 0.51; with the map 0.99). The map was placed by fitting it to the coast and cities, so the edges are approximate.", ["wParth", "ckPar94", "ckNE"]),
    kf(-91, 224, [PARFR], "The empire as the undated French map draws it: Iran and Mesopotamia from the Euphrates to the Hilmand and Herat, without Armenia (overlap with the old outline 0.69; with the map 0.91). The map gives no date, so using it for the later centuries is an interpretation; it was fitted by city control points, with errors up to about 1 degree.", ["wParth", "brSel", "ckParFr", "ckNE"]),
  ] },
  { id: "seleucid", name: "Seleucid Empire", color: "#b5651d", dates: "312 to 63 BC", desc: "Founded by Seleucus I after Alexander. Antiochus III took Coele-Syria (Judea) from the Ptolemies at Panium in 200 BC; Antiochus IV's suppression of Jewish practice provoked the Maccabean revolt.", dis: "Only four outlines come from a map (c. 200 BC, after Apamea in 188 BC, c. 100 BC and 64 BC); the frontier between them shifted constantly, and the earliest and the Parthian-loss phases are drawn as simple steps.", rulers: [[-312, -281, "Seleucus I Nicator (312 to 281 BC)"], [-222, -187, "Antiochus III the Great (222 to 187 BC)"], [-175, -164, "Antiochus IV Epiphanes (175 to 164 BC)"]], scr: ["Daniel 11", "1 Maccabees 1", "2 Maccabees 4"], src: ["brSel", "metSel", "wSel", "wPanium", "wApamea", "ckSel"], kf: [
    kf(-312, -301, [SEL1], "Babylonia and Iran. Not re-checked: no open map shows these years.", ["wSel"]),
    kf(-301, -200, [SEL2], "Syria, Mesopotamia, Iran and parts of Anatolia; Coele-Syria is Ptolemaic. Not re-checked: the nearest map is for c. 200 BC after Antiochus III's eastern campaign, and this outline overlaps it only 0.41.", ["brSel", "metSel"]),
    kf(-200, -190, [...SEL200], "The state c. 200 BC after Antiochus III's eastern campaign, with Coele-Syria (including Judea) won at Panium. Redrawn from the Kaidor map (overlap 0.41 → 0.96); the yellow 'dependent territories' of Parthia, Bactria and Armenia on that map are not included.", ["wPanium", "ckSel", "ckNE"]),
    kf(-190, -141, [SEL188], "West of the Taurus lost after Magnesia (190 BC) and Apamea (188 BC); Judea still Seleucid. Redrawn from the same map (overlap 0.46 → 0.98).", ["wApamea", "metSel", "ckSel", "ckNE"]),
    kf(-141, -129, [SEL5], "Parthia takes Iran and Babylonia; Judea gains independence. Not re-checked: the map shows no stage between 188 BC and c. 100 BC (this outline overlaps the 188 BC outline 0.31).", ["wParth", "wHasm"]),
    kf(-129, -69, [SEL100], "A shrinking rump around Syria and Cilicia: the state at the end of the 2nd century BC. Redrawn from the Kaidor map (overlap 0.54 → 0.96); the Armenian occupation of 83 to 69 BC is not drawn.", ["metSel", "wSyria", "ckSel", "ckNE"]),
    kf(-69, -64, [SEL64], "The territory on the eve of becoming a Roman province (64 BC). Redrawn from the same map (overlap 0.22 → 0.92).", ["metSel", "wSyria", "ckSel", "ckNE"]),
  ] },
  { id: "assyria", name: "Assyria", color: "#b03a2e", dates: "city-state c. 2000 BC; empire 883 to 612 BC (remnant to 609 BC)", desc: "Based at Ashur and later Nineveh. Its Neo-Assyrian kings extorted tribute from Israel and Judah, destroyed Samaria in 722 BC and besieged Jerusalem in 701 BC.", rulers: [[-883, -859, "Ashurnasirpal II (883 to 859 BC)"], [-859, -824, "Shalmaneser III (859 to 824 BC)"], [-745, -727, "Tiglath-Pileser III (745 to 727 BC)"], [-727, -722, "Shalmaneser V (727 to 722 BC)"], [-722, -705, "Sargon II (722 to 705 BC)"], [-705, -681, "Sennacherib (705 to 681 BC)"], [-681, -669, "Esarhaddon (681 to 669 BC)"], [-669, -631, "Ashurbanipal (669 to c. 631 BC)"]], scr: ["2 Kings 15", "2 Kings 17", "2 Kings 18", "2 Kings 19", "Isaiah 10", "Isaiah 36", "Jonah 3", "Nahum 3"], src: ["brAssyria", "wNA", "bmAss", "wSenn", "wAssCapt", "wFallNin"], kf: [
    kf(-2000, -1365, [ASHUR], "City-state around Ashur (often under foreign overlords).", ["wOA", "brAssyria"]),
    kf(-1365, -1050, [ASSMID], "Middle Assyrian kingdom in northern Mesopotamia.", ["wMA", "brAssyria"]),
    kf(-1050, -883, [ASHUR], "Contraction to the heartland.", ["brAssyria"]),
    kf(-883, -745, [...ASS824P], "Expansion into north Syria; tribute from Phoenicia and Aram. Outline redrawn after the 824 BC extent in the Neo-Assyrian map (Mesopotamian arc from Cilicia to the Tigris and Euphrates above Babylon); overlap with the reference fill 0.54, previously 0.36.", ["wNA", "bmAss", "ckAss", "ckNE"]),
    kf(-745, -671, [...ASS671P], "Damascus (732 BC), Samaria (722 BC) and Philistia taken; Babylon annexed. Outline redrawn after the 671 BC extent in the same map (overlap 0.71, previously 0.48).", ["wNA", "wAssCapt", "wSenn", "ckAss", "ckNE"]),
    kf(-671, -655, [...ASS671P, EGY], "Peak: Egypt conquered by Esarhaddon and Ashurbanipal.", ["wAssEg", "ckAss"]),
    kf(-655, -612, [...ASS671P], "Egypt lost; empire still large until the fall of Nineveh in 612 BC (simplified).", ["wFallNin", "bmAss", "ckAss"]),
    kf(-612, -609, [ASSHARRAN], "Last Assyrian remnant around Haran.", ["wFallNin"]),
  ] },
  { id: "babylon", name: "Babylon / Babylonia", color: "#2e7d4f", dates: "c. 1894 to 539 BC (Neo-Babylonian empire 626 to 539 BC)", desc: "Old Babylon under Hammurabi, Kassite Babylonia, then the Neo-Babylonian (Chaldean) empire whose king Nebuchadnezzar II destroyed Jerusalem and exiled Judeans.", dis: "Jerusalem's destruction is dated 587 or 586 BC depending on how regnal years are counted.", rulers: [[-1792, -1750, "Hammurabi (c. 1792 to 1750 BC)"], [-626, -605, "Nabopolassar (626 to 605 BC)"], [-605, -562, "Nebuchadnezzar II (605 to 562 BC)"], [-556, -539, "Nabonidus (556 to 539 BC); son Belshazzar co-regent in Daniel 5"]], scr: ["Genesis 11", "2 Kings 24", "2 Kings 25", "Jeremiah 39", "Psalm 137", "Daniel 1", "Daniel 5"], src: ["brBab", "brNeoBab", "wNB", "wOB", "wHam", "wKass", "wCarch"], kf: [
    kf(-1894, -1792, [BABOLD1], "Small Amorite kingdom around Babylon.", ["wOB"]),
    kf(-1792, -1595, [BABHAM], "Hammurabi's kingdom at its height.", ["wHam", "wOB"]),
    kf(-1595, -626, [BABS], "Kassite and later Babylonia in the south, often under Assyrian control.", ["brBab", "wKass"]),
    kf(-626, -605, [BABNB1], "Nabopolassar frees Babylonia and takes Assyrian lands after 612 BC.", ["brNeoBab"]),
    kf(-605, -539, [...BABNBP], "Neo-Babylonian empire after Carchemish (605 BC), including Judah, with Tayma and the Hejaz oases under Nabonidus. Redrawn after the Nabonidus-era map; hand-placed from the map (about 0.5 degree accuracy).", ["wCarch", "brNeoBab", "wNB", "ckNab", "ckNE"]),
  ] },
  { id: "medes", name: "Medes", color: "#7a8b3a", dates: "c. 612 to 550 BC", desc: "Allied with Babylon against Assyria; later absorbed by Cyrus of Persia.", dis: "The size, and even the unity, of the Median state are debated; Herodotus is the main source. Two open maps disagree: Median Empire-en.svg (drawn here) reaches the Halys river in Cappadocia and holds northern Mesopotamia and the south of Iran, while Median Empire.svg (Crates) stops further east and does not hold Cappadocia or the Jazira. This app draws the first and does not decide between them.", rulers: [[-625, -585, "Cyaxares (c. 625 to 585 BC)"], [-585, -550, "Astyages (c. 585 to 550 BC)"]], scr: ["Isaiah 13", "Jeremiah 51", "Daniel 5"], src: ["wMedes", "bmAss", "ckMed", "ckMedB"], kf: [
    kf(-612, -585, [MEDES], "Median realm across northern Iran and eastern Anatolia; very approximate. Not re-checked: neither map shows this phase.", ["wMedes"]),
    kf(-585, -550, [MEDA], "The Median realm at its height after the Halys settlement with Lydia, as the Median Empire-en map draws it: the Iranian plateau, Cappadocia to the Halys, northern Mesopotamia and the south of Iran (overlap 0.41 → 0.95). The second Median map (Crates) disagrees in the west, so that part is disputed; the eastern edge is approximate.", ["wMedes", "ckMed", "ckMedB", "ckNE"]),
  ] },
  { id: "lydia", name: "Lydia", color: "#c28b2e", dates: "c. 685 to 546 BC (mapped at its height, 585 to 546 BC)", desc: "A kingdom of western Anatolia with its capital at Sardis, famous for the wealth of Croesus and early coined money. It fought the Medes to a draw at the Halys (traditionally 585 BC) and fell to Cyrus of Persia in 546 BC.", rulers: [[-680, -644, "Gyges (c. 680 to 644 BC)"], [-560, -546, "Croesus (c. 560 to 546 BC)"]], scr: ["Revelation 3"], src: ["wLydia", "ckLyd", "ckNE"], kf: [
    kf(-585, -546, [LYD], "Lydia at its height under Croesus: western Anatolia to the Halys. Redrawn from the Lydian kingdom map (overlap 0.98). Before 585 BC Lydia was smaller, and no open map shows it, so it is not drawn.", ["wLydia", "ckLyd", "ckNE"]),
  ] },
  { id: "macedon", name: "Macedon (Alexander)", color: "#7d5aa6", dates: "334 to 323 BC", desc: "Alexander III conquered Anatolia, the Levant, Egypt and Persia in a decade.", rulers: [[-359, -336, "Philip II (359 to 336 BC)"], [-336, -323, "Alexander III the Great (336 to 323 BC)"]], scr: ["Daniel 8", "1 Maccabees 1"], src: ["wAlex", "wGaug", "wDiad"], kf: [
    kf(-334, -332, [GREECE, ANATW], "Greece and western Anatolia.", ["wAlex"]),
    kf(-332, -330, [GREECE, PERSW, EGY], "Levant and Egypt taken (332 BC).", ["wAlex"]),
    kf(-330, -323, [GREECE, PERS, EGY], "Persian heartland taken; empire continues east beyond this map.", ["wAlex", "wGaug"]),
  ] },
  { id: "hittite", name: "Hittites (Hatti)", color: "#7d7d7d", dates: "c. 1650 to 1180 BC", desc: "An Anatolian kingdom centered on Hattusa that fought Egypt for Syria and signed a treaty with Ramesses II.", rulers: [[-1344, -1322, "Suppiluliuma I (c. 1344 to 1322 BC)"], [-1267, -1237, "Hattusili III (c. 1267 to 1237 BC)"]], scr: ["Genesis 23", "2 Samuel 11"], src: ["wHitt", "wMitanni"], kf: [
    kf(-1650, -1350, [HITTOLD], "Central Anatolia. Not re-checked: no open map shows the Old Kingdom's extent, and this outline overlaps the 1350 to 1300 BC outline only 0.58.", ["wHitt"]),
    kf(-1350, -1300, [HITL], "The empire c. 1350 to 1300 BC under Suppiluliuma I and Mursili II, with northern Syria. Redrawn from the green line on the Hittite rule map (overlap 0.64 → 0.97).", ["wHitt", "ckHit", "ckNE"]),
    kf(-1300, -1210, [HITM], "Approximate maximum area of Hittite rule (the map's light green), including the western vassals; the edges of vassal lands are approximate. Overlap 0.74 → 0.89.", ["wHitt", "ckHit", "ckNE"]),
    kf(-1210, -1180, [HITM, CYPRUS], "As before, with Cyprus (Alashiya), which the map also shades as within Hittite reach; the last decades before the collapse.", ["wHitt", "ckHit", "ckNE"]),
  ] },
  { id: "mitanni", name: "Mitanni (Hanigalbat)", color: "#8e5a9b", dates: "c. 1500 to 1260 BC (approx.)", desc: "A Hurrian kingdom of northern Syria and Mesopotamia that rivalled Egypt, the Hittites and Assyria. Its kings corresponded with Egypt (Tushratta's letters are in the Amarna archive); Hittite and Assyrian attacks reduced it to a rump called Hanigalbat.", dis: "Whether the Biblical 'Aram-naharaim' (Aram of the two rivers) meant Mitanni's land is debated.", rulers: [[-1358, -1335, "Tushratta (c. 1358 to 1335 BC)"]], scr: ["Genesis 24:10", "Judges 3:8"], src: ["wMitanni"], kf: [
    kf(-1500, -1450, [MITH], "The heartland between the Khabur and the Tigris, the dark purple on the map; its beginnings are poorly documented, so this is approximate.", ["wMitanni", "ckMit", "ckNE"]),
    kf(-1450, -1350, [MITM], "Mitanni at its maximal extension: northern Syria, the Jazira and the Tigris lands as far as Arrapha and Nuzi. Outline from the light purple on the map (overlap 0.96); the map shows only this one time slice, so the dating of the phases is an interpretation.", ["wMitanni", "ckMit", "ckNE"]),
    kf(-1350, -1260, [MITH], "After the Hittite conquest of the west (Suppiluliuma I) and Assyrian pressure, Mitanni shrinks to its heartland (Hanigalbat), drawn from the map's dark purple area (overlap 0.95); the later phases are approximate.", ["wMitanni", "ckMit", "ckNE"]),
  ] },
  { id: "egypt", name: "Egypt", color: "#c9951c", dates: "Native kingdom to 343 BC (Persians and then Ptolemies after)", desc: "Egypt's reach varied: Nile valley and delta in the Middle Kingdom, an empire in Canaan in the New Kingdom, then retreat. Scripture places Joseph, the Exodus, Shishak's raid and Necho's campaign here.", dis: "Which pharaoh ruled at the Exodus is unknown; Ramesses II is a frequent late-date suggestion.", rulers: [[-1991, -1962, "Amenemhat I (c. 1991 to 1962 BC)"], [-1878, -1839, "Senusret III (c. 1878 to 1839 BC)"], [-1550, -1525, "Ahmose I (c. 1550 to 1525 BC)"], [-1479, -1425, "Thutmose III (c. 1479 to 1425 BC)"], [-1353, -1336, "Akhenaten (c. 1353 to 1336 BC)"], [-1279, -1213, "Ramesses II (c. 1279 to 1213 BC)"], [-1213, -1203, "Merneptah (c. 1213 to 1203 BC)"], [-945, -924, "Shoshenq I, the biblical Shishak (c. 945 to 924 BC)"], [-690, -664, "Taharqa (690 to 664 BC)"], [-610, -595, "Necho II (610 to 595 BC)"], [-589, -570, "Apries, the biblical Hophra (589 to 570 BC)"]], scr: ["Genesis 12", "Genesis 41", "Exodus 12", "1 Kings 14", "2 Kings 19", "2 Kings 23", "Jeremiah 44", "Ezekiel 29"], src: ["brEgypt", "wMK", "wSIP", "wNK", "wTIP", "wLate", "wMern", "wShosh"], kf: [
    kf(-2000, -1650, [EGYLN], "Middle Kingdom: Egypt as the map draws it (Nile, delta, Sinai and the desert borders) with Lower Nubia annexed as far as the Second Cataract. Redrawn from the Old and Middle Kingdoms map (overlap 0.17 → 0.95); the desert borders are nominal.", ["wMK", "ckMKE", "ckNE"]),
    kf(-1650, -1550, [EGY], "Second Intermediate Period: divided, with Hyksos rule in the delta (shown as one wash). Egypt proper is the Old Kingdom area of the Old and Middle Kingdoms map without Lower Nubia (overlap 0.17 → 0.96); that map shows the Hyksos only as invasion arrows, so the division is not drawn.", ["wSIP", "ckMKE", "ckNE"]),
    kf(-1550, -1479, [EGYEMP], "New Kingdom after Ahmose: Canaan, coastal Syria and Nubia; the frontier shifted with each pharaoh. Not re-checked: no open map of this phase.", ["wNK", "wMern"]),
    kf(-1479, -1425, [EGYNK], "The Egyptian Empire c. 1450 BC under Thutmose III: Egypt, Nubia to the Fourth to Sixth Cataract, the Red Sea coast to Punt, Canaan and Syria to the Euphrates. Redrawn from the ArdadN map (overlap with its green: 0.19 → 0.96). The desert borders are nominal.", ["wNK", "ckNK", "ckNE"]),
    kf(-1425, -1150, [EGYEMP], "New Kingdom empire: Canaan, coastal Syria and Nubia; the frontier in Syria shifted with each pharaoh. Not re-checked: no open map of these phases.", ["wNK", "wMern"]),
    kf(-1150, -744, [EGY], "Third Intermediate Period: Egypt proper (Shoshenq raids Canaan c. 925 BC). The Third Intermediate Period map splits the Delta and Valley among local rulers; its coloured zones lie 82% inside the old outline and 99.9% inside this one, and the rulers are not drawn separately.", ["wTIP", "wShosh", "ckTIP", "ckNE"]),
    kf(-744, -656, [EGYKUSH], "25th Dynasty: Egypt and Kush under Nubian kings. Redrawn from the Kushite Empire map, a blurred schematic: Egypt plus its Nubian part (overlap 0.28 → 0.93). The southern edge is cut at 16 N, near Meroe, the map's southernmost city; the real southern limit is poorly known.", ["wTIP", "ckKush", "ckNE"]),
    kf(-656, -609, [EGY], "Egypt proper.", ["wLate", "ckMKE", "ckNE"]),
    kf(-609, -605, [EGYNECHO], "Necho II's brief presence in Syria up to Carchemish. The Syrian part is not re-checked: no open map shows it.", ["wCarch", "wLate"]),
    kf(-605, -525, [EGY], "Saite Egypt; Babylon threatens but does not hold Egypt.", ["wLate", "ckMKE", "ckNE"]),
    kf(-404, -343, [EGY], "Last native dynasties (28th to 30th).", ["wLate", "ckMKE", "ckNE"]),
  ] },
  { id: "ptolemaic", name: "Ptolemaic Kingdom", color: "#d8a73a", dates: "305 to 30 BC", desc: "Greek-Macedonian dynasty in Egypt. It held Coele-Syria including Judea until 200 BC; the Septuagint was produced in this Hellenistic Egypt.", rulers: [[-305, -282, "Ptolemy I Soter (305 to 282 BC)"], [-204, -180, "Ptolemy V Epiphanes (204 to 180 BC)"], [-51, -30, "Cleopatra VII (51 to 30 BC)"]], scr: ["Daniel 11"], src: ["brPtol", "wPtol", "wHell"], kf: [
    kf(-305, -200, [PTEGY, PTCYR, PTCS, CYPRUS], "Egypt with Coele-Syria, Cyrene and Cyprus. Redrawn from the Kaidor map of Egypt in the 3rd and 2nd centuries BC, which draws the nominal desert borders and the Red Sea coast with Berenice (overlap for Egypt and Cyrenaica 0.31 → 0.92; Coele-Syria 0.67 → 0.77).", ["brPtol", "wPtol", "ckPtol", "ckNE"]),
    kf(-200, -96, [PTEGY, PTCYR, CYPRUS], "Coele-Syria lost at Panium (200 BC).", ["wPanium", "ckPtol"]),
    kf(-96, -58, [PTEGY, CYPRUS], "Cyrene bequeathed to Rome (96 BC).", ["wPtol", "ckPtol"]),
    kf(-58, -30, [PTEGY], "Egypt alone until Rome annexes it (30 BC).", ["wPtol", "ckPtol"]),
  ] },
  { id: "elam", name: "Elam", color: "#6a8caf", dates: "c. 2700 to 539 BC (shown to 647 BC)", desc: "A kingdom in south-west Iran centered on Susa, later destroyed by Ashurbanipal. Susa later became a Persian capital.", rulers: [], scr: ["Genesis 14", "Isaiah 11", "Daniel 8"], src: ["wElam"], kf: [kf(-2000, -647, [ELAM], "Susiana and Anshan; very approximate.", ["wElam"])] },
  { id: "canaan", name: "Canaan (city-states)", color: "#8a9a5b", dates: "to c. 1200 BC", desc: "The land between Egypt and Syria held many small city-states; Egypt controlled it for centuries in the New Kingdom. Genesis sets the patriarchs here.", rulers: [], scr: ["Genesis 12", "Genesis 15", "Numbers 13", "Joshua 11"], src: ["wCanaan", "wNK", "carta"], kf: [kf(-2000, -1200, [CANAAN], "Region of the Canaanite city-states (not a single state).", ["wCanaan"])] },
  { id: "phoenicia", name: "Phoenicia (Tyre, Sidon)", color: "#7e57c2", dates: "c. 1200 to 332 BC", desc: "Coastal city-states of seafarers and traders. Hiram of Tyre supplied cedar and craftsmen for Solomon's Temple.", rulers: [[-969, -936, "Hiram I of Tyre (c. 969 to 936 BC)"], [-887, -856, "Ithobaal (Ethbaal) I of Tyre, father of Jezebel (c. 887 to 856 BC)"]], scr: ["1 Kings 5", "1 Kings 16", "Isaiah 23", "Ezekiel 26"], src: ["wPhoen", "carta"], kf: [kf(-1200, -332, [PHOEN], "A coastal strip of independent cities, later under Assyria, Babylon and Persia. Redrawn from the 830 BC reference map (overlap with its fill: 0.41, previously 0.21).", ["wPhoen", "ckIs830"])] },
  { id: "aram", name: "Aram-Damascus", color: "#d2691e", dates: "c. 940 to 732 BC", desc: "An Aramean kingdom around Damascus, Israel's frequent enemy. Hazael (c. 842 to 800 BC) pressed Israel hard; Tiglath-Pileser III destroyed the kingdom in 732 BC.", dis: "How much of Gilead Hazael held is debated: 2 Kings 10:32 to 33 says he took all of it from Israel, while the 830 BC reference map leaves Israel a strip east of the Jordan. The outline follows the reference map and does not choose.", rulers: [[-940, -900, "Rezon (Solomon's time)"], [-853, -841, "Hadad-ezer (Adad-idri), at Qarqar 853 BC"], [-842, -800, "Hazael (c. 842 to 800 BC)"], [-750, -732, "Rezin (c. 750 to 732 BC)"]], scr: ["1 Kings 11", "1 Kings 20", "2 Kings 8", "2 Kings 13", "2 Kings 16", "Isaiah 7"], src: ["wAram", "brAram", "wQarqar", "wDan"], kf: [
    kf(-940, -842, [ARAM1], "Damascus and its hinterland: the 830 BC fill north of the Yarmuk. No open map shows Aram before Hazael, so this is derived from the later map and is approximate.", ["wAram", "ckIs830"]),
    kf(-842, -800, [ARAMHAZ], "Hazael's expansion into Gilead and northern Israel. Redrawn from the 830 BC reference map (overlap with its fill: 0.76, previously 0.31).", ["wAram", "wDan", "ckIs830"]),
    kf(-800, -732, [ARAM1], "Reduced again until its fall in 732 BC. Same derived outline as before Hazael.", ["wAram", "ckIs830"]),
  ] },
  { id: "philistia", name: "Philistia", color: "#cf5c36", dates: "c. 1175 to 604 BC", desc: "A coastal group of five cities (Gaza, Ashkelon, Ashdod, Ekron, Gath), long rivals of Israel and Judah; Ashkelon fell to Babylon in 604 BC.", rulers: [[-1010, -990, "Achish of Gath (David's time)"]], scr: ["Judges 13", "1 Samuel 4", "1 Samuel 17", "Amos 1", "Jeremiah 47"], src: ["wPhil", "brPhil", "wSea"], kf: [
    kf(-1175, -1000, [PHIL1], "The pentapolis and its sites, from Tel Qasile in the north to Tell el-Farah (south) and Lachish inland. No open area map exists for this period, so the outline is a hull of the sites on the Philistie Fer II map plus a margin; the five cities lie inside it.", ["wPhil", "ckPhil", "ckNE"]),
    kf(-1000, -604, [PHIL2], "The five city-states of the coastal plain. Redrawn from the 830 BC reference map (overlap with its fill: 0.62, previously 0.35). Widened slightly inland to hold Gath and Ekron.", ["wPhil", "ckIs830"]),
  ] },
  { id: "moab", name: "Moab", color: "#a0522d", dates: "c. 1300 to 580 BC (approx.)", desc: "A kingdom east of the Dead Sea. King Mesha's own stele records his revolt against Israel.", rulers: [[-860, -840, "Mesha (c. 9th century BC; Mesha Stele and 2 Kings 3)"]], scr: ["Numbers 21", "Judges 3", "Ruth 1", "2 Kings 3", "Isaiah 15", "Jeremiah 48"], src: ["wMoab", "brMoab", "wMesha"], kf: [
    kf(-1300, -850, [MOAB], "South of the Arnon (Wadi Mujib, about 31.47 N), cut from the 830 BC map's Moab fill. No open map shows Moab before Mesha, so this is derived and approximate.", ["wMoab", "ckIs830"]),
    kf(-850, -580, [MOABM], "Mesha extends north to Heshbon and Medeba. Redrawn from the 830 BC reference map (overlap with its fill: 0.75, previously 0.59).", ["wMesha", "ckIs830"]),
  ] },
  { id: "ammon", name: "Ammon", color: "#c2185b", dates: "c. 1200 to 580 BC (approx.)", desc: "A kingdom in Transjordan with its capital at Rabbah (modern Amman).", rulers: [[-1050, -1040, "Nahash (Saul's time)"], [-1000, -980, "Hanun (David's time)"]], scr: ["Judges 11", "1 Samuel 11", "2 Samuel 10", "Jeremiah 49"], src: ["wAmmon", "brAmmon"], kf: [kf(-1200, -580, [AMMON], "Territory around Rabbah. Redrawn from the 830 BC reference map (overlap with its fill: 0.84, previously 0.38).", ["wAmmon", "ckIs830"])] },
  { id: "edom", name: "Edom", color: "#e07b39", dates: "c. 1200 to 550 BC (approx.)", desc: "A kingdom south of Moab, in Esau's tradition. It was later pushed by Nabataeans, and its region became Idumea.", rulers: [[-970, -950, "Hadad the Edomite (Solomon's time)"]], scr: ["Genesis 36", "Numbers 20", "2 Samuel 8", "2 Kings 8", "Obadiah 1"], src: ["wEdom", "brEdom", "wIdumea"], kf: [kf(-1200, -550, [EDOM], "Highlands from the Zered to the Gulf of Aqaba. Redrawn from the 830 BC reference map (overlap with its fill: 0.93, previously 0.33). That map stops at about 30.1 N, so the outline is extended south along the Arabah to the head of the gulf by hand, putting Ezion-geber inside Edom as 1 Kings 9:26 places it 'in the land of Edom'; no map reaches that far and the site's location (Tell el-Kheleifeh or Jazirat Faraun) is debated.", ["wEdom", "ckIs830", "wEzion"])] },
  { id: "nabataea", name: "Nabataean Kingdom", color: "#c77d5a", dates: "c. 168 BC to AD 106 (approx.)", desc: "An Arab kingdom centered on Petra that grew rich on the incense trade; Rome annexed it in AD 106. Paul's escape from Damascus involved the officer of King Aretas.", rulers: [[-87, -62, "Aretas III (c. 87 to 62 BC)"], [-9, 40, "Aretas IV (9 BC to AD 40)"]], scr: ["1 Maccabees 5", "2 Maccabees 5", "2 Corinthians 11"], src: ["brNab", "wNab", "wInc"], kf: [
    kf(-168, -87, [NAB1], "Petra and the Negev, very approximate; no open map shows the early kingdom. It lies wholly inside the later limit drawn from the Villeneuve and Nehm\u00e9 map.", ["brNab"]),
    kf(-87, -72, [NAB85], "The kingdom at its maximal extension under Aretas III (the map dates it to around 85 BC): Damascus and the Hauran, the Negev, Sinai to the Gulf of Suez and the Hejaz to Hegra. Drawn from the map's limit line; it has no fill to measure, so the old outlines are compared by area instead (NAB1 and NAB2 were wholly inside it, covering 14% and 32%). The map stops near 39.6 E, so the eastern edge is closed with a straight line.", ["brNab", "wNab", "ckNab85", "ckNE"]),
    kf(-72, -63, [NAB1], "Petra and the Negev after Aretas III loses Damascus (the map gives no separate outline), very approximate.", ["brNab"]),
    kf(-63, 106, [NAB2], "Extended north and south-east; control of Damascus shifted. Approximate and not re-drawn: no open map shows this phase. It lies wholly inside the c. 85 BC limit.", ["brNab", "wNab"]),
  ] },
  { id: "tribes", name: "Israelite tribes (the Judges)", color: "#2f6db5", dates: "c. 1200 to 1050 BC", desc: "The tribes settled the hill country and parts of Transjordan, led in crises by judges and then Samuel. The Merneptah Stele (c. 1208 BC) names Israel in Canaan.", dis: "How the settlement happened (conquest, infiltration, or internal development) is debated.", rulers: [[-1200, -1050, "Judges in Judges 3 to 16 (Othniel, Ehud, Deborah, Gideon, Jephthah, Samson), then Eli and Samuel; no secure dates"]], scr: ["Joshua 13", "Judges 2", "Judges 4", "1 Samuel 1", "1 Samuel 7"], src: ["wJudges", "wMern", "wIJ", "carta"], kf: [kf(-1200, -1050, [TRIBES], "Hill country and parts of Gilead; tribal, not a state. The outline is the allotments of Joshua 13 to 19 as drawn on the Biblica map (overlap with its tribal fills: 0.96, previously 0.52). That is the biblical ideal; settlement was gradual and partial.", ["wJudges", "wIJ", "ckB05", "ckNE"])] },
  { id: "united", name: "United Monarchy (Israel)", color: "#1f5fa8", dates: "c. 1050 to 931 BC", desc: "Saul, David and Solomon rule one kingdom with Jerusalem as capital; Solomon builds the Temple.", dis: "Whether this kingdom was a large state or a smaller chiefdom is debated by archaeologists; Solomon's 'Euphrates to Egypt' dominion (1 Kings 4:21) is drawn dashed.", rulers: [[-1050, -1010, "Saul (c. 1050 to 1010 BC)"], [-1010, -970, "David (c. 1010 to 970 BC)"], [-970, -931, "Solomon (c. 970 to 931 BC)"]], scr: ["1 Samuel 8", "1 Samuel 31", "2 Samuel 5", "2 Samuel 8", "1 Kings 4", "1 Kings 6", "1 Kings 11"], src: ["wUM", "brDav", "wIJ", "oba", "carta"], kf: [
    kf(-1050, -1010, [SAUL], "Saul's realm in the central hills, Gilead and the Jezreel edge. Redrawn from the Biblica map of Saul, David and Solomon (overlap with its Saul fill: 0.89, previously 0.37); the map's two blocks either side of the Jordan are drawn as one outline.", ["wUM", "ckB06", "ckNE"]),
    kf(-1010, -970, [DAVID], "David's kingdom with Transjordan and Edom subdued. Redrawn from the same map (overlap with its David fill, which includes Saul's land: 0.93, previously 0.49). The map is an illustration of the biblical account, not an archaeological survey.", ["wUM", "brDav", "ckB06", "ckNE"]),
    kf(-970, -931, [DAVID, SOLSPH], "Solomon: core kingdom (solid) and the claimed tributary sphere to the Euphrates (dashed, contested). The dashed sphere follows the Biblica map's green zone controlled by Solomon (overlap 0.90, previously 0.21).", ["brDav", "wUM", "ckB06", "ckNE"]),
  ] },
  { id: "israel", name: "Kingdom of Israel (north)", color: "#3a7bd5", dates: "c. 931 to 722 BC", desc: "The northern kingdom, with Samaria as capital from the time of Omri. It fell to Assyria in 722 BC and many of its people were deported.", dis: "Regnal dates differ by a few years between chronologies (for example Thiele and Albright). Whether Israel kept any land east of the Jordan after about 841 BC is also debated: the 830 BC reference map shows a strip there, while 2 Kings 10:32 to 33 says Hazael took all of Gilead. The map follows the reference map and does not choose.", rulers: [[-931, -910, "Jeroboam I (c. 931 to 910 BC)"], [-874, -853, "Ahab (c. 874 to 853 BC)"], [-841, -814, "Jehu (c. 841 to 814 BC)"], [-793, -753, "Jeroboam II (c. 793 to 753 BC)"], [-732, -722, "Hoshea (c. 732 to 722 BC)"]], scr: ["1 Kings 12", "1 Kings 16", "2 Kings 9", "2 Kings 14", "2 Kings 17"], src: ["wIsr", "wIJ", "wMesha", "wDan", "wQarqar", "wAssCapt"], kf: [
    kf(-931, -880, [ISR1], "Israel after the split, with Transjordan holdings. Redrawn from the Biblica map of Israel and Judah (overlap of this outline plus the Omride piece with the map's Israel fill: 0.89, previously 0.48). The map's fill south of Medeba is drawn only from Omri, as the Mesha Stele says he took it.", ["wIsr", "ckB07", "ckNE"]),
    kf(-880, -841, [ISR1, ISROMRI], "Omri's dynasty; Moab tributary (dashed) per the Mesha Stele. The dashed part is the map's Israel south of Medeba.", ["wMesha", "wIsr", "ckB07"]),
    kf(-841, -793, [ISRHAZ], "Losses to Hazael of Aram-Damascus. Redrawn from the 830 BC reference map (overlap with its fill: 0.79, previously 0.50). 2 Kings 10:32 to 33 says Hazael took Gilead, so the map's Transjordan strip is uncertain.", ["wAram", "wDan", "ckIs830", "ckPleiades"]),
    kf(-793, -753, [ISRJER], "Jeroboam II restores borders 'from Lebo-hamath to the Sea of the Arabah'.", ["wIsr"]),
    kf(-753, -732, [ISR1], "Decline. Same outline as the early kingdom; no separate reference map.", ["wIsr", "ckB07"]),
    kf(-732, -722, [ISRRUMP], "Galilee and Gilead annexed by Assyria (732 BC); Samaria region remains.", ["wAssCapt", "wIsr"]),
  ] },
  { id: "judah", name: "Kingdom of Judah", color: "#0f8b8d", dates: "c. 931 to 586 BC", desc: "The southern kingdom of David's line, with Jerusalem as capital. It survived Assyria as a vassal and fell to Babylon.", dis: "The date of Jerusalem's fall is 587 or 586 BC; Hezekiah's reign dates vary by several years.", rulers: [[-931, -913, "Rehoboam (c. 931 to 913 BC)"], [-792, -740, "Uzziah (Azariah) (c. 792 to 740 BC)"], [-715, -686, "Hezekiah (c. 715 to 686 BC)"], [-687, -642, "Manasseh (c. 687 to 642 BC)"], [-640, -609, "Josiah (c. 640 to 609 BC)"], [-597, -586, "Zedekiah (597 to 586 BC)"]], scr: ["1 Kings 12", "2 Kings 18", "2 Kings 22", "2 Kings 25", "2 Chronicles 36", "Isaiah 36"], src: ["wJud", "wIJ", "wSenn", "wHezekiah", "wJosiah", "brNeoBab"], kf: [
    kf(-931, -792, [JUD1], "Judah around Jerusalem and the Shephelah. Redrawn from the 830 BC reference map (overlap with its fill: 0.85, previously 0.53).", ["wJud", "ckIs830"]),
    kf(-792, -740, [JUD1, JUDELATH], "Uzziah's reach to Elath (dashed).", ["wJud"]),
    kf(-740, -701, [JUD1], "Pressure from Assyria.", ["wJud"]),
    kf(-701, -640, [JUD2], "Shephelah towns lost after Sennacherib's 701 BC campaign.", ["wSenn", "wHezekiah"]),
    kf(-640, -609, [JUDJOS], "Josiah extends influence north into former Israel.", ["wJosiah"]),
    kf(-609, -586, [JUD1], "Vassal of Egypt then Babylon; Lachish and Azekah still held by Judah (Lachish letters, c. 588 BC).", ["wJud", "wCarch", "wLachishL"]),
  ] },
  { id: "hasmonean", name: "Hasmonean Kingdom", color: "#3d8bd9", dates: "167 to 37 BC", desc: "Descendants of the Maccabees won autonomy from the Seleucids and then expanded; civil war between brothers invited Pompey in 63 BC.", rulers: [[-167, -160, "Judas Maccabeus (167 to 160 BC)"], [-160, -143, "Jonathan (160 to 143 BC)"], [-142, -135, "Simon (142 to 135 BC)"], [-134, -104, "John Hyrcanus I (134 to 104 BC)"], [-103, -76, "Alexander Jannaeus (103 to 76 BC)"], [-76, -67, "Salome Alexandra (76 to 67 BC)"], [-40, -37, "Antigonus (40 to 37 BC)"]], scr: ["1 Maccabees 2", "1 Maccabees 13", "2 Maccabees 8"], src: ["brMacc", "wHasm", "wMaccRev", "wSiege63"], kf: [
    kf(-167, -145, [HASM1], "Judea around Jerusalem in the time of Judas Maccabeus. Redrawn from the Hasmonean annexations map (overlap with its first fill: 0.91, previously 0.37).", ["brMacc", "ckHasm", "ckNE"]),
    kf(-145, -134, [HASM1, HASMJA, HASMJB, HASMJC], "Jonathan's annexations as the map shades them (the Hebron hills, districts west and north-west of Jerusalem, and a block east of the Jordan); Simon's small additions are too small to draw separately. Overlap with the map's first two fills: 0.85, previously 0.34.", ["wHasm", "ckHasm", "ckNE"]),
    kf(-134, -104, [HASM2, HASMPOSSD], "John Hyrcanus I adds Samaria, Idumea and Medeba. Overlap with the map's first four fills: 0.89, previously 0.63. The map's 'possible annexations of Hyrcanus I' (lower Galilee) are dashed.", ["wHasm", "wIdumea", "ckHasm", "ckNE"]),
    kf(-104, -103, [HASM2, HASMPOSS, HASMGAL], "Aristobulus I adds upper Galilee (the map's fifth fill). Overlap with the first five fills: 0.89, previously 0.54.", ["wHasm", "ckHasm", "ckNE"]),
    kf(-103, -63, [HASM3, HASMMOAB], "Kingdom at its height under Jannaeus, with the coast, Galilee, the Golan and Transjordan. Overlap with all of the map's fills: 0.87, previously 0.63. The map stops at about 36.1 E, so the eastern edge of the Transjordan holdings is approximate.", ["wHasm", "ckHasm", "ckNE"]),
    kf(-63, -37, [HASM4, HASMPER, HASMGALIL], "Reduced after Pompey (63 BC) to Judea with Idumea, Galilee and Perea; Samaria and the coastal cities are detached. Redrawn from a simplified Hyrcanus II map (overlap 0.83, previously 0.44).", ["wSiege63", "wHasm", "ckHyr2", "ckNE"]),
  ] },
  { id: "herodian", name: "Herodian Kingdom", color: "#4a6fa5", dates: "37 BC to c. AD 100", desc: "Rome made Herod king in 37 BC. After him his sons ruled tetrarchies; Agrippa I briefly reunited the kingdom (AD 41 to 44).", dis: "Exact tetrarchy borders are drawn approximately.", rulers: [[-37, -4, "Herod the Great (37 to 4 BC)"], [-4, 6, "Archelaus, ethnarch of Judea (4 BC to AD 6)"], [-4, 39, "Herod Antipas, tetrarch of Galilee and Perea (4 BC to AD 39)"], [-4, 34, "Philip, tetrarch of the north-east (4 BC to AD 34)"], [37, 44, "Herod Agrippa I (AD 37 to 44)"], [50, 100, "Herod Agrippa II (c. AD 50 to c. 93/100)"]], scr: ["Matthew 2", "Luke 1", "Luke 3", "Mark 6", "Acts 12", "Acts 25"], src: ["brHerod", "wHerod", "wHerodG", "wAntipas", "wAgrippaI", "wAgrippaII"], kf: [
    kf(-37, -4, [HEROD, HERODM], "Herod's kingdom: Judea, Idumea, Samaria, Galilee, Perea and the north-east districts, with the coast from Gaza to Caesarea. Redrawn from a simplified Herodian Kingdom map, fitted by its city icons to about 0.1 degrees (overlap 0.92, previously 0.68); the Golan and Hauran edge is as that map draws it.", ["wHerod", "wHerodG", "ckHerod", "ckNE"]),
    kf(-4, 6, [ARCH, GALPER, PHILT], "Division among Archelaus (south), Antipas (Galilee and Perea) and Philip (north-east).", ["wHerod", "brHerod"]),
    kf(6, 41, [GALPER, PHILT], "Antipas and Philip remain; Judea is a Roman province. Philip died AD 34; Antipas was deposed AD 39 (simplified).", ["wAntipas", "wHerod"]),
    kf(41, 44, [HEROD, HERODM], "Agrippa I rules the reunited territory (drawn with Herod's outline).", ["wAgrippaI", "ckHerod"]),
    kf(44, 101, [AGR2], "Agrippa II rules northern districts.", ["wAgrippaII"]),
  ] },
  { id: "rjudea", name: "Judea (Roman province)", color: "#8e3b46", dates: "AD 6 to c. 395 (named Syria Palaestina from about AD 135)", desc: "After Archelaus's removal, Judea, Samaria and Idumea were governed by Roman prefects and procurators.", rulers: [[26, 36, "Pontius Pilate, prefect (AD 26 to 36)"], [52, 60, "Antonius Felix, procurator (c. AD 52 to 60)"], [59, 62, "Porcius Festus, procurator (c. AD 59 to 62)"]], scr: ["Luke 3", "Matthew 27", "John 18", "Acts 24", "Acts 25"], src: ["wJudea", "wPilate", "wFJRW"], kf: [
    kf(6, 41, [ARCH], "Province of Judea.", ["wJudea"]),
    kf(44, 135, [ARCH], "Province of Judea after Agrippa I; revolts AD 66 to 70 and AD 132 to 135.", ["wJudea", "wFJRW", "wBarK"]),
    kf(135, 395, [PALEST], "After the Bar Kokhba revolt the province is renamed Syria Palaestina and enlarged; extent approximate (this outline was not re-checked against a map).", ["wSyriaPal", "wBarK"]),
  ] },
  { id: "sasan", name: "Sasanian Empire", color: "#5e548e", dates: "AD 224 to 651", desc: "Persian dynasty that replaced the Parthians in AD 224 and became Rome's and then Byzantium's chief eastern rival. Khosrow II's armies occupied the Levant (Jerusalem, 614) and Egypt until the Byzantine recovery in 628 to 629; the dynasty fell to the Arab conquest.", dis: "The empire's frontiers changed constantly; it is drawn as a simple block, and the dates of the Persian occupation of Egypt vary between accounts.", rulers: [[224, 241, "Ardashir I (224 to 241)"], [241, 272, "Shapur I (241 to 272)"], [590, 628, "Khosrow II (590 to 628)"]], scr: [], src: ["brSas", "wSas", "wBSW"], kf: [
    kf(224, 614, [SASAN], "Sasanian realm from Mesopotamia and Iran eastward (extent approximate).", ["brSas", "wSas"]),
    kf(614, 629, [SASAN, LEV, EGY], "Persian occupation of the Levant and Egypt in the last Byzantine-Sasanian war.", ["wBSW", "wSas"]),
    kf(629, 651, [SASAN], "Heraclius's victory restores the old frontier; the empire collapses to the Arab conquest (637 to 651).", ["wBSW", "brSas", "wMPers"]),
  ] },
  mk("byz", "Byzantine (East Roman) Empire", "#9b2d5b", "AD 395 to 1453 (shown with simplified blocks)", "The eastern half of the Roman Empire, ruled from Constantinople. It held the Levant and Egypt until the Arab conquest in the 630s and 640s, then Anatolia and the Balkans, shrinking after Manzikert (1071) and the Fourth Crusade (1204) until the Ottoman capture of Constantinople in 1453.", ["brByz", "wByz", "wManz", "wConst", "wLatinE"], [
    kf(395, 533, [...BY395], "East Roman Empire after the division of 395: Balkans, Anatolia, the Levant, Egypt and Cyrenaica. Western provinces lost.", ["brByz", "wByz", "ckByz565", "ckNE"]),
    kf(533, 568, [...BY533], "Justinian's reconquests: Africa (533 to 534) and Italy (535 to 554); greatest extent about 555 to 565 (southern Spain not drawn). Checked against the c. 565 map.", ["wByz", "wJustRec", "ckByz565", "ckNE"]),
    kf(568, 614, [...BY568], "The Lombards take northern Italy (568); the exarchates of Ravenna and Africa and parts of southern Italy remain.", ["wByz", "wJustRec", "ckByz565", "ckNE"]),
    kf(614, 629, [...BY614], "Persian occupation of Syria, Palestine (614) and Egypt (619); Anatolia, the Balkan coast, Africa and parts of Italy remain.", ["wBSW", "wBSW2", "ckNE"]),
    kf(629, 636, [...BY568], "Heraclius restores the eastern provinces (629); shown with the earlier western holdings.", ["wBSW", "wBSW2", "brByz", "ckNE"]),
    kf(636, 698, [...BY636], "After the loss of Syria (636) and Egypt (641): Anatolia, the Balkan coast, Sicily, parts of Italy and Africa (Carthage falls in 698).", ["wMusl", "wByz", "ckByz717", "ckNE"]),
    kf(698, 867, [...BY700], "Anatolia, Thrace, coastal Greece, Sicily (until 827 to 902) and fragments of southern Italy; Cyprus was a Byzantine-Arab condominium and is not drawn.", ["wByz", "ckByz717", "ckNE"]),
    kf(867, 1025, [...BY900], "Macedonian expansion: Bulgaria, Armenian marches and northern Syria (Antioch 969), reaching the empire's height under Basil II (died 1025).", ["wByz", "ckByz1025", "ckNE"]),
    kf(1025, 1071, [...BY1045], "Greatest extent around 1045 (Ani annexed 1045), with Calabria and Apulia in southern Italy until the Normans take the last of it (1071).", ["wByz", "wManz", "ckByz1025", "ckNE"]),
    kf(1071, 1204, [...BY1097], "Central Anatolia lost to the Seljuks after Manzikert (1071); the Komnenian restoration (from 1081) regains the Anatolian coasts and the Balkans. Checked against the 1076 map.", ["wManz", "wByz", "wKomn", "ckByz1076", "ckNE"]),
    kf(1204, 1261, [...BYNIC], "After the Fourth Crusade (1204): the successor states of Nicaea, Epirus and Trebizond (Constantinople held by the Latin Empire).", ["wLatinE", "wNicaea", "ckByz1265", "ckNE"]),
    kf(1261, 1350, [...BY1261], "Constantinople recovered (1261): Thrace, Macedonia, coastal western Anatolia and the Morea. Checked against the 1265 map.", ["wByz", "wConst", "ckByz1265", "ckNE"]),
    kf(1350, 1453, [...BY1350], "Reduced to Constantinople and its surroundings, Thessalonica (to 1387, 1403 to 1430) and the Morea; ends with the Ottoman capture (1453). Checked against the 1355 map.", ["wConst", "wByz", "ckByz1355", "ckNE"]),
  ], "Extents are drawn as blocks; the empire's frontiers shifted frequently, and the dates when regions were lost vary by region."),
  mk("caliph", "Caliphate (Rashidun, Umayyad, Abbasid)", "#2a9d8f", "AD 632 to 1258 (shown to the Mongol sack of Baghdad)", "The Rashidun caliphs (632 to 661) conquered Syria, Egypt and Persia; the Umayyads (661 to 750) ruled from Damascus; the Abbasids (750 to 1258) ruled from Baghdad, with real power increasingly held by regional dynasties.", ["brCal", "brUmay", "brAbb", "wRash", "wUmay", "wAbb", "wMusl", "wMEgy", "wMPers"], [
    kf(632, 661, [...RASHN], "Rashidun Caliphate: Arabia, the Levant, Egypt, Libya and Persia, conquered within about two decades (extent east of this map's frame not shown). Coasts redrawn from Natural Earth and checked against the Rashidun expansion map.", ["wRash", "wMusl", "ckRash", "ckNE"]),
    kf(661, 750, [...UMAYN], "Umayyad Caliphate with its capital at Damascus, adding North Africa within this map (Spain, Sind and Transoxiana lie beyond it). Checked against the 750 map from Shepherd's Historical Atlas.", ["brUmay", "wUmay", "ckCal750", "ckNE"]),
    kf(750, 868, [...ABBN], "Abbasid Caliphate at Baghdad: nominal extent from Libya to Iran (the Maghreb west of Barqa was already lost; extent east of this map not shown). Checked against the 850 map.", ["brAbb", "wAbb", "ckAbb850", "ckCal750", "ckNE"]),
    kf(868, 1258, [...ABBCORE], "Abbasid caliphs keep Iraq while regional dynasties hold most provinces; ends with the Mongol sack of Baghdad (1258). Core outline from Natural Earth (modern Iraq between the Euphrates and the Zagros), a convenience only.", ["brAbb", "wAbb", "ckNE"]),
  ], "The caliphate's real extent varied greatly after about AD 900; later periods are drawn only as a core region."),
  mk("fatimid", "Fatimid Caliphate", "#43aa8b", "AD 969 to 1171 in Egypt (dynasty from 909)", "An Ismaili Shi'a caliphate that took Egypt in 969, founded Cairo, and held much of the Levant and the Hejaz for periods.", ["brFat", "wFat", "ckFat", "ckFat2"], [
    kf(969, 1048, [...FAT1], "Egypt, Cyrenaica and Ifriqiya (Tunisia and Tripolitania) until the Zirids break away in 1048, with Palestine, southern Syria and the Hejaz. Drawn from the Ayyubid and Mamluk reference maps for the Egypt, Cyrenaica and Hejaz shapes; the Fatimid maps on Commons are schematic and could not be overlaid, so the Maghreb and Levant edges are approximate.", ["brFat", "wFat", "ckFat", "ckFat2", "ckAyy93", "ckMam17", "ckNE"]),
    kf(1048, 1099, [...FAT2], "Ifriqiya lost to the Zirids (1048). Egypt, Cyrenaica, Palestine and the Levant coast, and the Hejaz until the 1070s; the Seljuks took Damascus and Jerusalem in the 1070s and the Fatimids briefly recovered Jerusalem in 1098. Approximate.", ["wFat", "ckFat", "ckFat2", "ckNE"]),
    kf(1099, 1171, [...FAT3], "Egypt, Sinai and the Ascalon coast (until 1153): the Crusaders take Jerusalem (1099) and the Levant coast, and the dynasty ends when Saladin abolishes the caliphate (1171).", ["wFat", "ckFat", "ckFat2", "ckNE"]),
  ]),
  mk("seljuk", "Seljuk Empire", "#bc6c25", "c. AD 1037 to 1194 (Great Seljuk Empire)", "A Turkic dynasty that took Iran and Iraq, then Syria, and opened Anatolia to Turkic settlement after the victory at Manzikert (1071).", ["brSelj", "wSelj", "wGSelj", "wManz"], [
    kf(1040, 1055, [...SELJ1], "Tughril wins Khorasan at Dandanaqan (1040) and takes northern Iran (Rayy, Isfahan) by 1051. Drawn from modern country outlines as a rough guide; Khwarazm and Transoxiana lie east of this map.", ["wSelj", "wGSelj", "brSelj", "ckSelj92", "ckNE"]),
    kf(1055, 1071, [...SELJ2], "Tughril enters Baghdad (1055); Iran and Iraq under Seljuk control, with Alp Arslan reigning from 1063.", ["wGSelj", "brSelj", "ckSelj92", "ckNE"]),
    kf(1071, 1092, [...SELJ3, ...SELJA], "After Manzikert (1071) Turkic bands settle Anatolia, and Syria and Palestine pass to Tutush (1079); shown at the greatest extent under Malik-Shah (to 1092). Checked against the 1092 map; central Anatolia was the Sultanate of Rum.", ["wManz", "wGSelj", "brSelj", "ckSelj92", "ckNE"]),
    kf(1092, 1157, [...SELJ4], "After Malik-Shah's death (1092) the realm fragments: Sanjar's Great Seljuk state keeps Iran, Iraq and Khorasan; the Syrian and Anatolian Seljuk lines are not drawn.", ["wGSelj", "brSelj", "ckSelj92", "ckNE"]),
  ]),
  mk("crus", "Crusader states", "#6d597a", "AD 1099 to 1291", "Latin Christian states founded after the First Crusade took Jerusalem in 1099: the Kingdom of Jerusalem, the Principality of Antioch, the County of Tripoli and the County of Edessa. Saladin retook Jerusalem in 1187; the last mainland stronghold, Acre, fell in 1291.", ["brCrus", "brKJer", "wCrus", "wKJer", "wHattin", "wAcre"], [
    kf(1099, 1124, [...CRU1], "After the First Crusade: the Kingdom of Jerusalem (Jerusalem, Jaffa, Galilee; Beirut and Sidon by 1110), the County of Edessa (1098), the Principality of Antioch (1098) and the County of Tripoli (1109). Coastal strips follow the Natural Earth coast.", ["wCrus", "wKJer", "ckCr35", "ckNE"]),
    kf(1124, 1144, [...CRU2], "Tyre taken (1124); Oultrejordain (Montreal 1115, Aqaba 1116) held; Edessa stands until Zengi takes it in 1144. Overlap with the 1135 reference map: 0.65 (previously 0.20).", ["wCrus", "wKJer", "ckCr35", "ckNE"]),
    kf(1144, 1187, [...CRU3], "Edessa lost (1144); Ascalon taken (1153): the kingdom's fullest extent before Hattin.", ["wCrus", "wKJer", "ckCr35", "ckNE"]),
    kf(1187, 1191, [...CRU4], "After Hattin (1187): Tyre, Tripoli and a small Antioch hold out; Jerusalem and Acre fall to Saladin. Checked against the 1190 map.", ["wHattin", "wCrus", "ckCr90", "ckNE"]),
    kf(1191, 1229, [...CRU5], "The Third Crusade recovers the coast (Acre 1191; Beirut and Sidon 1197); Tripoli and Antioch remain. Cyprus (a separate Crusader kingdom from 1192) is drawn as its own kingdom.", ["wAcre", "wCrus", "ckCr90", "ckNE"]),
    kf(1229, 1244, [...CRU6], "Treaty of Jaffa (1229) returns Jerusalem, Bethlehem and Nazareth by a corridor; Jerusalem is lost to the Khwarazmians in 1244.", ["wJaffa29", "wKJer", "ckCr90", "ckNE"]),
    kf(1244, 1268, [...CRU7], "Coastal strip from Jaffa to Beirut; Baybars takes Caesarea, Arsuf and Haifa (1265) and Jaffa and Antioch (1268).", ["wAcre", "wCrus", "ckCr90", "ckNE"]),
    kf(1268, 1289, [...CRU8], "Antioch and Jaffa lost (1268); Acre, Tyre, Sidon, Beirut and the County of Tripoli remain until Tripoli falls (1289).", ["wAcre", "wCrus", "ckNE"]),
    kf(1289, 1291, [...CRU9], "Only the Acre, Tyre, Sidon and Beirut coast remains; Acre falls on 18 May 1291 (small Templar outposts such as Tortosa and Atlit held out a few months longer and are not drawn).", ["wAcre91", "wAcre", "wCrus", "ckNE"]),
  ], "The map shows a schematic outline; the real holdings were scattered cities, castles and coastal enclaves."),
  mk("cyprus", "Kingdom of Cyprus", "#9c6644", "AD 1192 to 1489 (Lusignan); Venetian rule 1489 to 1571", "Richard I took Cyprus from a Byzantine rebel in 1191 and sold it to the Templars, who passed it to Guy of Lusignan (1192). Amalric of Lusignan was crowned king in 1197, and the Lusignans ruled until Queen Catherine Cornaro ceded the island to Venice in 1489. Cyprus was a Mamluk tribute state from 1426.", ["wKCyp", "ckNE"], [
    kf(1192, 1489, [CYPRUS], "The island of Cyprus under the Lusignan kings. Outline from the Natural Earth coast; no open reference map of the kingdom's extent was found, but its extent is the island.", ["wKCyp", "ckNE"]),
    kf(1489, 1571, [CYPRUS], "Venetian rule after Catherine Cornaro's abdication (1489); the Ottomans take the island in 1570 to 1571.", ["wKCyp", "ckNE"]),
  ], "Whether Venice 'annexed' the island in 1489 or ruled it as the queen's heir is a matter of framing; the island changed hands without a change of borders."),
  mk("ayy", "Ayyubid and Mamluk Sultanates", "#b8860b", "AD 1171 to 1517", "Saladin founded the Ayyubid dynasty (Egypt and Syria) in 1171; the Mamluks, former slave-soldiers, took power in Egypt in 1250 and ruled Egypt and Syria until the Ottoman conquest of 1516 to 1517.", ["brAyy", "brMam", "wAyy", "wMam", "wOMW", "ckAyy93", "ckAyy88", "ckMam17"], [
    kf(1171, 1188, [...AYY0], "Saladin's realm: Egypt, Cyrenaica and (briefly, under Qaraqush) the Tripolitanian coast, Syria and the Jazira, the Hejaz and Yemen; Crusader enclaves on the coast are drawn separately. Redrawn from the Ayyubid maps for 1193 and 1188 (overlap with the 1193 fill: 0.76, previously 0.40); the Tripolitanian strip comes from the 1188 map only, which could not be overlaid exactly.", ["brAyy", "wAyy", "ckAyy93", "ckAyy88", "ckNE"]),
    kf(1188, 1193, [...AYY1], "Tripolitania lost to the Almohads (1188); Saladin dies in 1193 holding Egypt, Cyrenaica, Syria, the Jazira, the Hejaz and Yemen. Overlap with the 1193 reference map: 0.76 (previously 0.40).", ["brAyy", "wAyy", "ckAyy93", "ckNE"]),
    kf(1193, 1229, [...AYY2], "Saladin's sons and brother divide the realm: Egypt, Syria, the Hejaz and Yemen (until 1229), without Cyrenaica. The Jazira frontier moves between the Ayyubid branches and the Zangids; approximate.", ["brAyy", "wAyy", "ckAyy93", "ckNE"]),
    kf(1229, 1250, [...AYY3], "Yemen lost (1229); Egypt, Syria, the Hejaz and the upper Jazira. The coast shown here still includes Crusader enclaves, which are drawn separately.", ["brAyy", "wAyy", "ckAyy93", "ckNE"]),
    kf(1250, 1260, [...MAM1], "Mamluks take power in Egypt (1250); Syria remains Ayyubid until the Mongol invasion of 1260. Egypt and the Hejaz only.", ["brMam", "wMam", "ckMam17", "ckNE"]),
    kf(1260, 1291, [...MAM2], "After Ain Jalut (1260) Baybars takes Syria to the Euphrates; the Crusader coast falls by 1291 (drawn separately), so the strip shown here includes land the Crusaders still held before then.", ["brMam", "wMam", "ckMam17", "ckNE"]),
    kf(1291, 1400, [...MAM3], "The extent of al-Nasir Muhammad (1317): Egypt, Cyrenaica, Nubia to near Dongola, the Hejaz and Syria to the Euphrates. Overlap with the 1317 reference map: 0.72 (previously 0.37). The Nubian and Hejaz edges are approximate.", ["brMam", "wMam", "ckMam17", "ckNE"]),
    kf(1400, 1517, [...MAM4], "Cilician Armenia annexed (1375); Egypt, Cyrenaica, Syria to the Euphrates, the Hejaz, and Egypt's Nile valley to Aswan (the southern Nubian frontier of 1317 is no longer held). Approximate; Cyprus became a tribute state in 1426 and is not drawn.", ["brMam", "wMam", "ckMam17", "ckNE"]),
  ]),
  mk("ott", "Ottoman Empire", "#c1440e", "c. AD 1299 to 1922 (the phases before the 1516 to 1517 conquest of Syria and Egypt are approximate)", "Founded in Anatolia c. 1300; took Constantinople in 1453 and under Selim I conquered Syria and Egypt (1516 to 1517). Egypt became largely autonomous in the 19th century and was occupied by Britain in 1882; Balkan and North African territories were lost between 1878 and 1913; the Arab provinces were detached in and after the First World War.", ["brOtt", "wOtt", "wSelimI", "wOMW", "wKhed", "wSykes"], [
    kf(1299, 1354, [...OT1], "Osman's beylik around Sogut and Bithynia: Bursa (1326), Nicaea (1331), Nicomedia (1337). Very small; outline drawn from article text and the Natural Earth coast, no per-phase reference map was available.", ["wRiseOtt", "wOtt", "ckNE"]),
    kf(1354, 1402, [...OT2], "Gallipoli (1354) and Adrianople (1362) open Thrace; Kosovo (1389); Bayezid I overruns the Anatolian beyliks until Timur defeats him at Ankara (1402). Approximate.", ["wRiseOtt", "wOtt", "ckNE"]),
    kf(1402, 1453, [...OT3], "Interregnum (1402 to 1413) and recovery: Rumelia and western Anatolia under Murad II (Thessalonica 1430). Approximate.", ["wInterreg", "wRiseOtt", "wOtt", "ckNE"]),
    kf(1453, 1517, [...OT4], "Mehmed II takes Constantinople (1453), then Serbia, Bosnia, the Morea and Trebizond (1461); Karaman is absorbed (1468 to 1487) and Selim I wins at Chaldiran (1514). Approximate.", ["wConst", "wRiseOtt", "wOtt", "ckNE"]),
    kf(1517, 1805, [OTTCORE, EGYOTT, LIBOTT, BALK], "Ottoman rule over Anatolia, the Levant, Iraq, Egypt, Hejaz, Libya and the Balkans (blocks approximate).", ["brOtt", "wOtt"]),
    kf(1805, 1878, [OTTCORE, LIBOTT, BALK], "Egypt becomes a largely autonomous province under Muhammad Ali and his dynasty (shown separately).", ["wKhed", "wOtt"]),
    kf(1878, 1912, [OTTCORE, LIBOTT, BALKE], "Balkan territories mostly lost (Congress of Berlin 1878 onward).", ["wOtt"]),
    kf(1912, 1918, [OTTCORE], "Libya lost to Italy (1912); Balkan Wars (1912 to 1913) leave only a small European foothold; the Arab provinces are lost by 1918.", ["wOtt", "wSykes"]),
  ]),
  mk("iran", "Persia / Iran (Safavid to present)", "#8d5fd3", "AD 1501 to present (named Iran officially from 1935)", "Safavid, later Qajar and Pahlavi Persia, and since 1979 the Islamic Republic of Iran. The outline is a modern-border approximation applied to the whole span; frontiers moved considerably, especially in the Caucasus and Mesopotamia.", ["wSaf", "wQaj"], [
    kf(1501, 1534, [...IR1], "Ismail I founds the Safavid state (1501) and takes Tabriz, Iraq (1508) and Khorasan (1510); Chaldiran (1514) costs the Diyarbakir area; Baghdad falls to the Ottomans in 1534. Shown with modern country shapes as a rough guide.", ["wSaf", "wChald", "ckSaf", "ckNE"]),
    kf(1534, 1590, [...IR2], "Iraq lost to Suleiman (1534); the Ottoman-Safavid war of 1578 to 1590 ends with Tabriz and the Caucasus ceded (1590).", ["wSaf", "wAmasya", "wCons1590", "ckSaf", "ckNE"]),
    kf(1590, 1722, [...IR3], "Abbas I recovers Tabriz, Shirvan and Yerevan (1603 to 1607) and Qandahar (1622); Baghdad is taken in 1623 and lost for good by the Treaty of Zuhab (1639); Kakheti shown as a vassal.", ["wSaf", "wZuhab", "ckSaf", "ckNE"]),
    kf(1722, 1736, [...IR4], "Safavid collapse: Afghan Hotaki rule in Isfahan (1722 to 1729); Ottoman and Russian occupation of the west and the Caspian coast.", ["wHotak", "wSaf", "ckNE"]),
    kf(1736, 1747, [...IR5], "Nader Shah's Afsharid empire at its greatest extent: Caucasus, Iranian plateau, Afghanistan, the Indus lands and the Oman coast (extent east of this map not shown).", ["wAfsh", "ckAfs", "ckNE"]),
    kf(1747, 1794, [...IR6], "Zand dynasty (Karim Khan) holds western and southern Iran; Khorasan is separate. Checked against the Zand map.", ["wZand", "ckZand", "ckNE"]),
    kf(1794, 1828, [...IR7], "Qajar rule: Agha Mohammad Khan reunites Iran, then loses the Caucasus to Russia (Gulistan 1813, Turkmenchay 1828).", ["wQaj", "wTurkm", "ckNE"]),
    kf(1828, 2027, [IRANP], "Qajar, Pahlavi and the Islamic Republic: modern borders from Natural Earth (1:10m); smaller shifts such as Herat (1857) and the Atrek line (1881) are not drawn.", ["wQaj", "ckNE"]),
  ], "Older frontiers are not reproduced; this outline is a convenience for context."),
  mk("turk", "Turkey", "#d1495b", "AD 1923 to present (Allied occupation and the national movement from 1918)", "The Republic of Turkey was proclaimed in 1923 after the Turkish War of Independence; the Treaty of Lausanne (1923) set its borders, with later adjustments such as Hatay (1939).", ["wLaus", "wHistTr", "brOtt"], [
    kf(1918, 1923, [TURK, ...TURKTH], "Allied occupation and the Turkish national movement; the Ottoman sultanate is abolished in 1922.", ["wLaus", "wHistTr"]),
    kf(1923, 2027, [TURK, ...TURKTH], "Republic of Turkey (approximate modern outline).", ["wLaus", "wHistTr"]),
  ]),
  mk("egmod", "Egypt (modern)", "#d4a017", "AD 1805 to present", "From 1805 under Muhammad Ali's dynasty, nominally Ottoman; occupied by Britain in 1882 and a British protectorate 1914 to 1922; independent kingdom from 1922; a republic from 1953. Israel held Sinai from 1967 until the withdrawal completed in 1982 under the 1979 treaty.", ["wKhed", "wAEW", "wKEgypt", "wSinaiOcc", "wEIT", "avEgIsr", "brSinaiP"], [
    kf(1805, 1882, [EGYFULL], "Autonomous Egypt under Muhammad Ali's dynasty (Ottoman suzerainty; modern outline used).", ["wKhed"]),
    kf(1882, 1922, [EGYFULL], "British occupation (1882) and protectorate (1914 to 1922).", ["wAEW", "wKEgypt"]),
    kf(1922, 1967, [EGYFULL], "Independent kingdom (1922), republic (1953), including Sinai and administering Gaza from 1949 (drawn separately).", ["wKEgypt", "avArm1"]),
    kf(1967, 1982, [EGYW], "Sinai under Israeli control after the Six-Day War (drawn separately as disputed administration).", ["wSinaiOcc", "wSDW"]),
    kf(1982, 2027, [EGYFULL], "Sinai returned: the Egypt-Israel treaty (26 March 1979) provided for phased withdrawal, completed on 25 April 1982.", ["avEgIsr", "wEIT", "wSinaiOcc", "brCamp"]),
  ]),
  mk("iraq", "Iraq (British Mandate, kingdom, republic)", "#3a7d44", "AD 1920 to present", "British mandate from 1920 (confirmed by the League of Nations), an independent kingdom from 1932, a republic from 1958. Outline approximate.", ["wMIraq", "wKIraq", "wSanR"], [
    kf(1920, 2027, [IRAQP], "Iraq within approximate modern borders.", ["wMIraq", "wKIraq"]),
  ]),
  mk("saudi", "Saudi Arabia", "#588157", "AD 1925 (Hejaz) / 1932 to present", "Abd al-Aziz Ibn Saud took the Hejaz in 1925 and proclaimed the Kingdom of Saudi Arabia in 1932. Outline approximate; some borders were settled only later.", ["wSaudi"], [
    kf(1925, 2027, [SAUDI], "Saudi Arabia within approximate modern borders (southern and eastern limits particularly rough).", ["wSaudi"]),
  ]),
  mk("syria", "Syria (French Mandate, then independent)", "#ca6702", "AD 1920 (mandate) to present", "Placed under French mandate by the San Remo conference (1920); independence achieved by 1946. The Golan Heights are shown separately because their status is disputed.", ["wFrM", "wSanR", "avArm4", "wGolan"], [
    kf(1920, 1946, [SYRP], "French Mandate for Syria (approximate outline).", ["wFrM", "wSanR"]),
    kf(1946, 2027, [SYRP], "Independent Syria (approximate outline); the Israeli-controlled Golan Heights are marked separately.", ["wFrM", "avArm4", "wGolan"]),
  ]),
  mk("leb", "Lebanon (French Mandate, then independent)", "#0a9396", "AD 1920 (Greater Lebanon) to present", "Greater Lebanon was created in 1920 under French mandate; independence was declared in 1943 and recognised by 1946. Armistice line with Israel: 1949.", ["wGrLeb", "wFrM", "avArm2"], [
    kf(1920, 2027, [LEBP], "Lebanon (approximate modern outline).", ["wGrLeb", "avArm2"]),
  ]),
  mk("jor", "Transjordan / Jordan", "#9c6644", "AD 1921 to present", "A separate emirate under the British Mandate from 1921; independent in 1946; renamed the Hashemite Kingdom of Jordan. Jordan administered the West Bank 1949 to 1967 (drawn separately). The Israel-Jordan treaty of 1994 defines their boundary.", ["wTrans", "wTL46", "wIJT", "peaceJor", "avArm3"], [
    kf(1921, 2027, [TRANSJ], "East of the Jordan River (approximate modern outline); the boundary with Israel is defined by the 1994 treaty.", ["wTrans", "wIJT", "peaceJor"]),
  ]),
  mk("palmand", "British Mandate for Palestine", "#005f73", "British military administration from 1918; Mandate 1920 (in force 1923) to 15 May 1948", "After the First World War Britain administered Palestine, first militarily (from 1917 to 1918) and from 1920 civilly. The League of Nations confirmed the Mandate in 1922 (in force 1923); its text incorporated the Balfour Declaration's 'national home for the Jewish people' and safeguards for the rights of other communities. Transjordan was administered separately.", ["avMandate", "wMandP", "brPal", "unispalH", "wBalf", "wSanR"], [
    kf(1918, 1920, [PALMANS], "British military administration (Occupied Enemy Territory Administration); extent and status provisional.", ["wMandP", "wSanR"]),
    kf(1920, 1948, [PALMAN], "Mandate boundaries, with Transjordan separated in 1921 to 1923.", ["avMandate", "wMandP", "unispalH"]),
  ], "Different parties dispute the Mandate's legacy and its terms; the page shows the territory the Mandate covered."),
  mk("partj", "Proposed Jewish State (UN Partition Plan, 1947)", "#4361ee", "Recommended 29 Nov 1947; not implemented as drawn", "The General Assembly recommended partitioning Mandatory Palestine into an Arab state and a Jewish state with Jerusalem under international administration. The Jewish leadership accepted the plan; Arab leaders and states rejected it. It was not implemented as drawn.", ["unGA181", "unGA181t", "wPart", "unispalH"], [
    kf(1947, 1949, [JEWA, JEWB, JEWC], "Three areas: eastern Galilee and Jezreel, the central coastal plain, and the Negev (schematic redrawing of the plan's description).", ["unGA181", "unGA181t", "wPart"]),
  ], "Only a recommendation; boundaries on this map are schematic and not traced from the UN map."),
  mk("parta", "Proposed Arab State (UN Partition Plan, 1947)", "#e07a5f", "Recommended 29 Nov 1947; not implemented as drawn", "The plan proposed an Arab state in western Galilee, the central hill country and a coastal strip south of Ashdod. The Arab Higher Committee and Arab states rejected the plan.", ["unGA181", "unGA181t", "wPart"], [
    kf(1947, 1949, [ARBA, ARBB, ARBC], "Three areas (schematic redrawing of the plan's description).", ["unGA181", "unGA181t"]),
  ], "Only a recommendation; boundaries on this map are schematic."),
  mk("partjer", "Proposed international Jerusalem (corpus separatum)", "#8338ec", "Recommended 29 Nov 1947; not implemented", "The plan placed Jerusalem and Bethlehem and nearby villages under a special international regime administered by the UN.", ["unGA181", "unGA181t", "wPart"], [
    kf(1947, 1949, [JERSEP], "Proposed international enclave (schematic).", ["unGA181", "unGA181t"]),
  ]),
  mk("israel49", "Israel (within the 1949 armistice lines)", "#0077b6", "Declared 14 May 1948; shown within the 1949 lines", "Israel declared independence as the Mandate ended; war with neighbouring states followed. Armistice agreements with Egypt, Lebanon, Jordan and Syria (February to July 1949) fixed ceasefire lines, popularly the 'Green Line'. The 1979 treaty with Egypt and the 1994 treaty with Jordan defined those international boundaries.", ["wArm", "wGreen", "avArm1", "avArm2", "avArm3", "avArm4", "w48", "avEgIsr", "peaceJor", "brAIW"], [
    kf(1948, 1949, [ISR49S], "Israel declared 14 May 1948; front lines during the war were not final (shown with the eventual 1949 lines, dashed).", ["w48", "wArm"]),
    kf(1949, 2027, [ISR49], "Within the 1949 armistice lines. The agreements state that these lines are not political or territorial borders; the lines with Egypt (1979) and Jordan (1994) were later fixed by treaty. This page does not mark Israeli-administered areas beyond the lines as part of this outline (see separate entries).", ["wArm", "avArm3", "avEgIsr", "peaceJor"]),
  ], "The status of Jerusalem is disputed: the 1949 line divided the city; Israel treats Jerusalem as its capital and the UN Security Council (resolution 478, 1980) declared Israel's Jerusalem Law null and void; Palestinians seek East Jerusalem as the capital of a future state. The borders with Lebanon and Syria are not settled by a peace treaty in the sources cited here."),
  mk("wbank", "West Bank, including East Jerusalem", "#52796f", "Jordanian-administered 1949 to 1967; Israeli-administered from 1967; partly Palestinian self-rule from 1994 to 1995", "The area west of the Jordan River left outside Israel by the 1949 armistice lines. Jordan administered it and annexed it in 1950 (recognised by few states). Israel took it, including East Jerusalem, in 1967. Under Oslo II (1995) it is divided into Areas A, B and C with different Palestinian and Israeli powers.", ["avArm3", "wJordAnn", "wSDW", "unSC242", "unSC478", "wJerLaw", "peaceDOP", "peaceOsloII", "wOslo2", "wWB", "wAreaC", "wStPal", "ocha26"], [
    kf(1949, 1967, [WB49], "Administered by Jordan after the 1949 armistice; Jordan annexed it in 1950 (few states recognised this). East Jerusalem is included (the Old City was under Jordan).", ["avArm3", "wJordAnn", "wGreen"]),
    kf(1967, 1994, [WB49S], "Under Israeli military administration after the Six-Day War. Israel applied its law and administration to East Jerusalem (1967; Jerusalem Law, 1980); UN Security Council resolution 478 (1980) called such measures null and void. Israeli settlements were established.", ["wSDW", "unSC242", "unSC478", "wJerLaw", "wWB"]),
    kf(1994, 1995, [WB49S], "Gaza-Jericho Agreement (May 1994): first transfer of powers to the Palestinian Authority, in the Jericho area.", ["wGazaJ", "peaceDOP"]),
    kf(1995, 2027, [WB49S], "Oslo II (28 Sept 1995) divides the West Bank into Areas A (Palestinian civil and security control), B (Palestinian civil, Israeli security control) and C (Israeli control). The interim arrangements were not replaced by a permanent agreement. Israeli settlements and military presence continue; the State of Palestine (proclaimed 1988) claims the territory. See UN OCHA for current conditions.", ["peaceOsloII", "wOslo2", "wAreaC", "wStPal", "ocha26"]),
  ], "Status disputed. Israel, the Palestinians and other states differ on whether the territory is 'occupied', 'disputed' or Palestinian, on East Jerusalem, and on settlements. Security Council resolutions 242 (1967) and 478 (1980) and the Oslo agreements are cited in different ways by different parties. This page does not take a position; dashed means disputed or provisional."),
  mk("gaza", "Gaza Strip", "#c9184a", "Egyptian-administered 1949 to 1967; Israeli-administered from 1967; Palestinian self-rule from 1994; 2005 onward", "A coastal strip left outside Israel by the 1949 armistice lines. Egypt administered it until 1967; Israel held it from 1967; the Palestinian Authority took over most of it from 1994; Israel withdrew its settlements and forces from inside the Strip in 2005.", ["avArm1", "wSDW", "wGazaJ", "peaceDOP", "wDisen", "wGaza", "ocha26", "unNews26"], [
    kf(1949, 1967, [GAZA], "Administered by Egypt under the 1949 armistice (not annexed).", ["avArm1", "wGaza"]),
    kf(1967, 1994, [GAZAS], "Under Israeli military administration after the Six-Day War, with Israeli settlements.", ["wSDW", "wGaza"]),
    kf(1994, 2005, [GAZAS], "Gaza-Jericho Agreement (1994): Palestinian Authority self-rule in most of the Strip; Israeli settlements and forces remain until 2005.", ["wGazaJ", "peaceDOP", "peaceOsloII"]),
    kf(2005, 2027, [GAZAS], "Israeli settlements and forces withdrew from inside the Strip in 2005 (disengagement); Israel and Egypt control the crossings. Control inside the Strip has been contested and has changed; a ceasefire took effect on 10 October 2025, and UN OCHA's report of 15 October 2026 describes a 'Yellow Line' inside the Strip beyond which access is restricted, with reported shifts of the line. Status is contested and changing.", ["wDisen", "wGaza", "ocha26", "unNews26"]),
  ], "Status disputed and changing. Israel, the Palestinians and other states describe the Strip's legal status and control differently; the most recent facts come from the UN reports cited. This page shows the Strip's geographic outline only."),
  mk("golan", "Golan Heights (Israeli-controlled since 1967; disputed)", "#f77f00", "AD 1967 to present", "A plateau on the Syria-Israel frontier. Israel took it from Syria in 1967 and applied Israeli law there in 1981; the UN Security Council (resolution 497, 1981) declared that decision null and void. Syria claims the territory; other states' positions differ.", ["wGolan", "wGolanLaw", "unSC497", "wSDW", "avArm4", "avSC242"], [
    kf(1967, 2027, [GOLAN], "Israeli-controlled since 1967 (approximate outline; a UN-monitored buffer zone and disengagement lines from 1974 lie within or beside it). Disputed.", ["wGolan", "unSC497", "wGolanLaw"]),
  ], "Status disputed: Syria claims the territory; Israel applied its law in 1981 and UN Security Council resolution 497 declared that decision null and void; other states differ in their positions."),
  mk("sinaiocc", "Sinai Peninsula (Israeli-controlled, 1967 to 1982)", "#8d99ae", "AD 1967 to 1982", "Israel took the Sinai Peninsula from Egypt in 1967. After the 1978 Camp David Accords and the 1979 peace treaty, Israel withdrew in phases; the withdrawal was completed on 25 April 1982.", ["wSinaiOcc", "wEIT", "avEgIsr", "brCamp", "brSinaiP", "wSDW", "avSC338"], [
    kf(1967, 1982, [SINAIM], "Held by Israel; returned to Egypt in stages under the 1979 treaty.", ["wSinaiOcc", "avEgIsr"]),
  ]),
];

/* ---------- routes and journeys ---------- */
const TRAILS: Trail[] = [
  { id: "kh", kind: "Trade route", name: "The King's Highway", color: "#8a4b08", a: -1300, b: 100, dates: "Attested from the Bronze and Iron Ages; used into Roman times", legs: [P("31.28,30.13 32.55,29.97 33.8,29.8 34.95,29.55 35.44,30.33 35.73,30.19 35.53,30.53 35.7,31.18 35.8,31.72 35.93,31.95 35.89,32.28 36.48,32.52 36.3,33.51")], stops: [{ n: "Heliopolis (Egypt)", p: [31.28, 30.13] }, { n: "Ezion-geber / Eilat", p: [34.95, 29.55], ref: "1 Kings 9" }, { n: "Petra area", p: [35.44, 30.33] }, { n: "Kerak (Kir)", p: [35.7, 31.18] }, { n: "Madaba", p: [35.8, 31.72] }, { n: "Rabbah (Amman)", p: [35.93, 31.95] }, { n: "Bosra", p: [36.48, 32.52] }, { n: "Damascus", p: [36.3, 33.51] }], desc: "A north-south road from Egypt across Sinai to Aqaba, then through Edom, Moab and Ammon to Damascus. Moses asks Edom for passage on it.", note: "The precise definition and date range of the 'King's Highway' are debated among scholars; the course here follows the stops listed in the Wikipedia article.", scr: ["Numbers 20", "Numbers 21"], src: ["wKH", "carta", "sacred"] },
  { id: "vm", kind: "Trade route", name: "The Way of the Sea (Via Maris)", color: "#1f5f8b", a: -1550, b: 100, dates: "Route from the Bronze Age; the name 'Via Maris' is later", legs: [P("32.4,30.85 32.55,31.05 34.25,31.28 34.47,31.5 34.65,31.8 34.93,32.1 35.18,32.58 35.57,33.02 36.3,33.51")], stops: [{ n: "Pelusium", p: [32.55, 31.05] }, { n: "Gaza", p: [34.47, 31.5] }, { n: "Aphek", p: [34.93, 32.1] }, { n: "Megiddo", p: [35.18, 32.58], ref: "1 Kings 9" }, { n: "Hazor", p: [35.57, 33.02], ref: "1 Kings 9" }, { n: "Damascus", p: [36.3, 33.51] }], desc: "The coastal trunk route linking Egypt with Syria and Mesopotamia, through Gaza, the Jezreel valley (Megiddo) and Galilee toward Damascus.", note: "Scholars such as Anson Rainey call the name 'Via Maris' a misnomer drawn from Isaiah 9:1; the exact course through Galilee is debated.", scr: ["Isaiah 9", "1 Kings 9", "2 Kings 23"], src: ["wViaM", "carta", "oba"] },
  { id: "inc", kind: "Trade route", name: "The Incense Route", color: "#7b2d8e", a: -1000, b: 100, dates: "Approximate; trade attested earlier, demand grew from the 5th century BC", legs: [P("47.01,15.37 45.33,15.43 44.13,17.5 39.83,21.42 39.61,24.47 37.93,26.62 35.44,30.33 34.47,31.5")], stops: [{ n: "Shabwa", p: [47.01, 15.37] }, { n: "Marib (Saba)", p: [45.33, 15.43], ref: "1 Kings 10" }, { n: "Najran", p: [44.13, 17.5] }, { n: "Mecca", p: [39.83, 21.42] }, { n: "Medina", p: [39.61, 24.47] }, { n: "Dedan / al-Ula", p: [37.93, 26.62] }, { n: "Petra", p: [35.44, 30.33] }, { n: "Gaza", p: [34.47, 31.5] }], desc: "Caravans carried frankincense and myrrh from South Arabia north through the Hejaz to Petra and Gaza. The Queen of Sheba's visit to Solomon is set against this trade.", note: "Stops follow the Wikipedia article; the Sheba story's historicity and date are debated.", scr: ["1 Kings 10", "Genesis 37"], src: ["wInc", "wNab", "brNab"] },
  { id: "silk", kind: "Trade route", name: "The Silk Road, western end", color: "#b0283b", a: -114, b: 100, dates: "From about 114 BC (Han expansion westward) to AD 100 and beyond", legs: [P("36.16,36.2 38.27,34.55 44.52,33.09 48.51,34.8 51.43,35.6 58,37.2")], stops: [{ n: "Antioch", p: [36.16, 36.2] }, { n: "Palmyra", p: [38.27, 34.55] }, { n: "Seleucia on the Tigris", p: [44.52, 33.09] }, { n: "Ecbatana", p: [48.51, 34.8] }, { n: "Rhagae (Ray)", p: [51.43, 35.6] }, { n: "toward Merv and China", p: [58, 37.2] }], desc: "From Antioch caravans crossed the Syrian desert via Palmyra to Seleucia and Ctesiphon, then east over the Zagros to Ecbatana and on to Merv.", note: "Palmyrene merchants mainly used Gulf and river trade; the course is a simplified schematic.", scr: ["Acts 2"], src: ["metTrade", "wSilk", "wParth"] },
  { id: "abr", kind: "Journey", name: "Abraham: Ur, Haran, Canaan, Egypt and back", color: "#2d6a4f", a: -2000, b: -1850, dates: "Traditionally c. 2000 to 1850 BC", legs: [P("46.1,30.96 44.42,32.54 42.8,33.65 40.95,34.45 40.15,35.3 39,35.95 39.03,36.86"), P("39.03,36.86 37.16,36.2 36.75,35.13 36.3,33.51 35.28,32.21 35.22,31.93 34.79,31.25 32,30.4"), P("32,30.4 34.79,31.25 35.22,31.93 35.1,31.53")], stops: [{ n: "Ur", p: [46.1, 30.96], ref: "Genesis 11" }, { n: "Haran", p: [39.03, 36.86], ref: "Genesis 11" }, { n: "Shechem", p: [35.28, 32.21], ref: "Genesis 12" }, { n: "Bethel", p: [35.22, 31.93], ref: "Genesis 12" }, { n: "The Negev", p: [34.79, 31.25], ref: "Genesis 12" }, { n: "Egypt (location unspecified)", p: [32, 30.4], ref: "Genesis 12" }, { n: "Hebron (Mamre)", p: [35.1, 31.53], ref: "Genesis 13" }], desc: "Genesis has Abraham leave Ur of the Chaldeans, settle at Haran, then move to Canaan, go down to Egypt in famine and return to the Negev, Bethel and Hebron.", note: "The route between stops is a schematic arc along the Fertile Crescent; the texts do not describe it. Dates are traditional and not independently attested; the site of Ur of the Chaldeans (southern Iraq or the Haran/Urfa area) is itself debated.", scr: ["Genesis 11", "Genesis 12", "Genesis 13"], src: ["brAbr", "wAbr", "wChron", "wUr", "wHarran", "oba"] },
  { id: "exo", kind: "Journey", name: "The Exodus (commonly proposed southern route)", color: "#c1121f", a: -1450, b: -1200, dates: "Early date c. 1446 BC or late date c. 1250 to 1200 BC", legs: [P("31.83,30.8 32.1,30.55 32.45,30.2 32.85,29.5 32.95,29.3 33.4,28.9 33.7,28.7 33.97,28.54"), P("33.97,28.54 34.3,29.7 34.42,30.69 34.95,29.55 36,29.8 36.4,30.6 36.2,31.3 35.85,31.45 35.57,31.8 35.46,31.86")], stops: [{ n: "Rameses", p: [31.83, 30.8], ref: "Exodus 12" }, { n: "Sea crossing (site debated)", p: [32.45, 30.2], ref: "Exodus 14" }, { n: "Marah (approx.)", p: [32.95, 29.3], ref: "Exodus 15" }, { n: "Rephidim (approx.)", p: [33.7, 28.7], ref: "Exodus 17" }, { n: "Mount Sinai (traditional: Jebel Musa)", p: [33.97, 28.54], ref: "Exodus 19" }, { n: "Kadesh-barnea", p: [34.41, 30.64], ref: "Numbers 13" }, { n: "Ezion-geber", p: [34.95, 29.55], ref: "Numbers 33" }, { n: "Plains of Moab", p: [35.57, 31.8], ref: "Numbers 22" }, { n: "Crossing the Jordan", p: [35.46, 31.86], ref: "Joshua 3" }], desc: "Israel leaves Egypt, crosses the sea, travels to Sinai, wanders in the wilderness, skirts Edom and Moab and enters Canaan.", note: "The route is debated. This map shows the commonly proposed southern route to the traditional Mount Sinai; northern and Arabian (Midian) alternatives exist, many stops cannot be located securely, and the Exodus's historicity and date (early vs late) are disputed.", scr: ["Exodus 12", "Exodus 14", "Exodus 19", "Numbers 20", "Numbers 33", "Joshua 3"], src: ["brExodus", "wExodus", "wSinai", "wMern", "wChron", "carta"] },
  { id: "ret", kind: "Journey", name: "Return from exile: Ezra and Nehemiah", color: "#5a189a", a: -538, b: -398, dates: "Cyrus's decree 538 BC; Nehemiah 445 BC; Ezra 458 BC (traditional) or c. 398 BC", legs: [P("44.42,32.54 42.8,33.65 38.27,34.55 36.3,33.51 35.6,32.4 35.23,31.78"), P("48.24,32.19 46.5,32.4 44.42,32.54")], stops: [{ n: "Susa (Nehemiah's start)", p: [48.24, 32.19], ref: "Nehemiah 1" }, { n: "Babylon (Ezra's start)", p: [44.42, 32.54], ref: "Ezra 7" }, { n: "Damascus (route inferred)", p: [36.3, 33.51] }, { n: "Jerusalem", p: [35.23, 31.78], ref: "Nehemiah 2" }], desc: "Ezra leads a company from Babylon to Jerusalem; Nehemiah travels from Susa to rebuild the walls. A first return under Zerubbabel followed Cyrus's decree.", note: "The texts name no itinerary; the corridor through Palmyra and Damascus is a common reconstruction. Whether Ezra came before or after Nehemiah is debated (458 or 398 BC).", scr: ["Ezra 1", "Ezra 7", "Ezra 8", "Nehemiah 1", "Nehemiah 2"], src: ["brEzra", "brNeh", "wReturn", "wEzra", "wNeh", "wCylinder"] },
  { id: "jes", kind: "Journey", name: "Jesus: main travels in Galilee and Judea", color: "#0b5394", a: 26, b: 33, dates: "Ministry c. AD 27 to 30 (crucifixion AD 30 or 33)", legs: [P("35.3,32.7 35.45,32.4 35.55,32 35.55,31.84"), P("35.55,31.84 35.34,32.75 35.575,32.88 35.63,32.91 35.2,33.27 35.69,33.25"), P("35.69,33.25 35.55,32.6 35.5,32 35.46,31.86 35.26,31.77 35.23,31.78")], stops: [{ n: "Nazareth", p: [35.3, 32.7], ref: "Luke 4" }, { n: "Jordan (baptism)", p: [35.55, 31.84], ref: "Matthew 3" }, { n: "Cana", p: [35.34, 32.75], ref: "John 2" }, { n: "Capernaum", p: [35.575, 32.88], ref: "Mark 1" }, { n: "Region of Tyre", p: [35.2, 33.27], ref: "Mark 7" }, { n: "Caesarea Philippi", p: [35.69, 33.25], ref: "Matthew 16" }, { n: "Jericho", p: [35.46, 31.86], ref: "Luke 19" }, { n: "Bethany", p: [35.26, 31.77], ref: "John 11" }, { n: "Jerusalem", p: [35.23, 31.78], ref: "Luke 19" }, { n: "Sychar (Samaria)", p: [35.28, 32.22], ref: "John 4" }], desc: "A composite of the Gospels: baptism in the Jordan, ministry centered on Capernaum and the Sea of Galilee, a northern journey to Caesarea Philippi, then the road through Jericho to Jerusalem.", note: "This is a simplified composite, not a single itinerary; John and the Synoptic Gospels order events differently, and the dates are approximate.", scr: ["Matthew 3", "Matthew 16", "Mark 1", "Luke 4", "Luke 19", "John 2", "John 4"], src: ["brJesus", "brGalilee", "wMin", "wJChron", "carta"] },
  { id: "p1", kind: "Journey", name: "Paul's first missionary journey", color: "#e07a00", a: 46, b: 49, dates: "c. AD 46 to 48", straight: true, legs: [P("36.16,36.2 35.93,36.12 33.9,35.18 32.41,34.76 30.85,36.96 31.19,38.3 32.49,37.87 32.45,37.58 33.37,37.35 32.45,37.58 32.49,37.87 31.19,38.3 30.85,36.96 30.7,36.89 36.16,36.2")], stops: [{ n: "Antioch (Syria)", p: [36.16, 36.2], ref: "Acts 13" }, { n: "Salamis", p: [33.9, 35.18], ref: "Acts 13" }, { n: "Paphos", p: [32.41, 34.76], ref: "Acts 13" }, { n: "Perga", p: [30.85, 36.96], ref: "Acts 13" }, { n: "Pisidian Antioch", p: [31.19, 38.3], ref: "Acts 13" }, { n: "Iconium", p: [32.49, 37.87], ref: "Acts 14" }, { n: "Lystra", p: [32.45, 37.58], ref: "Acts 14" }, { n: "Derbe", p: [33.37, 37.35], ref: "Acts 14" }], desc: "From Antioch to Cyprus and the cities of southern Galatia, returning the same way and sailing from Attalia to Antioch.", note: "Dates are approximate; the final sea leg is drawn as a straight line.", scr: ["Acts 13", "Acts 14"], src: ["brPaul", "brPaulMap", "wPaul"] },
  { id: "p2", kind: "Journey", name: "Paul's second missionary journey", color: "#008b8b", a: 49, b: 53, dates: "c. AD 49 to 52", straight: true, legs: [P("36.16,36.2 34.89,36.92 33.37,37.35 32.45,37.58 26.17,39.75 24.5,40.94 24.29,41.01 22.94,40.64 22.2,40.52 23.73,37.98 22.88,37.91 27.34,37.94 34.89,32.5 36.16,36.2")], stops: [{ n: "Antioch", p: [36.16, 36.2], ref: "Acts 15" }, { n: "Tarsus", p: [34.89, 36.92], ref: "Acts 15" }, { n: "Lystra", p: [32.45, 37.58], ref: "Acts 16" }, { n: "Troas", p: [26.17, 39.75], ref: "Acts 16" }, { n: "Philippi", p: [24.29, 41.01], ref: "Acts 16" }, { n: "Thessalonica", p: [22.94, 40.64], ref: "Acts 17" }, { n: "Berea", p: [22.2, 40.52], ref: "Acts 17" }, { n: "Athens", p: [23.73, 37.98], ref: "Acts 17" }, { n: "Corinth", p: [22.88, 37.91], ref: "Acts 18" }, { n: "Ephesus", p: [27.34, 37.94], ref: "Acts 18" }, { n: "Caesarea", p: [34.89, 32.5], ref: "Acts 18" }], desc: "Paul and Silas revisit Galatia, then cross to Macedonia and Greece, founding churches at Philippi, Thessalonica and Corinth.", note: "Dates are approximate and some legs are schematic straight lines.", scr: ["Acts 15", "Acts 16", "Acts 17", "Acts 18"], src: ["brPaul", "brPaulMap", "wPaul"] },
  { id: "p3", kind: "Journey", name: "Paul's third missionary journey", color: "#6a994e", a: 53, b: 58, dates: "c. AD 53 to 57", straight: true, legs: [P("36.16,36.2 32.5,37.8 27.34,37.94 24.29,41.01 22.88,37.91 24.29,41.01 26.17,39.75 27.28,37.53 29.31,36.26 35.2,33.27 35.07,32.93 34.89,32.5 35.23,31.78")], stops: [{ n: "Antioch", p: [36.16, 36.2], ref: "Acts 18" }, { n: "Ephesus", p: [27.34, 37.94], ref: "Acts 19" }, { n: "Philippi", p: [24.29, 41.01], ref: "Acts 20" }, { n: "Corinth", p: [22.88, 37.91], ref: "Acts 20" }, { n: "Troas", p: [26.17, 39.75], ref: "Acts 20" }, { n: "Miletus", p: [27.28, 37.53], ref: "Acts 20" }, { n: "Patara", p: [29.31, 36.26], ref: "Acts 21" }, { n: "Tyre", p: [35.2, 33.27], ref: "Acts 21" }, { n: "Ptolemais", p: [35.07, 32.93], ref: "Acts 21" }, { n: "Caesarea", p: [34.89, 32.5], ref: "Acts 21" }, { n: "Jerusalem", p: [35.23, 31.78], ref: "Acts 21" }], desc: "Paul spends about three years at Ephesus, revisits Macedonia and Greece and sails back to Jerusalem.", note: "Dates are approximate; the passage through Galatia and Phrygia is not itemized in Acts, so that leg is schematic.", scr: ["Acts 18", "Acts 19", "Acts 20", "Acts 21"], src: ["brPaul", "brPaulMap", "wPaul"] },
  { id: "pr", kind: "Journey", name: "Paul's voyage to Rome", color: "#9d0208", a: 59, b: 63, dates: "c. AD 59 to 62 (arrival c. AD 60 to 62)", straight: true, legs: [P("34.89,32.5 35.37,33.56 33.5,35.9 29.98,36.26 27.37,36.68 26.2,35.3 24.8,34.93 24,34.3 19,35 14.4,35.9 15.29,37.07 15.65,38.11 14.12,40.82 12.5,41.9")], stops: [{ n: "Caesarea", p: [34.89, 32.5], ref: "Acts 27" }, { n: "Sidon", p: [35.37, 33.56], ref: "Acts 27" }, { n: "Myra", p: [29.98, 36.26], ref: "Acts 27" }, { n: "Cnidus", p: [27.37, 36.68], ref: "Acts 27" }, { n: "Fair Havens (Crete)", p: [24.8, 34.93], ref: "Acts 27" }, { n: "Malta (shipwreck)", p: [14.4, 35.9], ref: "Acts 28" }, { n: "Syracuse", p: [15.29, 37.07], ref: "Acts 28" }, { n: "Rhegium", p: [15.65, 38.11], ref: "Acts 28" }, { n: "Puteoli", p: [14.12, 40.82], ref: "Acts 28" }, { n: "Rome", p: [12.5, 41.9], ref: "Acts 28" }], desc: "Paul, appealing to Caesar, sails under guard from Caesarea, is shipwrecked on Malta and reaches Rome by way of Syracuse and Puteoli.", note: "Dates are approximate; sea legs are drawn as straight lines between named ports.", scr: ["Acts 27", "Acts 28"], src: ["brPaul", "brPaulMap", "wPaul"] },
];
const TRAILD = TRAILS.map((t) => ({ id: t.id, ds: t.legs.map((l) => (t.straight ? line(l) : smooth(l))) }));

/* ---------- eras ---------- */
const ERAS: Era[] = [
  { id: "pat", name: "Patriarchs and the Amorite world", a: -2000, b: -1700, text: "The Third Dynasty of Ur collapses and Amorite dynasties rise in Mesopotamia, while Egypt's Middle Kingdom reunites the Nile. Genesis places Abraham, Isaac, Jacob and Joseph in this world; the traditional date is roughly 2000 to 1700 BC, but these figures are not independently attested.", scr: ["Genesis 12", "Genesis 37"], src: ["oba", "wUr3", "wOB", "wMK", "wChron", "brAbr"] },
  { id: "egy", name: "Egypt and the Exodus", a: -1700, b: -1200, text: "New Kingdom Egypt controls Canaan while Hittites and Assyria rival it in Syria. Scripture places Israel's stay in Egypt and the Exodus here: the early date is c. 1446 BC (from 1 Kings 6:1), the late date c. 1250 to 1200 BC. The Merneptah Stele (c. 1208 BC) is the earliest outside mention of Israel.", scr: ["Exodus 1", "Exodus 12", "1 Kings 6"], src: ["wExodus", "brExodus", "wMern", "wChron", "wNK", "wHitt"] },
  { id: "jud", name: "The judges", a: -1200, b: -1050, text: "Philistines settle the southern coast while Israelite tribes settle the hill country; judges rise in turn, from Othniel to Samuel. Absolute dates for individual judges are uncertain.", scr: ["Judges 2", "Judges 4", "1 Samuel 7"], src: ["wJudges", "wSea", "wPhil", "carta"] },
  { id: "um", name: "United monarchy: Saul, David, Solomon", a: -1050, b: -931, text: "Saul (c. 1050 to 1010 BC), David (c. 1010 to 970) and Solomon (c. 970 to 931) rule one kingdom with Jerusalem as capital; the Temple is built under Solomon. Archaeologists disagree about how large and centralized this kingdom was.", scr: ["1 Samuel 8", "2 Samuel 5", "1 Kings 6"], src: ["wUM", "brDav", "wIJ", "oba"] },
  { id: "div", name: "Divided kingdom: Israel and Judah", a: -931, b: -745, text: "Israel in the north (capital Samaria from c. 880 BC) and Judah in the south split after Solomon. Shishak raids both c. 925 BC; Aram-Damascus, Moab and Assyria press in. Ahab joins the anti-Assyrian coalition at Qarqar (853 BC); Jeroboam II (c. 793 to 753) brings Israel's greatest extent.", scr: ["1 Kings 12", "1 Kings 16", "2 Kings 14"], src: ["wIsr", "wJud", "wQarqar", "wMesha", "wDan", "wShosh"] },
  { id: "ass", name: "Assyrian era", a: -745, b: -609, text: "Tiglath-Pileser III takes Damascus (732 BC) and reduces Israel; Samaria falls in 722 BC and many Israelites are deported. Sennacherib's 701 BC campaign leaves Jerusalem standing under Hezekiah. Assyria briefly rules Egypt, then collapses when Nineveh falls in 612 BC.", scr: ["2 Kings 17", "2 Kings 19", "Isaiah 36", "Nahum 3"], src: ["brAssyria", "wNA", "wSenn", "wAssCapt", "wFallNin", "bmAss"] },
  { id: "bab", name: "Babylonian era", a: -609, b: -539, text: "Babylon under Nebuchadnezzar II defeats Egypt at Carchemish (605 BC). Jerusalem is taken in 597 BC and destroyed in 587/586 BC, and many Judeans are exiled. Cyrus of Persia takes Babylon in 539 BC.", scr: ["2 Kings 24", "2 Kings 25", "Jeremiah 39", "Psalm 137", "Daniel 5"], src: ["brNeoBab", "wNB", "wCarch", "brCapt", "wCapt"] },
  { id: "per", name: "Persian era", a: -539, b: -332, text: "Cyrus's decree (538 BC) lets Judeans return; the Second Temple is completed c. 516/515 BC. Judah is a small province. Nehemiah rebuilds the walls (445 BC); Ezra's mission is dated 458 BC by tradition, though some scholars place it c. 398 BC.", scr: ["Ezra 1", "Ezra 6", "Nehemiah 2", "Esther 1"], src: ["brCyrus", "brAch", "metAch", "wReturn", "brEzra", "brNeh", "wCylinder"] },
  { id: "hel", name: "Hellenistic era: Ptolemies and Seleucids", a: -332, b: -167, text: "Alexander conquers the Persian empire (334 to 323 BC) and his generals divide it. The Ptolemies hold Judea until 200 BC, then the Seleucids take it. Antiochus IV's suppression of Jewish practice in 167 BC sparks revolt.", scr: ["Daniel 8", "Daniel 11", "1 Maccabees 1"], src: ["wAlex", "wDiad", "brSel", "brPtol", "metSel", "wHell", "wPanium"] },
  { id: "has", name: "Maccabean revolt and the Hasmoneans", a: -167, b: -63, text: "Judas Maccabeus rededicates the Temple (164 BC). Hasmonean leaders win autonomy c. 142 BC and, under John Hyrcanus and Alexander Jannaeus, expand to Samaria, Idumea, Galilee and parts of Transjordan. A civil war invites Rome; Pompey takes Jerusalem in 63 BC.", scr: ["1 Maccabees 2", "1 Maccabees 13", "2 Maccabees 8"], src: ["brMacc", "wHasm", "wMaccRev", "wSiege63"] },
  { id: "hrd", name: "Roman conquest and Herod the Great", a: -63, b: -4, text: "Judea becomes a Roman client state. Rome names Herod king (37 BC); he rebuilds the Temple and founds Caesarea, and rules until 4 BC. Egypt, the last Hellenistic kingdom, falls to Rome in 30 BC. The birth of Jesus is traditionally placed shortly before Herod's death.", scr: ["Matthew 2", "Luke 1", "Luke 2"], src: ["brHerod", "wHerod", "wHerodG", "wRomR", "wPtol"] },
  { id: "jes", name: "Roman Judea and the ministry of Jesus", a: -4, b: 30, text: "Herod's sons divide the kingdom: Archelaus, Antipas and Philip. Judea becomes a Roman province in AD 6. Jesus teaches mainly in Galilee and Judea under Antipas and the prefect Pontius Pilate (AD 26 to 36); his crucifixion is dated AD 30 or 33.", scr: ["Luke 2", "Luke 3", "Matthew 4", "John 18"], src: ["wMin", "wJChron", "brJesus", "wPilate", "wHerod"] },
  { id: "chu", name: "Early church and the First Jewish-Roman War", a: 30, b: 101, text: "Paul's missions carry the gospel around the Mediterranean (c. AD 46 to 62). Herod Agrippa I rules a reunited Judea (AD 41 to 44). The revolt of AD 66 ends with the Temple's destruction in AD 70.", scr: ["Acts 9", "Acts 12", "Acts 13", "Acts 28"], src: ["wPaul", "brPaul", "wRomE", "wFJRW", "wAgrippaI"] },
  { id: "lr", name: "Later Roman Empire and Sasanian Persia", a: 101, b: 395, text: "After the First Jewish-Roman War Judea stayed a Roman province. After the Bar Kokhba revolt (AD 132 to 135) Rome enlarged and renamed it Syria Palaestina. In Persia the Sasanians replaced the Parthians in AD 224 and became Rome's main eastern rival. This stretch is compressed on the timeline.", scr: [], src: ["wSyriaPal", "wBarK", "wSas", "brSas", "wRomE"] },
  { id: "byz", name: "Byzantine and Sasanian era", a: 395, b: 636, text: "The Roman Empire divides in 395; its eastern half, the Byzantine Empire, rules the Levant and Egypt from Constantinople. Byzantium and Sasanian Persia fight a last long war: Persia occupies the Levant and Egypt c. 614 to 628 and Byzantium recovers them.", scr: [], src: ["brByz", "wByz", "wBSW", "brSas"] },
  { id: "cal", name: "Arab conquest and the early caliphates", a: 636, b: 1099, text: "Arab Muslim armies take Syria and Palestine (636 to 638), Egypt (641 to 642) and Persia (642 to 651). The Rashidun, Umayyad (661 to 750) and Abbasid (from 750) caliphates follow. From 969 the Fatimids hold Egypt and parts of the Levant; the Seljuks take much of the east from the 1030s and open Anatolia after Manzikert (1071), shrinking Byzantium.", scr: [], src: ["wMusl", "wMEgy", "wMPers", "brCal", "brUmay", "brAbb", "brFat", "brSelj", "wManz"] },
  { id: "cru", name: "Crusaders, Ayyubids and Mamluks", a: 1099, b: 1517, text: "The First Crusade takes Jerusalem in 1099 and Latin states are founded along the coast. Saladin's Ayyubids retake Jerusalem in 1187; the last mainland Crusader stronghold, Acre, falls in 1291. The Mamluk Sultanate rules Egypt and Syria from 1250. The Ottomans take Constantinople in 1453.", scr: [], src: ["brCrus", "brKJer", "wCrus", "wHattin", "wAcre", "brAyy", "brMam", "wConst"] },
  { id: "ott", name: "Ottoman era", a: 1517, b: 1917, text: "Selim I conquers Syria and Egypt (1516 to 1517) and Ottoman rule lasts about four centuries. Egypt becomes largely autonomous in the 19th century and Britain occupies it in 1882; Ottoman territory in the Balkans and North Africa shrinks. The empire enters the First World War in 1914 and British forces take Jerusalem in December 1917.", scr: [], src: ["brOtt", "wOtt", "wSelimI", "wOMW", "wKhed", "wAEW"] },
  { id: "man", name: "Mandates after the First World War", a: 1917, b: 1947, text: "The Balfour Declaration (November 1917) expresses British support for a Jewish national home in Palestine. After the war the Ottoman Arab provinces are divided: the San Remo conference (1920) allocates mandates to Britain (Palestine, Transjordan, Iraq) and France (Syria, Lebanon); the League of Nations confirms the Palestine Mandate in 1922 (in force 1923). The Republic of Turkey is founded in 1923; Egypt becomes formally independent in 1922; Saudi Arabia is proclaimed in 1932.", scr: [], src: ["wBalf", "wSanR", "avMandate", "wMandP", "unispalH", "wFrM", "wSykes", "wLaus", "brPal"] },
  { id: "par", name: "Partition plan, the 1948 war and the armistice lines", a: 1947, b: 1967, text: "On 29 November 1947 the UN General Assembly recommended partitioning Mandatory Palestine into an Arab state, a Jewish state and an international Jerusalem. Jewish leaders accepted the plan; Arab leaders rejected it, and it was not implemented as drawn. The Mandate ended on 14 to 15 May 1948, Israel declared independence and war followed. Armistice agreements in 1949 fixed ceasefire lines (the 'Green Line'), which are not agreed borders. Egypt administered Gaza; Jordan administered the West Bank, including East Jerusalem, and annexed it in 1950, which few states recognised.", scr: [], src: ["unGA181", "unGA181t", "wPart", "w48", "wArm", "avArm1", "avArm3", "wJordAnn", "brAIW"] },
  { id: "six", name: "The 1967 war, occupation and the Sinai return", a: 1967, b: 1993, text: "In the Six-Day War (June 1967) Israel took the Sinai Peninsula and the Gaza Strip from Egypt, the West Bank including East Jerusalem from Jordan, and the Golan Heights from Syria. UN Security Council resolution 242 (November 1967) calls for withdrawal from 'territories occupied in the recent conflict' and for secure and recognised boundaries; the parties read its wording differently. Israel and Egypt made peace in 1979 and Israel withdrew from Sinai by 25 April 1982. Israel extended its law to East Jerusalem (1980 Jerusalem Law) and the Golan (1981); Security Council resolutions 478 and 497 declared these steps null and void.", scr: [], src: ["wSDW", "brAIW", "unSC242", "avSC242", "avSC338", "avEgIsr", "wEIT", "brCamp", "wSinaiOcc", "unSC478", "unSC497", "wJerLaw", "wGolanLaw"] },
  { id: "osl", name: "Oslo: interim self-government", a: 1993, b: 2005, text: "Israel and the PLO sign the Declaration of Principles (13 September 1993) and the Gaza-Jericho Agreement (May 1994); Israel and Jordan sign a peace treaty (26 October 1994) that defines their boundary. Oslo II (28 September 1995) divides the West Bank into Areas A, B and C. The interim arrangements were meant to lead to a permanent settlement within five years; permanent-status questions (borders, Jerusalem, refugees, settlements) remain unresolved.", scr: [], src: ["peaceDOP", "unDOPt", "wOslo", "brOslo", "wGazaJ", "peaceOsloII", "wOslo2", "peaceJor", "wIJT"] },
  { id: "now", name: "Since 2005", a: 2005, b: 2027, text: "In August and September 2005 Israel withdrew its settlements and forces from inside the Gaza Strip. Control of Gaza and of crossings has since been contested, with major hostilities including from October 2023; a ceasefire took effect on 10 October 2025, and UN OCHA's report of 15 October 2026 describes a 'Yellow Line' inside the Strip, with reported shifts. In the West Bank the Oslo II divisions remain, with continuing disputes over settlements, East Jerusalem and access. The State of Palestine is recognised by a majority of UN member states; the Golan Heights remain Israeli-controlled and disputed. Conditions change faster than a map can show; check the linked UN reports.", scr: [], src: ["wDisen", "wGaza", "wWB", "wStPal", "ocha26", "unNews26", "wGolan", "unSC497"] },
];

const SHORT: Record<string, string> = { pat: "Patriarchs", egy: "Egypt", jud: "Judges", um: "United", div: "Divided", ass: "Assyria", bab: "Babylon", per: "Persia", hel: "Hellenistic", has: "Hasmonean", hrd: "Herod", jes: "Jesus", chu: "Church", lr: "Later Rome", byz: "Byzantine", cal: "Caliphates", cru: "Crusaders", ott: "Ottoman", man: "Mandates", par: "Partition", six: "1967", osl: "Oslo", now: "Since 2005" };
const PARCH = "#e9d8ae", INK = "#3b2a14", SEA = "#a3b8bc", SEAINK = "#4f6b73", SERIF = "Georgia, 'Times New Roman', serif";

/* starting year: AD 30, or the last year the reader chose when the host lets the page use localStorage. Every storage access is guarded, because a sandboxed frame can block it. */
const YKEY = "bkm.lastYear", YDEF = 30;
const loadYear = (): number => {
  try {
    const raw = window.localStorage.getItem(YKEY);
    if (raw === null || raw === "") return YDEF;
    const n = Number(raw);
    if (!isFinite(n)) return YDEF;
    const y = Math.max(YMIN, Math.min(YMAX, Math.round(n)));
    return y === 0 ? 1 : y;
  } catch (e) {
    return YDEF;
  }
};
const saveYear = (y: number) => {
  try {
    if (isFinite(y)) window.localStorage.setItem(YKEY, String(Math.max(YMIN, Math.min(YMAX, Math.round(y)))));
  } catch (e) {
    /* storage unavailable: the page simply starts at AD 30 next time */
  }
};
/* which kingdom the Details panel shows first: the United Monarchy or Roman Judea if either is on the map that year, else any kingdom that is */
const pickK = (y: number): string => {
  const on = (id: string) => { const k = KINGS.find((x) => x.id === id); return !!k && k.kf.some((f) => y >= f.a && y < f.b); };
  if (on("rjudea") && y >= 6) return "rjudea";
  if (on("united")) return "united";
  const any = KINGS.find((k) => k.kf.some((f) => y >= f.a && y < f.b));
  return any ? any.id : "united";
};

export default function App() {
  const theme = useGrokTheme();
  const [y0] = useState<number>(() => loadYear());
  const [year, setYear] = useState<number>(y0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<string>("Normal");
  const [cam, setCam] = useState<Cam>(() => camFor("all"));
  const [preset, setPreset] = useState<string>("all");
  const [cw, setCw] = useState<number>(900);
  const [chH, setChH] = useState<number>(600);
  /* frame aspect is measured, not fixed: the camera, labels and culling all follow the real frame size */
  const fa = chH > 0 && cw > 0 ? cw / chH : FA;
  const faRef = useRef<number>(fa);
  faRef.current = fa;
  const [chipOn, setChipOn] = useState<boolean>(false);
  const detRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<Cam>(camFor("all"));
  const frameRef = useRef<HTMLDivElement>(null);
  const [sel, setSel0] = useState<{ t: string; id: string }>({ t: "k", id: pickK(y0) });
  const [on, setOn] = useState<Record<string, boolean>>(() => { const o: Record<string, boolean> = {}; TRAILS.forEach((t) => { o[t.id] = true; }); return o; });
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [showKings, setShowKings] = useState<boolean>(true);
  const [geo, setGeo] = useState<boolean>(true);
  const [showCities, setShowCities] = useState<boolean>(true);
  const [lgOpen, setLgOpen] = useState<Record<string, boolean>>({ map: true, trade: false, journey: false });
  const [fs, setFs] = useState<boolean>(false);
  const [fsPanel, setFsPanel] = useState<string>("");
  const fsRef = useRef<HTMLDivElement>(null);
  const setSel = (v: { t: string; id: string }) => { setSel0(v); if (fs) setFsPanel("details"); else setChipOn(true); };
  const [yTxt, setYTxt] = useState<string>(yr(y0));
  const [yEdit, setYEdit] = useState<boolean>(false);
  const yBlurT = useRef<any>(0);
  const hold = useRef<{ t: any; i: any; n: number }>({ t: 0, i: 0, n: 0 });
  const stopHold = () => { const h = hold.current; if (h.t) clearTimeout(h.t); if (h.i) clearInterval(h.i); h.t = 0; h.i = 0; };
  useEffect(() => () => stopHold(), []);
  /* remember the year: saved 400 ms after the last change (slider, buttons, year box, era jump, play) and again when the page is hidden */
  const yearRef = useRef<number>(year);
  yearRef.current = year;
  useEffect(() => { const t = setTimeout(() => saveYear(year), 400); return () => clearTimeout(t); }, [year]);
  useEffect(() => {
    const h = () => saveYear(yearRef.current);
    try { window.addEventListener("pagehide", h); } catch (e) { /* no window events */ }
    return () => { try { window.removeEventListener("pagehide", h); } catch (e) { /* ignore */ } };
  }, []);
  /* press: one step now (10 with Shift); after 0.5 s repeat quickly; after about a second more of holding, 10 years per tick */
  const startHold = (d: number, shift: boolean) => {
    stopHold(); setPlaying(false);
    const h = hold.current; h.n = 0;
    setYear((y: number) => stepYear(y, shift ? d * 10 : d));
    h.t = setTimeout(() => { h.i = setInterval(() => { h.n += 1; setYear((y: number) => stepYear(y, d * (h.n > 12 ? 10 : 1))); }, 90); }, 500);
  };
  const fineBtn = (d: number, dark?: boolean) => (
    <button type="button" aria-label={d < 0 ? "One year earlier" : "One year later"} title={d < 0 ? "One year earlier (hold to repeat, Shift or long hold: 10 years)" : "One year later (hold to repeat, Shift or long hold: 10 years)"}
      onPointerDown={(e: { button: number; shiftKey: boolean; preventDefault: () => void }) => { if (e.button > 0) return; e.preventDefault(); startHold(d, e.shiftKey); }}
      onPointerUp={() => stopHold()} onPointerLeave={() => stopHold()} onPointerCancel={() => stopHold()} onBlur={() => stopHold()}
      onContextMenu={(e: { preventDefault: () => void }) => e.preventDefault()}
      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlaying(false); setYear((y: number) => stepYear(y, e.shiftKey ? d * 10 : d)); } }}
      style={{ flex: "none", width: 40, height: 40, minWidth: 36, minHeight: 36, borderRadius: 8, fontSize: 22, lineHeight: "1", fontFamily: SERIF, cursor: "pointer", touchAction: "none", userSelect: "none", border: "1px solid " + (dark ? "#8a7a55" : theme.border.default), background: dark ? "#f3e7c9" : theme.bg.elevated, color: dark ? "#2b1d0a" : theme.text.primary }}>{d < 0 ? "\u2212" : "+"}</button>
  );
  const [yMsg, setYMsg] = useState<{ err: boolean; t: string }>({ err: false, t: "" });
  useEffect(() => { if (!yEdit) setYTxt(yr(year)); }, [year, yEdit]);
  const applyYear = () => {
    const r = parseYear(yTxt);
    if (r.y === undefined) { setYMsg({ err: true, t: r.err || "Could not read that year." }); return; }
    setYear(r.y); setPlaying(false); setYEdit(false); setYTxt(yr(r.y));
    setYMsg(r.note ? { err: false, t: r.note } : { err: false, t: "" });
  };
  const yearInput = (dark: boolean) => (
    <div data-nopan="1" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <input type="text" value={yTxt} aria-label="Type a year, for example 586 BC, AD 70 or 1948" placeholder="586 BC, AD 70, 1948" autoComplete="off" spellCheck={false}
        onFocus={() => { if (yBlurT.current) { clearTimeout(yBlurT.current); yBlurT.current = 0; } setYEdit(true); }}
        onBlur={() => { if (yBlurT.current) clearTimeout(yBlurT.current); yBlurT.current = setTimeout(() => { yBlurT.current = 0; setYEdit(false); setYMsg({ err: false, t: "" }); }, 300); }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => { setYTxt(e.target.value); setYEdit(true); setYMsg({ err: false, t: "" }); }}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); applyYear(); } }}
        style={{ width: 118, padding: "5px 8px", borderRadius: 6, fontSize: 14, fontFamily: SERIF, border: "1px solid " + (yMsg.err ? "#c0392b" : dark ? "#8a7a55" : theme.border.default), background: dark ? "#f3e7c9" : theme.bg.elevated, color: dark ? "#2b1d0a" : theme.text.primary }} />
      <span onMouseDown={(e: { preventDefault: () => void }) => e.preventDefault()} style={{ display: "inline-flex" }}><Button label="Go" onClick={applyYear} /></span>
      {yMsg.t && (<span role="status" style={{ fontSize: 12, color: yMsg.err ? (dark ? "#ffb4a2" : "#b3261e") : (dark ? "#f3e7c9" : theme.text.tertiary), maxWidth: 260 }}>{yMsg.t}</span>)}
    </div>
  );

  useEffect(() => {
    if (!playing) return;
    const step = speed === "Slow" ? 2 : speed === "Fast" ? 10 : 4;
    const id = setInterval(() => { setYear((y: number) => p2y(Math.min(SL, y2p(y) + step))); }, 120);
    return () => clearInterval(id);
  }, [playing, speed]);
  useEffect(() => { if (playing && year >= YMAX) setPlaying(false); }, [playing, year]);

  const era = ERAS.find((e) => year >= e.a && year < e.b) || ERAS[ERAS.length - 1];
  const eraIdx = ERAS.indexOf(era);
  /* z = screen pixels per map unit, so every size below written as px / z stays constant on screen while zooming */
  const chh = cam.w / fa;
  const z = cw / cam.w;
  const vx = cam.cx - cam.w / 2, vy = cam.cy - chh / 2;
  const vbs = f1(vx) + " " + f1(vy) + " " + f1(cam.w) + " " + f1(chh);
  const lvl = z < 1.2 ? 1 : z < 2.2 ? 2 : z < 4 ? 3 : z < 8 ? 4 : 5;
  const zoomX = z / (cw / camFor("all", fa).w);
  /* map frame height: 16:9 on wide screens, 3:2 on tablets, taller (4:5) on phones, never more than 80% of the viewport height */
  const frameH = "min(" + Math.round(cw / (cw >= 900 ? 16 / 9 : cw >= 600 ? 3 / 2 : 4 / 5)) + "px, 80vh)";
  const commit = (c: Cam) => { const n = clampCam(c); camRef.current = n; setCam(n); setPreset(""); };
  const goPreset = (k: string) => { const n = camFor(k, fa); camRef.current = n; setCam(n); setPreset(k); };
  /* when the frame shape changes (resize, rotate, full screen) a named view is refitted to it; a custom view keeps its centre and width */
  useEffect(() => { if (preset && VIEWS[preset]) { const n = camFor(preset, fa); camRef.current = n; setCam(n); } }, [Math.round(fa * 40)]);
  useEffect(() => { if (!chipOn) return; const t = setTimeout(() => setChipOn(false), 8000); return () => clearTimeout(t); }, [chipOn, sel.t, sel.id]);
  const [cq, setCq] = useState<string>("");
  const [cqOpen, setCqOpen] = useState<boolean>(false);
  /* centre and zoom on a city: keep the reader's zoom if already closer, otherwise zoom until the place is drawn */
  const goCity = (n: string) => {
    const c = ALLC.find((x) => x.n === n);
    if (!c) return;
    const q = proj(c.p);
    const zt = c.r <= 1 ? 3 : c.r === 2 ? 4.5 : c.r === 3 ? 5 : c.r === 4 ? 6 : 8.5;
    commit({ cx: q[0], cy: q[1], w: Math.min(camRef.current.w, cw / zt) });
    setSel({ t: "c", id: n });
    setShowCities(true);
    setCq(""); setCqOpen(false);
  };
  const setAllTrails = (ids: string[], v: boolean) => setOn((o) => { const n = { ...o }; ids.forEach((i) => { n[i] = v; }); return n; });
  /* one grouped Layers control, rendered in the normal view and in the full-screen Layers panel */
  const layersCtl = (bare: boolean) => {
    const item = (key: string, label: string, checked: boolean, onCh: (v: boolean) => void, color: string, sw: string, dim: boolean, tip: string) => (
      <label key={key} title={tip} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 34, padding: "2px 8px", borderRadius: theme.radius.md, cursor: "pointer", opacity: dim ? 0.55 : 1, minWidth: 0, background: checked ? theme.bg.subtle : "transparent" }}>
        <input type="checkbox" checked={checked} onChange={(e: ChangeEvent<HTMLInputElement>) => onCh(e.target.checked)} style={{ width: 16, height: 16, margin: 0, flex: "none", accentColor: color, cursor: "pointer" }} />
        {sw === "box" ? (<span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, background: color, flex: "none", border: "1px solid " + theme.border.default }} />) : (<span aria-hidden="true" style={{ width: 22, height: 0, borderTop: "4px " + (sw === "dash" ? "dashed " : "solid ") + color, borderRadius: 2, flex: "none" }} />)}
        <span style={{ ...theme.font.body2, color: theme.text.primary, minWidth: 0 }}>{label}</span>
      </label>
    );
    const grid: Record<string, string | number> = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))", gap: "2px 10px" };
    const head = (id: string, title: string, count: number, total: number, onAll: (v: boolean) => void) => {
      const open = !!lgOpen[id];
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button type="button" aria-expanded={open} aria-label={(open ? "Collapse " : "Expand ") + title} onClick={() => setLgOpen({ ...lgOpen, [id]: !open })} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", padding: "6px 2px", cursor: "pointer", color: theme.text.primary, ...theme.font.label }}>
            <span aria-hidden="true" style={{ display: "inline-block", width: 10, color: theme.text.tertiary, transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
            <span>{title}</span>
            <span style={{ ...theme.font.caption, color: count > 0 ? theme.text.accent : theme.text.tertiary, fontWeight: 400 }}>{count} of {total} on</span>
          </button>
          <span style={{ flex: 1 }} />
          <Button label="Show all" variant="quiet" onClick={() => onAll(true)} />
          <Button label="Hide all" variant="quiet" onClick={() => onAll(false)} />
        </div>
      );
    };
    const mapOn = (showKings ? 1 : 0) + (geo ? 1 : 0) + (showCities ? 1 : 0);
    const pathGroup = (id: string, title: string, kind: string, sw: string) => {
      const list = TRAILS.filter((t) => t.kind === kind);
      const ids = list.map((t) => t.id);
      return (
        <div style={{ borderTop: "1px solid " + theme.border.subtle, paddingTop: 4 }}>
          {head(id, title, list.filter((t) => on[t.id]).length, list.length, (v) => setAllTrails(ids, v))}
          {lgOpen[id] && (
            <div style={grid}>
              {list.map((t) => {
                const off = activeOnly && !(year >= t.a && year <= t.b);
                return item(t.id, t.name, !!on[t.id], (v) => setOn({ ...on, [t.id]: v }), t.color, sw, off, off ? "Switched on, but hidden while the slider is outside its period (" + t.dates + ")" : t.dates);
              })}
            </div>
          )}
        </div>
      );
    };
    return (
      <div data-nopan="1" role="group" aria-label="Layers" style={{ display: "flex", flexDirection: "column", gap: 4, ...(bare ? {} : { padding: 10, borderRadius: theme.radius.lg, background: theme.bg.elevated, border: "1px solid " + theme.border.default }) }}>
        <div>
          {head("map", "Map", mapOn, 3, (v) => { setShowKings(v); setGeo(v); setShowCities(v); })}
          {lgOpen.map && (
            <div style={grid}>
              {item("m-k", "Kingdoms", showKings, setShowKings, "#b5651d", "box", false, "Kingdom outlines and names for the slider's year")}
              {item("m-g", "Geography: mountains, deserts, rivers", geo, setGeo, "#5b4222", "box", false, "Hill marks, deserts, rivers and seas")}
              {item("m-c", "Cities and towns", showCities, setShowCities, INK, "box", false, "City dots and labels (clickable)")}
            </div>
          )}
        </div>
        {pathGroup("trade", "Trade routes", "Trade route", "dash")}
        {pathGroup("journey", "Journeys", "Journey", "solid")}
        <div style={{ borderTop: "1px solid " + theme.border.subtle, paddingTop: 6 }}>
          <Toggle label="Show trade routes and journeys only while their period is active" value={activeOnly} onChange={(v: boolean) => setActiveOnly(v)} />
        </div>
      </div>
    );
  };
  const cityMatches = (qs: string) => {
    const t = qs.trim().toLowerCase();
    if (!t) return [] as { n: string; r: number }[];
    const hit = ALLC.filter((c) => { const i = CINFO[c.n]; return c.n.toLowerCase().indexOf(t) >= 0 || (!!i && (i.m.toLowerCase().indexOf(t) >= 0 || i.a.toLowerCase().indexOf(t) >= 0)); });
    hit.sort((a, b) => ((a.n.toLowerCase().indexOf(t) === 0 ? 0 : 1) - (b.n.toLowerCase().indexOf(t) === 0 ? 0 : 1)) || (a.r - b.r));
    return hit.slice(0, 8);
  };
  const citySearch = (dark: boolean) => {
    const ms = cqOpen ? cityMatches(cq) : [];
    return (
      <div data-nopan="1" style={{ position: "relative", display: "inline-block", zIndex: 30 }}>
        <input type="text" value={cq} placeholder="Find a city (e.g. Jaffa, Nineveh)" aria-label="Search for a city or town by name" autoComplete="off" spellCheck={false}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setCq(e.target.value); setCqOpen(true); }}
          onFocus={() => setCqOpen(true)}
          onBlur={() => { setTimeout(() => setCqOpen(false), 200); }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); const m = cityMatches(cq); if (m.length > 0) goCity(m[0].n); } }}
          style={{ width: 230, maxWidth: "60vw", padding: "6px 10px", borderRadius: 6, fontSize: 14, fontFamily: SERIF, border: "1px solid " + (dark ? "#8a7a55" : theme.border.default), background: dark ? "#f3e7c9" : theme.bg.elevated, color: dark ? "#2b1d0a" : theme.text.primary }} />
        {cqOpen && cq.trim() !== "" && (
          <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 2, minWidth: 230, maxHeight: 280, overflow: "auto", borderRadius: 8, border: "1px solid " + theme.border.default, background: theme.bg.elevated, boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}>
            {ms.length === 0 && (<div style={{ padding: "8px 10px", fontSize: 13, color: theme.text.tertiary }}>No city or town by that name.</div>)}
            {ms.map((c) => (
              <div key={c.n} role="button" tabIndex={0} onMouseDown={(e: { preventDefault: () => void }) => e.preventDefault()} onClick={() => goCity(c.n)} onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => { if (e.key === "Enter") goCity(c.n); }}
                style={{ padding: "8px 10px", minHeight: 36, cursor: "pointer", fontSize: 14, color: theme.text.primary, borderBottom: "1px solid " + theme.border.subtle }}>
                {c.n}{CINFO[c.n] ? <span style={{ color: theme.text.tertiary, fontSize: 12 }}> ({CINFO[c.n].m.split("(")[0].trim()})</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const m = () => { if (el.clientWidth > 0) setCw(el.clientWidth); if (el.clientHeight > 0) setChH(el.clientHeight); };
    m();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(m); ro.observe(el); }
    window.addEventListener("resize", m);
    return () => { window.removeEventListener("resize", m); if (ro) ro.disconnect(); };
  }, []);

  /* wheel zoom, drag pan, two-finger pinch (pointer events work for mouse, pen and touch) */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let moved = 0;
    const apply = (c: Cam) => { const n = clampCam(c); camRef.current = n; setCam(n); setPreset(""); };
    const zoomAt = (px: number, py: number, factor: number) => {
      const r = el.getBoundingClientRect();
      const c = camRef.current;
      const h = c.w / faRef.current;
      const nw = Math.min(MAXW, Math.max(MINW, c.w * factor));
      const nh = nw / faRef.current;
      const fx = (px - r.left) / r.width, fy = (py - r.top) / r.height;
      apply({ cx: c.cx - c.w / 2 + fx * c.w - (fx - 0.5) * nw, cy: c.cy - h / 2 + fy * h - (fy - 0.5) * nh, w: nw });
    };
    const inPanel = (t: EventTarget | null): boolean => { const n = t as HTMLElement | null; return !!(n && n.closest && n.closest("[data-nopan]")); };
    const onWheel = (e: WheelEvent) => { if (inPanel(e.target)) return; e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016))); };
    const onDown = (e: PointerEvent) => { if (inPanel(e.target)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) moved = 0; };
    const onMove = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const r = el.getBoundingClientRect();
      const c = camRef.current;
      if (pts.size === 1) {
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 6) apply({ cx: c.cx - (dx * c.w) / r.width, cy: c.cy - (dy * c.w) / r.width, w: c.w });
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      } else if (pts.size === 2) {
        const ids = Array.from(pts.keys());
        const a = pts.get(ids[0]), b = pts.get(ids[1]);
        if (!a || !b) return;
        const d0 = Math.hypot(a.x - b.x, a.y - b.y), m0x = (a.x + b.x) / 2, m0y = (a.y + b.y) / 2;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const a2 = pts.get(ids[0]), b2 = pts.get(ids[1]);
        if (!a2 || !b2) return;
        const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y), m1x = (a2.x + b2.x) / 2, m1y = (a2.y + b2.y) / 2;
        moved += 20;
        if (d0 > 8 && d1 > 8) zoomAt(m1x, m1y, d0 / d1);
        const c2 = camRef.current;
        apply({ cx: c2.cx - ((m1x - m0x) * c2.w) / r.width, cy: c2.cy - ((m1y - m0y) * c2.w) / r.width, w: c2.w });
      }
    };
    const onUp = (e: PointerEvent) => { pts.delete(e.pointerId); };
    const onClickCap = (e: MouseEvent) => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); moved = 0; } };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("click", onClickCap, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("click", onClickCap, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);
  const active = useMemo(() => KINGS.map((k) => ({ k, f: k.kf.find((f) => year >= f.a && year < f.b) })).filter((x) => !!x.f) as { k: King; f: KF }[], [year]);
  const trails = TRAILS.filter((t) => on[t.id] && (!activeOnly || (year >= t.a && year <= t.b)));
  const selK = sel.t === "k" ? KINGS.find((k) => k.id === sel.id) : undefined;
  const selT = sel.t === "t" ? TRAILS.find((t) => t.id === sel.id) : undefined;
  const selC = sel.t === "c" ? ALLC.find((c) => c.n === sel.id) : undefined;

  const srcLinks = (ids: string[]) => ids.filter((v, i) => ids.indexOf(v) === i && S[v]).map((id) => (
    <div key={id} style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 2 }}>
      <a href={S[id].u} target="_blank" rel="noreferrer" style={{ color: theme.text.accent }}>{S[id].t}</a>
      <span style={{ color: theme.text.tertiary }}> ({S[id].w})</span>
    </div>
  ));
  const scrLinks = (refs: string[]) => (
    <div style={{ ...theme.font.body2, color: theme.text.primary, display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
      {refs.map((r) => (<a key={r} href={bgUrl(r)} target="_blank" rel="noreferrer" style={{ color: theme.text.accent }}>{dash(r)}</a>))}
    </div>
  );
  const head = (s: string) => (<div style={{ ...theme.font.label, color: theme.text.tertiary, marginTop: 14, marginBottom: 4, textTransform: "uppercase" }}>{s}</div>);

  const jumpEra = (id: string) => { const e = ERAS.find((x) => x.id === id); if (e) { setYear(e.a); setPlaying(false); } };
  const stopNames: Record<string, boolean> = {};
  trails.forEach((t) => t.stops.forEach((s) => { stopNames[s.n] = true; }));
  const selTrailVisible = selT && trails.some((t) => t.id === selT.id);

  /* label placement: higher-priority labels are placed first; a label that would overlap one already placed is skipped, so text never collides at any zoom */
  const lay = useMemo(() => {
    const FWp = cw, FHp = chH;
    const sc = (p: Pt): Pt => { const q = proj(p); return [(q[0] - vx) * z, (q[1] - vy) * z]; };
    const near = (s: Pt): boolean => s[0] > -30 && s[0] < FWp + 30 && s[1] > -20 && s[1] < FHp + 20;
    const cands: Cand[] = [];
    const boxes: number[][] = [];
    const selId = sel.t === "t" ? sel.id : "";
    trails.forEach((t) => t.stops.forEach((s, i) => {
      const q = sc(s.p);
      if (!near(q)) return;
      const isSel = t.id === selId;
      if (!isSel && lvl < 2) return;
      cands.push({ key: "s" + t.id + i, text: s.n, p: q, dx: 6, dy: -5, anchor: "start", pri: isSel ? 0 : 3, size: 11.5, fill: t.color, italic: true });
    }));
    if (showKings) {
      active.forEach(({ k, f }) => {
        const big = f.polys.reduce((a, b) => (b.bw > a.bw ? b : a), f.polys[0]);
        const q: Pt = [(big.c[0] - vx) * z, (big.c[1] - vy) * z];
        if (!near(q)) return;
        boxes.push([q[0] - 10, q[1] - 10, q[0] + 10, q[1] + 10]);
        if (big.bw * z >= 80) cands.push({ key: "k" + k.id, text: k.name.split(" (")[0], p: q, dx: 0, dy: 24, anchor: "middle", pri: 1, size: 12.5, fill: INK, italic: true, bold: true });
      });
    }
    const dots: { key: string; x: number; y: number; big: boolean; hr: number }[] = [];
    ALLC.forEach((c) => {
      if (!showCities || c.r > lvl) return;
      const q = sc(c.p);
      if (!near(q)) return;
      dots.push({ key: "d" + c.n, x: vx + q[0] / z, y: vy + q[1] / z, big: c.r === 1, hr: 15 });
      if (stopNames[c.n]) return;
      cands.push({ key: "c" + c.n, text: c.n, p: q, dx: c.e ? -5 : 5, dy: 4, anchor: c.e ? "end" : "start", pri: c.r === 1 ? 2 : c.r === 2 ? 4 : c.r === 3 ? 6 : c.r === 4 ? 7 : 8, size: c.r === 1 ? 13 : 11.5, fill: INK });
    });
    REGIONS.forEach((r) => { if (lvl > 3) return; const q = sc(r.p); if (near(q)) cands.push({ key: "R" + r.n, text: r.n, p: q, dx: 0, dy: 0, anchor: "middle", pri: 9, size: 13, fill: INK, sp: 3, op: 0.4, nohalo: true }); });
    REG2.forEach((r) => { if (lvl < r.l || lvl > r.h) return; const q = sc(r.p); if (near(q)) cands.push({ key: "G" + r.n, text: r.n.toUpperCase(), p: q, dx: 0, dy: 0, anchor: "middle", pri: 5, size: 11.5, fill: INK, sp: 2, op: 0.5, nohalo: true }); });
    WATERL.forEach((r) => { if (lvl < r.l) return; const q = sc(r.p); if (near(q)) cands.push({ key: "W" + r.n, text: r.n, p: q, dx: 0, dy: 0, anchor: "middle", pri: 2, size: 12, fill: SEAINK, italic: true, hc: SEA, sp: 1 }); });
    if (geo) {
      const vis = (pts: Pt[]): Pt | undefined => {
        let best: Pt | undefined;
        let bd = 1e12;
        for (const p of pts) { const q = sc(p); if (!near(q)) continue; const d = Math.hypot(q[0] - FWp / 2, q[1] - FHp / 2); if (d < bd) { bd = d; best = q; } }
        return best;
      };
      RIVERS.filter((r) => r.n).forEach((r) => { const q = vis(r.pts); if (q) cands.push({ key: "V" + r.n, text: r.n === "Nile" ? "Nile" : r.n, p: q, dx: 6, dy: 0, anchor: "start", pri: 7, size: 11, fill: SEAINK, italic: true, hc: PARCH }); });
      RIV2.forEach((r) => { if (lvl < r.l) return; const q = vis(r.pts); if (q) cands.push({ key: "V2" + r.n, text: r.n, p: q, dx: 6, dy: 0, anchor: "start", pri: 7, size: 11, fill: SEAINK, italic: true, hc: PARCH }); });
      GEO_R.forEach((r) => { if (lvl < r.l || r.nl === false) return; const q = vis(r.pts); if (q) cands.push({ key: "M" + r.n, text: r.n, p: q, dx: 0, dy: -12, anchor: "middle", pri: 5, size: 11.5, fill: "#5b4222", italic: true, sp: 1 }); });
      GEO_P.forEach((p) => { if (lvl < p.l) return; const q = sc(p.p); if (near(q)) cands.push({ key: "P" + p.n, text: p.n, p: q, dx: 11, dy: 4, anchor: "start", pri: 4, size: 11.5, fill: "#5b4222", italic: true, bold: true }); });
      DESERTS.forEach((d) => { if (d.nl || lvl < d.l || lvl > 4) return; const q = sc(d.c); if (near(q)) cands.push({ key: "D" + d.n, text: d.n.toUpperCase(), p: q, dx: 0, dy: 0, anchor: "middle", pri: 6, size: 11.5, fill: "#6b4c24", sp: 3, op: 0.6, nohalo: true }); });
    }
    if (year >= -1200 && year < -1050 && lvl >= 3) TRIBEL.forEach((r) => { const q = sc(r.p); if (near(q)) cands.push({ key: "T" + r.n, text: r.n, p: q, dx: 0, dy: 0, anchor: "middle", pri: 3, size: 12, fill: "#1b4a85", italic: true, bold: true }); });
    cands.sort((a, b) => a.pri - b.pri);
    const out: { c: Cand; x: number; y: number }[] = [];
    for (const c of cands) {
      const w = c.text.length * (c.size * 0.52 + (c.sp || 0)), h = c.size * 1.1;
      const sx = c.p[0] + c.dx, sy = c.p[1] + c.dy;
      const x0 = c.anchor === "start" ? sx : c.anchor === "end" ? sx - w : sx - w / 2;
      const y0 = sy - h * 0.8;
      if (x0 + w < 0 || x0 > FWp || y0 + h < 0 || y0 > FHp) continue;
      let hit = false;
      for (const b of boxes) { if (x0 < b[2] + 2 && x0 + w > b[0] - 2 && y0 < b[3] + 1 && y0 + h > b[1] - 1) { hit = true; break; } }
      if (hit) continue;
      boxes.push([x0, y0, x0 + w, y0 + h]);
      out.push({ c, x: vx + sx / z, y: vy + sy / z });
    }
    /* dense areas: shrink each hit target to half the distance to its nearest neighbour, so a click goes to the nearest dot */
    dots.forEach((d) => { let nn = 1e9; dots.forEach((e) => { if (e !== d) { const dd = Math.hypot(e.x - d.x, e.y - d.y) * z; if (dd < nn) nn = dd; } }); d.hr = Math.max(6, Math.min(15, nn / 2)); });
    return { out, dots };
  }, [cam, cw, chH, year, sel.t, sel.id, on, activeOnly, showKings, geo, showCities]);

  /* hand-drawn mountain and hill marks, built in screen pixels so they keep a steady size and gain density as you zoom */
  const gm = useMemo(() => {
    const res = { tri: "", sh: "", arc: "", peaks: [] as { key: string; d: string }[] };
    if (!geo) return res;
    const FWp = cw, FHp = chH;
    let count = 0;
    GEO_R.forEach((r) => {
      if (lvl < r.l) return;
      const q = r.pts.map((p): Pt => { const u = proj(p); return [(u[0] - vx) * z, (u[1] - vy) * z]; });
      const sp = r.hill ? 13 : 11;
      const rows = !r.hill && r.wide && lvl >= 3 ? [-6, 6] : [0];
      let carry = 0;
      for (let i = 0; i < q.length - 1; i++) {
        const a = q[i], b = q[i + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const ux = dx / len, uy = dy / len;
        let d = sp - carry;
        for (; d <= len; d += sp) {
          if (count > 1800) break;
          count++;
          const jit = Math.sin(count * 12.9898) * 2.2;
          const sz = (r.hill ? 5 : 6.5) * (0.8 + 0.4 * (((count * 7) % 5) / 4));
          for (const off of rows) {
            const o = off + jit;
            const x = a[0] + ux * d - uy * o, y = a[1] + uy * d + ux * o;
            if (x < -12 || x > FWp + 12 || y < -12 || y > FHp + 12) continue;
            if (r.hill) res.arc += "M" + f1(x - sz) + " " + f1(y + sz * 0.5) + "Q" + f1(x) + " " + f1(y - sz * 1.1) + " " + f1(x + sz) + " " + f1(y + sz * 0.5);
            else {
              res.tri += "M" + f1(x - sz) + " " + f1(y + sz * 0.6) + "L" + f1(x) + " " + f1(y - sz) + "L" + f1(x + sz) + " " + f1(y + sz * 0.6) + "Z";
              res.sh += "M" + f1(x) + " " + f1(y - sz) + "L" + f1(x + sz) + " " + f1(y + sz * 0.6) + "L" + f1(x + sz * 0.15) + " " + f1(y + sz * 0.6) + "Z";
            }
          }
        }
        carry = sp - (d - len);
      }
    });
    GEO_P.forEach((p) => {
      if (lvl < p.l) return;
      const u = proj(p.p);
      const x = (u[0] - vx) * z, y = (u[1] - vy) * z;
      if (x < -12 || x > FWp + 12 || y < -12 || y > FHp + 12) return;
      res.peaks.push({ key: p.n, d: "M" + f1(x - 8) + " " + f1(y + 6) + "L" + f1(x) + " " + f1(y - 9) + "L" + f1(x + 8) + " " + f1(y + 6) + "Z" });
    });
    return res;
  }, [cam, cw, chH, geo]);

  /* full screen: the browser Fullscreen API on the map container, with an in-page fixed overlay as fallback (also used when the API is blocked) */
  const exitFs = () => {
    setFs(false);
    setFsPanel("");
    if (document.fullscreenElement && document.exitFullscreen) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); }
  };
  const enterFs = () => {
    setFs(true);
    setFsPanel("");
    /* the container is display: contents in the normal view, so ask for browser full screen once the fixed-position styles are on it */
    setTimeout(() => {
      const el = fsRef.current;
      if (el && el.requestFullscreen) { try { const p = el.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* fixed-position fallback is already active */ } }
    }, 50);
  };
  useEffect(() => {
    const h = () => { if (!document.fullscreenElement) { setFs(false); setFsPanel(""); } };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  useEffect(() => {
    if (!fs) return;
    const k = (e: { key: string }) => { if (e.key === "Escape") exitFs(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fs]);

  return (
    <Page title="Biblical kingdoms through time" summary="Drag the timeline from 2000 BC to 2026 (a non-linear scale that gives the Biblical period the most room) to see which kingdoms, empires and states existed, then click one for its rulers or notes, scripture and sources. Zoom and pan the map for more detail, and toggle trade routes and journeys on top." width="full">
      <Section heading="Interactive map">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ order: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <Button label={playing ? "Pause" : year >= YMAX ? "Replay" : "Play"} variant="primary" onClick={() => { if (!playing && year >= YMAX) setYear(YMIN); setPlaying(!playing); }} />
            <Button label="Step back" onClick={() => { const s = year <= 100 ? 25 : year <= 1900 ? 100 : 5; setYear(Math.max(YMIN, year - s)); setPlaying(false); }} />
            <Button label="Step forward" onClick={() => { const s = year < 100 ? 25 : year < 1900 ? 100 : 5; setYear(Math.min(YMAX, year + s)); setPlaying(false); }} />
            <Button label="Previous era" onClick={() => { setYear(ERAS[Math.max(0, eraIdx - 1)].a); setPlaying(false); }} />
            <Button label="Next era" onClick={() => { setYear(ERAS[Math.min(ERAS.length - 1, eraIdx + 1)].a); setPlaying(false); }} />
            <Segmented options={["Slow", "Normal", "Fast"]} value={speed} onChange={(v: string) => setSpeed(v)} />
          </div>
          <div style={{ order: 3, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <div style={{ ...theme.font.heading2, color: theme.text.primary, minWidth: 110 }}>{yr(year)}</div>
            {yearInput(false)}
            <div style={{ flex: "1 1 340px", display: "flex", alignItems: "center", gap: 8 }}>
            {fineBtn(-1)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <input type="range" min={0} max={SL} step={1} value={y2p(year)} aria-label="Year (non-linear scale: the Biblical period has the most room)" onChange={(e: ChangeEvent<HTMLInputElement>) => { setYear(p2y(parseInt(e.target.value, 10))); setPlaying(false); }} style={{ width: "100%", accentColor: theme.fill.accent }} />
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 2 }}>
                {ERAS.map((e, i) => (
                  <div key={e.id} title={SHORT[e.id]} onClick={() => jumpEra(e.id)} style={{ width: ((y2p(Math.min(e.b, YMAX)) - y2p(e.a)) / SL) * 100 + "%", cursor: "pointer", background: e.id === era.id ? theme.fill.accent : i % 2 ? theme.fill.secondary : theme.fill.pressed }} />
                ))}
              </div>
            </div>
            {fineBtn(1)}
            </div>
            <div style={{ flex: "0 1 260px" }}>
              <Select label="Jump to era" options={ERAS.map((e) => ({ value: e.id, label: SHORT[e.id] + " (" + yr(e.a) + ")" }))} value={era.id} onChange={(v: string) => jumpEra(v)} />
            </div>
          </div>

          <div style={{ order: 5, border: "1px solid " + theme.border.default, borderRadius: theme.radius.lg, padding: 14, background: theme.bg.subtle }}>
            <div style={{ ...theme.font.heading3, color: theme.text.primary }}>{era.name}</div>
            <div style={{ ...theme.font.caption, color: theme.text.tertiary, marginBottom: 6 }}>{yr(era.a)} to {yr(Math.min(era.b, YMAX))} (era captions use widely cited dates; the slider scale is non-linear)</div>
            <div style={{ ...theme.font.body2, color: theme.text.primary }}>{era.text}</div>
            {era.scr.length > 0 && (<div style={{ marginTop: 8 }}>{scrLinks(era.scr)}</div>)}
            <details style={{ marginTop: 6 }}>
              <summary style={{ ...theme.font.caption, color: theme.text.secondary, cursor: "pointer" }}>Sources for this caption ({era.src.length})</summary>
              {srcLinks(era.src)}
            </details>
          </div>

          <div style={{ order: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
            <Segmented options={Object.keys(VIEWS).map((k) => ({ value: k, label: VIEWS[k].label }))} value={preset} onChange={(v: string) => goPreset(v)} />
            <Button label="Full screen" onClick={enterFs} />
          </div>
          <div style={{ order: 6 }}>{layersCtl(false)}</div>

          <div style={{ order: 1 }}>{citySearch(false)}</div>
          <div ref={fsRef} style={fs ? { position: "fixed", inset: 0, zIndex: 1000, background: "#14100a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" } : { display: "contents" }}>
            <div style={fs ? { flex: "none", position: "relative", width: "100vw", height: "100vh" } : { display: "contents" }}>
              <div ref={frameRef} style={{ position: "relative", boxSizing: "border-box", order: 2, width: "100%", height: fs ? "100%" : frameH, minHeight: fs ? undefined : 260, border: fs ? "none" : "2px solid #8a6d3b", borderRadius: fs ? 0 : 8, overflow: "hidden", background: PARCH, touchAction: "none", cursor: "grab", userSelect: "none" }}>
                <svg viewBox={vbs} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                  <defs>
                    <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="60%" stopColor="#8a6d3b" stopOpacity="0" /><stop offset="100%" stopColor="#8a6d3b" stopOpacity="0.35" /></radialGradient>
                  </defs>
                  <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill={PARCH} />
                  {[10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((lo) => (<path key={"lo" + lo} d={line([[lo, LAT0], [lo, LAT1]])} stroke="#8a6d3b" strokeOpacity={0.18} strokeWidth={0.8 / z} fill="none" />))}
                  {[15, 20, 25, 30, 35, 40].map((la) => (<path key={"la" + la} d={line([[LON0, la], [LON1, la]])} stroke="#8a6d3b" strokeOpacity={0.18} strokeWidth={0.8 / z} fill="none" />))}
                  {showKings && active.map(({ k, f }) => f.polys.map((p, i) => {
                    const isSel = sel.t === "k" && sel.id === k.id;
                    return (
                      <path key={k.id + i} d={p.d} fill={k.color} fillOpacity={isSel ? 0.5 : 0.26} stroke={k.color} strokeOpacity={0.9} strokeWidth={(isSel ? 2.4 : 1.1) / z} strokeDasharray={p.soft ? 4 / z + " " + 3 / z : undefined} strokeLinejoin="round" style={{ cursor: "pointer" }} onClick={() => setSel({ t: "k", id: k.id })}>
                        <title>{k.name}</title>
                      </path>
                    );
                  }))}
                  <rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill="url(#vig)" pointerEvents="none" />
                </svg>
                <svg viewBox={vbs} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  <defs>
                    <pattern id="dots" width={12 / z} height={12 / z} patternUnits="userSpaceOnUse"><circle cx={3 / z} cy={4 / z} r={0.9 / z} fill="#8a6d3b" fillOpacity={0.55} /><circle cx={9 / z} cy={10 / z} r={0.9 / z} fill="#8a6d3b" fillOpacity={0.55} /></pattern>
                  </defs>
                  {geo && DESERTS.map((d) => (<path key={d.n} d={d.d} fill="url(#dots)" stroke="#8a6d3b" strokeOpacity={0.35} strokeWidth={0.8 / z} strokeDasharray={3 / z + " " + 3 / z} />))}
                  <g strokeLinejoin="round">
                    <path d={MED_D} fillRule="evenodd" fill={SEA} stroke={SEAINK} strokeWidth={1.3 / z} />
                    <path d={MED_D} fillRule="evenodd" fill="none" stroke={SEAINK} strokeOpacity={0.3} strokeWidth={0.8 / z} transform={"translate(" + 1.6 / z + " " + 1.6 / z + ")"} />
                    {SEAS.map((d, i) => (<path key={i} d={d} fill={SEA} stroke={SEAINK} strokeWidth={1.3 / z} />))}
                    {RIVERS.map((r, i) => (<path key={"r" + i} d={smooth(r.pts)} fill="none" stroke="#5f8791" strokeWidth={(r.n === "Nile" || r.n === "Euphrates" || r.n === "Tigris" ? 2 : 1.4) / z} strokeLinecap="round" />))}
                  </g>
                  {geo && RIV2.filter((r) => lvl >= r.l).map((r) => (<path key={r.n} d={smooth(r.pts)} fill="none" stroke="#5f8791" strokeWidth={1.3 / z} strokeLinecap="round" />))}
                  {geo && (
                    <g transform={"translate(" + f1(vx) + " " + f1(vy) + ") scale(" + (1 / z).toFixed(5) + ")"}>
                      <path d={gm.arc} fill="none" stroke="#6b4c24" strokeWidth={1.1} strokeLinecap="round" />
                      <path d={gm.tri} fill="#dcc99a" stroke="#6b4c24" strokeWidth={1} strokeLinejoin="round" />
                      <path d={gm.sh} fill="#6b4c24" fillOpacity={0.35} />
                      {gm.peaks.map((p) => (<path key={p.key} d={p.d} fill="#c9a96a" stroke="#4a3217" strokeWidth={1.4} strokeLinejoin="round" />))}
                    </g>
                  )}
                </svg>
                <svg viewBox={vbs} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  {lay.dots.map((d) => (<circle key={d.key} cx={d.x} cy={d.y} r={(d.big ? 2.6 : 2) / z} fill={INK} pointerEvents="none" />))}
                  {showKings && active.map(({ k, f }, i) => {
                    const big = f.polys.reduce((a, b) => (b.bw > a.bw ? b : a), f.polys[0]);
                    const isSel = sel.t === "k" && sel.id === k.id;
                    return (
                      <g key={"kl" + k.id} pointerEvents="all" style={{ cursor: "pointer" }} onClick={() => setSel({ t: "k", id: k.id })}>
                        <circle cx={big.c[0]} cy={big.c[1]} r={(isSel ? 8.5 : 7) / z} fill={k.color} stroke={isSel ? INK : PARCH} strokeWidth={(isSel ? 2.2 : 1.2) / z} />
                        <text x={big.c[0]} y={big.c[1] + 3.6 / z} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize={9.5 / z} fill="#ffffff" pointerEvents="none">{i + 1}</text>
                      </g>
                    );
                  })}
                  {trails.map((t) => {
                    const d = TRAILD.find((x) => x.id === t.id);
                    const isSel = sel.t === "t" && sel.id === t.id;
                    if (!d) return null;
                    return (
                      <g key={t.id}>
                        {d.ds.map((ds, i) => (
                          <g key={i}>
                            <path d={ds} fill="none" stroke={t.color} strokeWidth={(isSel ? 3.4 : 2.4) / z} strokeDasharray={7 / z + " " + 5 / z} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
                              <animate attributeName="stroke-dashoffset" from="0" to={-12 / z} dur="1.4s" repeatCount="indefinite" />
                            </path>
                            <path d={ds} fill="none" stroke="transparent" strokeWidth={10 / z} style={{ cursor: "pointer" }} pointerEvents="stroke" onClick={() => setSel({ t: "t", id: t.id })}><title>{t.name}</title></path>
                          </g>
                        ))}
                        {t.stops.map((s, i) => {
                          const q = proj(s.p);
                          return (
                            <g key={i} pointerEvents="none">
                              <circle cx={q[0]} cy={q[1]} r={(isSel ? 3.2 : 2.5) / z} fill={t.color} stroke={PARCH} strokeWidth={1 / z} />
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                  {lay.out.map((o) => (
                    <text key={o.c.key} x={o.x} y={o.y} textAnchor={o.c.anchor} fontFamily={SERIF} fontStyle={o.c.italic ? "italic" : "normal"} fontWeight={o.c.bold ? 700 : 400} fontSize={o.c.size / z} letterSpacing={o.c.sp ? o.c.sp / z : undefined} fill={o.c.fill} opacity={o.c.op || 1} paintOrder="stroke" stroke={o.c.nohalo ? "none" : o.c.hc || PARCH} strokeWidth={o.c.nohalo ? 0 : 2.6 / z} strokeOpacity={0.8} pointerEvents={o.c.key.charAt(0) === "c" && !!CINFO[o.c.key.slice(1)] ? "all" : "none"} style={o.c.key.charAt(0) === "c" && !!CINFO[o.c.key.slice(1)] ? { cursor: "pointer" } : undefined} onClick={o.c.key.charAt(0) === "c" && !!CINFO[o.c.key.slice(1)] ? () => setSel({ t: "c", id: o.c.key.slice(1) }) : undefined}>{o.c.text}</text>
                  ))}
                  {lay.dots.map((d) => {
                    const nm = d.key.slice(1);
                    const isC = sel.t === "c" && sel.id === nm;
                    return (
                      <g key={"ch" + d.key}>
                        {isC && (<circle cx={d.x} cy={d.y} r={8 / z} fill="none" stroke="#b3261e" strokeWidth={2 / z} pointerEvents="none" />)}
                        <circle cx={d.x} cy={d.y} r={d.hr / z} fill="transparent" pointerEvents="all" style={{ cursor: "pointer" }} onClick={() => setSel({ t: "c", id: nm })}><title>{nm}</title></circle>
                      </g>
                    );
                  })}
                </svg>
                <div data-nopan="1" style={{ position: "absolute", ...(fs ? { left: 8, top: cw < 600 ? 92 : 52, zIndex: 7 } : { right: 8, top: 8 }), display: "flex", flexDirection: "column", gap: 4, padding: 4, borderRadius: 10, background: theme.bg.elevated, border: "1px solid " + theme.border.default }}>
                  <Button label="+" onClick={() => commit({ cx: cam.cx, cy: cam.cy, w: cam.w / 1.5 })} />
                  <Button label="−" onClick={() => commit({ cx: cam.cx, cy: cam.cy, w: cam.w * 1.5 })} />
                  <Button label="Reset" onClick={() => goPreset("all")} />
                  {!fs && <Button label="Full screen" onClick={enterFs} />}
                </div>
                {fs && (
                  <div data-nopan="1" style={{ position: "absolute", left: 8, top: 8, maxWidth: "calc(100% - 16px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, zIndex: 8, padding: 4, borderRadius: 10, background: theme.bg.elevated, border: "1px solid " + theme.border.default }}>
                    <Button label={cw < 600 ? "Exit" : "Exit full screen (Esc)"} variant="primary" onClick={exitFs} />
                    <Button label="Layers" variant={fsPanel === "layers" ? "primary" : "quiet"} onClick={() => setFsPanel(fsPanel === "layers" ? "" : "layers")} />
                    <Button label="Map index" variant={fsPanel === "index" ? "primary" : "quiet"} onClick={() => setFsPanel(fsPanel === "index" ? "" : "index")} />
                    <Button label="Details" variant={fsPanel === "details" ? "primary" : "quiet"} onClick={() => setFsPanel(fsPanel === "details" ? "" : "details")} />
                    {citySearch(true)}
                  </div>
                )}
                {fs && fsPanel === "layers" && (
                  <div data-nopan="1" style={{ position: "absolute", left: 90, top: 48, width: "min(340px, 80%)", maxHeight: "60%", overflow: "auto", zIndex: 9, padding: 12, borderRadius: theme.radius.lg, background: theme.bg.elevated, border: "1px solid " + theme.border.default, display: "flex", flexDirection: "column", gap: 8 }}>
                    {layersCtl(true)}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.keys(VIEWS).map((k) => (<Button key={k} label={VIEWS[k].label} variant={preset === k ? "primary" : "quiet"} onClick={() => goPreset(k)} />))}
                    </div>
                  </div>
                )}
                {fs && (
                  <div data-nopan="1" style={{ position: "absolute", left: 8, right: 8, bottom: 8, zIndex: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 10, background: theme.kind === "dark" ? "rgba(24,24,24,0.94)" : "rgba(252,252,252,0.94)", border: "1px solid " + theme.border.default }}>
                    <Button label={playing ? "Pause" : year >= YMAX ? "Replay" : "Play"} variant="primary" onClick={() => { if (!playing && year >= YMAX) setYear(YMIN); setPlaying(!playing); }} />
                    <Button label="Step back" onClick={() => { const s = year <= 100 ? 25 : year <= 1900 ? 100 : 5; setYear(Math.max(YMIN, year - s)); setPlaying(false); }} />
                    <Button label="Step forward" onClick={() => { const s = year < 100 ? 25 : year < 1900 ? 100 : 5; setYear(Math.min(YMAX, year + s)); setPlaying(false); }} />
                    <Button label="Previous era" onClick={() => { setYear(ERAS[Math.max(0, eraIdx - 1)].a); setPlaying(false); }} />
                    <Button label="Next era" onClick={() => { setYear(ERAS[Math.min(ERAS.length - 1, eraIdx + 1)].a); setPlaying(false); }} />
                    <span style={{ fontFamily: SERIF, fontSize: 17, color: theme.text.primary, minWidth: 76 }}>{yr(year)}</span>
                    {yearInput(false)}
                    <div style={{ flex: "1 1 260px", minWidth: 180, display: "flex", alignItems: "center", gap: 6 }}>{fineBtn(-1)}<input type="range" min={0} max={SL} step={1} value={y2p(year)} aria-label="Year" onChange={(e: ChangeEvent<HTMLInputElement>) => { setYear(p2y(parseInt(e.target.value, 10))); setPlaying(false); }} style={{ flex: 1, minWidth: 80 }} />{fineBtn(1)}</div>
                    <select value={era.id} aria-label="Jump to era" onChange={(e: ChangeEvent<HTMLSelectElement>) => jumpEra(e.target.value)} style={{ padding: "4px 6px", borderRadius: 6, maxWidth: 220 }}>
                      {ERAS.map((e) => (<option key={e.id} value={e.id}>{SHORT[e.id]} ({yr(e.a)})</option>))}
                    </select>
                  </div>
                )}
                {!fs && (<div style={{ position: "absolute", left: 8, top: 8, maxWidth: "calc(100% - 110px)", fontFamily: SERIF, fontSize: 11, color: INK, background: "rgba(233,216,174,0.8)", padding: "2px 8px", borderRadius: 4, pointerEvents: "none" }}>Scroll or pinch to zoom, drag to pan, click a city for details. Zoom ×{zoomX.toFixed(1)}</div>)}
                {!fs && chipOn && (
                  <div data-nopan="1" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 40, zIndex: 6, maxWidth: "calc(100% - 24px)" }}>
                    <Button label={"Details for " + (selK ? selK.name : selT ? selT.name : selC ? selC.n : "this item") + ": show below the map"} variant="primary" onClick={() => { setChipOn(false); if (detRef.current) detRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
                  </div>
                )}
                <svg viewBox="0 0 100 100" width={86} height={86} style={{ position: "absolute", left: 10, bottom: 10, pointerEvents: "none", opacity: 0.8 }}>
                  <circle cx={50} cy={52} r={30} fill="none" stroke={INK} strokeWidth={1} opacity={0.6} />
                  <circle cx={50} cy={52} r={24} fill="none" stroke={INK} strokeWidth={0.6} opacity={0.5} />
                  <polygon points="50,18 56,52 50,46 44,52" fill={INK} />
                  <polygon points="50,86 44,52 50,58 56,52" fill={INK} opacity={0.35} />
                  <polygon points="16,52 50,46 44,52 50,58" fill={INK} opacity={0.35} />
                  <polygon points="84,52 50,58 56,52 50,46" fill={INK} opacity={0.35} />
                  <text x={50} y={12} textAnchor="middle" fontFamily={SERIF} fontSize={12} fill={INK}>N</text>
                </svg>
                <div style={{ position: "absolute", right: 8, bottom: 6, fontFamily: SERIF, fontSize: 11, fontStyle: "italic", color: INK, opacity: 0.75, background: "rgba(233,216,174,0.7)", padding: "1px 6px", borderRadius: 4, pointerEvents: "none" }}>Extents approximate. Dashed outlines are contested or tributary.</div>
              </div>
              {geo && !fs && (<div style={{ order: 7, ...theme.font.caption, color: theme.text.tertiary }}>Geography layer: mountain, hill and desert marks and peak and river positions are schematic. Mount Sinai is shown at Jebel Musa, the traditional site; its location is debated (see the Exodus route note).</div>)}
              <div style={fs ? { position: "absolute", left: 90, bottom: 64, width: "min(380px, 80%)", maxHeight: "55%", overflow: "auto", zIndex: 9, display: fsPanel === "index" ? "block" : "none" } : { order: 8 }}>
                <div style={{ border: "1px solid " + theme.border.default, borderRadius: theme.radius.lg, padding: 12, background: fs ? theme.bg.elevated : theme.bg.subtle }}>
                  <div style={{ ...theme.font.label, color: theme.text.tertiary, marginBottom: 8, textTransform: "uppercase" }}>Map index for {yr(year)}: areas highlighted now (click to open and highlight)</div>
                  {active.length === 0 ? (<div style={{ ...theme.font.body2, color: theme.text.secondary }}>No area is highlighted on the map at this date (see the era caption).</div>) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 4 }}>
                      {active.map(({ k, f }, i) => {
                        const isSel = sel.t === "k" && sel.id === k.id;
                        return (
                          <div key={k.id} role="button" tabIndex={0} onClick={() => setSel({ t: "k", id: k.id })} onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") setSel({ t: "k", id: k.id }); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: theme.radius.md, cursor: "pointer", background: isSel ? theme.fill.accentSubtle : "transparent", border: "1px solid " + (isSel ? theme.border.strong : "transparent") }}>
                            <span style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: 11, background: k.color, color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{i + 1}</span>
                            <span style={{ ...theme.font.body2, color: theme.text.primary }}>{k.name}{f.polys.some((p) => p.soft) ? <span style={{ color: theme.text.tertiary }}> (part dashed)</span> : null}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {TRAILS.some((t) => on[t.id]) && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid " + theme.border.subtle }}>
                      <div style={{ ...theme.font.label, color: theme.text.tertiary, marginBottom: 6, textTransform: "uppercase" }}>Routes and journeys switched on</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 4 }}>
                        {TRAILS.filter((t) => on[t.id]).map((t) => {
                          const shown = trails.some((x) => x.id === t.id);
                          const isSel = sel.t === "t" && sel.id === t.id;
                          return (
                            <div key={t.id} role="button" tabIndex={0} onClick={() => setSel({ t: "t", id: t.id })} onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") setSel({ t: "t", id: t.id }); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: theme.radius.md, cursor: "pointer", opacity: shown ? 1 : 0.55, background: isSel ? theme.fill.accentSubtle : "transparent", border: "1px solid " + (isSel ? theme.border.strong : "transparent") }}>
                              <span style={{ flex: "0 0 auto", width: 22, height: 0, borderTop: "3px dashed " + t.color }} />
                              <span style={{ ...theme.font.body2, color: theme.text.primary }}>{t.name}{shown ? "" : <span style={{ color: theme.text.tertiary }}> (not in period)</span>}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={detRef} style={fs ? { position: "absolute", right: 8, top: 8, bottom: 64, width: "min(360px, 90vw)", overflow: "auto", zIndex: 9, display: fsPanel === "details" ? "block" : "none", border: "1px solid " + theme.border.default, borderRadius: theme.radius.lg, padding: 16, background: theme.bg.elevated } : { order: 9, minWidth: 0, maxWidth: 1000, scrollMarginTop: 12, border: "1px solid " + theme.border.default, borderRadius: theme.radius.lg, padding: 16, background: theme.bg.elevated }}>
              {selK && (() => {
                const f = selK.kf.find((x) => year >= x.a && x.b > year);
                const lo = f ? f.a : YMIN, hi = f ? f.b : YMAX + 1;
                const rl = selK.rulers.filter((r) => r[0] < hi && r[1] > lo);
                return (
                  <div>
                    <div style={{ ...theme.font.heading3, color: theme.text.primary }}>{selK.name}</div>
                    <div style={{ marginTop: 6 }}>{f ? <Status tone="success">Present in {yr(year)}</Status> : <Status tone="neutral">Not shown on the map in {yr(year)}</Status>}</div>
                    <Properties2 items={[["Dates", selK.dates], f ? ["Extent now (" + yr(f.a) + " to " + yr(Math.min(f.b, YMAX)) + ")", f.note] : ["Extent", "Move the slider to a period when this kingdom is drawn."]]} theme={theme} />
                    {rl.length > 0 && (<div>{head(f ? "Key rulers in this period" : "Key rulers")}{rl.map((r, i) => (<div key={i} style={{ ...theme.font.body2, color: theme.text.primary, marginTop: 2 }}>{r[2]}</div>))}</div>)}
                    {head("About")}
                    <div style={{ ...theme.font.body2, color: theme.text.primary }}>{selK.desc}</div>
                    {selK.dis && (<div><div style={{ ...theme.font.label, color: theme.text.tertiary, marginTop: 14, marginBottom: 4, textTransform: "uppercase" }}>Disputed or debated</div><div style={{ ...theme.font.body2, color: theme.text.primary }}>{selK.dis}</div></div>)}
                    {selK.scr.length > 0 && head("Scripture")}
                    {selK.scr.length > 0 && scrLinks(selK.scr)}
                    {head("Sources")}
                    {f && f.s.length > 0 && (<div style={{ ...theme.font.caption, color: theme.text.tertiary }}>For this extent:</div>)}
                    {f && srcLinks(f.s)}
                    <div style={{ ...theme.font.caption, color: theme.text.tertiary, marginTop: 6 }}>General:</div>
                    {srcLinks(selK.src)}
                    <div style={{ ...theme.font.caption, color: theme.text.tertiary, marginTop: 8 }}>Outlines were hand-drawn for this page as approximations informed by these references; they are not traced from any atlas map.</div>
                  </div>
                );
              })()}
              {selT && (
                <div>
                  <div style={{ ...theme.font.label, color: theme.text.tertiary, textTransform: "uppercase" }}>{selT.kind}</div>
                  <div style={{ ...theme.font.heading3, color: theme.text.primary }}>{selT.name}</div>
                  <div style={{ marginTop: 6 }}>{selTrailVisible ? <Status tone="success">Shown on the map</Status> : <Status tone="neutral">{on[selT.id] ? "Hidden until its period is active" : "Layer is off"}</Status>}</div>
                  <Properties2 items={[["Dates", selT.dates], ["Active window used", yr(selT.a) + " to " + yr(selT.b)]]} theme={theme} />
                  {head("Key stops")}
                  {selT.stops.map((s, i) => (<div key={i} style={{ ...theme.font.body2, color: theme.text.primary, marginTop: 2 }}>{s.n}{s.ref ? <span style={{ color: theme.text.tertiary }}> ({dash(s.ref)})</span> : null}</div>))}
                  {head("About")}
                  <div style={{ ...theme.font.body2, color: theme.text.primary }}>{selT.desc}</div>
                  {selT.note && (<div><div style={{ ...theme.font.label, color: theme.text.tertiary, marginTop: 14, marginBottom: 4, textTransform: "uppercase" }}>Debated or simplified</div><div style={{ ...theme.font.body2, color: theme.text.primary }}>{selT.note}</div></div>)}
                  {head("Scripture")}
                  {scrLinks(selT.scr)}
                  {head("Sources")}
                  {srcLinks(selT.src)}
                </div>
              )}
              {selC && (() => {
                const info = CINFO[selC.n];
                const who = holders(selC.p, year);
                const solidN = who.filter((x) => !x.soft).map((x) => x.k.name);
                const softN = who.filter((x) => x.soft).map((x) => x.k.name);
                const evs = info ? info.ev.slice().sort((a, b) => a[0] - b[0]) : [];
                let near = -1, nd = 1e9;
                evs.forEach((e, i) => { const dd = Math.abs(e[0] - year); if (dd < nd) { nd = dd; near = i; } });
                const mi = evs.findIndex((e) => e[0] > year);
                const marker = (<div style={{ ...theme.font.caption, color: theme.text.accent, margin: "4px 0", paddingTop: 2, borderTop: "1px dashed " + theme.border.default }}>Slider is at {yr(year)}</div>);
                const srcs = info ? info.src : [];
                return (
                  <div>
                    <div style={{ ...theme.font.label, color: theme.text.tertiary, textTransform: "uppercase" }}>City or town</div>
                    <div style={{ ...theme.font.heading3, color: theme.text.primary }}>{selC.n}</div>
                    {info ? (
                      <div>
                        <Properties2 items={[["Ancient", info.a || selC.n], ["Modern", info.m || "Not recorded here"], ["Where", info.c]]} theme={theme} />
                        {head("About")}
                        <div style={{ ...theme.font.body2, color: theme.text.primary }}>{info.d}</div>
                        {head("Who held it in " + yr(year))}
                        <div style={{ ...theme.font.body2, color: theme.text.primary }}>
                          {solidN.length === 0 && softN.length === 0 ? "No kingdom or empire drawn on this map covers the place in " + yr(year) + "." : (solidN.length > 0 ? "Inside the drawn outline of: " + solidN.join(", ") + "." : "") + (softN.length > 0 ? (solidN.length > 0 ? " " : "") + "Within a dashed (tributary, disputed or proposed) outline of: " + softN.join(", ") + "." : "")}
                        </div>
                        <div style={{ ...theme.font.caption, color: theme.text.tertiary, marginTop: 4 }}>Read from this page's approximate outlines for the year on the slider, not from a ruler list; places near a frontier may fall on the wrong side.</div>
                        {head("Key dates (the entry nearest the slider is highlighted)")}
                        <div>
                          {evs.map((e, i) => (
                            <div key={i}>
                              {i === mi && marker}
                              <div style={{ display: "flex", gap: 8, padding: "3px 6px", borderRadius: 6, background: i === near ? theme.fill.secondary : undefined, borderLeft: i === near ? "3px solid " + theme.fill.accent : "3px solid transparent" }}>
                                <div style={{ ...theme.font.caption, color: theme.text.tertiary, flex: "0 0 92px" }}>{(e[2] ? "c. " : "") + yr(e[0])}</div>
                                <div style={{ ...theme.font.body2, color: theme.text.primary, flex: 1, fontWeight: i === near ? 600 : 400 }}>{e[1]}</div>
                              </div>
                            </div>
                          ))}
                          {mi < 0 && marker}
                        </div>
                        {info.bib && (<div>{head("Biblical significance")}<div style={{ ...theme.font.body2, color: theme.text.primary }}>{info.bib}</div></div>)}
                        {info.scr.length > 0 && head("Scripture")}
                        {info.scr.length > 0 && scrLinks(info.scr)}
                        {DIG[selC.n] ? (() => {
                          const a2 = DIG[selC.n];
                          return (
                            <div>
                              {head("Archaeology")}
                              <div style={{ ...theme.font.body2, color: theme.text.primary }}>{a2.sites}</div>
                              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                                <span style={{ ...theme.font.label, padding: "1px 10px", borderRadius: 999, background: theme.fill.secondary, color: theme.text.primary }}>Identification: {a2.id}</span>
                                <span style={{ ...theme.font.caption, color: theme.text.secondary, flex: "1 1 200px" }}>{a2.idn}</span>
                              </div>
                              <div style={{ ...theme.font.caption, color: theme.text.tertiary, marginTop: 8, textTransform: "uppercase" }}>Key finds and what they show</div>
                              {a2.finds.map((f, i) => (
                                <div key={i} style={{ display: "flex", gap: 8, padding: "4px 6px", borderLeft: "3px solid " + theme.border.default, marginTop: 4 }}>
                                  <div style={{ ...theme.font.caption, color: theme.text.tertiary, flex: "0 0 92px" }}>{f[0]}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ ...theme.font.body2, color: theme.text.primary, fontWeight: 600 }}>{f[1]}</div>
                                    <div style={{ ...theme.font.body2, color: theme.text.secondary }}>{f[2]}</div>
                                  </div>
                                </div>
                              ))}
                              <div style={{ ...theme.font.caption, color: theme.text.tertiary, marginTop: 6 }}>Archaeology sources:</div>
                              {a2.src.map((id) => {
                                const s = W_(id, decodeURIComponent(id).replace(/_/g, " "));
                                return (<div key={id} style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 2 }}><a href={s.u} target="_blank" rel="noreferrer" style={{ color: theme.text.accent }}>{"Wikipedia: " + s.t}</a></div>);
                              })}
                            </div>
                          );
                        })() : (!info.minor && (<div style={{ ...theme.font.caption, color: theme.text.tertiary, marginTop: 8 }}>Archaeology: no summary for this city yet (left out where it could not be sourced).</div>))}
                        {head("Sources")}
                        {srcs.map((id) => {
                          const s = id.charAt(0) === "@" ? S[id.slice(1)] : W_(id, decodeURIComponent(id).replace(/_/g, " "));
                          if (!s) return null;
                          return (<div key={id} style={{ ...theme.font.caption, color: theme.text.secondary, marginTop: 2 }}><a href={s.u} target="_blank" rel="noreferrer" style={{ color: theme.text.accent }}>{(id.charAt(0) === "@" ? "" : "Wikipedia: ") + s.t}</a><span style={{ color: theme.text.tertiary }}> ({s.w})</span></div>);
                        })}
                        <div style={{ ...theme.font.caption, color: theme.text.tertiary, marginTop: 8 }}>{info.minor ? "Short entry: a one-line description, key dates and a Wikipedia article; follow its citations for scholarship. " : ""}Dates marked c. are approximate or traditional. Positions on the map are approximate. Territory names follow the modern state or, where status is disputed, say so.</div>
                      </div>
                    ) : (<div style={{ ...theme.font.body2, color: theme.text.secondary, marginTop: 6 }}>No entry has been written for this place yet.</div>)}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </Section>

      <Callout lead="Borders are approximate" tone="info">
        Outlines are simplified hand-drawn polygons, not surveyed borders. Ancient and medieval states rarely had fixed frontiers, and scholars disagree about many extents (Solomon's dominion, the settlement of Israel, Hasmonean and Nabataean limits); dates before about 1000 BC are especially uncertain. For the modern period (1917 to 2026) the page shows proposals, armistice lines, administration and occupation as separate entries, uses dashed outlines for areas whose status is disputed or provisional, and takes no position on sovereignty; the modern shapes are schematic approximations, not traced from official maps. Recent conditions (for example inside Gaza since the October 2025 ceasefire) change faster than a map can show, so check the linked UN reports. Mountain, desert and river positions in the geography layer are schematic too. Each panel lists the sources it rests on; nothing here is traced from a copyrighted atlas map.
      </Callout>

      <Section heading="Dating notes: where dates are disputed">
        <Table columns={["Topic", "Commonly cited", "Where scholars disagree"]} rows={[
          ["Abraham and the patriarchs", "c. 2000 to 1700 BC (traditional)", "No outside attestation; the historicity and dating of the patriarchs are debated."],
          ["Exodus", "c. 1446 BC (early) or c. 1250 to 1200 BC (late)", "No direct Egyptian record; route, date and historicity are all disputed."],
          ["Judges", "c. 1200 to 1050 BC", "No secure absolute dates for individual judges."],
          ["United monarchy", "Saul c. 1050, David c. 1010, Solomon c. 970 to 931 BC", "Size and centralization of the kingdom are debated."],
          ["Fall of Samaria and Jerusalem", "722 BC and 587 or 586 BC", "Well attested; the year of Jerusalem's fall depends on the calendar used."],
          ["Ezra", "458 BC (traditional)", "Many scholars place his mission c. 398 BC, after Nehemiah."],
          ["Jesus", "Born c. 6 to 4 BC; ministry c. AD 27 to 30", "Crucifixion is dated AD 30 or 33."],
          ["Paul's journeys", "c. AD 46 to 62", "Approximate; reconstructed from Acts and the letters."],
        ]} />
        <Text>Sources for this table: Britannica on Exodus and Ezra, Wikipedia on Biblical chronology and the Chronology of Jesus (both linked below).</Text>
      </Section>

      <Section heading="Modern borders: how this page labels them">
        <Text>Solid outlines are used for areas with an agreed or long-settled status (for example Israel within the 1949 armistice lines, or states with treaty boundaries). Dashed outlines mark proposals (the 1947 UN partition recommendation), provisional administration, or areas whose status is disputed (the West Bank including East Jerusalem, the Gaza Strip, the Golan Heights, and Sinai while Israeli-held). The page uses geographic names and the terms used in the cited UN and treaty texts; the parties use other names and legal descriptions, and the panels say where they differ. The 1949 lines are armistice lines, not agreed borders; Security Council resolution 242 (1967), 478 (1980) and 497 (1981), the 1979 and 1994 peace treaties and the Oslo agreements (1993 to 1995) are each cited where they apply.</Text>
        <Text>Sources for the modern period: UN General Assembly and Security Council resolutions (via undocs.org and the UN Digital Library), UN Peacemaker and UNISPAL texts of the Oslo and Jordan treaties, the Avalon Project (Yale) texts of the Mandate, the 1949 armistice agreements and the 1979 treaty, UN OCHA and UN News for 2026 conditions, with Britannica and Wikipedia for background.</Text>
      </Section>

      <Section heading="References">
        <Text>Bible passages link to BibleGateway (NRSVUE). Links were checked through web search results or HTTP fetches while building this page; some publisher sites block automated checks, so a few may need opening in a browser. Wikipedia entries are secondary summaries; use their footnotes for primary scholarship.</Text>
        {["Bible atlases", "Encyclopedias", "Museum and other essays", "UN documents and treaty texts", "Reference maps and data checked", "Wikipedia articles"].map((g) => (
          <Section key={g} heading={g} collapsible defaultOpen={g !== "Wikipedia articles"}>
            <LinkCards links={Object.keys(S).filter((k) => S[k].g === g).map((k) => ({ title: S[k].t, site: S[k].w, href: S[k].u }))} />
          </Section>
        ))}
      </Section>
    </Page>
  );
}

function Properties2({ items, theme }: { items: string[][]; theme: ReturnType<typeof useGrokTheme> }) {
  return (
    <div style={{ marginTop: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "4px 0", borderTop: i ? "1px solid " + theme.border.subtle : undefined }}>
          <div style={{ ...theme.font.caption, color: theme.text.tertiary, flex: "0 0 84px" }}>{it[0]}</div>
          <div style={{ ...theme.font.body2, color: theme.text.primary, flex: 1 }}>{it[1]}</div>
        </div>
      ))}
    </div>
  );
}
