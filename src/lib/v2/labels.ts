export const FLAG_LABELS: Record<string, string> = {
  missing_time: 'Zeit fehlt',
  invalid_time: 'Ungültige Zeit',
  total_mismatch: 'Summe weicht ab',
  low_confidence: 'Unsicher gelesen',
  unmatched_worker: 'Mitarbeiter nicht gefunden',
  ambiguous_worker: 'Mitarbeiter nicht eindeutig',
  implausible_hours: 'Unplausible Stunden',
  missing_name: 'Name fehlt',
};

export const DUPLICATE_LABELS: Record<string, string> = {
  same_file_hash: 'Identische Bilddatei bereits eingereicht',
  worker_overlap: 'Gleicher Mitarbeiter, gleiches Datum und gleicher Auftrag in anderem Rapport',
  same_document_number: 'Gleiche Rapportnummer bereits vorhanden',
  existing_time_entry: 'Für diesen Mitarbeiter und Tag existieren bereits Stunden',
};

export const BLOCKER_LABELS: Record<string, string> = {
  not_verified: 'Zeile nicht bestätigt',
  worker_unresolved: 'Mitarbeiter nicht zugeordnet',
  times_missing: 'Zeiten fehlen',
  invalid_hours: 'Ungültige Stunden',
  no_account: 'Mitarbeiter hat kein Konto',
  duplicate_line_in_report: 'Überschneidung innerhalb des Rapports',
  conflict: 'Konflikt mit bestehenden Stunden – Auflösung wählen',
};

export const LEAVE_TYPES: Record<string, string> = {
  annual_leave: 'Ferien',
  unpaid_leave: 'Unbezahlter Urlaub',
  personal_day: 'Persönlicher Freitag',
  sick_notification: 'Krankmeldung',
  other_absence: 'Andere Absenz',
  day_off: 'Freier Tag',
};

export const EXTRACTION_LABELS: Record<string, string> = {
  not_requested: 'Keine KI-Auswertung',
  pending: 'KI wartet',
  processing: 'KI läuft …',
  succeeded: 'KI-Vorschlag (muss geprüft werden)',
  failed: 'KI fehlgeschlagen',
  not_configured: 'KI nicht eingerichtet – manuell erfassen',
};
