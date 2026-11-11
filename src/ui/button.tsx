import { forwardRef, type ButtonHTMLAttributes } from 'react';

// Componente no repositório, seguindo o modelo de componentes copiáveis do shadcn/ui.
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };
export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', className = '', type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={`btn btn-${variant} ${className}`} {...props} />
  ),
);
Button.displayName = 'Button';
