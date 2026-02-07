import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Leistungen', href: '/services' },
    { label: 'Über uns', href: '/about' },
    { label: 'Projekte', href: '/projects' },
    { label: 'Produkte', href: '/products' },
    { label: 'Kontakt', href: '/contact' }
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'header-glass scrolled' : 'header-glass'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16 md:h-20">
          <Link to="/" className="flex items-center">
            <img
              src="/Transperent.png"
              alt="Apex Gerüstbau Logo"
              className="h-12 md:h-16 w-auto object-contain"
              loading="lazy"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center ml-4 sm:ml-6 md:ml-8 lg:ml-10 xl:ml-12 space-x-6 lg:space-x-8 xl:space-x-10">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="text-foreground hover:text-primary transition-colors duration-300 font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Contact Button replaced with mailto */}
          <div className="hidden md:block ml-auto md:pl-6 lg:pl-8 xl:pl-10">
            <a
              href="mailto:info@apex-gerüste.ch"
              className="btn-hero inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Kostenlose Beratung
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden ml-auto text-foreground hover:text-primary transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menü umschalten"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-lg border-t border-border/50 py-4">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-foreground hover:text-primary transition-colors duration-300 font-medium px-4 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="px-4 pt-2">
                <a
                  href="mailto:info@apex-gerüste.ch"
                  className="btn-hero w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Kostenlose Beratung
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
