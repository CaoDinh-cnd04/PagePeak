import { useState, useEffect, useCallback } from "react";
import type { LoginFeatureSlide } from "@/data/loginFeatureSlides";

const ICONS: Record<NonNullable<LoginFeatureSlide["icon"]>, React.ReactNode> = {
  drag: (
    <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16M8 4v16M16 4v16" />
    </svg>
  ),
  template: (
    <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  publish: (
    <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  lead: (
    <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  analytics: (
    <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  seo: (
    <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
  ),
};

const AUTO_PLAY_MS = 5000;

type Props = {
  slides: LoginFeatureSlide[];
};

export function LoginFeatureCarousel({ slides }: Props) {
  const [index, setIndex] = useState(0);
  const [, setDirection] = useState<"next" | "prev">("next");

  const goTo = useCallback((nextIndex: number) => {
    setIndex((i) => {
      setDirection(nextIndex > i ? "next" : "prev");
      return nextIndex;
    });
  }, []);

  const next = useCallback(() => {
    setDirection("next");
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(next, AUTO_PLAY_MS);
    return () => clearInterval(t);
  }, [slides.length, next]);

  if (slides.length === 0) return null;

  const slidePercent = slides.length > 0 ? 100 / slides.length : 100;

  return (
    <div className="flex flex-col h-full min-h-[280px] lg:min-h-0">
      <div className="flex-1 overflow-hidden relative">
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(-${index * slidePercent}%)`,
          }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="flex-shrink-0 flex flex-col items-center justify-center px-6 py-8 lg:px-10 lg:py-12 text-center"
              style={{ width: `${slidePercent}%` }}
            >
              <div className="mb-4 flex justify-center">
                {slide.icon && ICONS[slide.icon]}
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-2">
                {slide.title}
              </h2>
              <p className="text-slate-600 text-sm lg:text-base max-w-md leading-relaxed">
                {slide.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-4 pb-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? "h-1.5 w-4 bg-primary-500"
                  : "h-1.5 w-1.5 bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
