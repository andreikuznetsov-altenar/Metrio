import type { AnchorHTMLAttributes, ReactNode } from "react";
import { openExternalUrl } from "../../platform/openExternal";
import "./EntityLink.css";

export interface EntityLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> {
  href?: string | null;
  onNavigate?: () => void;
  mono?: boolean;
  children: ReactNode;
}

export function EntityLink({
  href,
  onNavigate,
  mono = false,
  className,
  children,
  ...rest
}: EntityLinkProps) {
  if (!href && !onNavigate) {
    return (
      <span
        className={["entity-link--static", mono ? "entity-link--mono" : "", className]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </span>
    );
  }

  const classes = [
    "entity-link",
    mono ? "entity-link--mono" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      href={href ?? "#"}
      className={classes}
      onClick={(event) => {
        event.preventDefault();
        if (onNavigate) {
          onNavigate();
          return;
        }
        if (href) void openExternalUrl(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
