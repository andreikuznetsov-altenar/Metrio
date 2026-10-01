import { DatePicker, Input, Section, SelectDropdown } from './design-system';

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
    <Section title="Survey setup">
      <div className="ds-filter-row ds-filter-row--embedded">
        <div className="ds-filter-row__grid ds-filter-row__grid--four">
          <DatePicker label="Start date" value={dateFrom} onChange={onDateFromChange} />
          <DatePicker label="End date" value={dateTo} onChange={onDateToChange} />
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
            placeholder="All projects"
          />
        </div>
      </div>
    </Section>
  );
}
