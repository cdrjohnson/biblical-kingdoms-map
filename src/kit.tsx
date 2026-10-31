/*
 * A small local stand-in for the canvas kit the page was first written against.
 * It provides the same hooks and components (Page, Section, Text, Callout, Button,
 * Segmented, Select, Toggle, Table, LinkCards, Status, useGrokTheme) so the map code is unchanged.
 * The palette and type scale follow the kit's light and dark tokens, and the theme follows prefers-color-scheme.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

export { useState, useEffect, useMemo, useRef, useCallback, useReducer, Fragment } from "react";
export type { ChangeEvent, KeyboardEvent, FocusEvent, FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, CSSProperties } from "react";

type TextStyle = { fontSize: string; lineHeight: string; letterSpacing: string };
const type: Record<string, TextStyle> = {
  heading1: { fontSize: "30px", lineHeight: "36px", letterSpacing: "-0.4px" },
  heading2: { fontSize: "24px", lineHeight: "30px", letterSpacing: "-0.25px" },
  heading3: { fontSize: "20px", lineHeight: "26px", letterSpacing: "-0.1px" },
  body1: { fontSize: "16px", lineHeight: "24px", letterSpacing: "0.1px" },
  subtext: { fontSize: "14px", lineHeight: "20px", letterSpacing: "0.1px" },
  table: { fontSize: "15px", lineHeight: "22px", letterSpacing: "0.1px" },
  metric: { fontSize: "24px", lineHeight: "30px", letterSpacing: "-0.25px" },
  body2: { fontSize: "13px", lineHeight: "18px", letterSpacing: "-0.08px" },
  label: { fontSize: "12px", lineHeight: "16px", letterSpacing: "0" },
  caption: { fontSize: "11px", lineHeight: "16px", letterSpacing: "0.055px" },
  code: { fontSize: "13px", lineHeight: "20px", letterSpacing: "0" },
};

const light = {
  bg: { base: "#fcfcfc", subtle: "#f7f7f7", elevated: "#fcfcfc" },
  text: { primary: "#141414", secondary: "#14141499", tertiary: "#14141466", onColor: "#fcfcfc", onPrimary: "#fcfcfc", accent: "#0c64c1", success: "#009957", warning: "#c27400", danger: "#c21d2e" },
  fill: { primary: "#070707", primaryHover: "#2f2f2f", secondary: "#77777717", secondaryHover: "#77777726", hover: "#1414140f", pressed: "#14141417", accent: "#1084fe", controlChecked: "#070707", accentSubtle: "#1084fe17", successSubtle: "#00c97217", warningSubtle: "#ff980017", dangerSubtle: "#ff263c17" },
  border: { subtle: "#1414140d", weak: "#1414141a", default: "#14141426", strong: "#1414144d", focus: "#14141466" },
};
const dark = {
  bg: { base: "#070707", subtle: "#111111", elevated: "#181818" },
  text: { primary: "#fcfcfc", secondary: "#fcfcfc99", tertiary: "#fcfcfc66", onColor: "#fcfcfc", onPrimary: "#141414", accent: "#459ffe", success: "#38d591", warning: "#ffaf38", danger: "#ff5667" },
  fill: { primary: "#fafafa", primaryHover: "#d5d5d5", secondary: "#7777772c", secondaryHover: "#77777747", hover: "#fcfcfc14", pressed: "#fcfcfc1f", accent: "#1084fe", controlChecked: "#5a5a5a", accentSubtle: "#1084fe2c", successSubtle: "#00c9722c", warningSubtle: "#ff98002c", dangerSubtle: "#ff263c2c" },
  border: { subtle: "#fcfcfc0d", weak: "#fcfcfc1a", default: "#fcfcfc26", strong: "#fcfcfc4d", focus: "#fcfcfc66" },
};
const FONT = '-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function build(kind: "light" | "dark") {
  const p = kind === "dark" ? dark : light;
  return {
    kind,
    ...p,
    font: { family: FONT, mono: MONO, ...type } as { family: string; mono: string } & Record<string, TextStyle>,
    weight: { regular: 400, medium: 500, semibold: 600 },
    radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    motion: { hover: "140ms", easing: "ease" },
  };
}
export type GrokTheme = ReturnType<typeof build>;
const themes = { light: build("light"), dark: build("dark") };

function systemKind(): "light" | "dark" {
  try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return "light"; }
}

/** The theme for the viewer's current light or dark mode (follows prefers-color-scheme live). */
export function useGrokTheme(): GrokTheme {
  const [kind, setKind] = useState<"light" | "dark">(systemKind());
  useEffect(() => {
    let mq: MediaQueryList | undefined;
    try { mq = window.matchMedia("(prefers-color-scheme: dark)"); } catch (e) { return; }
    const h = () => setKind(mq && mq.matches ? "dark" : "light");
    h();
    if (mq.addEventListener) mq.addEventListener("change", h); else mq.addListener(h);
    return () => { if (mq) { if (mq.removeEventListener) mq.removeEventListener("change", h); else mq.removeListener(h); } };
  }, []);
  return themes[kind];
}

