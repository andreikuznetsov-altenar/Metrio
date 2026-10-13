import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { openExternalUrl } from "../../platform/openExternal";
import "./EntityLink.css";

export interface EntityLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> {
  /**
   * Side-effect hook only (e.g. `stopPropagation` so a row click does not also fire). It can never
   * replace the link's behavior: an external href always opens in the system browser.
   */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  href?: string | null;
  onNavigate?: () => void;
  mono?: boolean;
  children: ReactNode;
}

export function EntityLink({
  href,
  onNavigate,
  onClick: onClickSideEffect,
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
      {...rest}
      href={href ?? "#"}
      className={classes}
      // Must come AFTER the spread: a stray `onClick={undefined}` in rest would otherwise erase
      // this handler and let the browser navigate the Metrio webview to the external URL.
      onClick={(event) => {
        onClickSideEffect?.(event);
        event.preventDefault();
        if (onNavigate) {
          onNavigate();
          return;
        }
        if (href) void openExternalUrl(href);
      }}
    >
      {children}
    </a>
  );
}
