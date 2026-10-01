import { FeedbackTeamProvider } from "../app/FeedbackTeamProvider";
import { FeedbackPage as FeedbackWorkflowPage } from "./feedback/FeedbackPage";

export function FeedbackPage() {
  return (
    <FeedbackTeamProvider>
      <FeedbackWorkflowPage />
    </FeedbackTeamProvider>
  );
}
