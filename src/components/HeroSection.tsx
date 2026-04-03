import { useEffect, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { APEX1_HERO_SLIDES } from '@/lib/apex1-media';
import { COMPANY_ADDRESS_LINE, COMPANY_LEGAL_NAME } from '@/lib/company';

const SLIDE_MS = 5000;

const HeroSection = () => {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % APEX1_HERO_SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      id="home"
      className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 min-w-0 overflow-x-clip overflow-hidden pt-20"
    >
      <div className="relative w-full bg-zinc-950">
        {APEX1_HERO_SLIDES.map((item, i) => (
          <img
            key={item.src}
            src={item.src}
            alt={item.alt}
            sizes="100vw"
            className={`w-full max-w-full h-auto align-middle transition-opacity duration-700 ease-in-out ${
              i === slide ? 'relative z-0 block opacity-100' : 'hidden'
            }`}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={i === 0 ? 'high' : 'auto'}
          />
        ))}

        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/75 via-black/45 to-black/55"
          aria-hidden
        />

        {/* Teksti / logo / butonat: nga lartë, jo në mes të lartësisë */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-start px-3 pt-3 pb-10 sm:px-5 sm:pt-5 sm:pb-14 md:px-8 md:pt-6 md:pb-16">
          <div className="w-full max-w-4xl mx-auto text-center">
            <h1 className="text-3xl min-[400px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-3 sm:mb-5 fade-in-up animate drop-shadow-md">
              Willkommen bei <br />
              <img
                src="/Transperent.png"
                alt="Apex Gerüste Logo"
                className="mx-auto max-h-12 sm:max-h-20 md:max-h-24 object-contain mt-1"
              />
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-white/90 mt-2 fade-in-up animate drop-shadow max-w-2xl mx-auto leading-snug">
              {COMPANY_LEGAL_NAME} · {COMPANY_ADDRESS_LINE}
            </p>

            <p
              className="text-sm sm:text-base md:text-lg text-gray-100 mb-5 sm:mb-6 max-w-2xl md:max-w-3xl mx-auto fade-in-up animate drop-shadow leading-relaxed mt-3 sm:mt-4"
              style={{ animationDelay: '0.2s' }}
            >
              Apex Gerüste ist Ihr zuverlässiger Partner für Gerüstverleih und professionelle
              Montage- und Demontagedienstleistungen. Mit einem engagierten Team und hochwertigen
              Materialien stellen wir sicher, dass Ihre Bauprojekte effizient und sicher
              durchgeführt werden.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center fade-in-up animate max-w-md sm:max-w-none mx-auto"
              style={{ animationDelay: '0.4s' }}
            >
              <Button
                className="btn-hero group w-full sm:w-auto px-5 sm:px-8 py-3 text-sm sm:text-base md:text-lg"
                onClick={() => (window.location.href = 'mailto:info@apex-gerüste.ch')}
              >
                Kostenlose Beratung
                <ArrowRight
                  size={20}
                  className="ml-2 group-hover:translate-x-1 transition-transform shrink-0"
                />
              </Button>
              <Button
                variant="outline"
                className="btn-secondary group w-full sm:w-auto px-5 sm:px-8 py-3 text-sm sm:text-base md:text-lg border-white/30 text-white hover:bg-white hover:text-secondary-dark"
                onClick={() => navigate('/projects')}
              >
                <Play size={20} className="mr-2 shrink-0" />
                Unsere Projekte
              </Button>
            </div>

            <div
              className="grid grid-cols-3 gap-2 sm:gap-6 mt-6 sm:mt-8 fade-in-up animate"
              style={{ animationDelay: '0.6s' }}
            >
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0.5 sm:mb-1 drop-shadow">
                  150+
                </div>
                <div className="text-gray-200 text-xs sm:text-sm">Abgeschlossene Projekte</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0.5 sm:mb-1 drop-shadow">
                  5+
                </div>
                <div className="text-gray-200 text-xs sm:text-sm">Jahre Erfahrung</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0.5 sm:mb-1 drop-shadow">
                  100%
                </div>
                <div className="text-gray-200 text-xs sm:text-sm">Kundenzufriedenheit</div>
              </div>
            </div>

            <div
              className="flex justify-center gap-2 mt-6 sm:mt-8"
              role="tablist"
              aria-label="Hero slides"
            >
              {APEX1_HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === slide}
                  aria-label={`Foto ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === slide ? 'w-8 bg-primary' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  onClick={() => setSlide(i)}
                />
              ))}
            </div>

            <div className="flex justify-center mt-6 sm:mt-8 animate-bounce">
              <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
