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
  const [clientForm, setClientForm] = useState({ company_name: '', contact_person: '', phone: '', email: '' });
  const [equipmentForm, setEquipmentForm] = useState({
    equipment_name: '',
    equipment_type: 'Trucks',
    status: 'available',
    notes: '',
  });

  const load = async () => {
    const [clientRows, equipmentRows] = await Promise.all([clientApi.list(), equipmentApi.list()]);
    setClients(clientRows);
    setEquipment(equipmentRows);
  };

  useEffect(() => {
    load();
  }, []);

  const onCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    await clientApi.create(clientForm);
    setClientForm({ company_name: '', contact_person: '', phone: '', email: '' });
    await load();
  };

  const onCreateEquipment = async (e: FormEvent) => {
    e.preventDefault();
    await equipmentApi.create(equipmentForm);
    setEquipmentForm({ equipment_name: '', equipment_type: 'Trucks', status: 'available', notes: '' });
    await load();
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
              <div><Label>Personi kontaktues</Label><Input value={clientForm.contact_person} onChange={(e) => setClientForm((s) => ({ ...s, contact_person: e.target.value }))} required /></div>
              <div><Label>Telefoni</Label><Input value={clientForm.phone} onChange={(e) => setClientForm((s) => ({ ...s, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={clientForm.email} onChange={(e) => setClientForm((s) => ({ ...s, email: e.target.value }))} /></div>
              <Button type="submit">Ruaj klientin</Button>
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
              <Button type="submit">Ruaj pajisjen</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Databaza e klienteve</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {clients.map((c) => (
              <div key={c.id} className="border rounded p-3">
                <p className="font-medium">{c.company_name}</p>
                <p className="text-sm text-muted-foreground">{c.contact_person} - {c.phone || '-'} - {c.email || '-'}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pajisjet</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {equipment.map((e) => (
              <div key={e.id} className="border rounded p-3">
                <p className="font-medium">{e.equipment_name} ({e.equipment_type})</p>
                <p className="text-sm text-muted-foreground">{e.status} - {e.notes || 'Pa shenime'}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientsEquipmentPage;
