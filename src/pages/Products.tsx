import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Shield, Truck, Wrench, Package, Settings, Zap, Award } from 'lucide-react';

const Products = () => {
  const productCategories = [
    {
      id: "scaffolding",
      title: "Gerüstsysteme",
      description: "Hochwertige Gerüstkomponenten für jeden Einsatzbereich"
    },
    {
      id: "accessories", 
      title: "Zubehör & Sicherheit",
      description: "Sicherheitsausrüstung und praktisches Zubehör"
    },
    {
      id: "special",
      title: "Spezialprodukte",
      description: "Maßgeschneiderte Lösungen für besondere Anforderungen"
    }
  ];

  const scaffoldingSystems = [
    {
      name: "Rahmengerüst Standard",
      type: "Modulares System",
      description: "Bewährtes Rahmengerüst für Standardanwendungen bis 50m Höhe. Schneller Aufbau durch vorgefertigte Rahmenelemente.",
      features: ["Bis 50m Höhe", "Schneller Aufbau", "Hohe Tragkraft", "Wetterfest"],
      specs: {
        "Rahmenbreite": "0,73m / 1,09m / 2,07m",
        "Rahmenhöhe": "2,00m",
        "Tragkraft": "300 kg/m²",
        "Material": "Verzinkter Stahl"
      },
      price: "Preis auf Anfrage",
      availability: "Sofort verfügbar"
    },
    {
      name: "Multidirektionales System", 
      type: "Allround-System",
      description: "Flexibles Knotenpunktsystem für komplexe Geometrien und Sonderformen. Ideal für Rundbauten und unregelmäßige Fassaden.",
      features: ["Jede Geometrie", "360° Anschlüsse", "Maximale Flexibilität", "Geprüfte Statik"],
      specs: {
        "Standardabstand": "0,50m / 1,00m / 1,50m",
        "Höhe variabel": "Beliebig erweiterbar",
        "Tragkraft": "500 kg/m²", 
        "Material": "Hochfester Stahl"
      },
      price: "Preis auf Anfrage",
      availability: "2-3 Tage Lieferzeit"
    },
    {
      name: "Fassadengerüst Premium",
      type: "Hochleistungssystem", 
      description: "Premium-Gerüstsystem für höchste Ansprüche. Optimiert für große Fassadenflächen und Langzeiteinsätze.",
      features: ["Premium-Qualität", "Langzeiteinsatz", "Minimaler Wartung", "Beste Optik"],
      specs: {
        "Systembreite": "0,73m / 1,33m",
        "Maximalhöhe": "200m+",
        "Tragkraft": "600 kg/m²",
        "Oberflächenschutz": "Duplex-Beschichtung"
      },
      price: "Preis auf Anfrage", 
      availability: "1 Woche Lieferzeit"
    },
    {
      name: "Arbeitsgerüst Kompakt",
      type: "Mobile Lösung",
      description: "Leichtes, mobiles Gerüstsystem für kleinere Arbeiten und häufige Umsetzung. Ideal für Handwerker.",
      features: ["Mobil & leicht", "Schneller Aufbau", "Kompakte Lagerung", "Preiswert"],
      specs: {
        "Maximalhöhe": "12m",
        "Gewicht": "25kg/Element",
        "Aufbauzeit": "15 Min/Ebene",
        "Transport": "PKW-Anhänger"
      },
      price: "Preis auf Anfrage",
      availability: "Sofort verfügbar"
    }
  ];

  const accessories = [
    {
      name: "Sicherheitsgeländer",
      category: "Sicherheit",
      description: "TÜV-geprüfte Geländersysteme für maximale Arbeitssicherheit",
      price: "Preis auf Anfrage"
    },
    {
      name: "Schutznetze & Planen",
      category: "Wetterschutz", 
      description: "Wind- und Sichtschutz sowie Auffangnetze in verschiedenen Ausführungen",
      price: "Preis auf Anfrage"
    },
    {
      name: "Gerüstbeläge",
      category: "Arbeitsebenen",
      description: "Rutschfeste Arbeitsbeläge aus Holz, Stahl oder Aluminium",
      price: "Preis auf Anfrage"
    },
    {
      name: "Konsolen & Ausleger",
      category: "Erweiterungen",
      description: "Spezielle Konsolen für Balkone, Erker und andere Vorsprünge",
      price: "Preis auf Anfrage"
    },
    {
      name: "Treppentürme",
      category: "Aufgänge",
      description: "Sichere Aufgangssysteme und Treppentürme für alle Gerüsthöhen",
      price: "Preis auf Anfrage"
    },
    {
      name: "Hubarbeitsbühnen-Adapter",
      category: "Spezialzubehör",
      description: "Adapter zur Kombination von Gerüst und Hubarbeitsbühnen",
      price: "Preis auf Anfrage"
    }
  ];

  const specialProducts = [
    {
      name: "Hängegerüste",
      description: "Spezielle Gerüstlösungen für Arbeiten an Brücken, Überhängen und schwer zugänglichen Bereichen",
      applications: ["Brückenbau", "Tunnel", "Industrieanlagen"],
      price: "Preis auf Anfrage"
    },
    {
      name: "Schutzgerüste",
      description: "Temporäre Schutzbauten für Veranstaltungen, Baustellen und Gefahrenbereiche",
      applications: ["Events", "Baustellen", "Denkmalschutz"], 
      price: "Preis auf Anfrage"
    },
    {
      name: "Lehrgerüste",
      description: "Tragende Hilfskonstruktionen für Brücken-, Tunnel- und Betonbau",
      applications: ["Brückenbau", "Tunnelbau", "Betonarbeiten"],
      price: "Preis auf Anfrage"
    },
    {
      name: "Wetterschutzeinhausungen",
      description: "Komplette Einhausungen für witterungsunabhängiges Arbeiten",
      applications: ["Denkmalschutz", "Winterbau", "Spezialarbeiten"],
      price: "Preis auf Anfrage"
    }
  ];

  const services = [
    {
      icon: Truck,
      title: "Lieferung & Logistik",
      description: "Termingerechte Anlieferung direkt zur Baustelle mit eigenem Fuhrpark"
    },
    {
      icon: Settings,
      title: "Montage & Demontage", 
      description: "Professioneller Auf- und Abbau durch zertifizierte Fachkräfte"
    },
    {
      icon: Wrench,
      title: "Wartung & Service",
      description: "Regelmäßige Inspektion und Wartung für maximale Sicherheit"
    },
    {
      icon: Zap,
      title: "24/7 Notdienst",
      description: "Schnelle Hilfe bei Problemen oder unvorhergesehenen Änderungen"
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
                Unsere Produkte
              </h1>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                Hochwertige Gerüstsysteme und Zubehör für professionelle Bauprojekte - 
                von Standard bis Sonderanfertigung
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Award className="w-4 h-4 mr-2" />
                  TÜV-zertifiziert
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Package className="w-4 h-4 mr-2" />
                  Sofort lieferbar
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Shield className="w-4 h-4 mr-2" />
                  10 Jahre Garantie
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Product Categories Tabs */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Unser Produktsortiment
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Von bewährten Standardsystemen bis zu maßgeschneiderten Speziallösungen - 
                wir haben das richtige Gerüst für jeden Einsatz.
              </p>
            </div>

            <Tabs defaultValue="scaffolding" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-12">
                {productCategories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id} className="text-center p-4">
                    <div>
                      <div className="font-semibold">{category.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{category.description}</div>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="scaffolding">
                <div className="grid lg:grid-cols-2 gap-8">
                  {scaffoldingSystems.map((system, index) => (
                    <Card key={index} className="card-elegant">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary">{system.type}</Badge>
                          <span className="text-lg font-bold text-primary">{system.price}</span>
                        </div>
                        <CardTitle className="text-xl">{system.name}</CardTitle>
                        <CardDescription className="text-base">
                          {system.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Eigenschaften:</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {system.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center text-sm">
                                  <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Technische Daten:</h4>
                            <div className="space-y-1">
                              {Object.entries(system.specs).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{key}:</span>
                                  <span className="font-medium">{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t">
                            <span className="text-sm text-muted-foreground">
                              📦 {system.availability}
                            </span>
                            <Button>Anfrage senden</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="accessories">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accessories.map((accessory, index) => (
                    <Card key={index} className="card-elegant">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <Badge variant="outline">{accessory.category}</Badge>
                          <span className="font-bold text-primary">{accessory.price}</span>
                        </div>
                        <h3 className="text-lg font-semibold mb-3">{accessory.name}</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          {accessory.description}
                        </p>
                        <Button variant="outline" className="w-full">
                          Details anzeigen
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="special">
                <div className="grid md:grid-cols-2 gap-8">
                  {specialProducts.map((product, index) => (
                    <Card key={index} className="card-elegant">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold mb-3">{product.name}</h3>
                        <p className="text-muted-foreground mb-4">
                          {product.description}
                        </p>
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Anwendungsbereiche:</h4>
                          <div className="flex flex-wrap gap-2">
                            {product.applications.map((app, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {app}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t">
                          <span className="font-bold text-primary">{product.price}</span>
                          <Button>Beratung anfordern</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Unsere Services
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Mehr als nur Produkte - wir bieten Ihnen den kompletten Service 
                rund um Ihr Gerüstprojekt.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {services.map((service, index) => (
                <Card key={index} className="card-elegant text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <service.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-3">{service.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Quality & Certification */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Qualität & Sicherheit
                </h2>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">TÜV-Zertifizierung</h3>
                      <p className="text-muted-foreground">
                        Alle unsere Gerüstsysteme sind TÜV-geprüft und entsprechen den neuesten 
                        Sicherheitsstandards nach DIN EN 12811.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">10 Jahre Garantie</h3>
                      <p className="text-muted-foreground">
                        Wir stehen für Qualität - deshalb gewähren wir auf alle unsere 
                        Gerüstsysteme eine 10-jährige Herstellergarantie.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">Regelmäßige Prüfung</h3>
                      <p className="text-muted-foreground">
                        Unser gesamtes Gerüstmaterial wird regelmäßig geprüft und gewartet, 
                        um höchste Sicherheitsstandards zu gewährleisten.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-primary/5 to-primary-glow/10 rounded-2xl p-8 text-center">
                  <Award className="w-16 h-16 text-primary mx-auto mb-6" />
                  <h3 className="text-2xl font-bold mb-4">Zertifizierte Qualität</h3>
                  <p className="text-muted-foreground mb-6">
                    Unsere Produkte erfüllen höchste Standards und sind von 
                    unabhängigen Prüfstellen zertifiziert.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>✓ DIN EN 12811</div>
                    <div>✓ TÜV-Zertifikat</div>
                    <div>✓ BGV C22</div>
                    <div>✓ ISO 9001</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-primary to-primary-glow rounded-2xl p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Benötigen Sie eine Beratung?
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Unsere Experten helfen Ihnen bei der Auswahl des optimalen 
                Gerüstsystems für Ihr Projekt. Kostenlos und unverbindlich.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="btn-secondary">
                  <Package className="w-5 h-5 mr-2" />
                  Produktkatalog anfordern
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                  Persönliche Beratung
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

export default Products;
