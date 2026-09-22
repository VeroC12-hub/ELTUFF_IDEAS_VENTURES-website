import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground text-sm px-4 py-2 flex items-center gap-2">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>You're offline — the app is open, but sales, stock and reports need a connection. Reconnect to continue.</span>
    </div>
  );
}
