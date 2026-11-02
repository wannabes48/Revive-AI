"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

export type ScrollNavLink = { label: string; href: string };

export type MorphingScrollNavbarProps = {
  brand?: ReactNode;
  links?: ScrollNavLink[];
  githubUrl?: string;
  socialUrl?: string;
  actions?: ReactNode;
};

const DEFAULT_LINKS: ScrollNavLink[] = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Featured Tasks", href: "#featured" },
  { label: "Practice Domains", href: "#categories" },
  { label: "Tasks", href: "/tasks" },
  { label: "FAQ", href: "#faq" },
];

function GithubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path
        d="M12 2.7a9.5 9.5 0 0 0-3 18.52c.48.09.66-.2.66-.46v-1.67c-2.67.58-3.23-1.14-3.23-1.14-.44-1.1-1.07-1.4-1.07-1.4-.87-.6.07-.59.07-.59.96.07 1.47.99 1.47.99.86 1.47 2.25 1.05 2.8.8.09-.62.34-1.05.61-1.29-2.13-.24-4.37-1.06-4.37-4.7 0-1.04.37-1.89.98-2.55-.1-.24-.43-1.21.09-2.52 0 0 .8-.26 2.61.97A9.1 9.1 0 0 1 12 7.34a9 9 0 0 1 2.38.32c1.81-1.23 2.6-.97 2.6-.97.53 1.31.2 2.28.1 2.52.61.66.98 1.51.98 2.55 0 3.65-2.25 4.46-4.39 4.7.35.3.65.88.65 1.77v2.63c0 .25.18.55.66.46A9.5 9.5 0 0 0 12 2.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path
        d="M5 4.5h3.8l3.7 5 4.3-5H19l-5.5 6.4 5.9 8.6h-3.8l-4.2-5.9-5.1 5.9H4l6.3-7.3L5 4.5Zm3 1.2 8.2 12.6h1.2L9.2 5.7H8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MorphingScrollNavbar({
  brand = (
    <>
      Revive<span>AI</span>
    </>
  ),
  links = DEFAULT_LINKS,
  githubUrl = "https://github.com",
  socialUrl = "https://x.com",
  actions,
}: MorphingScrollNavbarProps) {
  const [atTop, setAtTop] = useState(true);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [progress, setProgress] = useState(0);
  const [activeHref, setActiveHref] = useState(links[0]?.href ?? "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      setAtTop(y < 8);
      if (delta > 4) setDirection("down");
      else if (delta < -4) setDirection("up");

      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);

      const marker = y + window.innerHeight * 0.34;
      let next = links[0]?.href ?? "";
      for (const link of links) {
        if (!link.href.startsWith("#")) continue;
        const section = document.getElementById(link.href.slice(1));
        if (section && section.offsetTop <= marker) next = link.href;
      }
      setActiveHref(next);
      lastY = y;
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [links]);

  const floating = !atTop;
  const compact = floating && direction === "down";

  return (
    <>
      <style>{STYLES}</style>
      <div
        className="msn-progress"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
      <nav
        className={`msn-nav${floating ? " is-floating" : ""}${compact ? " is-compact" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="msn-shell">
          <a className="msn-brand" href="#top" aria-label="Go to top">
            {brand}
          </a>
          <div className="msn-links">
            {links.map((link) => (
              <a
                aria-current={activeHref === link.href ? "location" : undefined}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="msn-actions">
            {actions ? (
              <div className="hidden sm:flex items-center gap-2">
                {actions}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                {githubUrl && (
                  <a
                    className="msn-button msn-github"
                    href={githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open GitHub in a new tab"
                  >
                    <GithubIcon />
                    <span>GitHub</span>
                  </a>
                )}
                {socialUrl && (
                  <a
                    className="msn-button msn-icon-button"
                    href={socialUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open X in a new tab"
                  >
                    <XIcon />
                  </a>
                )}
              </div>
            )}

            {/* Mobile Hamburger Menu Button (shown < 900px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              className="msn-mobile-toggle touch-target"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Slide-down Menu Sheet */}
      {mobileMenuOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[150] flex flex-col pointer-events-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full bg-card text-card-foreground border-b border-border shadow-2xl max-h-[85dvh] overflow-y-auto p-5 space-y-4 pb-safe animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="font-heading font-extrabold text-base tracking-tight text-foreground">
                Navigation
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="touch-target p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col space-y-1">
              {links.map((link) => {
                const isActive = activeHref === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`touch-target flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 font-bold"
                        : "text-foreground hover:bg-muted hover:text-primary"
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>

            {actions && (
              <div className="pt-3 border-t border-border flex flex-col gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

const STYLES = `
.msn-progress{--accent:#0F766E;position:fixed;z-index:101;top:0;right:0;left:0;height:2.5px;background:linear-gradient(90deg,var(--accent),#34D399);transform:scaleX(0);transform-origin:0 50%;will-change:transform}
.msn-nav{--paper:#f7faf9;--surface:#ffffff;--ink:#0b2b2b;--muted:#59635d;--line:#d3e2de;--accent:#0F766E;position:fixed;z-index:100;top:0;right:0;left:0;display:flex;justify-content:center;padding:0 20px;pointer-events:none;font-family:var(--font-sans),ui-sans-serif,system-ui,sans-serif;color:var(--ink)}
.dark .msn-nav{--paper:#071c1b;--surface:#0e2e2c;--ink:#edf1ee;--muted:#9aa49e;--line:#1c423f;--accent:#14b8a6}
.msn-nav *{box-sizing:border-box}.msn-nav a{color:inherit;text-decoration:none}.msn-shell{pointer-events:auto;display:flex;align-items:center;justify-content:space-between;gap:22px;width:100%;max-width:1180px;height:68px;margin-top:0;padding:0 12px 0 22px;border:1px solid transparent;border-radius:20px;background:transparent;transition:max-width .5s cubic-bezier(.34,1.32,.5,1),height .38s cubic-bezier(.34,1.2,.5,1),margin-top .38s ease,padding .38s ease,background-color .3s ease,border-color .3s ease,box-shadow .4s ease}
.msn-nav.is-floating .msn-shell{max-width:960px;height:58px;margin-top:12px;padding:0 12px 0 20px;border-color:color-mix(in srgb,var(--ink) 12%,transparent);background:color-mix(in srgb,var(--paper) 78%,transparent);-webkit-backdrop-filter:saturate(170%) blur(16px);backdrop-filter:saturate(170%) blur(16px);box-shadow:0 1px 0 color-mix(in srgb,#fff 60%,transparent) inset,0 14px 40px -20px color-mix(in srgb,var(--ink) 35%,transparent)}
.msn-nav.is-compact .msn-shell{max-width:560px;height:52px}.msn-brand{flex:none;font-size:23px;font-weight:800;line-height:1;letter-spacing:-.045em;transition:font-size .38s cubic-bezier(.34,1.2,.5,1),transform .18s ease;display:flex;align-items:center;gap:6px}.msn-brand span{color:var(--accent)}.msn-brand:hover{transform:translateY(-1px)}.msn-nav.is-compact .msn-brand{font-size:20px}
.msn-links{display:flex;gap:26px;max-width:640px;overflow:hidden;opacity:1;transition:max-width .45s cubic-bezier(.34,1.2,.5,1),opacity .28s ease,transform .3s ease,gap .35s ease}.msn-nav.is-compact .msn-links{max-width:0;gap:0;opacity:0;transform:translateY(-8px);pointer-events:none}.msn-links a{position:relative;color:var(--muted);font-size:14px;font-weight:500;white-space:nowrap;transition:color .15s ease}.msn-links a:after{content:"";position:absolute;right:0;bottom:-5px;left:0;height:2px;border-radius:2px;background:var(--accent);transform:scaleX(0);transform-origin:0 50%;transition:transform .28s cubic-bezier(.2,.7,.2,1)}.msn-links a:hover,.msn-links a[aria-current="location"]{color:var(--ink);font-weight:600}.msn-links a:hover:after,.msn-links a[aria-current="location"]:after{transform:scaleX(1)}
.msn-actions{display:flex;flex:none;align-items:center;gap:8px}
.msn-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border:1px solid var(--line);border-radius:9999px;background:var(--surface);color:var(--ink);font-size:13px;font-weight:600;white-space:nowrap;transition:height .38s ease,font-size .38s ease,padding .38s ease,background-color .18s ease,transform .18s ease,box-shadow .22s ease}.msn-button svg{width:16px;height:16px}.msn-button:hover{background:color-mix(in srgb,var(--surface) 85%,var(--paper));transform:translateY(-1px);box-shadow:0 8px 18px -12px color-mix(in srgb,var(--ink) 35%,transparent)}.msn-button:active{transform:translateY(0) scale(.97)}.msn-icon-button{width:40px;padding:0}.msn-nav.is-compact .msn-button{height:36px;padding:0 13px;font-size:12px}.msn-nav.is-compact .msn-icon-button{width:36px;padding:0}

/* Mobile Hamburger Toggle */
.msn-mobile-toggle{display:none;align-items:center;justify-content:center;width:44px;height:44px;border-radius:9999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
@media(max-width:900px){
  .msn-links{display:none}
  .msn-mobile-toggle{display:inline-flex}
  .msn-nav.is-floating .msn-shell{max-width:680px}
  .msn-nav.is-compact .msn-shell{max-width:520px}
}
@media(max-width:560px){
  .msn-nav{padding:0 12px}
  .msn-shell,.msn-nav.is-floating .msn-shell,.msn-nav.is-compact .msn-shell{gap:8px;height:56px;padding:0 6px 0 12px}
  .msn-brand,.msn-nav.is-compact .msn-brand{font-size:19px}
  .msn-actions{gap:6px}
}

/* Mobile Menu Overlay & Sheet */
.msn-mobile-overlay{position:fixed;inset:0;z-index:150;display:flex;flex-direction:column;pointer-events:auto}
.msn-mobile-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);animation:fadeIn .2s ease-out}
.msn-mobile-sheet{position:relative;z-index:1;display:flex;flex-direction:column;gap:16px;width:100%;max-height:85dvh;overflow-y:auto;background:var(--surface, #ffffff);border-bottom:1px solid var(--line, #d3e2de);padding:16px 20px 24px;box-shadow:0 16px 36px rgba(0,0,0,0.18);animation:slideDown .22s cubic-bezier(0.16,1,0.3,1)}
.msn-mobile-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid color-mix(in srgb, var(--line) 60%, transparent)}
.msn-mobile-links{display:flex;flex-direction:column;gap:6px}
.msn-mobile-link{display:flex;align-items:center;min-height:44px;padding:10px 14px;border-radius:12px;font-size:15px;font-weight:600;color:var(--ink);text-decoration:none;transition:background-color .15s}
.msn-mobile-link:hover,.msn-mobile-link.is-active{background:color-mix(in srgb, var(--accent) 10%, transparent);color:var(--accent)}
.msn-mobile-actions{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid color-mix(in srgb, var(--line) 60%, transparent)}
@keyframes slideDown{from{transform:translateY(-16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.msn-nav *,.msn-shell,.msn-progress,.msn-mobile-sheet{transition-duration:.01ms!important;animation-duration:.01ms!important}}
`;

export default MorphingScrollNavbar;
