import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, Building2, Home, Factory, Church, School, Hospital } from 'lucide-react';

const Projects = () => {
  const projectCategories = [
    { icon: Building2, label: "Wohnbau", count: "850+" },
    { icon: Factory, label: "Gewerbebau", count: "420+" },
    { icon: Church, label: "Denkmalschutz", count: "180+" },
    { icon: School, label: "Öffentliche Gebäude", count: "290+" },
    { icon: Hospital, label: "Gesundheitswesen", count: "160+" },
    { icon: Home, label: "Privatkunden", count: "600+" }
  ];

  const featuredProjects = [
    {
      title: "Wohnkomplex Musterstraße",
      category: "Wohnbau",
      location: "München",
      duration: "6 Monate",
      year: "2024",
      description: "Komplette Gerüstierung eines 8-stöckigen Wohnkomplexes mit 120 Wohneinheiten. Inklusive Sondergerüst für Balkonarbeiten.",
      image: "https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a",
      highlights: ["8 Stockwerke", "2.400m² Gerüstfläche", "Sondergerüst", "Termingerecht"],
      client: "Bauträger München GmbH"
    },
    {
      title: "Fabrikhalle Industriepark",
      category: "Gewerbebau", 
      location: "Augsburg",
      duration: "4 Monate",
      year: "2024",
      description: "Gerüstierung einer 15.000m² Fabrikhalle mit speziellen Anforderungen für Kranarbeiten und Dachsanierung.",
      image: "https://images.unsplash.com/photo-1581094651181-35ad0a63f3ed",
      highlights: ["15.000m² Fläche", "25m Höhe", "Krankompatibel", "3-Schicht-Betrieb"],
      client: "Industrie AG"
    },
    {
      title: "Rathaus Altstadt",
      category: "Denkmalschutz",
      location: "Regensburg", 
      duration: "8 Monate",
      year: "2023",
      description: "Sensible Gerüstierung eines denkmalgeschützten Rathauses aus dem 14. Jahrhundert mit speziellen Schutzmaßnahmen.",
      image: "https://images.unsplash.com/photo-1494891848038-7f47de8d74ac",
      highlights: ["Denkmalschutz", "14. Jahrhundert", "Spezialgerüst", "Schutzmaßnahmen"],
      client: "Stadt Regensburg"
    },
    {
      title: "Klinikum Neubau",
      category: "Gesundheitswesen",
      location: "Nürnberg",
      duration: "12 Monate", 
      year: "2023",
      description: "Gerüstierung des Neubaus einer Klinik mit besonderen Hygieneanforderungen und laufendem Krankenhausbetrieb.",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
      highlights: ["Hygieneanforderungen", "Laufender Betrieb", "12 Monate", "Komplexe Logistik"],
      client: "Klinikum Nürnberg"
    },
    {
      title: "Gymnasium Sanierung",
      category: "Öffentliche Gebäude",
      location: "Würzburg",
      duration: "5 Monate",
      year: "2023",
      description: "Schulsanierung mit Gerüstierung während der Sommerferien, inklusive Aufzugsgerüst für Materialzufuhr.",
      image: "https://images.unsplash.com/photo-1469474968028-56623f02e429",
      highlights: ["Ferienzeitplan", "Aufzugsgerüst", "Schulsanierung", "Pünktlich fertig"],
      client: "Stadt Würzburg"
    },
    {
      title: "Villa Bergblick",
      category: "Privatkunden",
      location: "Garmisch-Partenkirchen",
      duration: "3 Monate",
      year: "2024",
      description: "Exklusive Sanierung einer Bergvilla mit anspruchsvollem Gelände und besonderen architektonischen Herausforderungen.",
      image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
      highlights: ["Hanglage", "Exklusive Villa", "Bergregion", "Sonderanfertigung"],
      client: "Privatkunde"
    }
  ];

  const testimonials = [
    {
      text: "Apex Gerüstbau hat unser Großprojekt termingerecht und in höchster Qualität abgewickelt. Die Kommunikation war hervorragend.",
      author: "Thomas Bauer",
      company: "Bauträger München GmbH",
      project: "Wohnkomplex Musterstraße"
    },
    {
      text: "Trotz schwieriger Gegebenheiten im Denkmalschutz wurde eine perfekte Lösung gefunden. Absolute Empfehlung!",
      author: "Dr. Maria Schneider", 
      company: "Stadt Regensburg",
      project: "Rathaus Altstadt"
    },
    {
      text: "Professionelle Abwicklung mit höchsten Sicherheitsstandards - genau das, was wir im Klinikbereich brauchen.",
      author: "Prof. Dr. Klaus Weber",
      company: "Klinikum Nürnberg", 
      project: "Klinikum Neubau"
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
                Unsere Projekte
              </h1>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                Über 2.500 erfolgreich abgeschlossene Projekte - 
                Referenzen, die für sich sprechen
              </p>
            </div>
          </div>
        </section>

        {/* Project Categories */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Unsere Projektbereiche
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Von Wohnbau bis Denkmalschutz - wir haben Erfahrung in allen Bereichen 
                des Gerüstbaus und kennen die spezifischen Anforderungen.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {projectCategories.map((category, index) => (
                <Card key={index} className="card-elegant text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-primary mb-1">{category.count}</div>
                    <div className="text-sm text-muted-foreground">{category.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Projects */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ausgewählte Referenzen
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Einblicke in unsere aktuellsten und anspruchsvollsten Projekte - 
                jedes mit seinen eigenen Herausforderungen und Lösungen.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {featuredProjects.map((project, index) => (
                <Card key={index} className="card-elegant overflow-hidden">
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img 
                      src={project.image} 
                      alt={project.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary">{project.category}</Badge>
                      <span className="text-sm text-muted-foreground">{project.year}</span>
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-3">{project.title}</h3>
                    <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                      {project.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2" />
                        {project.location}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        {project.duration}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm font-medium mb-2">Projekt-Highlights:</div>
                      <div className="flex flex-wrap gap-1">
                        {project.highlights.map((highlight, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {highlight}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        <Users className="w-4 h-4 inline mr-2" />
                        Auftraggeber: {project.client}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Das sagen unsere Kunden
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Authentische Bewertungen von Auftraggebern aus verschiedenen Projektbereichen - 
                Ihre Zufriedenheit ist unser Erfolg.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="card-elegant">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-6 italic leading-relaxed">
                      "{testimonial.text}"
                    </p>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                      <div className="text-xs text-primary mt-1">Projekt: {testimonial.project}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-primary to-primary-glow rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ihr Projekt wartet!
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Werden Sie Teil unserer Erfolgsgeschichte. Lassen Sie uns gemeinsam 
                Ihr nächstes Gerüstbauprojekt realisieren.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="btn-secondary">
                  <Calendar className="w-5 h-5 mr-2" />
                  Beratungstermin
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                  Referenzen anfordern
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

export default Projects;