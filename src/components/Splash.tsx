import { useEffect, useState } from 'react';

export function Splash() {
  const [state, setState] = useState<'visible' | 'hiding' | 'hidden'>('visible');

  useEffect(() => {
    const t = setTimeout(() => setState('hiding'), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (state !== 'hiding') return;
    const t = setTimeout(() => setState('hidden'), 500);
    return () => clearTimeout(t);
  }, [state]);

  if (state === 'hidden') return null;

  return (
    <div
      id="splash"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d0d0f] transition-opacity duration-500 ease-out"
      style={{ opacity: state === 'hiding' ? 0 : 1 }}
    >
      <div
        className="absolute w-[200px] h-[200px] rounded-full opacity-50"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
          animation: 'splash-pulse 2s ease-in-out infinite',
        }}
      />
      <div className="relative flex flex-col items-center">
        <div
          className="w-[240px] h-[240px] rounded-2xl overflow-hidden flex items-center justify-center bg-transparent"
          style={{
            animation: 'splash-scale 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          <img
            src="/icon.png"
            alt="SprintNest"
            className="w-[240px] h-[240px] object-contain"
          />
        </div>
        <span
          className="mt-1 text-2xl font-semibold text-white tracking-tight"
          style={{
            fontFamily: 'Inter, -apple-system, sans-serif',
            letterSpacing: '-0.02em',
            animation: 'splash-fade 0.8s ease-out 0.3s both',
          }}
        >
          SprintNest
        </span>
      </div>
    </div>
  );
}
