import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientApi, equipmentApi } from '@/lib/erp-api';
import { Building2, Truck, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const equipmentTypes = ['Trucks', 'Vans', 'Forklifts', 'Machines'];

const statusColor: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  in_use: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  unavailable: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const ClientsEquipmentPage = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [clientForm, setClientForm] = useState({ company_name: '', client_address: '', phone: '', email: '' });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientForm, setEditingClientForm] = useState({ company_name: '', client_address: '', phone: '', email: '' });
  const [equipmentForm, setEquipmentForm] = useState({ equipment_name: '', equipment_type: 'Trucks', status: 'available', notes: '' });
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [editingEquipmentForm, setEditingEquipmentForm] = useState({ equipment_name: '', equipment_type: 'Trucks', status: 'available', notes: '' });
  const [loading, setLoading] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [expandedEquipmentId, setExpandedEquipmentId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [clientRows, equipmentRows] = await Promise.all([clientApi.list(), equipmentApi.list()]);
      setClients(clientRows);
      setEquipment(equipmentRows);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    setSavingClient(true);
    try {
      await clientApi.create(clientForm);
      setClientForm({ company_name: '', client_address: '', phone: '', email: '' });
      setShowClientForm(false);
      await load();
    } finally { setSavingClient(false); }
  };

  const saveClientEdit = async (id: string) => {
    setSavingClient(true);
    try {
      await clientApi.update(id, editingClientForm);
      setEditingClientId(null);
      setExpandedClientId(id);
      await load();
    } finally { setSavingClient(false); }
  };

  const removeClient = async (id: string) => {
    if (!window.confirm('A je i sigurt qe do ta fshish kete klient?')) return;
    setSavingClient(true);
    try {
      await clientApi.remove(id);
      if (editingClientId === id) setEditingClientId(null);
      await load();
    } finally { setSavingClient(false); }
  };

  const onCreateEquipment = async (e: FormEvent) => {
    e.preventDefault();
    setSavingEquipment(true);
    try {
      await equipmentApi.create(equipmentForm);
      setEquipmentForm({ equipment_name: '', equipment_type: 'Trucks', status: 'available', notes: '' });
      setShowEquipmentForm(false);
      await load();
    } finally { setSavingEquipment(false); }
  };

  const saveEquipmentEdit = async (id: string) => {
    setSavingEquipment(true);
    try {
      await equipmentApi.update(id, editingEquipmentForm);
      setEditingEquipmentId(null);
      setExpandedEquipmentId(id);
      await load();
    } finally { setSavingEquipment(false); }
  };

  const removeEquipment = async (id: string) => {
    if (!window.confirm('A je i sigurt qe do ta fshish kete pajisje?')) return;
    setSavingEquipment(true);
    try {
      await equipmentApi.remove(id);
      if (editingEquipmentId === id) setEditingEquipmentId(null);
      await load();
    } finally { setSavingEquipment(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Klientet dhe pajisjet</h2>
        <div className="flex gap-2">
          <Button variant={showClientForm ? 'default' : 'outline'} onClick={() => { setShowClientForm(v => !v); setShowEquipmentForm(false); }} className="gap-2">
            <Building2 className="h-4 w-4" /> Shto Klient
          </Button>
          <Button variant={showEquipmentForm ? 'default' : 'outline'} onClick={() => { setShowEquipmentForm(v => !v); setShowClientForm(false); }} className="gap-2">
            <Truck className="h-4 w-4" /> Shto Pajisje
          </Button>
        </div>
      </div>

      {/* Forma klient */}
      {showClientForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Klient i ri</CardTitle></CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onCreateClient}>
              <div className="space-y-1.5"><Label>Kompania</Label><Input value={clientForm.company_name} onChange={(e) => setClientForm(s => ({ ...s, company_name: e.target.value }))} placeholder="p.sh. Luna GmbH" required /></div>
              <div className="space-y-1.5"><Label>Adresa</Label><Input value={clientForm.client_address} onChange={(e) => setClientForm(s => ({ ...s, client_address: e.target.value }))} placeholder="Rruga, Qyteti" /></div>
              <div className="space-y-1.5"><Label>Telefoni</Label><Input value={clientForm.phone} onChange={(e) => setClientForm(s => ({ ...s, phone: e.target.value }))} placeholder="+41..." /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={clientForm.email} onChange={(e) => setClientForm(s => ({ ...s, email: e.target.value }))} placeholder="info@..." /></div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={savingClient}>{savingClient ? 'Duke ruajtur...' : 'Ruaj klientin'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowClientForm(false)}>Anulo</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Forma pajisje */}
      {showEquipmentForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Pajisje e re</CardTitle></CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onCreateEquipment}>
              <div className="space-y-1.5"><Label>Emri i pajisjes</Label><Input value={equipmentForm.equipment_name} onChange={(e) => setEquipmentForm(s => ({ ...s, equipment_name: e.target.value }))} placeholder="p.sh. Mercedes Sprinter" required /></div>
              <div className="space-y-1.5">
                <Label>Lloji</Label>
                <Select value={equipmentForm.equipment_type} onValueChange={(v) => setEquipmentForm(s => ({ ...s, equipment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{equipmentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Statusi</Label><Input value={equipmentForm.status} onChange={(e) => setEquipmentForm(s => ({ ...s, status: e.target.value }))} placeholder="available" /></div>
              <div className="space-y-1.5"><Label>Shënime</Label><Input value={equipmentForm.notes} onChange={(e) => setEquipmentForm(s => ({ ...s, notes: e.target.value }))} placeholder="Çdo shënim..." /></div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={savingEquipment}>{savingEquipment ? 'Duke ruajtur...' : 'Ruaj pajisjen'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowEquipmentForm(false)}>Anulo</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista klientëve */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Klientët ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar...</p>}
          {!loading && clients.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka klientë të regjistruar.</p>}
          {clients.map((c) => {
            const isExpanded = expandedClientId === c.id;
            const isEditing = editingClientId === c.id;
            return (
              <div key={c.id} className="rounded-xl border border-border/70 overflow-hidden">
                <button type="button" className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => { if (isEditing) return; setExpandedClientId(prev => prev === c.id ? null : c.id); }}>
                  <div>
                    <p className="font-medium">{c.company_name}</p>
                    <p className="text-xs text-muted-foreground">{c.client_address || '—'} · {c.phone || '—'}</p>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0', (isExpanded || isEditing) && 'rotate-180')} />
                </button>
                {(isExpanded || isEditing) && (
                  <div className="border-t border-border/40 px-4 py-3 bg-muted/20 space-y-3">
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Kompania</Label><Input value={editingClientForm.company_name} onChange={(e) => setEditingClientForm(s => ({ ...s, company_name: e.target.value }))} /></div>
                        <div className="space-y-1"><Label className="text-xs">Adresa</Label><Input value={editingClientForm.client_address} onChange={(e) => setEditingClientForm(s => ({ ...s, client_address: e.target.value }))} /></div>
                        <div className="space-y-1"><Label className="text-xs">Telefoni</Label><Input value={editingClientForm.phone} onChange={(e) => setEditingClientForm(s => ({ ...s, phone: e.target.value }))} /></div>
                        <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={editingClientForm.email} onChange={(e) => setEditingClientForm(s => ({ ...s, email: e.target.value }))} /></div>
                        <div className="md:col-span-2 flex gap-2">
                          <Button size="sm" disabled={savingClient} onClick={() => saveClientEdit(c.id)}>{savingClient ? 'Duke ruajtur...' : 'Ruaj'}</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingClientId(null); setExpandedClientId(c.id); }}>Anulo</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {c.email && <p className="text-sm">Email: <span className="text-primary">{c.email}</span></p>}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditingClientId(c.id); setEditingClientForm({ company_name: c.company_name || '', client_address: c.client_address || '', phone: c.phone || '', email: c.email || '' }); }}>Modifiko</Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeClient(c.id)}>Fshi</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Lista pajisjet */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Pajisjet ({equipment.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar...</p>}
          {!loading && equipment.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka pajisje të regjistruara.</p>}
          {equipment.map((eq) => {
            const isExpanded = expandedEquipmentId === eq.id;
            const isEditing = editingEquipmentId === eq.id;
            return (
              <div key={eq.id} className="rounded-xl border border-border/70 overflow-hidden">
                <button type="button" className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => { if (isEditing) return; setExpandedEquipmentId(prev => prev === eq.id ? null : eq.id); }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <p className="font-medium">{eq.equipment_name} <span className="text-muted-foreground font-normal text-sm">({eq.equipment_type})</span></p>
                      <p className="text-xs text-muted-foreground">{eq.notes || 'Pa shënime'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor[eq.status] || 'bg-muted text-muted-foreground')}>{eq.status}</span>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', (isExpanded || isEditing) && 'rotate-180')} />
                  </div>
                </button>
                {(isExpanded || isEditing) && (
                  <div className="border-t border-border/40 px-4 py-3 bg-muted/20 space-y-3">
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Emri</Label><Input value={editingEquipmentForm.equipment_name} onChange={(ev) => setEditingEquipmentForm(s => ({ ...s, equipment_name: ev.target.value }))} /></div>
                        <div className="space-y-1">
                          <Label className="text-xs">Lloji</Label>
                          <Select value={editingEquipmentForm.equipment_type} onValueChange={(v) => setEditingEquipmentForm(s => ({ ...s, equipment_type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{equipmentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Statusi</Label><Input value={editingEquipmentForm.status} onChange={(ev) => setEditingEquipmentForm(s => ({ ...s, status: ev.target.value }))} /></div>
                        <div className="space-y-1"><Label className="text-xs">Shënime</Label><Input value={editingEquipmentForm.notes} onChange={(ev) => setEditingEquipmentForm(s => ({ ...s, notes: ev.target.value }))} /></div>
                        <div className="md:col-span-2 flex gap-2">
                          <Button size="sm" disabled={savingEquipment} onClick={() => saveEquipmentEdit(eq.id)}>{savingEquipment ? 'Duke ruajtur...' : 'Ruaj'}</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingEquipmentId(null); setExpandedEquipmentId(eq.id); }}>Anulo</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditingEquipmentId(eq.id); setEditingEquipmentForm({ equipment_name: eq.equipment_name || '', equipment_type: eq.equipment_type || 'Trucks', status: eq.status || 'available', notes: eq.notes || '' }); }}>Modifiko</Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => removeEquipment(eq.id)}>Fshi</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsEquipmentPage;
