import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary-dark text-secondary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img
                src="/Transperent.png"
                alt="Apex Gerüstbau Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-white">
              Ihr zuverlässiger Partner für Gerüstverleih und professionelle 
              Montage- und Demontagedienstleistungen in der Schweiz.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white hover:text-primary transition-colors icon-bounce">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-white hover:text-primary transition-colors icon-bounce">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-white hover:text-primary transition-colors icon-bounce">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Dienstleistungen</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white hover:text-primary transition-colors">Gerüstverleih</a></li>
              <li><a href="#" className="text-white hover:text-primary transition-colors">Montage & Demontage</a></li>
              <li><a href="#" className="text-white hover:text-primary transition-colors">Wohnbau</a></li>
              <li><a href="#" className="text-white hover:text-primary transition-colors">Gewerbe</a></li>
              <li><a href="#" className="text-white hover:text-primary transition-colors">Industrie</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Kontakt</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone size={16} className="text-primary" />
                <span className="text-white">+41 76 368 10 11</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail size={16} className="text-primary" />
                <span className="text-white">info@apex-gerüste.ch</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin size={16} className="text-primary" />
                <span className="text-white">Schweiz</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#about" className="text-white hover:text-primary transition-colors">Über uns</a></li>
              <li><a href="#projects" className="text-white hover:text-primary transition-colors">Projekte</a></li>
              <li><a href="#shop" className="text-white hover:text-primary transition-colors">Produkte</a></li>
              <li><a href="#career" className="text-white hover:text-primary transition-colors">Karriere</a></li>
              <li><a href="#contact" className="text-white hover:text-primary transition-colors">Kontakt</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-white text-sm">
              © 2024 Apex Gerüstbau. Alle Rechte vorbehalten.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-white hover:text-primary text-sm transition-colors">
                Datenschutz
              </a>
              <a href="#" className="text-white hover:text-primary text-sm transition-colors">
                Impressum
              </a>
              <a href="#" className="text-white hover:text-primary text-sm transition-colors">
                AGB
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;