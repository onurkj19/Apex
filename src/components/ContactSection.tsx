import { Phone, Mail, MapPin, Clock, Shield, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ContactSection = () => {
  const contacts = [
    {
      name: "Onur Kajmakci",
      phone: "+41 76 368 10 11",
      email: "info@apex-gerüste.ch",
      role: "Geschäftsführer"
    },
    {
      name: "Arlind Morina",
      phone: "+41 79 422 39 90",
      email: "info@apex-gerüste.ch",
      role: "Projektleiter"
    },
    {
      name: "Flamur Shala",
      phone: "+41 79 830 57 80",
      email: "info@apex-gerüste.ch",
      role: "Technischer Leiter"
    }
  ];

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Kontaktieren Sie <span className="text-gradient">uns</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Haben Sie Fragen zu unseren Dienstleistungen oder benötigen Sie ein Angebot? 
            Unser Team steht Ihnen gerne zur Verfügung.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Team Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                Unser Team
              </h3>
              <div className="space-y-6">
                {contacts.map((contact, index) => (
                  <Card key={index} className="p-6 hover-lift card-elegant">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-semibold text-foreground">
                        {contact.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {contact.role}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <Phone size={16} className="text-primary" />
                        <a 
                          href={`tel:${contact.phone}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {contact.phone}
                        </a>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail size={16} className="text-primary" />
                        <a 
                          href={`mailto:${contact.email}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {contact.email}
                        </a>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Company Info */}
            <Card className="p-6 card-elegant">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                Unternehmensinformationen
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <MapPin size={16} className="text-primary" />
                  <span className="text-muted-foreground">Schweiz</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail size={16} className="text-primary" />
                  <span className="text-muted-foreground">info@apex-gerüste.ch</span>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-border">
                <h5 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Geschäftszeiten
                </h5>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Montag - Freitag: 07:00 - 18:00</div>
                  <div>Samstag: 08:00 - 16:00</div>
                  <div>Sonntag: Nach Vereinbarung</div>
                </div>
              </div>
            </Card>

            {/* Response Time */}
            <Card className="p-6 card-elegant">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <h5 className="font-semibold text-foreground">Schnelle Antwort</h5>
              </div>
              <p className="text-sm text-muted-foreground">
                Wir antworten normalerweise innerhalb von 2 Stunden während der Geschäftszeiten.
              </p>
            </Card>

            {/* Emergency Contact */}
            <Card className="p-6 card-elegant border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <h5 className="font-semibold text-foreground">24/7 Notdienst</h5>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Für dringende Anfragen außerhalb der Geschäftszeiten.
              </p>
              <div className="flex items-center space-x-3">
                <Phone size={16} className="text-primary" />
                <span className="text-foreground font-semibold">+41 76 368 10 11</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;