import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { COMPANY_ADDRESS_LINE } from '@/lib/company';
import { APEX1_MEDIA } from '@/lib/apex1-media';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Users, Calendar, MapPin, Phone, Mail, CheckCircle, Target, Eye, Heart } from 'lucide-react';

const About = () => {
  const stats = [
    { icon: Calendar, label: "Jahre Erfahrung", value: "8+" },
    { icon: Users, label: "Abgeschlossene Projekte", value: "750+" },
    { icon: Award, label: "Zertifizierungen", value: "4" },
    { icon: MapPin, label: "Einsatzgebiete", value: "15km" }
  ];

  const values = [
    {
      icon: CheckCircle,
      title: "Sicherheit First",
      description: "Höchste Sicherheitsstandards und regelmäßige Schulungen unserer Mitarbeiter stehen bei uns an erster Stelle."
    },
    {
      icon: Target,
      title: "Präzision",
      description: "Millimetergenaue Planung und exakte Ausführung für optimale Ergebnisse bei jedem Projekt."
    },
    {
      icon: Eye,
      title: "Transparenz",
      description: "Offene Kommunikation, faire Preise und transparente Abläufe schaffen Vertrauen zu unseren Kunden."
    },
    {
      icon: Heart,
      title: "Leidenschaft",
      description: "Mit Herzblut und Engagement setzen wir uns für den Erfolg Ihrer Projekte ein."
    }
  ];

const team = [
  {
    name: "Onur Kajmakci",
    position: "Geschäftsführer & Gerüstbaumeister",
    experience: "5 Jahre Erfahrung",
    phone: "+41 76 368 10 11",
    email: "info@apex-gerüste.ch",
    specialties: ["Projektleitung", "Statikberechnung", "Sondergerüste"]
  },
  {
    name: "Arlind Morina",
    position: "Technischer Leiter",
    experience: "8 Jahre Erfahrung",
    phone: "+41 79 422 39 90",
    email: "info@apex-gerüste.ch",
    specialties: ["Baustellenplanung", "Sicherheitstechnik", "Teamführung"]
  },
  {
    name: "Flamur Shala",
    position: "Projektmanager",
    experience: "15 Jahre Erfahrung",
    phone: "+41 79 830 57 80",
    email: "info@apex-gerüste.ch",
    specialties: ["Kundenbetreuung", "Terminplanung", "Qualitätskontrolle"]
  }
];


  const certifications = [
    "EN 12811 – europäische Gerüstnorm (in der CH üblich)",
    "Arbeitssicherheit nach SUVA-Leitfäden",
    "Einhaltung einschlägiger Schweizer Vorschriften",
    "ISO 9001:2015 – Qualitätsmanagement",
  ];

  return (
    <div className="min-h-screen w-full min-w-0 bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="page-hero">
          <div className="page-hero__bg" aria-hidden />
          <div className="page-hero__scrim" aria-hidden />
          <div className="page-hero__inner container mx-auto px-4">
            <div className="text-center text-white max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-md [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
                Über Apex Gerüste
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-white/95 drop-shadow [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
                Seit über 8 Jahren Ihr zuverlässiger Partner für
                professionelle Gerüstlösungen in der Region
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Company Story */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Unsere Geschichte
                </h2>
                <div className="space-y-6 text-muted-foreground">
                  <p>
                    Die Apex Gerüste GmbH ist ein modernes Gerüsteunternehmen mit Sitz in Spreitenbach (
                    {COMPANY_ADDRESS_LINE}), das sich durch Qualität, Verlässlichkeit und Fachwissen auszeichnet.
                  </p>
                  <p>
                    Unser engagiertes Team besteht aus erfahrenen Fachleuten, die sich auf Fassadengerüste,
                    Dachgerüste und Spezialkonstruktionen spezialisiert haben. Wir bieten maßgeschneiderte
                    Lösungen für private, gewerbliche und industrielle Projekte.
                  </p>
                  <p>
                    Dank unserer hohen Standards, unserem modernen Equipment und einer transparenten
                    Kommunikation konnten wir bereits zahlreiche Projekte erfolgreich realisieren und
                    langfristige Partnerschaften mit unseren Kunden aufbauen.
                  </p>
                </div>
              </div>
              <div className="relative">
                <img 
                  src={APEX1_MEDIA.about} 
                  alt="Apex Gerüste – Team und Baustelle" 
                  className="rounded-xl shadow-elegant w-full object-cover aspect-[4/3]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Unsere Werte
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Diese Grundwerte prägen unsere tägliche Arbeit und unser Miteinander - 
                sowohl im Team als auch mit unseren Kunden.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="card-elegant text-center h-full">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-3">{value.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Unser Führungsteam
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Erfahrene Profis mit jahrzehntelanger Expertise bei Gerüsten - 
                Ihre Ansprechpartner für alle Fragen rund um Ihr Projekt.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <Card key={index} className="card-elegant">
                  <CardContent className="p-6 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-glow rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                    <Badge variant="secondary" className="mb-4">{member.experience}</Badge>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-center text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2" />
                        {member.phone}
                      </div>
                      <div className="flex items-center justify-center text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 mr-2" />
                        {member.email}
                      </div>
                    </div>

                    
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Zertifizierungen & Standards
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Orientierung an europäischen Normen und schweizerischen Vorgaben zu Sicherheit und Qualität
                – transparent dokumentiert.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {certifications.map((cert, index) => (
                <div key={index} className="text-center">
                  <div className="w-full aspect-square bg-muted/50 rounded-lg flex items-center justify-center mb-2 hover:bg-primary/10 transition-colors">
                    <Award className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">{cert}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-primary to-primary-glow rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Lernen Sie uns kennen!
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Vereinbaren Sie einen unverbindlichen Termin vor Ort und 
                überzeugen Sie sich selbst von unserer Expertise.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="btn-secondary">
                  <Phone className="w-5 h-5 mr-2" />
                  Termin vereinbaren
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                  Kontakt aufnehmen
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

export default About;