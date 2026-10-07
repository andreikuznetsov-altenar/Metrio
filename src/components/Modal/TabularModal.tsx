import type { ReactNode } from "react";
import { Modal, type ModalProps } from "./Modal";
import "./tabular-modal.css";

export interface TabularModalProps extends Omit<ModalProps, "className"> {
  children: ReactNode;
  /** Applied to the inner content wrapper (table area). */
  testId?: string;
  className?: string;
}

/**
 * Centered modal shell for read-only task/issue tables (task list, no-activity, counts).
 */
export function TabularModal({
  children,
  testId,
  className,
  ...modalProps
}: TabularModalProps) {
  return (
    <Modal
      {...modalProps}
      className={["metrio-modal--tabular", "metrio-modal--task-list", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="metrio-tabular-modal" data-testid={testId}>
        {children}
      </div>
    </Modal>
  );
}
