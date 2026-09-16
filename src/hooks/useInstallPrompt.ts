import { useEffect, useState } from "react";
import { getInstallState, promptInstall } from "@/lib/pwaInstall";

export function useInstallPrompt() {
  const [state, setState] = useState(getInstallState());

  useEffect(() => {
    const update = () => setState(getInstallState());
    window.addEventListener("pwa-install-changed", update);
    return () => window.removeEventListener("pwa-install-changed", update);
  }, []);

  return { ...state, promptInstall };
}
