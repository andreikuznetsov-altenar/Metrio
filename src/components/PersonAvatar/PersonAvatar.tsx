import { useEffect, useMemo, useState } from "react";
import type { Person } from "../../domain/people/types";
import { resolvePersonAvatarIdentity } from "../../domain/people/personDirectory";
import { getInitials } from "../../platform/avatar";
import {
  fetchEmployeeAvatarDataUrl,
  invalidateEmployeeAvatarCache,
  peekCachedEmployeeAvatar,
  resolveAvatarSubdomain,
} from "../../services/bamboo/bambooAvatarService";
import { bambooPhotoSizeForAvatar } from "./personAvatarPhotoSize";
import "./PersonAvatar.css";

export type PersonAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<PersonAvatarSize, string> = {
  xs: "person-avatar--xs",
  sm: "person-avatar--sm",
  md: "person-avatar--md",
  lg: "person-avatar--lg",
  xl: "person-avatar--xl",
};

export interface PersonAvatarProps {
  person?: Person | null;
  personId?: string;
  displayName?: string;
  bambooEmployeeId?: string;
  size?: PersonAvatarSize;
  className?: string;
}

export function PersonAvatar({
  person,
  personId,
  displayName,
  bambooEmployeeId,
  size = "sm",
  className,
}: PersonAvatarProps) {
  const identity = useMemo(
    () =>
      resolvePersonAvatarIdentity({
        person,
        personId,
        displayName,
        bambooEmployeeId,
      }),
    [person, personId, displayName, bambooEmployeeId],
  );

  const photoSize = bambooPhotoSizeForAvatar(size);
  const initials = getInitials(identity.displayName);
  const skipRemoteAvatar = import.meta.env.MODE === "test";

  const [src, setSrc] = useState<string | null>(null);
  const [photoVisible, setPhotoVisible] = useState(false);

  useEffect(() => {
    if (skipRemoteAvatar) {
      setSrc(null);
      setPhotoVisible(false);
      return;
    }

    const employeeId = identity.bambooEmployeeId;
    if (!employeeId) {
      setSrc(null);
      setPhotoVisible(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const subdomain = await resolveAvatarSubdomain();
      if (!subdomain || cancelled) return;

      const cached = peekCachedEmployeeAvatar(employeeId, subdomain, photoSize);
      if (cached !== undefined) {
        setSrc(cached);
        setPhotoVisible(Boolean(cached));
        return;
      }

      const dataUrl = await fetchEmployeeAvatarDataUrl(employeeId, subdomain, photoSize);
      if (!cancelled) {
        setSrc(dataUrl);
        setPhotoVisible(Boolean(dataUrl));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identity.bambooEmployeeId, photoSize, skipRemoteAvatar]);

  const classes = ["person-avatar", SIZE_CLASS[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden data-testid="person-avatar">
      <span className="person-avatar__initials">{initials}</span>
      {src ? (
        <img
          className={[
            "person-avatar__photo",
            photoVisible ? "person-avatar__photo--visible" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setPhotoVisible(true)}
          onError={() => {
            setSrc(null);
            setPhotoVisible(false);
            const employeeId = identity.bambooEmployeeId;
            if (!employeeId) return;
            void resolveAvatarSubdomain().then((subdomain) => {
              if (!subdomain) return;
              invalidateEmployeeAvatarCache(employeeId, subdomain, photoSize, "broken-image");
            });
          }}
        />
      ) : null}
    </span>
  );
}
