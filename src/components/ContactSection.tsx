import { useState } from 'react';
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const ContactSection = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create mailto link
    const mailtoLink = `mailto:info@apex-gerüste.ch?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nNachricht:\n${formData.message}`)}`;
    
    window.location.href = mailtoLink;
    
    toast({
      title: "Nachricht gesendet",
      description: "Vielen Dank für Ihre Nachricht. Wir melden uns zeitnah bei Ihnen.",
    });
    
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const contacts = [
    {
      name: "Onur Kajmakci",
      phone: "+41 76 368 10 11",
      email: "info@apex-gerüste.ch"
    },
    {
      name: "Arlind Morina",
      phone: "+41 79 422 39 90",
      email: "info@apex-gerüste.ch"
    },
    {
      name: "Flamur Shala",
      phone: "+41 79 830 57 80",
      email: "info@apex-gerüste.ch"
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
          {/* Contact Form */}
          <Card className="p-8">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Schreiben Sie uns
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Name *
                  </label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full"
                    placeholder="Ihr vollständiger Name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    E-Mail *
                  </label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full"
                    placeholder="ihre.email@beispiel.ch"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                  Betreff *
                </label>
                <Input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full"
                  placeholder="Worum geht es?"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Nachricht *
                </label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full resize-none"
                  placeholder="Beschreiben Sie Ihr Projekt oder Ihre Anfrage..."
                />
              </div>
              
              <Button type="submit" className="btn-hero w-full group">
                Nachricht senden
                <Send size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </Card>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Unser Team
              </h3>
              <div className="space-y-6">
                {contacts.map((contact, index) => (
                  <Card key={index} className="p-6 hover-lift">
                    <h4 className="text-lg font-semibold text-foreground mb-3">
                      {contact.name}
                    </h4>
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

            {/* Company Info */}
            <Card className="p-6">
              <h4 className="text-lg font-semibold text-foreground mb-4">
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
                <h5 className="font-semibold text-foreground mb-2">Geschäftszeiten</h5>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Montag - Freitag: 07:00 - 18:00</div>
                  <div>Samstag: 08:00 - 16:00</div>
                  <div>Sonntag: Nach Vereinbarung</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;