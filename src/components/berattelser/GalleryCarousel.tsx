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
 * Seamless-loop carousel.
 *
 * To avoid the visible "rewind" when wrapping from last → first, we render
 * one clone of the first image at the end of the track. The clone is visually
 * identical to the real first image, so swapping between them via an instant
 * (non-animated) scrollLeft change is invisible.
 *
 * - Forward wrap (auto-advance / next on last): smooth-scroll to the clone,
 *   then instantly snap back to real first.
 * - Backward wrap (prev on first): instantly teleport to the clone position
 *   (same image), then smooth-scroll backward to real last.
 * - Manual mid-track scrolls and indicator clicks behave normally.
 * - Mobile swipe past the last real image lands on the clone via scroll-snap,
 *   then the scroll handler snaps back to real first.
 *
 * The indicator dots reflect the real index (0..N-1), never the clone.
 */
export default function GalleryCarousel({
  images,
}: {
  images: readonly CeremonyImage[];
}) {
  const realCount = images.length;
  const useLoop = realCount >= 2;
  // DOM slides: [...real images, cloneOfFirst]. Length = realCount + 1 when looping.
  const domSlides = useLoop ? [...images, images[0]!] : images;

  const scrollRef = useRef<HTMLDivElement>(null);
  const offsetsRef = useRef<number[]>([0]);
  const activeRealIndexRef = useRef(0);
  const [pageOffsets, setPageOffsets] = useState<number[]>([0]);
  const [activeRealIndex, setActiveRealIndex] = useState(0);
  const isSnappingRef = useRef(false);
  const pendingSnapRef = useRef<number | null>(null);
  const swipeSnapDebounceRef = useRef<number | null>(null);

  const findClosestDomIndex = useCallback(
    (scrollLeft: number, offsets = offsetsRef.current) => {
      return offsets.reduce(
        (best, offset, index) => {
          const distance = Math.abs(offset - scrollLeft);
          return distance < best.distance ? { index, distance } : best;
        },
        { index: 0, distance: Number.POSITIVE_INFINITY },
      ).index;
    },
    [],
  );

  const updatePageOffsets = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-gallery-index]"),
    );
    // Use raw offsetLeft per card so index maps 1:1 with DOM slide order.
    // Previously we capped each value at maxScroll, but on wide viewports
    // (PC) where several cards fit at once, that collapsed the last real
    // card and the clone onto the same offset — breaking the loop logic
    // and stalling auto-advance.
    const offsets = cards.length
      ? cards.map((card) => card.offsetLeft)
      : [0];
    offsetsRef.current = offsets;
    setPageOffsets(offsets);
  }, []);

  const instantScrollTo = useCallback((scrollLeft: number) => {
    const container = scrollRef.current;
    if (!container) return;
    isSnappingRef.current = true;
    const prev = container.style.scrollBehavior;
    container.style.scrollBehavior = "auto";
    container.scrollLeft = scrollLeft;
    container.style.scrollBehavior = prev;
    // Release the flag after two frames so the resulting scroll event from
    // setting scrollLeft is filtered out.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        isSnappingRef.current = false;
      });
    });
  }, []);

  const clearPendingSnap = useCallback(() => {
    if (pendingSnapRef.current !== null) {
      window.clearTimeout(pendingSnapRef.current);
      pendingSnapRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    const container = scrollRef.current;
    const offsets = offsetsRef.current;
    if (!container || offsets.length === 0) return;
    clearPendingSnap();

    const current = activeRealIndexRef.current;

    if (useLoop && current === realCount - 1) {
      // Forward wrap. If the clone slide is actually reachable (its offset
      // can be scrolled to — i.e. the carousel doesn't fit on screen all at
      // once), smooth-scroll there and snap back: that's the seamless
      // mobile case. On wide PC viewports the clone offset is beyond
      // maxScroll, so scrollTo gets clamped and the user just sees the
      // last visible cards. In that case skip the smooth-scroll and reset
      // instantly — still loops, just without the rewind illusion.
      const maxScroll = Math.max(
        0,
        container.scrollWidth - container.clientWidth,
      );
      const cloneOffset = offsets[realCount];
      const firstOffset = offsets[0]!;
      const cloneReachable =
        cloneOffset !== undefined && cloneOffset <= maxScroll + 1;

      activeRealIndexRef.current = 0;
      setActiveRealIndex(0);

      if (cloneReachable) {
        container.scrollTo({ left: cloneOffset!, behavior: "smooth" });
        pendingSnapRef.current = window.setTimeout(() => {
          instantScrollTo(firstOffset);
          pendingSnapRef.current = null;
        }, 700);
      } else {
        instantScrollTo(firstOffset);
      }
      return;
    }

    const next = useLoop ? (current + 1) % realCount : current + 1;
    if (next >= realCount) return;
    const targetOffset = offsets[next];
    if (targetOffset === undefined) return;
    activeRealIndexRef.current = next;
    setActiveRealIndex(next);
    container.scrollTo({ left: targetOffset, behavior: "smooth" });
  }, [clearPendingSnap, instantScrollTo, realCount, useLoop]);

  const reverse = useCallback(() => {
    const container = scrollRef.current;
    const offsets = offsetsRef.current;
    if (!container || offsets.length === 0) return;
    clearPendingSnap();

    const current = activeRealIndexRef.current;

    if (useLoop && current === 0) {
      // Backward wrap. Same idea as advance: if the clone is reachable,
      // teleport to it (instant) then smooth-scroll back to the real last
      // card (mobile, seamless). If not, instant-jump to real last (PC).
      const maxScroll = Math.max(
        0,
        container.scrollWidth - container.clientWidth,
      );
      const cloneOffset = offsets[realCount];
      const lastRealOffset = offsets[realCount - 1];
      if (lastRealOffset === undefined) return;
      const cloneReachable =
        cloneOffset !== undefined && cloneOffset <= maxScroll + 1;

      activeRealIndexRef.current = realCount - 1;
      setActiveRealIndex(realCount - 1);

      if (cloneReachable) {
        instantScrollTo(cloneOffset!);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            const c = scrollRef.current;
            if (!c) return;
            c.scrollTo({ left: lastRealOffset, behavior: "smooth" });
          });
        });
      } else {
        instantScrollTo(lastRealOffset);
      }
      return;
    }

    const prev = current - 1;
    if (prev < 0) return;
    const targetOffset = offsets[prev];
    if (targetOffset === undefined) return;
    activeRealIndexRef.current = prev;
    setActiveRealIndex(prev);
    container.scrollTo({ left: targetOffset, behavior: "smooth" });
  }, [clearPendingSnap, instantScrollTo, realCount, useLoop]);

  const goToReal = useCallback(
    (realIdx: number) => {
      const container = scrollRef.current;
      const offsets = offsetsRef.current;
      if (!container || offsets.length === 0) return;
      const clamped = Math.max(0, Math.min(realIdx, realCount - 1));
      if (offsets[clamped] === undefined) return;
      clearPendingSnap();
      activeRealIndexRef.current = clamped;
      setActiveRealIndex(clamped);
      container.scrollTo({ left: offsets[clamped]!, behavior: "smooth" });
    },
    [clearPendingSnap, realCount],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return undefined;

    const handleScroll = () => {
      if (isSnappingRef.current) return;
      const domIdx = findClosestDomIndex(container.scrollLeft);
      // Map clone index back to real index 0.
      const realIdx = useLoop && domIdx === realCount ? 0 : domIdx;
      if (realIdx !== activeRealIndexRef.current && realIdx < realCount) {
        activeRealIndexRef.current = realIdx;
        setActiveRealIndex(realIdx);
      }

      // If the user manually scrolled onto the clone (mobile swipe past last),
      // wait briefly for scroll-snap to settle, then snap back to real first.
      if (useLoop && domIdx === realCount) {
        if (swipeSnapDebounceRef.current !== null) {
          window.clearTimeout(swipeSnapDebounceRef.current);
        }
        swipeSnapDebounceRef.current = window.setTimeout(() => {
          swipeSnapDebounceRef.current = null;
          const c = scrollRef.current;
          if (!c) return;
          if (findClosestDomIndex(c.scrollLeft) === realCount) {
            instantScrollTo(offsetsRef.current[0]!);
          }
        }, 180);
      }
    };

    const frame = window.requestAnimationFrame(updatePageOffsets);
    const resizeObserver = new ResizeObserver(updatePageOffsets);
    resizeObserver.observe(container);
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      container.removeEventListener("scroll", handleScroll);
      if (swipeSnapDebounceRef.current !== null) {
        window.clearTimeout(swipeSnapDebounceRef.current);
        swipeSnapDebounceRef.current = null;
      }
    };
  }, [findClosestDomIndex, instantScrollTo, realCount, updatePageOffsets, useLoop]);

  useEffect(() => {
    if (!useLoop) return undefined;
    const interval = window.setInterval(advance, 4200);
    return () => window.clearInterval(interval);
  }, [advance, useLoop]);

  // Clear pending snap on unmount.
  useEffect(() => () => clearPendingSnap(), [clearPendingSnap]);

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
        className="grid grid-flow-col [grid-auto-columns:clamp(260px,29vw,340px)] gap-5 overflow-x-auto overscroll-x-contain pb-[18px] [scroll-behavior:smooth] [scroll-snap-type:inline_mandatory] [scrollbar-color:var(--color-accent)_transparent] max-[560px]:[grid-auto-columns:minmax(260px,82vw)]"
      >
        {domSlides.map((image, domIdx) => {
          const isClone = useLoop && domIdx === realCount;
          const realIndexForCaption = isClone ? 0 : domIdx;
          return (
            <figure
              key={isClone ? `${image.src}-clone` : image.src}
              data-gallery-index={domIdx}
              aria-hidden={isClone ? "true" : undefined}
              className="m-0 overflow-hidden border border-hairline bg-paper [scroll-snap-align:start]"
              style={{ borderRadius: "28px 28px 70px 28px" }}
            >
              <div className="relative h-[clamp(310px,42vw,520px)] w-full max-[560px]:h-[330px]">
                <Image
                  src={image.src}
                  alt={`${image.title} — exempelbild`}
                  fill
                  sizes="(min-width: 768px) 340px, 82vw"
                  priority={domIdx === 0}
                  className="object-cover [filter:saturate(0.88)_contrast(0.96)]"
                />
              </div>
              <figcaption className="grid gap-1.5 px-[26px] pt-6 pb-7">
                <span className="text-copper text-eyebrow uppercase tracking-[0.075em] tabular-nums">
                  {String(realIndexForCaption + 1).padStart(2, "0")}
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
          const offsetIdx = realIdx;
          const dotKey =
            pageOffsets[offsetIdx] !== undefined
              ? `${pageOffsets[offsetIdx]}-${realIdx}`
              : `dot-${realIdx}`;
          return (
            <button
              key={dotKey}
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
