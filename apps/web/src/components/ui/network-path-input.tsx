import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupInput,
} from '@/components/ui/input-group';

interface NetworkPathInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  recentPaths: string[];
  onSelectPath: (path: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function NetworkPathInput({
  value,
  onChange,
  placeholder,
  recentPaths,
  onSelectPath,
  className,
  readOnly = false,
}: NetworkPathInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFocus = () => {
    if (recentPaths.length > 0 && !readOnly) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Delay 150ms para permitir click nos itens do dropdown antes de fechar
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleSelect = (path: string) => {
    onSelectPath(path);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <InputGroupText>
            <FolderOpen className="size-4" />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          readOnly={readOnly}
        />
      </InputGroup>

      {isOpen && recentPaths.length > 0 && (
        <ul
          className={cn(
            'absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none',
            'max-h-48 overflow-y-auto',
          )}
          role="listbox"
          aria-label="Caminhos de rede recentes"
        >
          {recentPaths.map((path, idx) => (
            <li
              key={idx}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                // Previne o blur antes do click
                e.preventDefault();
                handleSelect(path);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                'hover:bg-accent hover:text-accent-foreground',
              )}
              title={path}
            >
              <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{path}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
