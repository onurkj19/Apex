import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import supabase from '@/lib/supabase';
import type { TeamPlanAttachment } from '@/lib/erp-types';

/** Shfaq dokumente/foto për plan (për punëtorët – URL të nënshkruara për bucket privat). */
export function TeamPlanAttachmentsView({ items }: { items: TeamPlanAttachment[] }) {
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const a of items) {
        if (!a.path) continue;
        const { data, error } = await supabase.storage.from('erp-documents').createSignedUrl(a.path, 60 * 60 * 24);
        if (!error && data?.signedUrl) next[a.path] = data.signedUrl;
      }
      if (!cancelled) setSigned(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  if (!items?.length) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dokumente & foto</p>
      <ul className="space-y-3">
        {items.map((a) => {
          const href = signed[a.path] || a.url;
          const mime = a.mime || '';
          const isImg =
            mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(a.path || '');
          const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(a.path || '');

          return (
            <li key={a.path + a.title} className="rounded-md border bg-muted/20 p-2">
              <p className="text-sm font-medium text-foreground">{a.title}</p>
              {href ? (
                isImg ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                    <img src={href} alt={a.title} className="max-h-48 w-full max-w-md rounded object-contain" />
                  </a>
                ) : (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    {isPdf ? 'Hap PDF' : 'Hap dokumentin'}
                  </a>
                )
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Duke përgatitur lidhjen…</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
