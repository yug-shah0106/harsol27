"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * The site's scroll and pointer animation, in one place (GSAP, ScrollTrigger and Lenis smooth
 * scrolling). Pages stay plain server-rendered HTML and opt in with data attributes:
 *
 *   data-reveal         rises and fades in when scrolled to; items arriving together are staggered
 *   data-blur-text      a heading whose words ([data-word]) blur in one after another   (React Bits BlurText)
 *   data-count="1234"   a number that counts up from 0 as it comes into view              (React Bits CountUp)
 *   data-spotlight      a soft olive light follows the pointer across the card           (React Bits SpotlightCard)
 *   data-magnet         leans toward a nearby pointer                                    (React Bits Magnet)
 *   data-parallax="12"  drifts down by that percent of its height while the page scrolls past it
 *   data-draw           draws itself along x as its section scrolls by
 *   data-scroll-text    a statement whose words ([data-word]) go from faint to full as it scrolls by   (as on lenis.dev)
 *   data-slide="left"   a giant line that slides in from that side ("left" or "right") as it scrolls up
 *   data-stack          a list of CSS-sticky cards; each sinks back a little as the next slides over it
 *   data-marquee        a track holding its content twice, drifting sideways for ever; scrolling speeds it up
 *
 * The four React Bits effects are adapted from https://reactbits.dev (MIT + Commons Clause,
 * © David Haz) and rebuilt on GSAP: the originals set inline styles, which our CSP blocks.
 *
 * Rules that keep pages fast, readable and accessible:
 * - GSAP, ScrollTrigger and Lenis load after the page is up, in their own chunks: nothing waits for them.
 * - Nothing on screen at load is hidden and replayed (no flash, no slower largest paint). What is visible
 *   at load enters with CSS instead (tw-animate-css classes in the markup). Counters are the exception:
 *   they show the real number until they count.
 * - prefers-reduced-motion: no animation and native scrolling, and these libraries are not even downloaded;
 *   gsap.matchMedia undoes everything if the setting changes after they have loaded. Pointer effects need a mouse (hover + fine pointer).
 * - Only transform, opacity and filter are animated; hidden items stay focusable and appear when focused.
 */
// The running Lenis instance, if smooth scrolling is on (scrollToTop goes through it so the two don't fight).
let smooth: { scrollTo: (target: number) => void } | undefined;

/** Back to the top of the page (smoothly unless reduced motion), then focus the main content for keyboard users. */
export function scrollToTop() {
  if (smooth) smooth.scrollTo(0);
  else window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const main = document.getElementById("main");
  if (main) {
    main.tabIndex = -1;
    main.focus({ preventScroll: true });
  }
}

