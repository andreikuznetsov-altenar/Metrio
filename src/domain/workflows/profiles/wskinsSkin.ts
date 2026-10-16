import { createStatusMapProfile } from '../createStatusMapProfile';

const downstreamWaitingOverride = {
  countsAsActiveWork: false,
  countsAsReview: false,
  countsAsQa: false,
  countsAsWaiting: false,
  countsAsHold: false,
  countsAsAttentionEligible: false,
  countsAsCapacityContributor: false,
  isTerminal: false,
  isCompletion: false,
};

export const wskinsSkinWorkflowProfile = createStatusMapProfile({
  id: 'wskins_skin',
  label: 'WSkins Skin',
  statusMap: {
    'Not started WS': 'backlog',
    'To Do': 'backlog',
    Todo: 'backlog',
    'In Progress': 'active',
    'Internal Review': 'hold',
    'On Hold': 'hold',
    'On approval': 'waiting',
    'PRE-LIVE': 'waiting',
    'PRE-Live': 'waiting',
    Live: 'waiting',
    LIVE: 'waiting',
    Archived: 'waiting',
    Archive: 'waiting',
    Done: 'waiting',
  },
  transitionRules: [
    { from: 'backlog', to: 'active', startsCycle: true },
    { from: 'active', to: 'hold', countsAsReviewSubmission: true, completesCycle: true },
  ],
  stageOverrides: {
    hold: {
      countsAsActiveWork: false,
      countsAsHold: true,
      countsAsAttentionEligible: false,
      countsAsCapacityContributor: false,
      isCompletion: true,
    },
    waiting: downstreamWaitingOverride,
  },
  // Done is terminal and Archive is a storage state: no live effort. Live / PRE-LIVE / On approval
  // are downstream waits (default external_wait).
  effortByStatus: { Done: 'none', Archived: 'none', Archive: 'none' },
});
