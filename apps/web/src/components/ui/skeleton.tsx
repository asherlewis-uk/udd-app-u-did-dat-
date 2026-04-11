import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md animate-shimmer',
        className,
      )}
      aria-hidden="true"
    />
  );
}
