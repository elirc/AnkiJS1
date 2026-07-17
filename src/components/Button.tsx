import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';

const variants: Record<ButtonVariant, string> = {
  primary:
    'border-primary bg-gradient-to-b from-primary to-primary-pressed text-white shadow-sm shadow-primary/30 hover:from-primary-pressed hover:to-primary-pressed',
  secondary: 'border-line bg-surface text-text shadow-sm hover:border-primary/40 hover:bg-primary/5',
  ghost: 'border-transparent bg-transparent text-text hover:bg-primary/10',
  danger: 'border-again bg-again text-white shadow-sm shadow-again/30 hover:bg-again/90',
  inverse: 'border-white/20 bg-white text-primary shadow-sm hover:bg-white/90',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  children?: ReactNode;
}

export function Button({
  className,
  variant = 'secondary',
  icon: Icon,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold outline-none transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variants[variant],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
