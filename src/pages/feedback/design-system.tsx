import type { ComponentProps, ReactNode } from "react";
import { Badge, type BadgeVariant } from "../../components/Badge/Badge";
import { Button as BaseButton } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import {
  Drawer as BaseDrawer,
  type DrawerSize,
} from "../../components/Drawer/Drawer";
import { MetrioDatePicker } from "../../components/DatePicker/MetrioDatePicker";
import { Input } from "../../components/Input/Input";
import { Select } from "../../components/Select/Select";
import { ScrollArea } from "../../components/ScrollArea/ScrollArea";
import { PageSubnav } from "../../shell/PageSubnav";
import "../page-content.css";
import "./feedback-ds.css";

type BannerTone = "info" | "warning" | "danger" | "success";

function mapBannerVariant(variant?: string): BannerTone {
  switch (variant) {
    case "error":
      return "danger";
    case "loading":
      return "info";
    case "success":
      return "success";
    case "warning":
      return "warning";
    default:
      return "info";
  }
}

function toneToBadge(tone?: string): BadgeVariant {
  switch (tone) {
    case "green":
      return "success";
    case "blue":
      return "info";
    case "orange":
      return "warning";
    case "red":
      return "danger";
    default:
      return "neutral";
  }
}

export { Badge, type BadgeVariant } from "../../components/Badge/Badge";

export function Button({
  size: _size,
  ...props
}: ComponentProps<typeof BaseButton> & { size?: string }) {
  return <BaseButton {...props} />;
}

export { Input };

export function Drawer({
  title,
  footer,
  open,
  onClose,
  children,
  size = "default",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  size?: DrawerSize;
}) {
  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      ariaLabel={title}
      size={size}
      header={<h2 className="feedback-ds__drawer-title">{title}</h2>}
      footer={
        footer ? <div className="feedback-ds__drawer-footer">{footer}</div> : undefined
      }
    >
      {children}
    </BaseDrawer>
  );
}

export function MetrioScrollArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ScrollArea
      className={["metrio-scroll--primary", className].filter(Boolean).join(" ")}
    >
      {children}
    </ScrollArea>
  );
}

export function Section({
  title,
  subtitle,
  headerRight,
  children,
  variant = "card",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  variant?: "card" | "plain";
}) {
  if (variant === "plain") {
    return (
      <section className="feedback-block">
        <div className="feedback-block__header">
          <div>
            {typeof title === "string" ? (
              <h3 className="feedback-block__title">{title}</h3>
            ) : (
              title
            )}
            {subtitle ? <p className="feedback-block__subtitle">{subtitle}</p> : null}
          </div>
          {headerRight ? <div className="feedback-block__header-right">{headerRight}</div> : null}
        </div>
        <div className="feedback-block__body">{children}</div>
      </section>
    );
  }

  return (
    <Card
      title={typeof title === "string" ? title : "Section"}
      description={subtitle ? String(subtitle) : undefined}
    >
      {headerRight ? <div className="feedback-ds__header-right">{headerRight}</div> : null}
      {children}
    </Card>
  );
}

export function Segmented({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number; disabled?: boolean; title?: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <PageSubnav
      items={tabs.map((tab) => ({
        id: tab.id,
        label:
          tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label,
      }))}
      activeId={active}
      onChange={onChange}
      ariaLabel="Feedback sections"
    />
  );
}

/** Persistent / blocking messages only — prefer toasts for transient success. */
export function StatusBanner({
  children,
  tone,
  variant,
}: {
  children: ReactNode;
  tone?: BannerTone;
  variant?: string;
}) {
  const resolved = tone || mapBannerVariant(variant);
  return (
    <div className={`feedback-ds__banner feedback-ds__banner--${resolved}`} role="status">
      {children}
    </div>
  );
}

export function Status({
  children,
  tone,
  variant: _variant,
}: {
  children: ReactNode;
  tone?: string;
  variant?: string;
}) {
  return <Badge variant={toneToBadge(tone)}>{children}</Badge>;
}

export function Tag({
  children,
  variant,
  tone,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  tone?: string;
}) {
  const resolved = variant || toneToBadge(tone);
  return <Badge variant={resolved}>{children}</Badge>;
}

export function MetricCard({
  label,
  value,
  hint,
  status,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  status?: ReactNode;
}) {
  return (
    <div className="feedback-ds__metric">
      <div className="feedback-ds__metric-label">{label}</div>
      <div className="feedback-ds__metric-value">{value}</div>
      {status ? <div className="feedback-ds__metric-status">{status}</div> : null}
      {hint ? <div className="feedback-ds__metric-hint">{hint}</div> : null}
    </div>
  );
}

export function StickyActionBar({
  children,
  left,
  right,
}: {
  children?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}) {
  if (left || right) {
    return (
      <div className="feedback-ds__sticky feedback-ds__sticky--split">
        <div className="feedback-ds__sticky-left">{left}</div>
        <div className="feedback-ds__sticky-right">{right}</div>
      </div>
    );
  }
  return <div className="feedback-ds__sticky">{children}</div>;
}

export function DatePicker({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <MetrioDatePicker
      label={label}
      value={value}
      disabled={disabled}
      onChange={(iso) => onChange?.(iso)}
    />
  );
}

export function InputPassword(props: ComponentProps<typeof Input>) {
  return <Input {...props} type="password" />;
}

export function SelectDropdown({
  label = "",
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      label={label}
      value={value}
      options={options}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function DrawerActions({ children }: { children: ReactNode }) {
  return <div className="feedback-ds__drawer-actions">{children}</div>;
}

export function DrawerPrimaryAction(props: ComponentProps<typeof Button>) {
  return <Button {...props} variant="primary" />;
}

export function Checkbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="feedback-ds__checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      {label}
    </label>
  );
}
