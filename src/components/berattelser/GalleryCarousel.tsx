"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CeremonyImage } from "@/content/berattelser";

function uniqueOffsets(offsets: number[]) {
  return offsets.reduce<number[]>((result, offset) => {
    const rounded = Math.round(offset);
    if (!result.some((item) => Math.abs(item - rounded) < 18)) result.push(rounded);
    return result;
  }, []);
}

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

export default function GalleryCarousel({
  images,
}: {
  images: readonly CeremonyImage[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const offsetsRef = useRef([0]);
  const activePageRef = useRef(0);
  const [pageOffsets, setPageOffsets] = useState([0]);
  const [activePage, setActivePage] = useState(0);

  const findClosestPage = useCallback(
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
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-gallery-index]"),
    );
    const offsets = uniqueOffsets(
      cards.map((card) => Math.min(card.offsetLeft, maxScroll)),
    );
    if (
      maxScroll > 1 &&
      !offsets.some((offset) => Math.abs(offset - maxScroll) < 18)
    ) {
      offsets.push(Math.round(maxScroll));
    }
    const nextOffsets = offsets.length ? offsets.sort((a, b) => a - b) : [0];
    offsetsRef.current = nextOffsets;
    setPageOffsets(nextOffsets);
    const nextActive = findClosestPage(container.scrollLeft, nextOffsets);
    activePageRef.current = nextActive;
    setActivePage(nextActive);
  }, [findClosestPage]);

  const goToPage = useCallback((index: number) => {
    const container = scrollRef.current;
    const offsets = offsetsRef.current;
    if (!container || !offsets.length) return;
    const nextIndex = Math.max(0, Math.min(index, offsets.length - 1));
    activePageRef.current = nextIndex;
    setActivePage(nextIndex);
    container.scrollTo({ left: offsets[nextIndex], behavior: "smooth" });
  }, []);

  const movePage = useCallback(
    (direction: -1 | 1) => {
      const offsets = offsetsRef.current;
      if (!offsets.length) return;
      const next =
        (activePageRef.current + direction + offsets.length) % offsets.length;
      goToPage(next);
    },
    [goToPage],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return undefined;
    const handleScroll = () => {
      const nextActive = findClosestPage(container.scrollLeft);
      activePageRef.current = nextActive;
      setActivePage(nextActive);
    };
    const frame = window.requestAnimationFrame(updatePageOffsets);
    const resizeObserver = new ResizeObserver(updatePageOffsets);
    resizeObserver.observe(container);
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, [findClosestPage, updatePageOffsets]);

  useEffect(() => {
    if (images.length < 2) return undefined;
    const interval = window.setInterval(() => {
      const offsets = offsetsRef.current;
      if (offsets.length < 2) return;
      goToPage((activePageRef.current + 1) % offsets.length);
    }, 4200);
    return () => window.clearInterval(interval);
  }, [goToPage, images.length]);

  return (
    <div className="relative mt-8">
      <button
        type="button"
        aria-label="Visa föregående bildgrupp"
        onClick={() => movePage(-1)}
        className="absolute top-[calc(50%-38px)] left-[-27px] z-[3] grid h-[54px] w-[54px] place-items-center rounded-full border border-accent/40 bg-[color-mix(in_srgb,var(--color-paper)_84%,white)] text-accent-deep shadow-card transition-all duration-200 hover:-translate-y-px hover:bg-accent-deep hover:text-paper focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[3px] max-[640px]:top-auto max-[640px]:bottom-[-3px] max-[640px]:left-0 max-[640px]:h-[44px] max-[640px]:w-[44px]"
      >
        <ArrowMotif direction="previous" />
      </button>

      <div
        ref={scrollRef}
        aria-label="Exempelbilder, scrolla i sidled"
        className="grid grid-flow-col [grid-auto-columns:clamp(260px,29vw,340px)] gap-5 overflow-x-auto overscroll-x-contain pb-[18px] [scroll-behavior:smooth] [scroll-snap-type:inline_mandatory] [scrollbar-color:var(--color-accent)_transparent] max-[560px]:[grid-auto-columns:minmax(260px,82vw)]"
      >
        {images.map((image, index) => (
          <figure
            key={image.src}
            data-gallery-index={index}
            className="m-0 overflow-hidden border border-hairline bg-paper [scroll-snap-align:start]"
            style={{ borderRadius: "28px 28px 70px 28px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={`${image.title} — exempelbild`}
              loading={index === 0 ? "eager" : "lazy"}
              referrerPolicy="no-referrer"
              className="block h-[clamp(310px,42vw,520px)] w-full object-cover [filter:saturate(0.88)_contrast(0.96)] max-[560px]:h-[330px]"
            />
            <figcaption className="grid gap-1.5 px-[26px] pt-6 pb-7">
              <span className="text-copper text-eyebrow uppercase tracking-[0.075em] tabular-nums">
                {String(index + 1).padStart(2, "0")}
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
        ))}
      </div>

      <button
        type="button"
        aria-label="Visa nästa bildgrupp"
        onClick={() => movePage(1)}
        className="absolute top-[calc(50%-38px)] right-[-27px] z-[3] grid h-[54px] w-[54px] place-items-center rounded-full border border-accent/40 bg-[color-mix(in_srgb,var(--color-paper)_84%,white)] text-accent-deep shadow-card transition-all duration-200 hover:-translate-y-px hover:bg-accent-deep hover:text-paper focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[3px] max-[640px]:top-auto max-[640px]:bottom-[-3px] max-[640px]:right-0 max-[640px]:h-[44px] max-[640px]:w-[44px]"
      >
        <ArrowMotif direction="next" />
      </button>

      <div
        aria-label="Välj bildgrupp"
        className="mt-2.5 flex justify-center gap-2"
      >
        {pageOffsets.map((offset, index) => {
          const current = activePage === index;
          return (
            <button
              key={`${offset}-${index}`}
              type="button"
              aria-label={`Visa bildgrupp ${index + 1}`}
              aria-current={current ? "true" : undefined}
              onClick={() => goToPage(index)}
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
