import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div className="bg-amber-100 text-amber-900 text-sm px-4 py-2 flex items-center gap-2 justify-center">
      <WifiOff size={16} /> You're offline — practice, notes and saved progress still work. AI features paused.
    </div>
  );
}
