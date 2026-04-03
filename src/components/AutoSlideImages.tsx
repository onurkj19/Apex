import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_INTERVAL_MS = 5000;

export type SlideImage = { src: string; alt: string };

type AutoSlideImagesProps = {
  slides: readonly SlideImage[] | SlideImage[];
  /** I njëjtë si hero (5s). */
  intervalMs?: number;
  className?: string;
  /** Klasa për kornizën e imazhit (aspect ratio, border, etj.) */
  frameClassName?: string;
};

/**
 * Galeri me ndërrim automatik — e njëjta logjikë si slideshow-i i hero-s (interval + pika).
 */
export function AutoSlideImages({
  slides,
  intervalMs = DEFAULT_INTERVAL_MS,
  className,
  frameClassName,
}: AutoSlideImagesProps) {
  const [slide, setSlide] = useState(0);
  const len = slides.length;

  useEffect(() => {
    setSlide(0);
  }, [len]);

  useEffect(() => {
    if (len <= 1) return;
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % len);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [len, intervalMs]);

  if (len === 0) return null;

  return (
    <div className={cn('relative w-full', className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-xl shadow-elegant aspect-[4/3] bg-muted',
          frameClassName,
        )}
      >
        {slides.map((item, i) => (
          <img
            key={`${item.src}-${i}`}
            src={item.src}
            alt={item.alt}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out',
              i === slide ? 'z-[1] opacity-100' : 'z-0 opacity-0',
            )}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={i === 0 ? 'high' : 'auto'}
          />
        ))}
      </div>

      {len > 1 && (
        <div
          className="mt-3 flex justify-center gap-2"
          role="tablist"
          aria-label="Galerie"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === slide}
              aria-label={`Foto ${i + 1}`}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === slide ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70',
              )}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
