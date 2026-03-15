import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clientApi, equipmentApi } from '@/lib/erp-api';

const equipmentTypes = ['Trucks', 'Vans', 'Forklifts', 'Machines'];

const ClientsEquipmentPage = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [clientForm, setClientForm] = useState({ company_name: '', client_address: '', phone: '', email: '' });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientForm, setEditingClientForm] = useState({ company_name: '', client_address: '', phone: '', email: '' });
  const [equipmentForm, setEquipmentForm] = useState({
    equipment_name: '',
    equipment_type: 'Trucks',
    status: 'available',
    notes: '',
  });
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [editingEquipmentForm, setEditingEquipmentForm] = useState({
    equipment_name: '',
    equipment_type: 'Trucks',
    status: 'available',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [savingEquipment, setSavingEquipment] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [clientRows, equipmentRows] = await Promise.all([clientApi.list(), equipmentApi.list()]);
      setClients(clientRows);
      setEquipment(equipmentRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    setSavingClient(true);
    try {
      await clientApi.create(clientForm);
      setClientForm({ company_name: '', client_address: '', phone: '', email: '' });
      await load();
    } finally {
      setSavingClient(false);
    }
  };

  const startEditClient = (client: any) => {
    setEditingClientId(client.id);
    setEditingClientForm({
      company_name: client.company_name || '',
      client_address: client.client_address || '',
      phone: client.phone || '',
      email: client.email || '',
    });
  };

  const saveClientEdit = async (id: string) => {
    setSavingClient(true);
    try {
      await clientApi.update(id, editingClientForm);
      setEditingClientId(null);
      await load();
    } finally {
      setSavingClient(false);
    }
  };

  const removeClient = async (id: string) => {
    if (!window.confirm('A je i sigurt qe do ta fshish kete klient?')) return;
    setSavingClient(true);
    try {
      await clientApi.remove(id);
      if (editingClientId === id) setEditingClientId(null);
      await load();
    } finally {
      setSavingClient(false);
    }
  };

  const onCreateEquipment = async (e: FormEvent) => {
    e.preventDefault();
    setSavingEquipment(true);
    try {
      await equipmentApi.create(equipmentForm);
      setEquipmentForm({ equipment_name: '', equipment_type: 'Trucks', status: 'available', notes: '' });
      await load();
    } finally {
      setSavingEquipment(false);
    }
  };

  const startEditEquipment = (item: any) => {
    setEditingEquipmentId(item.id);
    setEditingEquipmentForm({
      equipment_name: item.equipment_name || '',
      equipment_type: item.equipment_type || 'Trucks',
      status: item.status || 'available',
      notes: item.notes || '',
    });
  };

  const saveEquipmentEdit = async (id: string) => {
    setSavingEquipment(true);
    try {
      await equipmentApi.update(id, editingEquipmentForm);
      setEditingEquipmentId(null);
      await load();
    } finally {
      setSavingEquipment(false);
    }
  };

  const removeEquipment = async (id: string) => {
    if (!window.confirm('A je i sigurt qe do ta fshish kete pajisje?')) return;
    setSavingEquipment(true);
    try {
      await equipmentApi.remove(id);
      if (editingEquipmentId === id) setEditingEquipmentId(null);
      await load();
    } finally {
      setSavingEquipment(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Klientet dhe pajisjet</h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Shto klient</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreateClient}>
              <div><Label>Kompania</Label><Input value={clientForm.company_name} onChange={(e) => setClientForm((s) => ({ ...s, company_name: e.target.value }))} required /></div>
              <div><Label>Adresa e klientit</Label><Input value={clientForm.client_address} onChange={(e) => setClientForm((s) => ({ ...s, client_address: e.target.value }))} required /></div>
              <div><Label>Telefoni</Label><Input value={clientForm.phone} onChange={(e) => setClientForm((s) => ({ ...s, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={clientForm.email} onChange={(e) => setClientForm((s) => ({ ...s, email: e.target.value }))} /></div>
              <Button type="submit" disabled={savingClient}>{savingClient ? 'Duke ruajtur...' : 'Ruaj klientin'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Shto pajisje</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreateEquipment}>
              <div><Label>Emri i pajisjes</Label><Input value={equipmentForm.equipment_name} onChange={(e) => setEquipmentForm((s) => ({ ...s, equipment_name: e.target.value }))} required /></div>
              <div>
                <Label>Lloji</Label>
                <Select value={equipmentForm.equipment_type} onValueChange={(v) => setEquipmentForm((s) => ({ ...s, equipment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{equipmentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Statusi</Label><Input value={equipmentForm.status} onChange={(e) => setEquipmentForm((s) => ({ ...s, status: e.target.value }))} /></div>
              <div><Label>Shenime</Label><Input value={equipmentForm.notes} onChange={(e) => setEquipmentForm((s) => ({ ...s, notes: e.target.value }))} /></div>
              <Button type="submit" disabled={savingEquipment}>{savingEquipment ? 'Duke ruajtur...' : 'Ruaj pajisjen'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Databaza e klienteve</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar...</p>}
            {clients.map((c) => (
              <div key={c.id} className="border rounded p-3">
                {editingClientId === c.id ? (
                  <div className="space-y-2">
                    <div><Label>Kompania</Label><Input value={editingClientForm.company_name} onChange={(e) => setEditingClientForm((s) => ({ ...s, company_name: e.target.value }))} /></div>
                    <div><Label>Adresa e klientit</Label><Input value={editingClientForm.client_address} onChange={(e) => setEditingClientForm((s) => ({ ...s, client_address: e.target.value }))} /></div>
                    <div><Label>Telefoni</Label><Input value={editingClientForm.phone} onChange={(e) => setEditingClientForm((s) => ({ ...s, phone: e.target.value }))} /></div>
                    <div><Label>Email</Label><Input type="email" value={editingClientForm.email} onChange={(e) => setEditingClientForm((s) => ({ ...s, email: e.target.value }))} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveClientEdit(c.id)} disabled={savingClient}>
                        {savingClient ? 'Duke ruajtur...' : 'Ruaj'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingClientId(null)} disabled={savingClient}>Anulo</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{c.company_name}</p>
                    <p className="text-sm text-muted-foreground">{c.client_address || '-'} - {c.phone || '-'} - {c.email || '-'}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEditClient(c)}>Edito</Button>
                      <Button size="sm" variant="destructive" onClick={() => removeClient(c.id)} disabled={savingClient}>Fshi</Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {!loading && clients.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka kliente te regjistruar.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pajisjet</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar...</p>}
            {equipment.map((e) => (
              <div key={e.id} className="border rounded p-3">
                {editingEquipmentId === e.id ? (
                  <div className="space-y-2">
                    <div><Label>Emri i pajisjes</Label><Input value={editingEquipmentForm.equipment_name} onChange={(ev) => setEditingEquipmentForm((s) => ({ ...s, equipment_name: ev.target.value }))} /></div>
                    <div>
                      <Label>Lloji</Label>
                      <Select value={editingEquipmentForm.equipment_type} onValueChange={(v) => setEditingEquipmentForm((s) => ({ ...s, equipment_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{equipmentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Statusi</Label><Input value={editingEquipmentForm.status} onChange={(ev) => setEditingEquipmentForm((s) => ({ ...s, status: ev.target.value }))} /></div>
                    <div><Label>Shenime</Label><Input value={editingEquipmentForm.notes} onChange={(ev) => setEditingEquipmentForm((s) => ({ ...s, notes: ev.target.value }))} /></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEquipmentEdit(e.id)} disabled={savingEquipment}>
                        {savingEquipment ? 'Duke ruajtur...' : 'Ruaj'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingEquipmentId(null)} disabled={savingEquipment}>Anulo</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{e.equipment_name} ({e.equipment_type})</p>
                    <p className="text-sm text-muted-foreground">{e.status} - {e.notes || 'Pa shenime'}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEditEquipment(e)}>Edito</Button>
                      <Button size="sm" variant="destructive" onClick={() => removeEquipment(e.id)} disabled={savingEquipment}>Fshi</Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {!loading && equipment.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka pajisje te regjistruara.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientsEquipmentPage;
