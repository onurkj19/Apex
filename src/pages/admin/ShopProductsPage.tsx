import { useEffect, useRef, useState } from 'react';
import { shopProductsApi } from '@/lib/shop-api';
import type { ShopProduct } from '@/lib/shop-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, X, Package, GripVertical } from 'lucide-react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Sortable row ────────────────────────────────────────────────────────────
const SortableProductRow = ({
  p,
  onEdit,
  onDelete,
  deletingId,
}: {
  p: ShopProduct;
  onEdit: (p: ShopProduct) => void;
  onDelete: (id: string, title: string) => void;
  deletingId: string | null;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const hasDiscount = p.discount_percent > 0;
  const finalPrice = hasDiscount ? p.price * (1 - p.discount_percent / 100) : p.price;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-3 bg-background">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 p-1 touch-none"
        title="Zvarrit për të ndryshuar renditjen"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {p.image_url ? (
        <img src={p.image_url} alt={p.title} className="w-12 h-12 object-cover rounded-md shrink-0 border" />
      ) : (
        <div className="w-12 h-12 rounded-md bg-muted shrink-0 flex items-center justify-center">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{p.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-sm font-semibold text-primary">CHF {finalPrice.toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">CHF {p.price.toFixed(2)}</span>
          )}
          {hasDiscount && <Badge variant="destructive" className="text-xs">-{p.discount_percent}%</Badge>}
          {p.category && <Badge variant="outline" className="text-xs">{p.category}</Badge>}
          <Badge variant={p.in_stock ? 'default' : 'secondary'} className="text-xs">
            {p.in_stock ? 'Ka stok' : 'Pa stok'}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="icon" onClick={() => onEdit(p)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={deletingId === p.id}
          onClick={() => onDelete(p.id, p.title)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

const emptyForm = {
  title: '',
  description: '',
  price: '',
  discount_percent: '',
  category: '',
  in_stock: true,
  image_url: '',
};

const ShopProductsPage = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = async () => {
    setLoading(true);
    try {
      setProducts(await shopProductsApi.list());
    } catch {
      toast.error('Nuk u ngarkuan produktet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p: ShopProduct) => {
    setEditId(p.id);
    setForm({
      title: p.title,
      description: p.description ?? '',
      price: String(p.price),
      discount_percent: String(p.discount_percent),
      category: p.category ?? '',
      in_stock: p.in_stock,
      image_url: p.image_url ?? '',
    });
    setShowForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await shopProductsApi.uploadImage(file);
      setForm((p) => ({ ...p, image_url: url }));
      toast.success('Foto u ngarkua!');
    } catch {
      toast.error('Gabim gjatë ngarkimit të fotos. Sigurohu që bucket "shop-images" ekziston në Supabase Storage.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price) {
      toast.error('Titulli dhe çmimi janë të detyrueshëm.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        discount_percent: parseFloat(form.discount_percent || '0'),
        category: form.category.trim() || null,
        in_stock: form.in_stock,
        image_url: form.image_url || null,
      };

      if (editId) {
        await shopProductsApi.update(editId, payload);
        toast.success('Produkti u përditësua!');
      } else {
        await shopProductsApi.create(payload);
        toast.success('Produkti u shtua!');
      }

      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      await load();
    } catch {
      toast.error('Ndodhi një gabim. Provo përsëri.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Fshi "${title}"?`)) return;
    setDeletingId(id);
    try {
      await shopProductsApi.remove(id);
      toast.success('Produkti u fshi.');
      await load();
    } catch {
      toast.error('Gabim gjatë fshirjes.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(products, oldIndex, newIndex);
    setProducts(reordered);
    setSavingOrder(true);
    try {
      await shopProductsApi.updateOrder(reordered.map((p, i) => ({ id: p.id, sort_order: i })));
      toast.success('Renditja u ruajt!');
    } catch {
      toast.error('Gabim gjatë ruajtjes së renditjes.');
      await load();
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Produktet e Dyqanit</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Produkt i ri
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editId ? 'Edito produktin' : 'Shto produkt të ri'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Titulli *</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Emri i produktit"
                />
              </div>

              <div className="sm:col-span-2">
                <Label>Përshkrimi</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Përshkrim i shkurtër i produktit..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Çmimi (CHF) *</Label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="29.90"
                />
              </div>

              <div>
                <Label>Zbritja (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.discount_percent}
                  onChange={(e) => setForm((p) => ({ ...p, discount_percent: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Kategoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="p.sh. Aksesore, Mjete..."
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="in_stock"
                  checked={form.in_stock}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, in_stock: v }))}
                />
                <Label htmlFor="in_stock">Ka stok (i dukshëm në shop)</Label>
              </div>

              {/* Image upload */}
              <div className="sm:col-span-2 space-y-2">
                <Label>Foto e produktit</Label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Duke ngarkuar...' : 'Ngarko foto'}
                  </Button>
                  {form.image_url && (
                    <div className="flex items-center gap-2">
                      <img
                        src={form.image_url}
                        alt="preview"
                        className="h-12 w-12 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setForm((p) => ({ ...p, image_url: '' }))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ose shkruaj URL-në e fotos manualisht:
                </p>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Duke ruajtur...' : editId ? 'Ruaj ndryshimet' : 'Shto produktin'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Anulo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products list with DnD */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Të gjitha produktet ({products.length})</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GripVertical className="h-4 w-4" />
              Zvarrit për të ndryshuar renditjen
              {savingOrder && <span className="text-xs text-primary animate-pulse ml-2">Duke ruajtur...</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nuk ka produkte. Shto produktin e parë!</p>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={products.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y">
                  {products.map((p) => (
                    <SortableProductRow
                      key={p.id}
                      p={p}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      deletingId={deletingId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopProductsPage;
