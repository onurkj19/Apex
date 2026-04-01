import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';

const Products = () => {
  const targetUrl = (import.meta as any)?.env?.VITE_STORE_URL;

  const handleRedirect = () => {
    if (targetUrl) {
      window.location.href = targetUrl;
    }
  };

  return (
    <div className="min-h-screen w-full min-w-0 bg-background">
      <Header />

      <main>
        <section className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1
                className="text-4xl md:text-6xl font-bold mb-6 cursor-pointer hover:text-primary transition-colors"
                onClick={handleRedirect}
                title="Produkte"
              >
                Produkte
              </h1>
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
