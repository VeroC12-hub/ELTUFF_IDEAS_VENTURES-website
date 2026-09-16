import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Download } from "lucide-react";

export default function InstallAppBanner() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  if (isInstalled || !canInstall) return null;

  return (
    <div className="bg-primary text-primary-foreground text-sm px-4 py-2 flex items-center justify-between gap-3">
      <span>Install this app for quick access, like any other app on your device.</span>
      <Button size="sm" variant="accent" onClick={() => promptInstall()} className="shrink-0">
        <Download className="h-3.5 w-3.5 mr-1" /> Install App
      </Button>
    </div>
  );
}
