import * as React from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface CustomButtonProps extends React.ComponentProps<typeof Button> {
  semantic?: 'success' | 'destructive' | 'warning' | 'info' | 'default';
  isLoading?: boolean;
}

export const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ className, semantic = 'default', isLoading, children, disabled, ...props }, ref) => {
    const semanticStyles = {
      default: '',
      success:
        'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/20 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-emerald-50 border-transparent',
      destructive:
        'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/20 dark:bg-red-700 dark:hover:bg-red-600 dark:text-red-50 border-transparent',
      warning:
        'bg-amber-500 text-black hover:bg-amber-600 focus-visible:ring-amber-500/20 dark:bg-amber-600 dark:text-white dark:hover:bg-amber-500 border-transparent',
      info: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500/20 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-blue-50 border-transparent',
    };

    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(semanticStyles[semantic], className)}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </Button>
    );
  },
);

CustomButton.displayName = 'CustomButton';
