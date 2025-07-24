import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Users, Shield, Wrench, Building2, Construction, HardHat } from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: Building2,
      title: "Fassadengerüste",
      description: "Sichere und stabile Gerüstsysteme für alle Arten von Fassadenarbeiten. Individuelle Preisgestaltung nach Absprache.",
      features: ["Bis zu 50m Höhe", "Wetterfest", "Schneller Aufbau", "TÜV-geprüft"]
    },
    {
      icon: Construction,
      title: "Baugerüste",
      description: "Robuste Gerüstlösungen für Neubau und Sanierungsprojekte. Preise auf Anfrage und je nach Projektumfang.",
      features: ["Modulares System", "Hohe Tragkraft", "Flexible Anpassung", "Sicherheitsgeländer"]
    },
    {
      icon: Wrench,
      title: "Arbeitsgerüste",
      description: "Spezialisierte Gerüste für Handwerker und Wartungsarbeiten. Kosten nach Vereinbarung.",
      features: ["Leichter Aufbau", "Kompakt", "Mobil", "Bis 8m Höhe"]
    },
    {
      icon: HardHat,
      title: "Schutzgerüste",
      description: "Sicherheitsgerüste zum Schutz von Personen und Objekten. Individuelle Angebote auf Basis der Anforderungen.",
      features: ["Auffangnetze", "Schutzdächer", "Absperrungen", "Sicherheitszonen"]
    },
    {
      icon: Shield,
      title: "Sondergerüste",
      description: "Individuelle Gerüstlösungen für besondere Anforderungen. Beratung und Preise nach Absprache.",
      features: ["Maßgeschneidert", "Komplexe Formen", "Statik-Berechnung", "Ingenieursplanung"]
    },
    {
      icon: Users,
      title: "Vollservice",
      description: "Komplettservice von Planung bis Demontage inklusive Wartung. Preise gemäß vereinbartem Leistungspaket.",
      features: ["Planung & Statik", "Aufbau & Abbau", "Wartung", "24/7 Service"]
    }
  ];

  const processSteps = [
    {
      step: "01",
      title: "Beratung & Planung",
      description: "Kostenloses Beratungsgespräch vor Ort mit detaillierter Projektplanung und Statikberechnung."
    },
    {
      step: "02", 
      title: "Angebot & Zeitplan",
      description: "Transparentes Angebot mit festen Preisen und realistischem Zeitplan für Ihr Projekt."
    },
    {
      step: "03",
      title: "Aufbau & Übergabe",
      description: "Professioneller Aufbau durch unser erfahrenes Team mit anschließender Sicherheitsübergabe."
    },
    {
      step: "04",
      title: "Service & Abbau",
      description: "Regelmäßige Wartung während der Nutzung und fachgerechter Abbau nach Projektende."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="pt-20 pb-16 bg-gradient-to-br from-primary via-primary-glow to-secondary">
          <div className="container mx-auto px-4">
            <div className="text-center text-white max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Unsere Leistungen
              </h1>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                Professionelle Gerüstlösungen für jeden Bedarf - 
                von der Planung bis zur Demontage
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  TÜV-zertifiziert
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  24/7 Notdienst
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Shield className="w-4 h-4 mr-2" />
                  Vollversichert
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Unsere Gerüstleistungen
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Wir bieten Ihnen maßgeschneiderte Gerüstlösungen für jeden Bedarf - 
                professionell, sicher und termingerecht.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <Card key={index} className="card-elegant h-full">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <service.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                    <CardDescription className="text-base">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-2 mb-6 flex-1">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-end pt-4 border-t">
                      <Button variant="outline" size="sm">
                        Anfragen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Unser Ablauf
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Von der ersten Beratung bis zur Demontage - 
                so läuft Ihr Projekt mit uns ab.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {processSteps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full font-bold text-xl flex items-center justify-center mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-primary to-primary-glow rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Bereit für Ihr Projekt?
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Kontaktieren Sie uns für ein kostenloses Beratungsgespräch 
                und ein unverbindliches Angebot.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="btn-secondary">
                  <Clock className="w-5 h-5 mr-2" />
                  Kostenlose Beratung
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                  Angebot anfordern
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default Services;
