import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { websiteContentApi } from '@/lib/erp-api';

const WebsiteContentPage = () => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [stats, setStats] = useState({
    projects: '2500+',
    workers: '65+',
    years: '12+',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await websiteContentApi.getHomeHero();
      if (!data) return;
      setTitle(data.title || '');
      setSubtitle(data.subtitle || '');
      setStats((data.stats || {}) as any);
      setImageUrl(data.image_url || '');
      setImagePath(data.image_path || '');
    };
    load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let uploaded = { url: imageUrl, path: imagePath };
    if (imageFile) {
      uploaded = await websiteContentApi.uploadImage(imageFile);
    }
    await websiteContentApi.saveHomeHero({
      title,
      subtitle,
      stats,
      image_url: uploaded.url,
      image_path: uploaded.path,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Menaxhimi i permbajtjes se websajtit</h2>
      <Card>
        <CardHeader><CardTitle>Hero Section</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Titulli</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Nentitulli</Label><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label>Statistika Projekte</Label><Input value={stats.projects} onChange={(e) => setStats((s) => ({ ...s, projects: e.target.value }))} /></div>
              <div><Label>Statistika Punetore</Label><Input value={stats.workers} onChange={(e) => setStats((s) => ({ ...s, workers: e.target.value }))} /></div>
              <div><Label>Statistika Vite</Label><Input value={stats.years} onChange={(e) => setStats((s) => ({ ...s, years: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Imazhi i Hero</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </div>
            {imageUrl && <img src={imageUrl} alt="Hero" className="w-full max-w-sm rounded-md border" />}
            <Button type="submit">Ruaj ndryshimet</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebsiteContentPage;