export function Motion({ smoothScroll = true }: { smoothScroll?: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    // Asked for less motion: nothing here would run, so nothing is downloaded either.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis")]).then(([{ gsap }, { ScrollTrigger }, { default: Lenis }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add({ motion: "(prefers-reduced-motion: no-preference)", mouse: "(hover: hover) and (pointer: fine)" }, (context) => {
        const { motion, mouse } = context.conditions as { motion: boolean; mouse: boolean };
        if (!motion) return;
        const main = document.getElementById("main") ?? document.body;
        const all = <T extends Element = HTMLElement>(selector: string, root: Element | Document = main) => gsap.utils.toArray<T>(selector, root);
        // Below the fold right now, so hiding it until it is scrolled to is never seen.
        const offscreen = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;
        const cleanups: (() => void)[] = [];

        if (smoothScroll) {
          // Lenis runs on GSAP's ticker, so ScrollTrigger reads the same scroll position every frame.
          // Touch keeps native scrolling (Lenis default). Inner scroll areas opt out (data-lenis-prevent).
          const lenis = new Lenis({ autoRaf: false });
          smooth = lenis;
          lenis.on("scroll", ScrollTrigger.update);
          const tick = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(tick);
          gsap.ticker.lagSmoothing(0);
          cleanups.push(() => {
            gsap.ticker.remove(tick);
            gsap.ticker.lagSmoothing(500, 33);
            lenis.destroy();
            smooth = undefined;
          });
        }

        // Reveal.
        const items = all("[data-reveal]").filter(offscreen);
        if (items.length) {
          // (A short page may have none: GSAP warns about an empty target.)
          gsap.set(items, { opacity: 0, y: 32 });
          ScrollTrigger.batch(items, {
            start: "top 90%",
            once: true,
            onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, overwrite: true }),
          });
        }
        // A keyboard user tabbing ahead never lands on something invisible.
        const showFocused = (event: FocusEvent) => {
          const item = (event.target as Element | null)?.closest?.("[data-reveal]");
          if (item) gsap.to(item, { opacity: 1, y: 0, duration: 0.2, overwrite: true });
        };
        main.addEventListener("focusin", showFocused);
        cleanups.push(() => main.removeEventListener("focusin", showFocused));

        // BlurText: from blurred and above, through half-visible, to sharp; one word after another.
        // Two steps per word, each word starting 0.12s after the one before (fromTo, so a revert restores it cleanly).
        for (const heading of all("[data-blur-text]").filter(offscreen)) {
          const words = all("[data-word]", heading);
          const step = { duration: 0.35, ease: "power1.out", stagger: 0.12 };
          gsap
            .timeline({ scrollTrigger: { trigger: heading, start: "top 90%", once: true } })
            .fromTo(words, { opacity: 0, filter: "blur(10px)", y: -40 }, { opacity: 0.5, filter: "blur(5px)", y: 5, ...step })
            .to(words, { opacity: 1, filter: "blur(0px)", y: 0, clearProps: "filter", ...step }, step.duration);
        }

        // CountUp: counts from 0 when it comes into view. Only the text node's value changes (React keeps
        // its node), padded with figure spaces to the final width so nothing beside it shifts.
        const numbers = new Intl.NumberFormat("en-IN");
        for (const el of all("[data-count]")) {
          const text = el.firstChild;
          const target = Number(el.dataset.count);
          if (!(text instanceof Text) || !Number.isFinite(target) || target <= 0) continue;
          const final = numbers.format(target);
          const counter = { value: 0 };
          gsap.to(counter, {
            value: target,
            duration: Math.min(2, 0.8 + target / 400),
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 95%", once: true },
            onStart: () => {
              text.nodeValue = numbers.format(0).padStart(final.length, " ");
            },
            onUpdate: () => {
              text.nodeValue = numbers.format(Math.round(counter.value)).padStart(final.length, " ");
            },
          });
          cleanups.push(() => {
            text.nodeValue = final;
          });
        }

        // Parallax and drawn lines (scroll-linked).
        for (const el of all("[data-parallax]")) {
          gsap.to(el, { yPercent: Number(el.dataset.parallax) || 10, ease: "none", scrollTrigger: { trigger: el, start: 0, end: "bottom top", scrub: true } });
        }
        for (const el of all("[data-draw]").filter(offscreen)) {
          gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 85%", end: "top 45%", scrub: 0.6 } });
        }

        // Statement text: each word goes from faint to full while the paragraph crosses the screen.
        for (const text of all("[data-scroll-text]").filter(offscreen)) {
          gsap.fromTo(all("[data-word]", text), { opacity: 0.15 }, { opacity: 1, ease: "none", stagger: 0.1, scrollTrigger: { trigger: text, start: "top 85%", end: "bottom 55%", scrub: true } });
        }

        // Giant lines slide in from their side as they scroll up the screen (their section clips the overflow).
        // clamp(): near the end of the page, where it cannot scroll that far, the slide finishes at the bottom.
        for (const el of all("[data-slide]").filter(offscreen)) {
          const side = el.dataset.slide === "right" ? 1 : -1;
          gsap.fromTo(el, { xPercent: side * 25 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "clamp(top 45%)", scrub: 0.6 } });
        }

        // Stacked cards: the cards stick (CSS); each one's face sinks back as the next card slides over it.
        for (const list of all("[data-stack]")) {
          const cards = all(":scope > li", list);
          cards.slice(0, -1).forEach((card, i) => {
            gsap.to(card.firstElementChild, { scale: 0.92, ease: "none", scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 25%", scrub: true } });
          });
        }

        // Marquee: drifts left for ever. Scrolling speeds it up, scrolling back turns it round, and it eases
        // back to cruising speed. The track holds its content twice, so wrapping at -50% is seamless.
        for (const track of all("[data-marquee]")) {
          const setX = gsap.quickSetter(track, "xPercent");
          const wrap = gsap.utils.wrap(-50, 0);
          let x = 0;
          let direction = 1;
          let speed = 1;
          const trigger = ScrollTrigger.create({
            trigger: track,
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => {
              direction = self.direction;
              speed = direction * Math.min(8, 1 + Math.abs(self.getVelocity()) / 400);
            },
          });
          const drift = (_time: number, deltaMs: number) => {
            if (!trigger.isActive) return; // off screen: nothing to draw
            speed += (direction - speed) * 0.04;
            x = wrap(x - speed * deltaMs * 0.0025);
            setX(x);
          };
          gsap.ticker.add(drift);
          cleanups.push(() => {
            gsap.ticker.remove(drift);
            gsap.set(track, { clearProps: "transform" });
          });
        }

        if (mouse) {
          // SpotlightCard: the light's position, as CSS variables the card's ::before/::after read (globals.css).
          const spotlight = (event: PointerEvent) => {
            const card = (event.target as Element | null)?.closest?.<HTMLElement>("[data-spotlight]");
            if (!card) return;
            const box = card.getBoundingClientRect();
            card.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
            card.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
          };
          document.addEventListener("pointermove", spotlight, { passive: true });
          cleanups.push(() => document.removeEventListener("pointermove", spotlight));

          // Magnet: within PADDING of the element, it moves a quarter of the way toward the pointer.
          const PADDING = 48;
          const STRENGTH = 4;
          const magnets = all("[data-magnet]", document).map((el) => ({
            el,
            x: gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" }),
            y: gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" }),
          }));
          const pull = (event: PointerEvent) => {
            for (const magnet of magnets) {
              const box = magnet.el.getBoundingClientRect();
              // Measure where it rests, not where it has been pulled to.
              const cx = box.left + box.width / 2 - Number(gsap.getProperty(magnet.el, "x"));
              const cy = box.top + box.height / 2 - Number(gsap.getProperty(magnet.el, "y"));
              const dx = event.clientX - cx;
              const dy = event.clientY - cy;
              const near = Math.abs(dx) < box.width / 2 + PADDING && Math.abs(dy) < box.height / 2 + PADDING;
              magnet.x(near ? dx / STRENGTH : 0);
              magnet.y(near ? dy / STRENGTH : 0);
            }
          };
          if (magnets.length) {
            window.addEventListener("pointermove", pull, { passive: true });
            cleanups.push(() => window.removeEventListener("pointermove", pull));
          }
        }

        // The display font can arrive after this runs and change heading heights: measure again once it has.
        void document.fonts.ready.then(() => ScrollTrigger.refresh());

        return () => cleanups.forEach((cleanup) => cleanup());
      });
      stop = () => mm.revert();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [pathname, search, smoothScroll]);

  return null;
}
