import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-8">
          <span className="text-4xl font-bold text-white">404</span>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-foreground">Seite nicht gefunden</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Die gesuchte Seite konnte nicht gefunden werden.
        </p>
        <a 
          href="/" 
          className="btn-hero inline-flex items-center px-6 py-3 text-lg no-underline hover:scale-105 transition-transform"
        >
          Zurück zur Startseite
        </a>
      </div>
    </div>
  );
};

export default NotFound;
