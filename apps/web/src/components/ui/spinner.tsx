import { cn } from '@/lib/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-3.5 w-3.5 border',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-2',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border-current border-t-transparent animate-spin opacity-70',
        sizes[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
