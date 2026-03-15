import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RowActionsMenu from '@/components/admin/RowActionsMenu';
import { Star } from 'lucide-react';
import { inventoryApi } from '@/lib/erp-api';
import type { InventoryItem } from '@/lib/erp-types';

const categories: InventoryItem['category'][] = ['Frames', 'Platforms', 'Guardrails', 'Anchors', 'Tools'];
const INVENTORY_FAVORITES_KEY = 'inventory_favorite_products_v1';

type SectionConfig = {
  id: string;
  label: string;
  category: InventoryItem['category'];
  products: Array<{
    name: string;
    measures: string[];
  }>;
};

const sectionConfigs: SectionConfig[] = [
  {
    id: 'MONTAGEGERUESTE',
    label: 'MONTAGEGERUESTE (Kuadro Montimi)',
    category: 'Frames',
    products: [
      {
        name: 'Montagerahmen, Stahl; 0,73 m',
        measures: ['0,67 × 0,73 m', '1,00 × 0,73 m', '1,50 × 0,73 m', '2,00 × 0,73 m'],
      },
      {
        name: 'Montagerahmen, Stahl; 0,73 m (mit eingepressten Rohrverbindern)',
        measures: ['0,67 × 0,73 m', '1,00 × 0,73 m', '1,50 × 0,73 m', '2,00 × 0,73 m'],
      },
      { name: 'Rahmentafel, Stahl; 0,73 m', measures: ['0,67 × 0,73 m', '1,00 × 0,73 m', '1,50 × 0,73 m', '2,00 × 0,73 m'] },
      { name: 'Rahmentafel, Stahl; 0,73 m (mit 4 Geländer-Keilgehäusen)', measures: ['2,00 × 0,73 m'] },
      { name: 'Rahmentafel, Aluminium; 0,73 m', measures: ['0,67 × 0,73 m', '1,00 × 0,73 m', '1,50 × 0,73 m', '2,00 × 0,73 m'] },
      { name: 'Rahmentafel, Stahl; 1,09 m', measures: ['0,67 × 1,09 m', '1,00 × 1,09 m', '1,50 × 1,09 m', '2,00 × 1,09 m'] },
      { name: 'Rahmentafel, Stahl; 1,09 m (mit 4 Geländer-Keilgehäusen)', measures: ['2,00 × 1,09 m'] },
      { name: 'Auslegertafel', measures: ['2,00 × 0,37 m', '2,00 × 0,53 m'] },
      { name: 'Dachschutz-Verlaengerungstafel', measures: ['2,00 × 0,73 m (bis 1,09 m)'] },
      { name: 'Abhebeschutz', measures: ['0,36 m'] },
      { name: 'Durchgangstafel (3-teilig)', measures: ['2,20 × 1,57 m'] },
      { name: 'Rahmentafel; 0,37 m', measures: ['2,00 × 0,37 m'] },
      { name: 'DS-Konsoletafel', measures: ['0,99 × 0,73 m', '0,99 × 1,09 m'] },
      { name: 'DS-Geschossleiter', measures: ['1,00 m'] },
    ],
  },
  {
    id: 'BELAEGE_AUFSTIEG',
    label: 'GERUESTBELAEGE / AUFSTIEGSBELAEGE',
    category: 'Platforms',
    products: [
      { name: 'Stahlbelag; 0,32 m breit', measures: ['0,73 × 0,32 m', '1,09 × 0,32 m', '1,57 × 0,32 m', '2,07 × 0,32 m', '2,57 × 0,32 m', '3,07 × 0,32 m', '4,14 × 0,32 m'] },
      { name: 'Holzbelag; 0,32 m breit', measures: ['0,73 × 0,32 m', '1,09 × 0,32 m', '1,57 × 0,32 m', '2,07 × 0,32 m', '2,57 × 0,32 m', '3,07 × 0,32 m'] },
      { name: 'Vollalu-Belag; 0,32 m breit', measures: ['1,09 × 0,32 m', '1,57 × 0,32 m', '2,07 × 0,32 m', '2,57 × 0,32 m', '3,07 × 0,32 m', '4,14 × 0,32 m'] },
      { name: 'ALBLITZ-Rahmenplattform; 0,60 m breit', measures: ['0,50 × 0,60 m', '0,73 × 0,60 m', '1,09 × 0,60 m', '1,57 × 0,60 m', '2,07 × 0,60 m', '2,57 × 0,60 m', '3,07 × 0,60 m'] },
      { name: 'Zwischenbelag, Stahl', measures: ['1,57 × 0,19 m', '2,07 × 0,19 m', '2,57 × 0,19 m', '3,07 × 0,19 m'] },
      { name: 'Lueckendeckel', measures: ['1,57 × 0,10 m', '2,07 × 0,10 m', '2,57 × 0,10 m', '3,07 × 0,10 m'] },
      { name: 'ALBLITZ-Leichtbelag; 0,60 m breit', measures: ['1,57 × 0,60 m', '2,07 × 0,60 m', '2,57 × 0,60 m', '3,07 × 0,60 m'] },
      { name: 'ALBLITZ-Aufstiegsbelag mit Leiter', measures: ['2,57 × 0,60 m', '3,07 × 0,60 m'] },
      { name: 'ALBLITZ-Aufstiegsbelag ohne Leiter', measures: ['1,57 × 0,60 m', '2,07 × 0,60 m', '2,57 × 0,60 m', '3,07 × 0,60 m'] },
      { name: 'Stahlbohle', measures: ['1,00 × 0,30 m', '1,50 × 0,30 m', '2,00 × 0,30 m', '2,50 × 0,30 m'] },
      { name: 'Federsplint', measures: ['0,03 m'] },
    ],
  },
  {
    id: 'TREPPEN',
    label: 'TREPPEN (Shkalle)',
    category: 'Platforms',
    products: [
      { name: 'Geschossleiter, Stahl', measures: ['2,00 × 0,40 m'] },
      { name: 'Geschossleiter, Aluminium', measures: ['2,00 × 0,40 m'] },
      { name: 'ALBLITZ-Antrittstreppe, Aluminium', measures: ['1,09 × 0,67 m', '1,40 × 1,00 m'] },
      { name: 'Treppengelaender, Aluminium', measures: ['1,40 × 1,00 m'] },
      { name: 'ALBLITZ-Treppe, Aluminium', measures: ['2,07 × 1,50 m', '2,57 × 2,00 m', '3,07 × 2,00 m'] },
      { name: 'Innengelaender fuer Aluminiumtreppe', measures: ['2,00 m'] },
      { name: 'ALBLITZ-Treppengelaender, doppelt', measures: ['2,07 × 1,50 m', '2,57 × 2,00 m', '3,07 × 2,00 m'] },
      { name: 'Treppenwangensicherung', measures: ['1,00 × 0,50 m'] },
      { name: 'Lueckenschliesser fuer Aluminiumtreppen', measures: ['0,28 × 0,50 m', '0,36 × 0,50 m'] },
    ],
  },
  {
    id: 'SEITENSCHUTZ',
    label: 'SEITENSCHUTZ / GELAENDER / BORDBRETTER',
    category: 'Guardrails',
    products: [
      { name: 'TRBS-Gelaender, Endgelaender, Stahl', measures: ['0,73 m', '1,09 m'] },
      { name: 'TRBS-Gelaender, starr, Stahl', measures: ['0,73 m', '1,09 m', '1,57 m'] },
      { name: 'TRBS-Gelaender, klappbar, Stahl', measures: ['2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Vorlaufgelaenderpfosten, Stahl', measures: ['2,00 m'] },
      { name: 'Vorlauf-Endgelaenderrahmen, Stahl', measures: ['0,73 m', '1,09 m'] },
      { name: 'Vorlauf-Teleskopgelaender', measures: ['2,00 – 2,57 m', '2,50 – 3,07 m'] },
      { name: 'Gelaenderrohr, Stahl', measures: ['0,73 m', '1,09 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Doppelgelaender, Stahl', measures: ['1,57 m', '2,07 m', '2,57 m', '3,07 m', '4,14 m'] },
      { name: 'Doppelgelaender, Aluminium', measures: ['1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Endgelaenderrahmen, Stahl', measures: ['1,00 × 0,73 m', '1,00 × 1,09 m'] },
      { name: 'Bordbrett, Holz', measures: ['0,73 m', '1,09 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m', '4,14 m'] },
      { name: 'Bordbrett, Stahl', measures: ['0,73 m', '1,09 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m', '4,14 m'] },
      { name: 'Stirnbordbrett, Holz', measures: ['0,73 m', '1,09 m'] },
      { name: 'Stirnbordbrett, Stahl', measures: ['0,73 m', '1,09 m'] },
    ],
  },
  {
    id: 'ERGAENZUNG',
    label: 'ERGAENZUNGSTEILE / KUPPLUNGEN / ZUBEHOER',
    category: 'Tools',
    products: [
      { name: 'Horizontalriegel, Stahl', measures: ['2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Diagonale, Stahl', measures: ['2,36 m', '2,80 m', '3,20 m', '3,60 m'] },
      { name: 'Riegel, Stahl WS 19', measures: ['0,73 m', '1,09 m'] },
      { name: 'Fussspindel, Stahl', measures: ['0,40 m', '0,60 m', '0,80 m'] },
      { name: 'Fahrtraverse, Stahl', measures: ['1,60 m', '2,00 m'] },
      { name: 'Laufrolle', measures: ['0,35 m'] },
      { name: 'Normalkupplung WS 19', measures: ['48/48 mm'] },
      { name: 'Drehkupplung WS 19', measures: ['48/48 mm'] },
      { name: 'Halbkupplung WS 19', measures: ['48/- mm'] },
      { name: 'Spannkupplung WS 19', measures: ['48/48 mm'] },
      { name: 'Geruestrohr, Stahl', measures: ['1,00 m', '2,00 m', '3,00 m', '4,00 m', '5,00 m', '6,00 m'] },
      { name: 'Geruestrohr, Aluminium', measures: ['1,00 m', '2,00 m', '3,00 m', '4,00 m', '5,00 m', '6,00 m'] },
      { name: 'PSA-Set', measures: ['Standard'] },
    ],
  },
  {
    id: 'VERANKERUNG',
    label: 'VERANKERUNG (Ankorimi)',
    category: 'Anchors',
    products: [
      { name: 'Ankerhuelse, Stahl', measures: ['Länge 300 mm', 'Länge 350 mm', 'Länge 475 mm'] },
      { name: 'Ringschraube, verzinkt Ø 12 mm', measures: ['300 mm', '350 mm', '500 mm'] },
      { name: 'Wellrohr, Kunststoff schwarz', measures: ['25 m'] },
      { name: 'WDVS-Daemmstoffstopfen', measures: ['220 mm'] },
      { name: 'Splint, verzinkt 12×70 mm', measures: ['0,1 m'] },
      { name: 'Lamellenduebel, Kunststoff Ø 32 mm', measures: ['Standard'] },
      { name: 'Ankerkupplung WS 19', measures: ['48/- mm'] },
    ],
  },
  {
    id: 'KONSOLEN_TRAEGER',
    label: 'KONSOLEN / GITTERTRAEGER',
    category: 'Frames',
    products: [
      { name: 'Konsole, Stahl', measures: ['0,24 m', '0,36 m', '0,50 m', '0,73 m', '1,09 m'] },
      { name: 'Inneneckkonsole, Stahl', measures: ['0,27 m'] },
      { name: 'Diagonalkreuzstrebe, Stahl', measures: ['1,77 m', '1,95 m'] },
      { name: 'Abhebeschutz fuer Konsole, Stahl', measures: ['0,36 m', '0,50 m', '0,73 m', '1,09 m'] },
      { name: 'Gittertraeger, Stahl', measures: ['3,20 × 0,45 m', '4,20 × 0,45 m', '5,20 × 0,45 m', '6,20 × 0,45 m', '7,77 × 0,45 m'] },
      { name: 'Gittertraeger, Aluminium', measures: ['3,20 × 0,45 m', '4,20 × 0,45 m', '5,20 × 0,45 m', '6,20 × 0,45 m', '8,20 × 0,45 m'] },
      { name: 'Gittertraeger-Querriegel, Stahl', measures: ['0,73 m', '1,09 m'] },
    ],
  },
  {
    id: 'VERTIKALE_TRAGELEMENTE_PLUS',
    label: 'Vertikale Tragelemente (shtese)',
    category: 'Frames',
    products: [
      { name: 'Vertikalrahmen mit eingedruecktem Rohrverbinder', measures: ['0,50 m', '1,00 m', '1,50 m', '2,00 m', '2,50 m', '3,00 m', '4,00 m'] },
      { name: 'Vertikalrahmen ohne Rohrverbinder', measures: ['0,50 m', '1,00 m', '1,50 m', '2,00 m', '2,50 m', '3,00 m', '4,00 m'] },
      { name: 'Vertikalrahmen mit integriertem Rohrverbinder', measures: ['0,50 m', '1,00 m', '1,50 m', '2,00 m', '2,50 m', '3,00 m', '4,00 m'] },
      { name: 'Vertikalstartrahmen mit integriertem Rohrverbinder', measures: ['0,66 m', '1,16 m', '1,66 m', '2,16 m', '2,66 m', '3,16 m'] },
      { name: 'Rohrverbinder (Ersatzteil)', measures: ['0,52 m', '0,50 m'] },
      { name: 'Sechskantschraube M12x60 mm', measures: ['0,05 m'] },
      { name: 'Adapterplatte zur Bodenverankerung', measures: ['Standard'] },
      { name: 'Fusskragen', measures: ['0,33 m'] },
      { name: 'Durchgangsrahmenfachwerktrager', measures: ['1,57 m'] },
      { name: 'Fussspindel', measures: ['0,40 m', '0,60 m', '0,80 m'] },
      { name: 'Fussspindel, schwenkbar', measures: ['0,60 m'] },
      { name: 'Kopfspindel U', measures: ['0,60 m'] },
      { name: 'Hangegeruestverbinder', measures: ['0,60 m', '0,80 m'] },
      { name: 'Sicherungsvorrichtung fuer Fussspindel', measures: ['0,65 m'] },
      { name: 'Laufrolle', measures: ['0,50 m'] },
      { name: 'Flanschlaufrolle', measures: ['0,70 m'] },
    ],
  },
  {
    id: 'HORIZONTALE_TRAGELEMENTE_PLUS',
    label: 'Horizontale Tragelemente / Seitenschutz (shtese)',
    category: 'Guardrails',
    products: [
      { name: 'Rohrriegel', measures: ['0,36 m', '0,39 m', '0,45 m', '0,73 m', '1,04 m', '1,09 m', '1,29 m', '1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m', '4,14 m'] },
      { name: 'Rohrriegel, verstaerkt', measures: ['1,09 m', '1,29 m', '1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'U-Riegel', measures: ['0,39 m', '0,45 m', '0,73 m', '1,04 m', '1,09 m', '1,29 m'] },
      { name: 'U-Riegel, verstaerkt', measures: ['1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Abhebeschutz', measures: ['0,45 m', '0,73 m', '1,09 m', '1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Zwischenbelagtrager', measures: ['0,32 m', '0,64 m', '0,96 m'] },
      { name: 'Zwischenbelagtrager U', measures: ['0,32 m', '0,64 m', '0,96 m'] },
      { name: 'Bretttrager (Rohrhalterung)', measures: ['0,73 m', '1,09 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Bretttrager (U-Profil)', measures: ['0,73 m', '1,09 m'] },
      { name: 'U-Belagtrager Richtungswechsel', measures: ['0,73 m', '1,09 m', '1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Nischenkonsolenhalter', measures: ['0,70 m', '1,00 m'] },
      { name: 'Nischenkonsolenstartplatte', measures: ['0,35 m'] },
      { name: 'Bordlatte, Holz', measures: ['0,73 m', '1,09 m', '1,29 m', '1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m', '4,14 m'] },
      { name: 'Bordlatte, Stahl', measures: ['0,73 m', '1,09 m', '1,29 m', '1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Querbordlatte mit Rohrhalterung, Holz', measures: ['0,73 m', '1,04 m', '1,09 m', '1,29 m', '1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Doppelabschlussgitter', measures: ['0,73 m', '1,09 m'] },
    ],
  },
  {
    id: 'DIAGONAL_AUSSTEIFUNG_PLUS',
    label: 'Diagonalaussteifung (shtese)',
    category: 'Tools',
    products: [
      { name: 'Vertikaldiagonale', measures: ['Feld 0,73-3,07 x 0,50-2,00'] },
      { name: 'Horizontaldiagonale', measures: ['2,07x0,73', '2,07x1,09', '2,57x0,73', '2,57x1,09', '3,07x0,73', '3,07x1,09'] },
      { name: 'Horizontaldiagonalriegel', measures: ['1,57x1,57', '2,07x2,07', '2,57x2,57', '3,07x3,07'] },
    ],
  },
  {
    id: 'BELAEGE_ZUGAENGE_PLUS',
    label: 'Geruestbelaege / Zugaenge (shtese)',
    category: 'Platforms',
    products: [
      { name: 'Stahlbelag; 0,32 m breit', measures: ['0,73 m', '1,09 m', '1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m', '4,14 m'] },
      { name: 'Stahlbelag mit Rohrhalterung; 0,32 m', measures: ['0,73 m', '1,09 m', '1,40 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Holzbelag; 0,32 m breit', measures: ['0,73 m', '1,09 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Rahmenplattform mit Rohrhalterung; 0,60 m', measures: ['1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'ALBLITZ Leichtbelag; 0,60 m', measures: ['1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Aufstiegsbelag mit Rohrhalterung und Leiter', measures: ['2,57 m', '3,07 m'] },
      { name: 'Aufstiegsbelag mit Rohrhalterung, ohne Leiter', measures: ['1,57 m', '2,07 m'] },
      { name: 'Zwischenbelag mit Rohrhalterung, Stahl', measures: ['1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'Federbuegel (Ersatzteil)', measures: ['Standard'] },
      { name: 'Eckbelag, verstellbar', measures: ['0,60 m'] },
      { name: 'Eckbelag', measures: ['0,39x0,39', '0,73x0,73'] },
    ],
  },
  {
    id: 'KONSOLEN_PLUS',
    label: 'Konsolen (shtese)',
    category: 'Frames',
    products: [
      { name: 'Konsole (1a)', measures: ['0,28 m'] },
      { name: 'Konsole (1b)', measures: ['0,36 m'] },
      { name: 'Konsole (1c)', measures: ['0,39 m'] },
      { name: 'Konsole (1d)', measures: ['0,73 m'] },
      { name: 'Konsole mit 2 Keilkoepfen', measures: ['0,73 m'] },
      { name: 'Konsole 1,09 m', measures: ['1,09 m'] },
      { name: 'Konsolenstrebe', measures: ['2,05 m'] },
      { name: 'Konsole mit Rohrhalterung (5a/5b)', measures: ['0,39 m', '0,73 m'] },
      { name: 'Konsole mit Riegelbefestigung (6a/6b)', measures: ['0,36 m', '0,73 m'] },
    ],
  },
  {
    id: 'GITTERTRAEGER_PLUS',
    label: 'Gittertraeger (shtese)',
    category: 'Frames',
    products: [
      { name: 'Gittertraeger (1a)', measures: ['2,07 m', '2,57 m', '3,07 m', '4,14 m', '5,14 m', '6,14 m', '7,71 m'] },
      { name: 'U-Gittertraeger (1b)', measures: ['2,07 m', '2,57 m', '3,07 m', '4,14 m', '5,14 m', '6,14 m', '7,71 m'] },
      { name: 'Gittertraegerqueraussteifung', measures: ['0,73 m', '1,09 m'] },
      { name: 'Rohrverbinder fuer U-2-Belagtraeger', measures: ['0,40 m'] },
      { name: 'Rohrverbinder fuer Gittertraeger (4a/4b)', measures: ['0,30 m'] },
      { name: 'Gelaenderstaender (mit Rohrhalterung)', measures: ['1,65 m'] },
    ],
  },
  {
    id: 'TREPPEN_LEITERN_PLUS',
    label: 'Treppen / Leitern / Gelaender (shtese)',
    category: 'Platforms',
    products: [
      { name: 'Treppenwange (1a)', measures: ['1,57x1,00', '2,57x1,50', '2,57x2,00'] },
      { name: 'Treppenwange (1b)', measures: ['1,57x1,00', '2,57x1,50', '2,57x2,00'] },
      { name: 'Treppenwange 750 kg/m2', measures: ['0,73x0,50', '1,57x1,00', '2,57x1,00', '2,57x1,50'] },
      { name: 'Treppengelaender mit Kindersicherung', measures: ['0,73', '1,09', '1,57', '2,07', '2,57', '3,07'] },
      { name: 'Drehtuer', measures: ['0,70 m', '1,00 m'] },
      { name: 'Klemmkuppler, universell', measures: ['0,20 m'] },
      { name: 'Konsole fuer Startstufe', measures: ['0,36 m'] },
      { name: 'Ueberbrueckungsbelag', measures: ['1,09 m', '1,57 m', '2,07 m', '2,57 m', '3,07 m'] },
      { name: 'ALBLITZ Treppe, Aluminium, Breite 0,62 m', measures: ['1,40x1,00', '2,07x1,50', '2,57x2,00', '3,07x2,00'] },
      { name: 'Etagenleiter, Aluminium', measures: ['2,00x0,40'] },
      { name: 'Etagenleiter, Stahl', measures: ['2,00x0,40'] },
      { name: 'Anlegeleiter fuer Geruest', measures: ['2,00 m', '3,00 m'] },
      { name: 'Leitersegment fuer Etage', measures: ['0,73x0,50'] },
      { name: 'ALBLITZ Plattformgelaender', measures: ['2,57 m', '3,07 m'] },
      { name: 'Wangensturzsicherung', measures: ['1,00x0,50'] },
    ],
  },
  {
    id: 'ZUBEHOER_PLUS',
    label: 'Zubehoer / Kupplungen (shtese)',
    category: 'Tools',
    products: [
      { name: 'Drehkuppler', measures: ['48/48 mm'] },
      { name: 'Normalkuppler', measures: ['48/48 mm'] },
      { name: 'Keilkopfkuppler, fest', measures: ['Standard'] },
      { name: 'Keilkopfkuppler, schwenkbar', measures: ['Standard'] },
      { name: 'Distanzkuppler, fest', measures: ['155 mm', '180 mm'] },
      { name: 'Klauenkuppler', measures: ['48/- mm'] },
      { name: 'Halbkuppler', measures: ['48/- mm'] },
      { name: 'Zugkuppler', measures: ['48/48 mm'] },
      { name: 'Rohrverbinder fuer Zugkuppler', measures: ['Standard'] },
      { name: 'Universalrohrverbinder 0,24 m, klemmbar', measures: ['0,24 m'] },
      { name: 'Kantholzkuppler', measures: ['SW19'] },
      { name: 'Sechskantschraube M14x65', measures: ['M14x65 mm'] },
      { name: 'Sechskantmutter M14', measures: ['M14'] },
      { name: 'Distanzrohr', measures: ['0,40 m', '1,00 m', '1,30 m', '1,50 m'] },
      { name: 'Schnellverschlussanker', measures: ['0,60 m'] },
    ],
  },
];

const InventoryPage = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [quantityById, setQuantityById] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);
  const [form, setForm] = useState({
    section_id: sectionConfigs[0].id,
    product_name: '',
    product_measure: '',
    manual_item_name: '',
    manual_measure: '',
    quantity_to_add: '',
  });

  const load = async () => setItems(await inventoryApi.list());
  useEffect(() => { load(); }, []);

  const selectedSection = useMemo(
    () => sectionConfigs.find((s) => s.id === form.section_id) || sectionConfigs[0],
    [form.section_id],
  );
  const selectedProduct = useMemo(
    () => selectedSection.products.find((p) => p.name === form.product_name) || null,
    [selectedSection, form.product_name],
  );
  const globalFavoriteProducts = useMemo(() => {
    return favoriteProducts
      .map((key) => {
        const [sectionId, productName] = key.split('::');
        const section = sectionConfigs.find((s) => s.id === sectionId);
        if (!section || !productName) return null;
        const product = section.products.find((p) => p.name === productName);
        if (!product) return null;
        return {
          key,
          sectionId,
          sectionLabel: section.label,
          productName: product.name,
        };
      })
      .filter((x): x is { key: string; sectionId: string; sectionLabel: string; productName: string } => Boolean(x));
  }, [favoriteProducts]);
  const filteredSectionProducts = useMemo(
    () =>
      selectedSection.products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.trim().toLowerCase()),
      ),
    [selectedSection, productSearch],
  );
  const favoriteProductsInSection = useMemo(
    () =>
      selectedSection.products.filter((p) =>
        favoriteProducts.includes(`${selectedSection.id}::${p.name}`),
      ),
    [selectedSection, favoriteProducts],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INVENTORY_FAVORITES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setFavoriteProducts(parsed.filter((x) => typeof x === 'string'));
    } catch {
      setFavoriteProducts([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(INVENTORY_FAVORITES_KEY, JSON.stringify(favoriteProducts));
  }, [favoriteProducts]);

  const filteredItems = useMemo(
    () => items
      .filter((item) => (categoryFilter === 'all' ? true : item.category === categoryFilter))
      .sort((a, b) => `${a.category}-${a.item_name}`.localeCompare(`${b.category}-${b.item_name}`)),
    [items, categoryFilter],
  );

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.total += Number(item.total_quantity || 0);
        acc.used += Number(item.used_quantity || 0);
        acc.available += Number(item.available_quantity || 0);
        return acc;
      },
      { total: 0, used: 0, available: 0 },
    );
  }, [filteredItems]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const quantity = Number(form.quantity_to_add);
    const usingCatalogProduct = Boolean(form.product_name.trim()) && !form.manual_item_name.trim();
    const baseName = form.manual_item_name.trim() || form.product_name.trim();
    const selectedMeasure = form.manual_measure.trim() || form.product_measure.trim();
    const finalItemName = selectedMeasure ? `${baseName} - ${selectedMeasure}` : baseName;

    if (!baseName) {
      alert('Zgjidh ose shkruaj emrin e produktit.');
      return;
    }
    if (usingCatalogProduct && selectedProduct && selectedProduct.measures.length > 0 && !selectedMeasure) {
      alert('Te lutem zgjedh masen e produktit para ruajtjes.');
      return;
    }
    if (Number.isNaN(quantity) || quantity <= 0) {
      alert('Sasia duhet te jete numer pozitiv.');
      return;
    }
    if (!confirm('A je i sigurt qe do ta shtosh kete sasi ne inventar?')) return;
    setIsSubmitting(true);
    try {
      await inventoryApi.addStock({
        category: selectedSection.category,
        item_name: finalItemName,
        quantity,
      });
      setForm((prev) => ({
        ...prev,
        product_name: '',
        product_measure: '',
        manual_item_name: '',
        manual_measure: '',
        quantity_to_add: '',
      }));
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEdit = async (item: InventoryItem) => {
    if (!confirm('A je i sigurt qe do ta ruash editimin?')) return;
    setActionLoadingId(`edit-${item.id}`);
    try {
      await inventoryApi.update(item.id, {
        category: item.category,
        item_name: item.item_name,
        total_quantity: item.total_quantity,
        used_quantity: item.used_quantity,
      });
      setEditingId(null);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm('A je i sigurt qe do ta fshish kete artikull inventari?')) return;
    setActionLoadingId(`delete-${id}`);
    try {
      await inventoryApi.remove(id);
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const quickAddToExisting = async (item: InventoryItem) => {
    const qty = Number(quantityById[item.id] || 0);
    if (Number.isNaN(qty) || qty <= 0) {
      alert('Shkruaj sasi pozitive per shtim.');
      return;
    }
    if (!confirm(`A je i sigurt qe do shtosh +${qty} te "${item.item_name}"?`)) return;
    setActionLoadingId(`quick-add-${item.id}`);
    try {
      await inventoryApi.addStock({ category: item.category, item_name: item.item_name, quantity: qty });
      setQuantityById((prev) => ({ ...prev, [item.id]: '' }));
      await load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const selectedProductKey = `${selectedSection.id}::${form.product_name}`;
  const selectedIsFavorite = favoriteProducts.includes(selectedProductKey);
  const toggleFavorite = (productName: string) => {
    const key = `${selectedSection.id}::${productName}`;
    setFavoriteProducts((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };
  const selectGlobalFavorite = (sectionId: string, productName: string) => {
    setForm((prev) => ({
      ...prev,
      section_id: sectionId,
      product_name: productName,
      product_measure: '',
      manual_item_name: '',
      manual_measure: '',
    }));
    setProductSearch('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventari (total automatik)</h2>
      <Card>
        <CardHeader><CardTitle>Shto/Blej stok (+)</CardTitle></CardHeader>
        <CardContent>
          {globalFavoriteProducts.length > 0 && (
            <div className="mb-4">
              <Label className="mb-2 block">Favorite Products (Global)</Label>
              <div className="flex flex-wrap gap-2">
                {globalFavoriteProducts.map((fav) => (
                  <Button
                    key={`global-fav-${fav.key}`}
                    type="button"
                    size="sm"
                    variant={form.section_id === fav.sectionId && form.product_name === fav.productName ? 'default' : 'outline'}
                    onClick={() => selectGlobalFavorite(fav.sectionId, fav.productName)}
                    title={fav.sectionLabel}
                  >
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {fav.productName}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Grupi i produkteve</Label>
              <Select
                value={form.section_id}
                onValueChange={(v) =>
                  setForm((s) => ({
                    ...s,
                    section_id: v,
                    product_name: '',
                    product_measure: '',
                    manual_item_name: '',
                    manual_measure: '',
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{sectionConfigs.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Kategori DB: {selectedSection.category}</p>
            </div>
            <div>
              <Label>Produkti</Label>
              <Input
                className="mb-2"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Kerko produkt..."
              />
              <Select
                value={form.product_name}
                onValueChange={(v) => setForm((s) => ({ ...s, product_name: v, product_measure: '' }))}
              >
                <SelectTrigger><SelectValue placeholder="Zgjidh produkt nga lista" /></SelectTrigger>
                <SelectContent>
                  {filteredSectionProducts.map((p) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {favoriteProductsInSection.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {favoriteProductsInSection.map((p) => (
                    <Button
                      key={`fav-${p.name}`}
                      type="button"
                      size="sm"
                      variant={form.product_name === p.name ? 'default' : 'outline'}
                      onClick={() => setForm((s) => ({ ...s, product_name: p.name, product_measure: '' }))}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      {p.name}
                    </Button>
                  ))}
                </div>
              )}
              {form.product_name && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => toggleFavorite(form.product_name)}
                >
                  <Star className={`h-3.5 w-3.5 mr-1 ${selectedIsFavorite ? 'fill-current' : ''}`} />
                  {selectedIsFavorite ? 'Hiq nga favorites' : 'Shto ne favorites'}
                </Button>
              )}
            </div>
            <div>
              <Label>Masa</Label>
              <Select
                value={form.product_measure}
                onValueChange={(v) => setForm((s) => ({ ...s, product_measure: v }))}
                disabled={!selectedProduct}
              >
                <SelectTrigger><SelectValue placeholder={selectedProduct ? 'Zgjidh masen' : 'Zgjidh produktin fillimisht'} /></SelectTrigger>
                <SelectContent>
                  {(selectedProduct?.measures || []).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ose emri manual (nese nuk gjendet)</Label>
              <Input
                value={form.manual_item_name}
                onChange={(e) => setForm((s) => ({ ...s, manual_item_name: e.target.value }))}
                placeholder="p.sh. Rahmentafel 2.00 x 0.73"
              />
            </div>
            <div>
              <Label>Masa manuale (opsionale)</Label>
              <Input
                value={form.manual_measure}
                onChange={(e) => setForm((s) => ({ ...s, manual_measure: e.target.value }))}
                placeholder="p.sh. 2,00 × 0,73 m"
              />
            </div>
            <div>
              <Label>Sasia qe shtohet (+)</Label>
              <Input
                type="number"
                value={form.quantity_to_add}
                onChange={(e) => setForm((s) => ({ ...s, quantity_to_add: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-4">
              <p className="text-xs text-muted-foreground mb-2">
                Emri qe ruhet: {(form.manual_item_name.trim() || form.product_name.trim()) || '—'}
                {(form.manual_measure.trim() || form.product_measure.trim()) ? ` - ${form.manual_measure.trim() || form.product_measure.trim()}` : ''}
              </p>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Duke shtuar...' : 'Shto ne inventar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tabela finale e inventarit</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Filtro kategorine</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Te gjitha</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 flex flex-wrap items-end gap-3 text-sm">
              <span>Artikuj: <strong>{filteredItems.length}</strong></span>
              <span>Total: <strong>{totals.total}</strong></span>
              <span>Ne perdorim: <strong>{totals.used}</strong></span>
              <span>Disponueshem: <strong>{totals.available}</strong></span>
            </div>
          </div>

          <div className="border rounded-md overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2">Produkti</th>
                  <th className="text-left p-2">Kategoria</th>
                  <th className="text-right p-2">Totali</th>
                  <th className="text-right p-2">Ne pune</th>
                  <th className="text-right p-2">Disponueshme</th>
                  <th className="text-left p-2">Shto +</th>
                  <th className="text-left p-2">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-t">
                    {editingId === item.id ? (
                      <>
                        <td className="p-2">
                          <Input
                            value={item.item_name}
                            onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, item_name: e.target.value } : x))}
                          />
                        </td>
                        <td className="p-2">
                          <Select value={item.category} onValueChange={(v) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, category: v as InventoryItem['category'] } : x))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="p-2 text-right">{item.total_quantity}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={item.used_quantity}
                            onChange={(e) => setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, used_quantity: Number(e.target.value) } : x))}
                          />
                        </td>
                        <td className="p-2 text-right">{item.available_quantity}</td>
                        <td className="p-2" />
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button size="sm" disabled={actionLoadingId === `edit-${item.id}`} onClick={() => saveEdit(item)}>
                              {actionLoadingId === `edit-${item.id}` ? 'Duke ruajtur...' : 'Ruaj'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Anulo</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2">{item.item_name}</td>
                        <td className="p-2">{item.category}</td>
                        <td className="p-2 text-right">{item.total_quantity}</td>
                        <td className="p-2 text-right">{item.used_quantity}</td>
                        <td className="p-2 text-right font-semibold">{item.available_quantity}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Input
                              className="w-24"
                              type="number"
                              value={quantityById[item.id] || ''}
                              onChange={(e) => setQuantityById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="sasia"
                            />
                            <Button size="sm" onClick={() => quickAddToExisting(item)} disabled={actionLoadingId === `quick-add-${item.id}`}>
                              {actionLoadingId === `quick-add-${item.id}` ? '...' : '+ Shto'}
                            </Button>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <RowActionsMenu
                              disabled={actionLoadingId === `delete-${item.id}`}
                              actions={[
                                { label: 'Edito', onClick: () => setEditingId(item.id) },
                                {
                                  label: actionLoadingId === `delete-${item.id}` ? 'Duke fshire...' : 'Fshi',
                                  onClick: () => removeItem(item.id),
                                  disabled: actionLoadingId === `delete-${item.id}`,
                                  destructive: true,
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredItems.length === 0 && <p className="text-sm text-muted-foreground">Nuk ka artikuj per kete filter.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;
