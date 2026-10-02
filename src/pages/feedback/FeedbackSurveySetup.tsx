import { DatePicker, Input, Section, SelectDropdown } from './design-system';
import { FEEDBACK_HELP } from './feedbackHelp';

export function FeedbackSurveySetup({
  dateFrom,
  dateTo,
  scope,
  projectsText,
  onDateFromChange,
  onDateToChange,
  onScopeChange,
  onProjectsChange,
}: {
  dateFrom: string;
  dateTo: string;
  scope: 'full' | 'direct';
  projectsText: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onScopeChange: (v: 'full' | 'direct') => void;
  onProjectsChange: (v: string) => void;
}) {
  return (
    <Section title="Survey scope" subtitle={FEEDBACK_HELP.surveyScope} variant="plain">
      <div className="ds-filter-row ds-filter-row--embedded">
        <div className="ds-filter-row__grid ds-filter-row__grid--four">
          <DatePicker label="From" value={dateFrom} onChange={onDateFromChange} />
          <DatePicker label="To" value={dateTo} onChange={onDateToChange} />
          <SelectDropdown
            label="Team scope"
            value={scope}
            options={[
              { value: 'full', label: 'Full reporting tree' },
              { value: 'direct', label: 'Direct reports only' },
            ]}
            onChange={(v) => onScopeChange(v as 'full' | 'direct')}
          />
          <Input
            label="Projects (optional)"
            value={projectsText}
            onChange={(e) => onProjectsChange(e.target.value)}
            placeholder="Comma-separated keys, or leave empty for all"
          />
        </div>
      </div>
    </Section>
  );
}
