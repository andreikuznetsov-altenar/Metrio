import type { HTMLAttributes, ReactNode } from "react";
import "./Card.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export function Card({
  title,
  description,
  children,
  className,
  ...props
}: CardProps) {
  const classes = ["card", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      {title ? <h3 className="card__title">{title}</h3> : null}
      {description ? <p className="card__description">{description}</p> : null}
      {children}
    </div>
  );
}
