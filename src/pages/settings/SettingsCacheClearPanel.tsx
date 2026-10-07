import { Button } from "../../components/Button/Button";
import { useToast } from "../../components/Toast/ToastContext";
import { resetRecreatableCaches } from "../../platform/observability/observabilityStore";

export function SettingsCacheClearPanel() {
  const { success } = useToast();

  return (
    <div className="settings-card__body settings-cache-clear" data-testid="settings-cache-clear">
      <p className="settings-card__description">
        Remove in-memory caches that Metrio can rebuild on the next refresh.
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          resetRecreatableCaches();
          success("Temporary caches cleared");
        }}
      >
        Clear temporary caches
      </Button>
    </div>
  );
}