const ts = (t: TextStyle): CSSProperties => ({ fontSize: t.fontSize, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing });

export function Page({ title, summary, width, children }: { title: string; summary?: string; width?: "narrow" | "wide" | "full"; children: ReactNode }) {
  const theme = useGrokTheme();
  const max = width === "full" ? "none" : width === "wide" ? 1280 : 700;
  useEffect(() => { document.documentElement.style.colorScheme = theme.kind; document.body.style.background = theme.bg.base; }, [theme]);
  return (
    <div style={{ minHeight: "100vh", background: theme.bg.base, color: theme.text.primary, fontFamily: theme.font.family }}>
      <main style={{ maxWidth: max, margin: "0 auto", padding: "28px clamp(12px, 3vw, 32px) 64px", display: "flex", flexDirection: "column", gap: 28 }}>
        <header>
          <h1 style={{ ...ts(type.heading1), fontWeight: 600, margin: 0 }}>{title}</h1>
          {summary && <p style={{ ...ts(type.body1), color: theme.text.secondary, margin: "8px 0 0", maxWidth: 900 }}>{summary}</p>}
        </header>
        {children}
      </main>
    </div>
  );
}

export function Section({ heading, collapsible, defaultOpen, children }: { heading: string; collapsible?: boolean; defaultOpen?: boolean; children: ReactNode }) {
  const theme = useGrokTheme();
  const h = <span style={{ ...ts(type.heading2), fontWeight: 600 }}>{heading}</span>;
  if (collapsible) {
    return (
      <details open={defaultOpen !== false} style={{ borderTop: "1px solid " + theme.border.default, paddingTop: 10 }}>
        <summary style={{ cursor: "pointer", listStyle: "revert", marginBottom: 10 }}><span style={{ ...ts(type.heading3), fontWeight: 600 }}>{heading}</span></summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
      </details>
    );
  }
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0 }}>{h}</h2>
      {children}
    </section>
  );
}

export function Text({ children }: { children: ReactNode }) {
  const theme = useGrokTheme();
  return <p style={{ ...ts(type.body1), margin: 0, color: theme.text.primary, maxWidth: 980 }}>{children}</p>;
}

export function Callout({ lead, tone, children }: { lead?: string; tone?: "info" | "warning" | "success" | "danger"; children: ReactNode }) {
  const theme = useGrokTheme();
  const bg = tone === "warning" ? theme.fill.warningSubtle : tone === "danger" ? theme.fill.dangerSubtle : tone === "success" ? theme.fill.successSubtle : theme.fill.accentSubtle;
  return (
    <div role="note" style={{ background: bg, borderRadius: theme.radius.lg, padding: "14px 16px", ...ts(type.subtext), color: theme.text.primary }}>
      {lead && <strong style={{ fontWeight: 600 }}>{lead}. </strong>}
      {children}
    </div>
  );
}

export function Button({ label, onClick, variant, disabled }: { label: string; onClick: () => void; variant?: "primary" | "quiet"; disabled?: boolean }) {
  const theme = useGrokTheme();
  const [hov, setHov] = useState(false);
  if (!label) return null;
  const primary = variant === "primary";
  return (
    <button type="button" disabled={disabled} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ minHeight: 28, padding: "4px 12px", borderRadius: theme.radius.md, border: "none", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1, fontFamily: theme.font.family, ...ts(type.body2), fontWeight: 500, whiteSpace: "nowrap",
        background: primary ? (hov ? theme.fill.primaryHover : theme.fill.primary) : (hov ? theme.fill.secondaryHover : theme.fill.secondary), color: primary ? theme.text.onPrimary : theme.text.primary, transition: "background " + theme.motion.hover + " " + theme.motion.easing }}>
      {label}
    </button>
  );
}

type Opt<T extends string> = T | { value: T; label: string };
const optVal = <T extends string>(o: Opt<T>): T => (typeof o === "string" ? o : o.value);
const optLabel = <T extends string>(o: Opt<T>): string => (typeof o === "string" ? o : o.label);

