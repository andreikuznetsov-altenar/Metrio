import "./workspace-content-loading.css";

export interface WorkspaceContentLoadingStateProps {
  title: string;
  body?: string;
  testId?: string;
  className?: string;
}

/**
 * Centered workspace bootstrap placeholder (no skeleton cards).
 */
export function WorkspaceContentLoadingState({
  title,
  body,
  testId = "workspace-content-loading",
  className,
}: WorkspaceContentLoadingStateProps) {
  return (
    <div
      className={["workspace-content-loading-host", className].filter(Boolean).join(" ")}
      data-testid={testId}
    >
      <section
        className="home-empty-state home-empty-state--centered workspace-content-loading"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <h2 className="home-empty-state__title">{title}</h2>
        {body ? <p className="home-empty-state__body">{body}</p> : null}
        <div className="workspace-content-loading__indicator" aria-hidden="true" />
      </section>
    </div>
  );
}
