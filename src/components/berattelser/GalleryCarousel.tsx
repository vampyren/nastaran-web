"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CeremonyImage } from "@/content/berattelser";

function ArrowMotif({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 28"
      className="h-[18px] w-[34px] max-[640px]:w-[28px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d={direction === "previous" ? "M38 5 18 14l20 9" : "M26 5l20 9-20 9"}
      />
      <path
        d={
          direction === "previous"
            ? "M46 6c-10 0-16 3-20 8 4 5 10 8 20 8"
            : "M18 6c10 0 16 3 20 8-4 5-10 8-20 8"
        }
      />
      <circle cx="32" cy="14" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Marquee-style carousel.
 *
 * The previous implementation stepped through cards via setInterval +
 * scrollTo({behavior:'smooth'}), which felt clunky and produced a visible
 * jump when wrapping. This version uses requestAnimationFrame to scroll
 * continuously at a steady velocity. Images are rendered twice so that
 * once scrollLeft crosses the width of one set, we instantly subtract
 * that width — the user is now scrolled into the second copy, which is
 * pixel-identical to the first copy at the equivalent offset, so the
 * wrap is invisible.
 *
 * Auto-scroll pauses briefly on intentional interaction: pointerdown
 * (including touch), focusin, and any click on the manual controls
 * (arrows + dots — these live outside the scroll container, so they
 * call pauseManual() explicitly to keep the rAF loop from fighting the
 * smooth manual scroll). Reduced-motion users get a static carousel
 * they navigate with the controls.
 *
 * Manual arrows preserve visual direction across the marquee seam by
 * normalizing scrollLeft into [0, realWidth) before each move, and (for
 * the reverse arrow) jumping into the second copy via an invisible
 * behavior:"auto" scroll if the smooth move would otherwise go negative.
 */
const VELOCITY_PX_PER_SEC = 32;
const INTERACTION_PAUSE_MS = 2500;

export default function GalleryCarousel({
  images,
}: {
  images: readonly CeremonyImage[];
}) {
  const realCount = images.length;
  const useLoop = realCount >= 2;
  // Render two copies for the seamless loop.
  const renderedImages = useLoop ? [...images, ...images] : images;

  const scrollRef = useRef<HTMLDivElement>(null);
  const realWidthRef = useRef(0);
  const pausedUntilRef = useRef(0);
  const [activeRealIndex, setActiveRealIndex] = useState(0);

  // Shared pause helper. Used by the in-container pointerdown/focusin
  // listeners AND by the manual arrow/dot click handlers (which live
  // outside the scroll container and so don't trigger those listeners).
  const pauseManual = useCallback(() => {
    pausedUntilRef.current = performance.now() + INTERACTION_PAUSE_MS;
  }, []);

  /** Measure the width of one complete copy of the real images. */
  const measureRealWidth = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>(
      "[data-gallery-index]",
    );
    if (!useLoop) {
      realWidthRef.current = container.scrollWidth;
      return;
    }
    if (items.length < realCount + 1) return;
    // offsetLeft of the first clone (index realCount in the doubled array)
    // equals the total width of the first copy (incl. trailing gap).
    realWidthRef.current = items[realCount]!.offsetLeft;
  }, [realCount, useLoop]);

  useEffect(() => {
    measureRealWidth();
    const container = scrollRef.current;
    if (!container) return undefined;
    const ro = new ResizeObserver(measureRealWidth);
    ro.observe(container);
    return () => ro.disconnect();
  }, [measureRealWidth]);

  // Continuous auto-scroll with interaction-driven pause.
  useEffect(() => {
    if (!useLoop) return undefined;
    const container = scrollRef.current;
    if (!container) return undefined;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    let raf = 0;
    let last: number | null = null;

    const tick = (now: number) => {
      const realWidth = realWidthRef.current;
      if (realWidth <= 0 || now < pausedUntilRef.current) {
        last = now;
        raf = window.requestAnimationFrame(tick);
        return;
      }
      if (last !== null) {
        const dt = (now - last) / 1000;
        let next = container.scrollLeft + VELOCITY_PX_PER_SEC * dt;
        if (next >= realWidth) {
          next -= realWidth;
        }
        // scrollTo with explicit behavior:"auto" so Firefox / other browsers
        // can't fall back to the inherited scroll-behavior:smooth from html
        // and animate each per-frame target asynchronously (which would stall
        // the loop).
        container.scrollTo({ left: next, behavior: "auto" });
      }
      last = now;
      raf = window.requestAnimationFrame(tick);
    };

    // Only pause on intentional interaction. Hover and wheel were too noisy
    // on PC — normal page scrolling fires wheel events over the gallery and
    // a stationary cursor landing on the gallery when it enters the viewport
    // counts as mouseenter, so both effectively suppressed all motion.
    container.addEventListener("pointerdown", pauseManual);
    container.addEventListener("focusin", pauseManual);

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      container.removeEventListener("pointerdown", pauseManual);
      container.removeEventListener("focusin", pauseManual);
    };
  }, [useLoop, pauseManual]);

  // Compute the active real index from scrollLeft. Pure read; no scroll mutation.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return undefined;

    const onScroll = () => {
      const items = container.querySelectorAll<HTMLElement>(
        "[data-gallery-index]",
      );
      if (items.length === 0) return;
      const realWidth = realWidthRef.current;
      const scrollLeft = container.scrollLeft;
      const normalized = realWidth > 0 ? scrollLeft % realWidth : scrollLeft;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < realCount && i < items.length; i++) {
        const offset = items[i]!.offsetLeft;
        const distance = Math.abs(offset - normalized);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      setActiveRealIndex((prev) => (prev === bestIndex ? prev : bestIndex));
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [realCount]);

  // Normalize scrollLeft into [0, realWidth) so manual moves always have
  // realWidth of forward headroom. The two copies are pixel-identical, so
  // dropping back from copy 2 → copy 1 is invisible.
  const normalizeScrollIntoFirstCopy = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const realWidth = realWidthRef.current;
    if (!useLoop || realWidth <= 0) return;
    if (container.scrollLeft >= realWidth) {
      container.scrollTo({
        left: container.scrollLeft - realWidth,
        behavior: "auto",
      });
    }
  }, [useLoop]);

  // Manual: advance one card.
  // Normalize first, then smooth-scroll forward. We deliberately do NOT
  // modulo-wrap the target — letting it cross into copy 2 keeps the
  // animation visibly forward. The rAF tick will wrap it invisibly later.
  const advance = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>(
      "[data-gallery-index]",
    );
    if (items.length < 2) return;
    const cardWidth = items[1]!.offsetLeft - items[0]!.offsetLeft;
    if (cardWidth <= 0) return;
    pauseManual();
    normalizeScrollIntoFirstCopy();
    container.scrollTo({
      left: container.scrollLeft + cardWidth,
      behavior: "smooth",
    });
  }, [normalizeScrollIntoFirstCopy, pauseManual]);

  // Manual: go back one card.
  // Normalize first, then — if we'd go negative — jump into copy 2 via an
  // invisible behavior:"auto" scroll. The subsequent smooth scroll then
  // animates visibly backward, instead of forward across the seam.
  const reverse = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>(
      "[data-gallery-index]",
    );
    if (items.length < 2) return;
    const cardWidth = items[1]!.offsetLeft - items[0]!.offsetLeft;
    if (cardWidth <= 0) return;
    const realWidth = realWidthRef.current;
    pauseManual();
    normalizeScrollIntoFirstCopy();
    if (
      useLoop &&
      realWidth > 0 &&
      container.scrollLeft - cardWidth < 0
    ) {
      container.scrollTo({
        left: container.scrollLeft + realWidth,
        behavior: "auto",
      });
    }
    container.scrollTo({
      left: container.scrollLeft - cardWidth,
      behavior: "smooth",
    });
  }, [normalizeScrollIntoFirstCopy, pauseManual, useLoop]);

  // Manual: jump to a specific real index. Picks whichever copy (first or
  // second) is closest to the current scroll position so the smooth scroll
  // feels short — this already keeps direction sensible across the seam.
  const goToReal = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      if (!container) return;
      const items = container.querySelectorAll<HTMLElement>(
        "[data-gallery-index]",
      );
      if (index < 0 || index >= realCount || items.length === 0) return;
      const realWidth = realWidthRef.current;
      const baseOffset = items[index]!.offsetLeft;
      const candidates = [baseOffset];
      if (useLoop && realWidth > 0 && items[index + realCount]) {
        candidates.push(items[index + realCount]!.offsetLeft);
      }
      const current = container.scrollLeft;
      let best = candidates[0]!;
      let bestDistance = Math.abs(best - current);
      for (const candidate of candidates.slice(1)) {
        const d = Math.abs(candidate - current);
        if (d < bestDistance) {
          best = candidate;
          bestDistance = d;
        }
      }
      pauseManual();
      container.scrollTo({ left: best, behavior: "smooth" });
    },
    [pauseManual, realCount, useLoop],
  );

  return (
    <div className="relative mt-8">
      <button
        type="button"
        aria-label="Visa föregående bildgrupp"
        onClick={reverse}
        className="absolute top-[calc(50%-38px)] left-[-27px] z-[3] grid h-[54px] w-[54px] place-items-center rounded-full border border-accent/40 bg-[color-mix(in_srgb,var(--color-paper)_84%,white)] text-accent-deep shadow-card transition-all duration-200 hover:-translate-y-px hover:bg-accent-deep hover:text-paper focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[3px] max-[640px]:top-auto max-[640px]:bottom-[-3px] max-[640px]:left-0 max-[640px]:h-[44px] max-[640px]:w-[44px]"
      >
        <ArrowMotif direction="previous" />
      </button>

      <div
        ref={scrollRef}
        aria-label="Exempelbilder, scrolla i sidled"
        className="grid grid-flow-col [grid-auto-columns:clamp(260px,29vw,340px)] gap-5 overflow-x-auto overscroll-x-contain pb-[18px] [scroll-behavior:auto] [scrollbar-color:var(--color-accent)_transparent] max-[560px]:[grid-auto-columns:minmax(260px,82vw)]"
      >
        {renderedImages.map((image, idx) => {
          const isClone = useLoop && idx >= realCount;
          const realIdx = useLoop ? idx % realCount : idx;
          return (
            <figure
              key={isClone ? `${image.src}-clone-${idx}` : image.src}
              data-gallery-index={idx}
              aria-hidden={isClone ? "true" : undefined}
              className="m-0 overflow-hidden border border-hairline bg-paper"
              style={{ borderRadius: "28px 28px 70px 28px" }}
            >
              <div className="relative h-[clamp(310px,42vw,520px)] w-full max-[560px]:h-[330px]">
                <Image
                  src={image.src}
                  alt={`${image.title} — exempelbild`}
                  fill
                  sizes="(min-width: 768px) 340px, 82vw"
                  priority={idx === 0}
                  className="object-cover [filter:saturate(0.88)_contrast(0.96)]"
                />
              </div>
              <figcaption className="grid gap-1.5 px-[26px] pt-6 pb-7">
                <span className="text-copper text-eyebrow uppercase tracking-[0.075em] tabular-nums">
                  {String(realIdx + 1).padStart(2, "0")}
                </span>
                <strong className="font-serif font-medium text-ink text-[23px]">
                  {image.title}
                </strong>
                <em className="text-ink-muted text-[15px] leading-[22px] not-italic">
                  {image.tone}
                </em>
                <small className="mt-1 text-[12px] text-[color-mix(in_srgb,var(--color-ink-muted)_76%,transparent)]">
                  {image.credit}
                </small>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Visa nästa bildgrupp"
        onClick={advance}
        className="absolute top-[calc(50%-38px)] right-[-27px] z-[3] grid h-[54px] w-[54px] place-items-center rounded-full border border-accent/40 bg-[color-mix(in_srgb,var(--color-paper)_84%,white)] text-accent-deep shadow-card transition-all duration-200 hover:-translate-y-px hover:bg-accent-deep hover:text-paper focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[3px] max-[640px]:top-auto max-[640px]:bottom-[-3px] max-[640px]:right-0 max-[640px]:h-[44px] max-[640px]:w-[44px]"
      >
        <ArrowMotif direction="next" />
      </button>

      <div
        aria-label="Välj bildgrupp"
        className="mt-2.5 flex justify-center gap-2"
      >
        {Array.from({ length: Math.max(1, realCount) }).map((_, realIdx) => {
          const current = activeRealIndex === realIdx;
          return (
            <button
              key={`dot-${realIdx}`}
              type="button"
              aria-label={`Visa bildgrupp ${realIdx + 1}`}
              aria-current={current ? "true" : undefined}
              onClick={() => goToReal(realIdx)}
              className={`h-[7px] rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[3px] ${
                current
                  ? "w-[42px] bg-accent-deep"
                  : "w-[22px] bg-[color-mix(in_srgb,var(--color-accent)_25%,var(--color-hairline))]"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
