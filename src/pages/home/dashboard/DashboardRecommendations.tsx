import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import { IconButton } from "../../../components/IconButton/IconButton";
import type { ProductRecommendation } from "../../../domain/recommendations/buildProductRecommendations";
import {
  presentProductRecommendation,
  type RecommendationSurface,
} from "../../../domain/recommendations/presentProductRecommendation";
import { JiraIssueText } from "../../../components/JiraIssueLink/JiraIssueText";

const SEVERITY_VARIANT = {
  critical: "danger",
  watch: "warning",
  neutral: "neutral",
} as const;

const SEVERITY_LABEL = {
  critical: "Critical",
  watch: "Watch",
  neutral: "Info",
} as const;

const CAROUSEL_THRESHOLD = 3;

export function DashboardRecommendations({
  items,
  onAction,
  surface = "dashboard",
}: {
  items: ProductRecommendation[];
  onAction: (item: ProductRecommendation) => void;
  surface?: RecommendationSurface;
}) {
  const railRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const useCarousel = items.length > CAROUSEL_THRESHOLD;

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail || !useCarousel) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const left = rail.scrollLeft;
    setCanPrev(left > 1);
    setCanNext(left < maxScroll - 1);
  }, [useCarousel]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !useCarousel) {
      updateScrollState();
      return;
    }
    updateScrollState();
    const onScroll = () => updateScrollState();
    rail.addEventListener("scroll", onScroll, { passive: true });
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateScrollState())
        : null;
    observer?.observe(rail);
    window.addEventListener("resize", updateScrollState);
    return () => {
      rail.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [items.length, useCarousel, updateScrollState]);

  const scrollByCard = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>(".executive-recommendations__item");
    const gap = Number.parseFloat(getComputedStyle(rail).gap || "0") || 0;
    const step = (card?.getBoundingClientRect().width ?? rail.clientWidth / 3) + gap;
    rail.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section
      className="executive-dashboard__span-12 dashboard-section"
      aria-label="Recommendations"
      data-testid="dashboard-recommendations"
      data-recommendation-surface={surface}
      data-recommendation-carousel={useCarousel ? "true" : "false"}
    >
      <div className="dashboard-section__title-row">
        <h2 className="dashboard-section__title">Recommendations</h2>
        {useCarousel ? (
          <div className="executive-recommendations__nav" role="group" aria-label="Recommendation pages">
            <IconButton
              label="Previous recommendations"
              size="compact"
              disabled={!canPrev}
              data-testid="recommendations-prev"
              onClick={() => scrollByCard(-1)}
            >
              <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
            </IconButton>
            <IconButton
              label="Next recommendations"
              size="compact"
              disabled={!canNext}
              data-testid="recommendations-next"
              onClick={() => scrollByCard(1)}
            >
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
            </IconButton>
          </div>
        ) : null}
      </div>
      <ul
        ref={railRef}
        className={
          useCarousel
            ? "executive-recommendations__list executive-recommendations__list--carousel metrio-scroll metrio-scroll--hidden-thumb"
            : "executive-recommendations__list"
        }
        style={
          useCarousel
            ? undefined
            : ({ "--recommendation-count": Math.min(items.length, 3) } as CSSProperties)
        }
      >
        {items.map((item) => {
          const presented = presentProductRecommendation(item, surface);
          return (
            <li key={item.id} className="executive-recommendations__item">
              <div className="executive-recommendations__head">
                <Badge variant={SEVERITY_VARIANT[item.severity]}>
                  {SEVERITY_LABEL[item.severity]}
                </Badge>
              </div>
              <p className="executive-recommendations__title">
                <JiraIssueText text={item.title} />
              </p>
              <p className="executive-recommendations__copy">
                <JiraIssueText text={item.explanation} />
              </p>
              <Button
                type="button"
                variant="secondary"
                className="executive-recommendations__cta"
                data-recommendation-action={presented.actionKind}
                data-testid={`recommendation-cta-${item.id}`}
                onClick={() => onAction({ ...item, ...presented })}
              >
                {presented.actionLabel}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
