import { Skeleton } from "../../components/Skeleton/Skeleton";
import "./performance-skeletons.css";

export function PerformanceOverviewSkeleton() {
  return (
    <div
      className="performance-skeleton-dashboard"
      data-testid="performance-overview-skeleton"
      aria-busy="true"
      aria-label="Loading performance overview"
    >
      <section aria-hidden className="performance-section">
        <div className="performance-metrics">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="performance-metric-card performance-skeleton-card">
              <Skeleton variant="text" width="40%" height={12} />
              <Skeleton variant="text" width="55%" height={28} className="performance-skeleton-gap" />
              <Skeleton variant="text" width="35%" height={12} />
            </div>
          ))}
        </div>
      </section>

      <section aria-hidden className="performance-section">
        <Skeleton variant="text" width={120} height={14} />
        <div className="performance-skeleton-attention">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="performance-skeleton-attention-row">
              <Skeleton variant="circle" width={32} height={32} />
              <div className="performance-skeleton-attention-row__main">
                <Skeleton variant="text" width="45%" height={12} />
                <Skeleton variant="text" width="70%" height={12} />
              </div>
              <Skeleton variant="rect" width={48} height={20} />
            </div>
          ))}
        </div>
      </section>

      <section aria-hidden className="performance-section">
        <Skeleton variant="text" width={100} height={14} />
        <div className="performance-trends">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="performance-trend-card performance-skeleton-card">
              <Skeleton variant="text" width="50%" height={12} />
              <Skeleton variant="text" width="40%" height={22} className="performance-skeleton-gap" />
              <Skeleton variant="rect" width="100%" height={56} />
            </div>
          ))}
        </div>
      </section>

      <PerformanceTableSkeleton rows={4} columns={5} />
      <section aria-hidden className="performance-section">
        <Skeleton variant="text" width={80} height={14} />
        <Skeleton variant="rect" width="100%" height={48} className="performance-skeleton-gap" />
      </section>
    </div>
  );
}

export interface PerformanceTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function PerformanceTableSkeleton({
  rows = 5,
  columns = 4,
}: PerformanceTableSkeletonProps) {
  return (
    <section
      aria-hidden
      className="performance-section"
      data-testid="performance-table-skeleton"
    >
      <Skeleton variant="text" width={140} height={14} />
      <div className="performance-table-wrap performance-skeleton-table">
        <div className="performance-skeleton-table__head">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} variant="text" height={12} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="performance-skeleton-table__row">
            {Array.from({ length: columns }).map((__, colIndex) => (
              <Skeleton key={colIndex} variant="text" height={12} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function PersonDrawerSkeleton() {
  return (
    <div className="performance-skeleton-drawer" data-testid="person-drawer-skeleton" aria-busy="true">
      <Skeleton variant="circle" width={40} height={40} />
      <Skeleton variant="text" width="50%" height={16} />
      <div className="performance-metrics performance-metrics--compact">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rect" width="100%" height={52} />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} variant="rect" width="100%" height={36} className="performance-skeleton-gap" />
      ))}
    </div>
  );
}
