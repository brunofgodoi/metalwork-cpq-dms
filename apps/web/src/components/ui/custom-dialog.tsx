import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from './sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

export interface CustomDialogProps {
  variant?: 'dialog' | 'sheet';
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'half' | 'full';
  footerActions?: React.ReactNode;
  tabs?: TabItem[];
  defaultTab?: string;
  children?: React.ReactNode;
  className?: string;
}

export function CustomDialog({
  variant = 'dialog',
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  footerActions,
  tabs,
  defaultTab,
  children,
  className,
}: CustomDialogProps) {
  // Size mapping dictionary for Dialog variants
  const dialogSizes = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-2xl',
    half: 'sm:max-w-[50vw]',
    full: 'sm:max-w-[95vw]',
  };

  // Size mapping dictionary for Sheet variants
  const sheetSizes = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    half: 'sm:max-w-[50vw] w-full sm:w-[50vw]',
    full: 'sm:max-w-full w-full',
  };

  const renderContent = () => {
    if (tabs && tabs.length > 0) {
      return (
        <Tabs
          defaultValue={defaultTab || tabs[0].value}
          className="w-full flex flex-col gap-4 flex-1"
        >
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto gap-2">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 font-medium"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="flex-1 mt-0 outline-none">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      );
    }
    return children;
  };

  if (variant === 'sheet') {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          className={cn('flex flex-col h-full overflow-y-auto', sheetSizes[size], className)}
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-2">{renderContent()}</div>
          {footerActions && (
            <SheetFooter className="mt-auto border-t pt-4">{footerActions}</SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn('flex flex-col max-h-[90vh] overflow-y-auto', dialogSizes[size], className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">{renderContent()}</div>
        {footerActions && <DialogFooter className="mt-4">{footerActions}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
