import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import heroImage from '@/assets/hero-construction.jpg';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Apex Gerüstbau - Professionelle Gerüstlösungen"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 fade-in-up animate">
            Willkommen bei <br />
            <img
              src="/Transperent.png"
              alt="Apex Gerüstbau Logo"
              className="mx-auto max-h-16 sm:max-h-24 object-contain"
            />
          </h1>

          {/* Subtitle */}
          <p
            className="text-base sm:text-lg md:text-xl text-gray-200 mb-8 max-w-3xl mx-auto fade-in-up animate"
            style={{ animationDelay: '0.2s' }}
          >
            Apex Gerüstbau ist Ihr zuverlässiger Partner für Gerüstverleih und professionelle
            Montage- und Demontagedienstleistungen. Mit einem engagierten Team und hochwertigen
            Materialien stellen wir sicher, dass Ihre Bauprojekte effizient und sicher
            durchgeführt werden.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center fade-in-up animate"
            style={{ animationDelay: '0.4s' }}
          >
            <Button
              className="btn-hero group px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg"
              onClick={() => (window.location.href = 'mailto:info@apex-gerüst\u0308e.ch')}
            >
              Kostenlose Beratung
              <ArrowRight
                size={20}
                className="ml-2 group-hover:translate-x-1 transition-transform"
              />
            </Button>
            <Button
              variant="outline"
              className="btn-secondary group px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg border-white/30 text-white hover:bg-white hover:text-secondary-dark"
              onClick={() => navigate('/projects')}
            >
              <Play size={20} className="mr-2" />
              Unsere Projekte
            </Button>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12 sm:mt-16 fade-in-up animate"
            style={{ animationDelay: '0.6s' }}
          >
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">500+</div>
              <div className="text-gray-300 text-sm sm:text-base">Abgeschlossene Projekte</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">15+</div>
              <div className="text-gray-300 text-sm sm:text-base">Jahre Erfahrung</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">100%</div>
              <div className="text-gray-300 text-sm sm:text-base">Kundenzufriedenheit</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
