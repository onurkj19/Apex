import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary-dark text-secondary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary-glow rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <h3 className="text-xl font-bold text-primary-foreground">Apex Gerüstbau</h3>
            </div>
            <p className="text-muted-foreground">
              Ihr zuverlässiger Partner für Gerüstverleih und professionelle 
              Montage- und Demontagedienstleistungen in der Schweiz.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors icon-bounce">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors icon-bounce">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors icon-bounce">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-primary-foreground">Dienstleistungen</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Gerüstverleih</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Montage & Demontage</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Wohnbau</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Gewerbe</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Industrie</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-primary-foreground">Kontakt</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone size={16} className="text-primary" />
                <span className="text-muted-foreground">+41 76 368 10 11</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail size={16} className="text-primary" />
                <span className="text-muted-foreground">info@apex-gerüste.ch</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin size={16} className="text-primary" />
                <span className="text-muted-foreground">Schweiz</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-primary-foreground">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#about" className="text-muted-foreground hover:text-primary transition-colors">Über uns</a></li>
              <li><a href="#projects" className="text-muted-foreground hover:text-primary transition-colors">Projekte</a></li>
              <li><a href="#shop" className="text-muted-foreground hover:text-primary transition-colors">Produkte</a></li>
              <li><a href="#career" className="text-muted-foreground hover:text-primary transition-colors">Karriere</a></li>
              <li><a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">Kontakt</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              © 2024 Apex Gerüstbau. Alle Rechte vorbehalten.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                Datenschutz
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">
                Impressum
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">
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