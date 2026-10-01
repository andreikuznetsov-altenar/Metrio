import type { ReactNode } from "react";
import "./ui.css";

export interface CardProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function Card({ title, description, children }: CardProps) {
  return (
    <section className="ui-card">
      {title ? <h2 className="ui-card__title">{title}</h2> : null}
      {description ? <p className="ui-card__desc">{description}</p> : null}
      {children}
    </section>
  );
}
