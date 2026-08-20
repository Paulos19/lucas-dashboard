'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'checked'> {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    const isChecked = checked === true;
    const isIndeterminate = checked === 'indeterminate';

    return (
      <label
        className={cn(
          'relative inline-flex items-center justify-center h-4 w-4 shrink-0 rounded-xs border border-slate-300 dark:border-slate-700 transition-colors focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 cursor-pointer',
          isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-900',
          isIndeterminate ? 'bg-blue-600 border-blue-600 text-white' : '',
          disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-blue-500',
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={isChecked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...props}
        />
        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
        {isIndeterminate && <div className="h-1.5 w-1.5 bg-white rounded-xs" />}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
