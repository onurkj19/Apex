import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';
import { COMPANY_ADDRESS_LINE, COMPANY_LEGAL_NAME } from '@/lib/company';

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
                alt="Apex Gerüste Logo"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-white font-medium">{COMPANY_LEGAL_NAME}</p>
            <p className="text-white text-sm leading-relaxed">
              {COMPANY_ADDRESS_LINE}
            </p>
            <p className="text-white">
              Ihr zuverlässiger Partner für Gerüstverleih und professionelle
              Montage- und Demontagedienstleistungen in der Schweiz.
            </p>
            <div className="flex space-x-4">



            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Dienstleistungen</h4>
            <ul className="space-y-2">
              <li><Link to="/services" className="text-white hover:text-primary transition-colors">Gerüstverleih</Link></li>
              <li><Link to="/services" className="text-white hover:text-primary transition-colors">Montage & Demontage</Link></li>
              <li><Link to="/services" className="text-white hover:text-primary transition-colors">Wohnbau</Link></li>
              <li><Link to="/services" className="text-white hover:text-primary transition-colors">Gewerbe</Link></li>
              <li><Link to="/services" className="text-white hover:text-primary transition-colors">Industrie</Link></li>
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
                <span className="text-white">info@apex-gerueste.ch</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                <span className="text-white leading-snug">{COMPANY_ADDRESS_LINE}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-white hover:text-primary transition-colors">Über uns</Link></li>
              <li><Link to="/projects" className="text-white hover:text-primary transition-colors">Projekte</Link></li>
              <li><Link to="/products" className="text-white hover:text-primary transition-colors">Produkte</Link></li>

              <li><Link to="/contact" className="text-white hover:text-primary transition-colors">Kontakt</Link></li>
            </ul>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
