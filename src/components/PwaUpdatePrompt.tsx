import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

const PwaUpdatePrompt = () => {
  const toastIdRef = useRef<string | number | null>(null);
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Check for updates periodically while app is open.
      window.setInterval(() => {
        void registration.update();
      }, 60_000);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast.success("App eshte gati per perdorim ne mode offline.");
  }, [offlineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    if (toastIdRef.current) return;

    toastIdRef.current = toast.message("Version i ri i app-it eshte gati.", {
      description: "Kliko perditeso qe te marresh patch-in dhe mundesite e reja.",
      duration: Infinity,
      action: {
        label: "Perditeso tani",
        onClick: async () => {
          toast.dismiss();
          toast.loading("Po perditesohet app-i...", { id: "pwa-updating" });

          let reloaded = false;
          const forceReload = () => {
            if (reloaded) return;
            reloaded = true;
            window.location.reload();
          };

          navigator.serviceWorker?.addEventListener("controllerchange", forceReload, { once: true });

          try {
            await updateServiceWorker(true);
            window.setTimeout(forceReload, 1500);
          } catch {
            window.setTimeout(forceReload, 500);
          }
        },
      },
      cancel: {
        label: "Me vone",
        onClick: () => {
          if (toastIdRef.current) toast.dismiss(toastIdRef.current);
          toastIdRef.current = null;
        },
      },
      onDismiss: () => {
        toastIdRef.current = null;
      },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default PwaUpdatePrompt;
