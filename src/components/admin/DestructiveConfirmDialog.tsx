import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type DestructiveConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` = veprim i rrezikshëm (fshirje); `default` = konfirmim neutral (ruaj / rikthe). */
  confirmVariant?: 'destructive' | 'default';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

/** Konfirmim i qartë për veprime që nuk kthehen lehtë (fshirje, arkivim masiv, etj.). */
export function DestructiveConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Po, vazhdo',
  cancelLabel = 'Anulo',
  confirmVariant = 'destructive',
  onConfirm,
  loading = false,
}: DestructiveConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className={cn(
              confirmVariant === 'destructive' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}
            onClick={(e) => {
              e.preventDefault();
              void Promise.resolve(onConfirm())
                .then(() => onOpenChange(false))
                .catch(() => {});
            }}
          >
            {loading ? 'Duke u përpunuar...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
