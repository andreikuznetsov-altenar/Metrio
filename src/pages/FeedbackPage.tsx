import { useState } from "react";
import { Card } from "../components/Card/Card";
import { PageSubnav } from "../shell/PageSubnav";
import type { FeedbackView } from "./feedback/types";
import "./page-content.css";

const NAV: { id: FeedbackView; label: string }[] = [
  { id: "survey", label: "Survey" },
  { id: "delivery", label: "Delivery" },
  { id: "results", label: "Results" },
  { id: "history", label: "History" },
];

function PanelCopy({
  title,
  description,
  empty,
}: {
  title: string;
  description: string;
  empty: string;
}) {
  return (
    <Card title={title} description={description}>
      <p className="page-content__lead">{empty}</p>
    </Card>
  );
}

export function FeedbackPage() {
  const [view, setView] = useState<FeedbackView>("survey");

  return (
    <div className="page-content">
      <PageSubnav
        items={NAV}
        activeId={view}
        onChange={setView}
        ariaLabel="Feedback views"
      />

      {view === "survey" ? (
        <PanelCopy
          title="Survey"
          description="Create or edit the active feedback form."
          empty="No survey draft yet. Publishing connects in a later integration step."
        />
      ) : null}

      {view === "delivery" ? (
        <PanelCopy
          title="Delivery"
          description="Choose recipients and send the survey."
          empty="No delivery batch scheduled."
        />
      ) : null}

      {view === "results" ? (
        <PanelCopy
          title="Results"
          description="Summary scores and open responses."
          empty="Results appear after the first completed survey."
        />
      ) : null}

      {view === "history" ? (
        <PanelCopy
          title="History"
          description="Past surveys and send batches."
          empty="No past surveys on record."
        />
      ) : null}
    </div>
  );
}
