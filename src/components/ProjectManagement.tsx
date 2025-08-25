import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { adminAPI } from '@/services/api';
import { supabaseAPI } from '@/services/supabase';
import { 
  Plus, 
  Trash2, 
  Upload, 
  FolderOpen,
  Calendar,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';

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

interface ProjectManagementProps {
  projects: Project[];
  onProjectsChange: () => void;
}

const ProjectManagement = ({ projects, onProjectsChange }: ProjectManagementProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    completedDate: '',
    client: '',
    category: '',
    duration: '',
    images: [] as File[]
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      completedDate: '',
      client: '',
      category: '',
      duration: '',
      images: []
    });
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData({
      ...formData,
      images: files
    });
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await supabaseAPI.addProject({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        completed_date: formData.completedDate,
        client: formData.client,
        category: formData.category,
        duration: formData.duration,
        images: formData.images,
      });
      
      setSuccess('Projekt erfolgreich hinzugefügt!');
      resetForm();
      setIsAddDialogOpen(false);
      onProjectsChange();
    } catch (error) {
      setError('Fehler beim Hinzufügen des Projekts');
      console.error('Add project error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Projekt löschen möchten?')) {
      return;
    }

    try {
      await supabaseAPI.deleteProject(projectId);
      setSuccess('Projekt erfolgreich gelöscht!');
      onProjectsChange();
    } catch (error) {
      setError('Fehler beim Löschen des Projekts');
      console.error('Delete project error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projektverwaltung</h2>
          <p className="text-gray-600">Verwalten Sie Ihre abgeschlossenen Projekte</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Neues Projekt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neues Projekt hinzufügen</DialogTitle>
              <DialogDescription>
                Fügen Sie ein neues abgeschlossenes Projekt zu Ihrer Galerie hinzu.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Projekttitel *</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="z.B. Gerüstbau Wohnhaus München"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Standort *</Label>
                  <Input
                    id="location"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="z.B. München, Deutschland"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Auftraggeber</Label>
                  <Input
                    id="client"
                    name="client"
                    value={formData.client}
                    onChange={handleInputChange}
                    placeholder="z.B. Bauträger München GmbH"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Kategorie</Label>
                  <Input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="z.B. Wohnbau, Gewerbebau"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Projektdauer</Label>
                  <Input
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    placeholder="z.B. 6 Monate"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Projektbeschreibung *</Label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Beschreiben Sie das Projekt, die verwendeten Materialien und besondere Herausforderungen..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="completedDate">Abschlussdatum *</Label>
                  <Input
                    id="completedDate"
                    name="completedDate"
                    type="date"
                    required
                    value={formData.completedDate}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="images">Projektbilder (max. 10) *</Label>
                  <Input
                    id="images"
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                    required
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-gray-600">
                    {formData.images.length} Bild(er) ausgewählt
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="overflow-hidden">
            <div className="aspect-video bg-gray-100 relative">
              {project.images.length > 0 ? (
                <div className="relative w-full h-full">
                  <img
                    src={project.images[0]}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                  {project.images.length > 1 && (
                    <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                      +{project.images.length - 1} weitere
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FolderOpen className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {project.location}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(project.completedDate)}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteProject(project.id)}
                  className="text-red-600 hover:text-red-700 ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <CardDescription className="line-clamp-3 mb-4">
                {project.description}
              </CardDescription>
              
              {(project.client || project.category || project.duration) && (
                <div className="space-y-2 mb-4 text-sm">
                  {project.client && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Auftraggeber:</span>
                      <span className="ml-2">{project.client}</span>
                    </div>
                  )}
                  {project.category && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Kategorie:</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {project.category}
                      </Badge>
                    </div>
                  )}
                  {project.duration && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Dauer:</span>
                      <span className="ml-2">{project.duration}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-600">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  {project.images.length} Bild(er)
                </div>
                <span className="text-gray-500">
                  Erstellt: {formatDate(project.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Keine Projekte vorhanden
          </h3>
          <p className="text-gray-600 mb-4">
            Fügen Sie Ihr erstes Projekt hinzu, um Ihre Arbeit zu präsentieren.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
