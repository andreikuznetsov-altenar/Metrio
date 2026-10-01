import type { ComponentProps, ReactNode } from "react";
import { Button as BaseButton } from "../../components/Button/Button";
import { Card } from "../../components/Card/Card";
import { Drawer as BaseDrawer } from "../../components/Drawer/Drawer";
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
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      ariaLabel={title}
      header={<h2 className="feedback-ds__drawer-title">{title}</h2>}
    >
      {children}
      {footer ? <div className="feedback-ds__drawer-footer">{footer}</div> : null}
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
  return <ScrollArea className={className}>{children}</ScrollArea>;
}

export function Section({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
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
  return (
    <span className={`feedback-ds__status feedback-ds__status--${tone || "grey"}`}>
      {children}
    </span>
  );
}

export function Tag({
  children,
  variant,
  tone,
}: {
  children: ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  tone?: string;
}) {
  const resolved = variant || tone || "neutral";
  return <span className={`feedback-ds__tag feedback-ds__tag--${resolved}`}>{children}</span>;
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
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "onChange"> & {
  onChange?: (value: string) => void;
}) {
  return (
    <Input
      {...props}
      label={label}
      type="date"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
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

export function Icon({ name, size: _size }: { name: string; size?: number }) {
  return <span className="feedback-ds__icon" aria-hidden>{name.slice(0, 1)}</span>;
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
