import { useEffect, useState } from "react";
import { OPEN_RESOURCES_EVENT } from "../platform/openOnboardingResource";

export function useResourceLibrary() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_RESOURCES_EVENT, handler);
    return () => window.removeEventListener(OPEN_RESOURCES_EVENT, handler);
  }, []);

  return {
    open,
    openLibrary: () => setOpen(true),
    closeLibrary: () => setOpen(false),
  };
}
