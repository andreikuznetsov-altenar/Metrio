import { useEffect, useState } from "react";
import { resolveBambooSubdomain } from "../../config/product";
import { getInitials } from "../../platform/avatar";
import { loadPreferences } from "../../platform/preferences";
import { fetchEmployeeAvatarDataUrl } from "../../services/bamboo/bambooAvatarService";
import "./PersonAvatar.css";

export type PersonAvatarSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<PersonAvatarSize, string> = {
  sm: "person-avatar--sm",
  md: "person-avatar--md",
  lg: "person-avatar--lg",
};

export interface PersonAvatarProps {
  employeeId: string;
  displayName: string;
  size?: PersonAvatarSize;
  className?: string;
}

export function PersonAvatar({
  employeeId,
  displayName,
  size = "sm",
  className,
}: PersonAvatarProps) {
  const [src, setSrc] = useState<string | null>(null);
  const initials = getInitials(displayName);
  const skipRemoteAvatar =
    import.meta.env.MODE === "test" ||
    import.meta.env.VITE_VISUAL_FIXTURE === "1";

  useEffect(() => {
    if (skipRemoteAvatar) return;
    let cancelled = false;
    void (async () => {
      const prefs = await loadPreferences();
      const subdomain = resolveBambooSubdomain(prefs);
      if (!subdomain || !employeeId) return;
      const dataUrl = await fetchEmployeeAvatarDataUrl(employeeId, subdomain);
      if (!cancelled) {
        setSrc(dataUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId, skipRemoteAvatar]);

  const classes = ["person-avatar", SIZE_CLASS[size], className]
    .filter(Boolean)
    .join(" ");

  if (src) {
    return (
      <img
        className={classes}
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        onError={() => setSrc(null)}
      />
    );
  }

  return (
    <span className={classes} aria-hidden>
      {initials}
    </span>
  );
}
