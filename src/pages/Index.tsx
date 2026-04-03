import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import HeroSection from '@/components/HeroSection';
import WhyChooseUs from '@/components/WhyChooseUs';
import ContactSection from '@/components/ContactSection';
import { websiteContentApi } from '@/lib/erp-api';
import type { WebsiteHomeHeroRow } from '@/lib/erp/website-content';
import { DEFAULT_DOCUMENT_TITLE } from '@/lib/site-meta';

const Index = () => {
  const [homeHero, setHomeHero] = useState<WebsiteHomeHeroRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    websiteContentApi
      .getHomeHero()
      .then((row) => {
        if (!cancelled) setHomeHero(row);
      })
      .catch(() => {
        if (!cancelled) setHomeHero(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = homeHero?.title?.trim();
    document.title = t || DEFAULT_DOCUMENT_TITLE;
    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [homeHero]);

  useEffect(() => {
    // Intersection Observer for animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
        }
      });
    }, observerOptions);

    // Observe all elements with fade-in-up class
    const elements = document.querySelectorAll('.fade-in-up');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen w-full min-w-0 bg-background">
      <Header />
      
      <main>
        <HeroSection hero={homeHero} />
        <WhyChooseUs />
        <ContactSection />
      </main>
      
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Index;
