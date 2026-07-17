import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92dvh] w-full overflow-auto rounded-t-2xl border border-line bg-background p-5 shadow-xl md:max-w-2xl md:rounded-2xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <Button className="ml-auto size-11 px-0" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
