import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { portalApi, type MonthOverview, type Worksite } from '@/lib/v2/api';
import { hoursFromMinutes } from '@/lib/v2/decimal';
import { currentMonth, Empty, Stat, errorMessage } from '@/components/v2/ui';
import { formatDateDe, todayInZurich } from '@/lib/v2/time';
import { monthLabelDe } from '@/lib/v2/pdf/models';

const PortalHome = () => {
  const today = todayInZurich();
  const [sites, setSites] = useState<Worksite[] | null>(null);
  const [overview, setOverview] = useState<MonthOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([portalApi.worksites(today), portalApi.overview(currentMonth())])
      .then(([s, o]) => {
        setSites(s);
        setOverview(o);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [today]);

  const pct = overview && overview.reference_minutes > 0 ? Math.min(100, Math.round((overview.approved_minutes / overview.reference_minutes) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Hallo!</h1>
        <p className="text-sm text-muted-foreground">Heute ist {formatDateDe(today)}</p>
      </div>
      {error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Heutige Baustelle</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sites === null && <p className="text-sm text-muted-foreground">Lädt …</p>}
          {sites?.length === 0 && <Empty>Für heute ist keine Baustelle zugeteilt.</Empty>}
          {sites?.map((s) => (
            <div key={`${s.kind}-${s.id}`} className="rounded-lg border border-border/70 p-3">
              <p className="font-medium">{s.name}</p>
              {s.address && <p className="text-sm text-muted-foreground">{s.address}</p>}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {s.assignment_number && <span>{s.kind === 'assignment' ? 'Auftrag' : 'Projekt'}: {s.assignment_number}</span>}
                {s.team_leader && <span>Vorarbeiter: {s.team_leader}</span>}
                {s.planned_daily_minutes !== null && <span>Soll: {hoursFromMinutes(s.planned_daily_minutes)} h</span>}
              </div>
              {s.team.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Team: {s.team.map((t) => t.name).join(', ')}</p>}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <Button asChild><Link to="/portal/stunden">Stunden erfassen</Link></Button>
            <Button asChild variant="secondary"><Link to="/portal/rapport">Rapport fotografieren</Link></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{monthLabelDe(currentMonth())}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {overview ? (
            <>
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Genehmigt {hoursFromMinutes(overview.approved_minutes)} h</span>
                  <span>Referenz {hoursFromMinutes(overview.reference_minutes)} h</span>
                </div>
                <Progress value={pct} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Eingereicht (offen)" value={`${hoursFromMinutes(overview.submitted_minutes)} h`} tone={overview.submitted_minutes > 0 ? 'warn' : undefined} />
                <Stat label="Abgelehnt" value={`${hoursFromMinutes(overview.rejected_minutes)} h`} tone={overview.rejected_minutes > 0 ? 'bad' : undefined} />
                <Stat label="Samstag genehmigt" value={`${hoursFromMinutes(overview.saturday_approved_minutes)} h`} />
                <Stat label="Samstag eingereicht" value={`${hoursFromMinutes(overview.saturday_submitted_minutes)} h`} />
              </div>
              <p className="text-xs text-muted-foreground">Die Referenzstunden dienen nur als Orientierung. Dein Lohn wird von der Verwaltung festgelegt.</p>
            </>
          ) : (
            <Empty>Noch keine Daten.</Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalHome;
