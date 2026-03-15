import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type RowAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

type RowActionsMenuProps = {
  actions: RowAction[];
  disabled?: boolean;
};

const RowActionsMenu = ({ actions, disabled = false }: RowActionsMenuProps) => {
  const visibleActions = actions.filter((action) => action.label.trim().length > 0);
  if (visibleActions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          disabled={disabled}
          aria-label="Veprime"
          className="h-9 w-9 rounded-md bg-muted/70 hover:bg-muted text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleActions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={action.onClick}
            disabled={disabled || action.disabled}
            className={action.destructive ? 'text-destructive focus:text-destructive' : undefined}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RowActionsMenu;
