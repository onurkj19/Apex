import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminAPI } from '@/services/api';
import { 
  LogOut, 
  Package, 
  FolderOpen, 
  Plus,
  Edit,
  Trash2,
  Upload,
  Euro,
  Percent
} from 'lucide-react';
import ProductManagement from '@/components/ProductManagement';
import ProjectManagement from '@/components/ProjectManagement';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  discount: number;
  image: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  location: string;
  completedDate: string;
  images: string[];
  createdAt: string;
}

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    verifyAuth();
  }, []);

  const verifyAuth = async () => {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      navigate('/admin/login');
      return;
    }

    try {
      await adminAPI.verify(token);
      setIsAuthenticated(true);
      await loadData(token);
    } catch (error) {
      console.error('Auth verification failed:', error);
      localStorage.removeItem('adminToken');
      navigate('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async (token: string) => {
    try {
      const [productsResponse, projectsResponse] = await Promise.all([
        adminAPI.getProducts(token),
        adminAPI.getProjects(token)
      ]);
      
      setProducts(productsResponse);
      setProjects(projectsResponse);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Fehler beim Laden der Daten');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const refreshProducts = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const response = await adminAPI.getProducts(token);
        setProducts(response);
      } catch (error) {
        console.error('Failed to refresh products:', error);
      }
    }
  };

  const refreshProjects = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const response = await adminAPI.getProjects(token);
        setProjects(response);
      } catch (error) {
        console.error('Failed to refresh projects:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img
                src="/Transperent.png"
                alt="Apex Gerüstbau Logo"
                className="h-10 w-auto"
              />
              <h1 className="text-xl font-semibold text-gray-900">
                Admin Panel
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="text-sm"
              >
                Website ansehen
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Produkte
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                Aktive Produkte
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Projekte
              </CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground">
                Abgeschlossene Projekte
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Durchschnittspreis
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.length > 0 
                  ? `CHF ${(products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2)}`
                  : 'CHF 0.00'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Durchschnittlicher Produktpreis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Rabattierte Artikel
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => p.discount > 0).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Produkte mit Rabatt
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Produktverwaltung</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center space-x-2">
              <FolderOpen className="h-4 w-4" />
              <span>Projektverwaltung</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductManagement 
              products={products}
              onProductsChange={refreshProducts}
            />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectManagement 
              projects={projects}
              onProjectsChange={refreshProjects}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
