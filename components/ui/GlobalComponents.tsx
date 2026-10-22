'use client';

import React, { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

// ============================================================================
// components/ui/GlobalComponents.tsx: Reusable UI Design System Components
// Adheres strictly to Tailwind v4, flat light theme, glassmorphic dark theme,
// and Sentence Case (strictly NO uppercase utilities)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. BUTTON COMPONENT
// ----------------------------------------------------------------------------
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading = false, disabled, className = '', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs min-h-[36px]',
      md: 'px-4 py-2.5 text-sm min-h-[44px]',
      lg: 'px-6 py-3 text-base min-h-[48px]',
    }[size];

    const variantStyles = {
      primary:
        'bg-cyan-600 hover:bg-cyan-700 text-white shadow-none border border-cyan-500/30',
      secondary:
        'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-none',
      danger:
        'bg-red-600 hover:bg-red-700 text-white shadow-none border border-red-500/30',
      outline:
        'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-none',
      ghost:
        'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-0 shadow-none',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ----------------------------------------------------------------------------
// 2. INPUT COMPONENT
// ----------------------------------------------------------------------------
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full bg-white dark:bg-zinc-900 border ${
            error
              ? 'border-red-500 focus:ring-red-500/30'
              : 'border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:ring-cyan-500/20'
          } rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 outline-none transition-all shadow-none ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ----------------------------------------------------------------------------
// 3. SELECT COMPONENT
// ----------------------------------------------------------------------------
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-white dark:bg-zinc-900 border ${
            error
              ? 'border-red-500 focus:ring-red-500/30'
              : 'border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:ring-cyan-500/20'
          } rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:ring-2 outline-none transition-all shadow-none ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ----------------------------------------------------------------------------
// 4. BADGE COMPONENT
// ----------------------------------------------------------------------------
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '', ...props }) => {
  const variantStyles = {
    default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    danger: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20',
    info: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// ----------------------------------------------------------------------------
// 5. CARD COMPONENT
// ----------------------------------------------------------------------------
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, header, footer, className = '', ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-none overflow-hidden ${className}`}
      {...props}
    >
      {header && (
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          {footer}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// 6. EMPTY STATE COMPONENT
// ----------------------------------------------------------------------------
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl ${className}`}>
      {icon && (
        <div className="p-3 mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
          {icon}
        </div>
      )}
      <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">{title}</h4>
      {description && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

// ----------------------------------------------------------------------------
// 7. CONFIRM DIALOG COMPONENT
// ----------------------------------------------------------------------------
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-4 animate-scale-up">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
