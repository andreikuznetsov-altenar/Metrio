import { Button } from "../../../components/Button/Button";

export function DashboardBlockingErrorState({
  title,
  body,
  errorMessage,
  onRetry,
  onOpenPerformance,
}: {
  title: string;
  body: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  onOpenPerformance?: () => void;
}) {
  return (
    <div className="home-page" data-testid="dashboard-blocking-error">
      <section className="home-empty-state home-empty-state--centered" role="alert">
        <h2 className="home-empty-state__title">{title}</h2>
        <p className="home-empty-state__body">{body}</p>
        {errorMessage ? (
          <p className="home-empty-state__hint">{errorMessage}</p>
        ) : null}
        <div className="home-empty-state__actions">
          {onRetry ? (
            <Button type="button" variant="primary" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {onOpenPerformance ? (
            <Button type="button" variant="secondary" onClick={onOpenPerformance}>
              Open Performance
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
