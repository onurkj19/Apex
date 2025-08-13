import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, MapPin, Users, Clock, Building2, Home, Factory, Church, School, Hospital, Image as ImageIcon, Package } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  location: string;
  completedDate: string;
  client?: string;
  category?: string;
  duration?: string;
  images: string[];
  createdAt: string;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects`);
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        throw new Error('Failed to load projects');
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setError('Fehler beim Laden der Projekte');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const projectCategories = [
    { icon: Building2, label: "Wohnbau", count: "850+" },
    { icon: Factory, label: "Gewerbebau", count: "420+" },
    { icon: Church, label: "Denkmalschutz", count: "180+" },
    { icon: School, label: "Öffentliche Gebäude", count: "290+" },
    { icon: Hospital, label: "Gesundheitswesen", count: "160+" },
    { icon: Home, label: "Privatkunden", count: "600+" }
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
                Unsere Referenzen
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Einblicke in unsere abgeschlossenen Projekte - 
                jedes mit seinen eigenen Herausforderungen und Lösungen.
              </p>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Projekte werden geladen...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Projects Grid */}
            {!isLoading && !error && projects.length > 0 && (
              <div className="grid lg:grid-cols-2 gap-8">
                {projects.map((project) => (
                  <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-muted overflow-hidden">
                      {project.images.length > 0 ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${project.images[0]}`}
                            alt={project.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                          {project.images.length > 1 && (
                            <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                              <ImageIcon className="w-3 h-3 mr-1" />
                              {project.images.length}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="secondary">
                          {project.category || 'Gerüstbau'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(project.completedDate)}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold mb-3">{project.title}</h3>
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed line-clamp-3">
                        {project.description}
                      </p>

                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-2" />
                          {project.location}
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDate(project.completedDate)}
                        </div>
                        {project.duration && (
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="w-4 h-4 mr-2" />
                            {project.duration}
                          </div>
                        )}
                        {project.client && (
                          <div className="flex items-center text-muted-foreground">
                            <Users className="w-4 h-4 mr-2" />
                            {project.client}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          <ImageIcon className="w-4 h-4 inline mr-2" />
                          {project.images.length} Projektbild(er)
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && projects.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine Projekte verfügbar
                </h3>
                <p className="text-muted-foreground">
                  Derzeit sind keine abgeschlossenen Projekte verfügbar.
                </p>
              </div>
            )}
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