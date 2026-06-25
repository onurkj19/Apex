import { FormEvent, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { websiteContentApi } from '@/lib/erp-api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, ImageIcon } from 'lucide-react';

const WebsiteContentPage = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [stats, setStats] = useState({ projects: '750+', workers: '20+', years: '15+' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    websiteContentApi.getHomeHero().then((data) => {
      if (!data) return;
      setTitle(data.title || '');
      setSubtitle(data.subtitle || '');
      setStats((data.stats || {}) as any);
      setImageUrl(data.image_url || '');
      setImagePath(data.image_path || '');
    }).catch((err) => {
      toast({ title: 'Gabim gjatë ngarkimit', description: String(err?.message || err), variant: 'destructive' });
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let uploaded = { url: imageUrl, path: imagePath };
      if (imageFile) {
        uploaded = await websiteContentApi.uploadImage(imageFile);
        setImageUrl(uploaded.url);
        setImagePath(uploaded.path);
        setImageFile(null);
        if (fileRef.current) fileRef.current.value = '';
      }
      await websiteContentApi.saveHomeHero({
        title,
        subtitle,
        stats,
        image_url: uploaded.url,
        image_path: uploaded.path,
      });
      toast({ title: 'U ruajt me sukses', description: 'Ndryshimet u ruajtën.' });
    } catch (err: any) {
      console.error('WebsiteContent save error:', err);
      toast({
        title: 'Gabim gjatë ruajtjes',
        description: err?.message || 'Provo sërisht. Kontrollo nëse bucket-i erp-images ekziston në Supabase.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const displayImage = preview || imageUrl || null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Menaxhimi i permbajtjes se websajtit</h2>
      <Card>
        <CardHeader><CardTitle>Hero Section (Homepage)</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Titulli</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p.sh. Ihr Gerüstbaupartner" />
            </div>
            <div className="space-y-2">
              <Label>Nëntitulli</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Nëntitulli i hero-s" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Projekte</Label>
                <Input value={stats.projects} onChange={(e) => setStats((s) => ({ ...s, projects: e.target.value }))} />
              </div>
              <div>
                <Label>Punëtorë</Label>
                <Input value={stats.workers} onChange={(e) => setStats((s) => ({ ...s, workers: e.target.value }))} />
              </div>
              <div>
                <Label>Vite</Label>
                <Input value={stats.years} onChange={(e) => setStats((s) => ({ ...s, years: e.target.value }))} />
              </div>
            </div>

            {/* Image upload */}
            <div className="space-y-3">
              <Label>Foto e Hero (1 foto — zëvendëson fallback-un nga ERP)</Label>
              <p className="text-xs text-muted-foreground">
                Nëse lihet bosh, shfaqet automatikisht fotoja e parë nga projektet e ERP-it.
              </p>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {displayImage && (
                <div className="relative rounded-lg overflow-hidden border bg-muted max-w-sm aspect-video">
                  <img
                    src={displayImage}
                    alt="Hero preview"
                    className="w-full h-full object-cover"
                  />
                  {preview && (
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                      E re — nuk është ruajtur ende
                    </span>
                  )}
                  {!preview && imageUrl && (
                    <span className="absolute bottom-2 left-2 bg-green-700/80 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Aktive
                    </span>
                  )}
                </div>
              )}
              {!displayImage && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg p-4 max-w-sm">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  Asnjë foto CMS — do të shfaqet foto nga ERP
                </div>
              )}
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebsiteContentPage;