export function Segmented<T extends string = string>({ options, value, onChange }: { options: readonly Opt<T>[]; value: T; onChange: (v: T) => void }) {
  const theme = useGrokTheme();
  return (
    <div role="radiogroup" style={{ display: "inline-flex", flexWrap: "wrap", gap: 2, padding: 2, borderRadius: theme.radius.md, background: theme.fill.secondary }}>
      {options.map((o) => {
        const v = optVal(o), on = v === value;
        return (
          <button key={v} type="button" role="radio" aria-checked={on} onClick={() => onChange(v)}
            style={{ minHeight: 24, padding: "2px 10px", borderRadius: theme.radius.sm + 2, border: "none", cursor: "pointer", fontFamily: theme.font.family, ...ts(type.body2), fontWeight: 500, background: on ? theme.bg.elevated : "transparent", color: on ? theme.text.primary : theme.text.secondary, boxShadow: on ? "0 0 0 1px " + theme.border.default : "none" }}>
            {optLabel(o)}
          </button>
        );
      })}
    </div>
  );
}

export function Select<T extends string = string>({ label, options, value, onChange }: { label?: string; options: readonly Opt<T>[]; value: T; onChange: (v: T) => void }) {
  const theme = useGrokTheme();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      {label && <span style={{ ...ts(type.label), color: theme.text.tertiary }}>{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        style={{ minHeight: 30, padding: "4px 28px 4px 10px", borderRadius: theme.radius.md, border: "none", background: theme.fill.secondary, color: theme.text.primary, fontFamily: theme.font.family, ...ts(type.body2), fontWeight: 500, cursor: "pointer", maxWidth: "100%" }}>
        {options.map((o) => (<option key={optVal(o)} value={optVal(o)}>{optLabel(o)}</option>))}
      </select>
    </label>
  );
}

export function Toggle({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const theme = useGrokTheme();
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1 }}>
      <button type="button" role="switch" aria-checked={value} aria-label={label} disabled={disabled} onClick={() => onChange(!value)}
        style={{ position: "relative", flex: "none", width: 30, height: 18, borderRadius: 9, border: "none", padding: 0, cursor: "inherit", background: value ? theme.fill.controlChecked : theme.border.strong, transition: "background " + theme.motion.hover }}>
        <span style={{ position: "absolute", top: 2, left: value ? 14 : 2, width: 14, height: 14, borderRadius: 7, background: theme.text.onColor, transition: "left " + theme.motion.hover }} />
      </button>
      <span style={{ ...ts(type.body2), color: theme.text.primary }}>{label}</span>
    </label>
  );
}

export function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  const theme = useGrokTheme();
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", ...ts(type.table) }}>
        <thead>
          <tr>{columns.map((c) => (<th key={c} style={{ textAlign: "left", padding: "8px 10px", ...ts(type.label), color: theme.text.tertiary, borderBottom: "1px solid " + theme.border.default, fontWeight: 500 }}>{c}</th>))}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (<tr key={i}>{r.map((c, j) => (<td key={j} style={{ padding: "8px 10px", verticalAlign: "top", borderBottom: "1px solid " + theme.border.subtle, color: j === 0 ? theme.text.primary : theme.text.secondary }}>{c}</td>))}</tr>))}
        </tbody>
      </table>
    </div>
  );
}

export function LinkCards({ links }: { links: { title: string; site?: string; href: string }[] }) {
  const theme = useGrokTheme();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
      {links.map((l, i) => (
        <a key={i} href={l.href} target="_blank" rel="noreferrer" style={{ display: "block", padding: "10px 12px", borderRadius: theme.radius.lg, border: "1px solid " + theme.border.default, textDecoration: "none", color: theme.text.primary }}>
          <div style={{ ...ts(type.body2), fontWeight: 500 }}>{l.title}</div>
          {l.site && <div style={{ ...ts(type.caption), color: theme.text.tertiary }}>{l.site}</div>}
        </a>
      ))}
    </div>
  );
}

export function Status({ tone, children }: { tone?: "success" | "warning" | "danger" | "accent" | "neutral"; children: ReactNode }) {
  const theme = useGrokTheme();
  const t = tone || "neutral";
  const ink = t === "success" ? theme.text.success : t === "warning" ? theme.text.warning : t === "danger" ? theme.text.danger : t === "accent" ? theme.text.accent : theme.text.secondary;
  const bg = t === "success" ? theme.fill.successSubtle : t === "warning" ? theme.fill.warningSubtle : t === "danger" ? theme.fill.dangerSubtle : t === "accent" ? theme.fill.accentSubtle : theme.fill.secondary;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 20, padding: "0 8px", borderRadius: 9999, background: bg, color: ink, ...ts(type.label), fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: ink }} />{children}
    </span>
  );
}
