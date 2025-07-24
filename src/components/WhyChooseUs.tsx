import { Settings, Shield, Users, Clock, Award, Target } from 'lucide-react';

const WhyChooseUs = () => {
  const benefits = [
    {
      icon: <Settings className="w-8 h-8" />,
      title: "Maßgeschneiderte Lösungen",
      description: "Individuelle Gerüstlösungen für jedes Bauprojekt, angepasst an Ihre spezifischen Anforderungen."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Moderne, robuste Gerüste",
      description: "Hochwertige Materialien und modernste Gerüstsysteme für maximale Sicherheit und Stabilität."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Erfahrenes und engagiertes Team",
      description: "Qualifizierte Fachkräfte mit langjähriger Erfahrung in der Gerüstmontage und -demontage."
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Flexible Konditionen",
      description: "Anpassbare Mietdauer und flexible Zahlungsbedingungen für optimale Projektplanung."
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Fokus auf Qualität",
      description: "Höchste Qualitätsstandards bei allen unseren Dienstleistungen und Produkten."
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "Zuverlässigkeit",
      description: "Pünktliche Lieferung und professionelle Ausführung für den Erfolg Ihrer Projekte."
    }
  ];

  return (
    <section id="about" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Warum <span className="text-gradient">Apex Gerüstbau</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Mit jahrelanger Erfahrung und einem Fokus auf Qualität und Sicherheit sind wir 
            der ideale Partner für Ihre Gerüstbedürfnisse.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="card-elegant p-8 text-center hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-xl mb-6 icon-bounce">
                {benefit.icon}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-primary to-primary-glow rounded-2xl p-8 md:p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">
              Bereit für Ihr nächstes Projekt?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Kontaktieren Sie uns noch heute für eine kostenlose Beratung und ein 
              individuelles Angebot für Ihre Gerüstanforderungen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300">
                Jetzt Beratung anfragen
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors duration-300">
                Unsere Referenzen ansehen
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;