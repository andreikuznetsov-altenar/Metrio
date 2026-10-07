function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Jira Status Audit');
  SpreadsheetApp.getUi().showSidebar(html);
}

function getInitialFormData() {
  const props = PropertiesService.getUserProperties();

  return {
    dateFrom: props.getProperty('LAST_DATE_FROM') || '',
    dateTo: props.getProperty('LAST_DATE_TO') || getTodayIsoDate_(),
    targetReviewDays: props.getProperty('LAST_TARGET_REVIEW_DAYS') || '3',
    usersText: props.getProperty('LAST_USERS_TEXT') || '',
    projectsText: props.getProperty('LAST_PROJECTS_TEXT') || ''
  };
}

function saveLastFormData_(params) {
  const props = PropertiesService.getUserProperties();
  props.setProperty('LAST_DATE_FROM', params.dateFrom || '');
  props.setProperty('LAST_DATE_TO', params.dateTo || '');
  props.setProperty('LAST_TARGET_REVIEW_DAYS', String(params.targetReviewDays || '3'));
  props.setProperty('LAST_USERS_TEXT', params.usersText || '');
  props.setProperty('LAST_PROJECTS_TEXT', params.projectsText || '');
}

function runLastSavedReport() {
  return runJiraStatusAuditReport(getInitialFormData());
}

function runJiraStatusAuditReport(formData) {
  const params = normalizeFormData_(formData);
  validateRuntimeParams_(params);
  saveLastFormData_(params);

  const creds = getJiraCredentials_();
  const jql = buildJql_(params);

  const sheet = getActiveReportSheet_();
  prepareSheet_(sheet);

  const issueCache = {};
  const teamUsers = resolveTeamUsersForAudit_(creds, params.users);
  const teamIdentityIndex = buildTeamIdentityIndex_(teamUsers, params.users);

  let issues = fetchAllIssues_(creds, jql);

  issues.forEach(function(issue) {
    issueCache[issue.key] = issue;
  });

  const reportData = buildEnhancedJiraAuditReport_(
    issues,
    creds,
    params,
    issueCache,
    teamUsers,
    teamIdentityIndex
  );

  writeEnhancedJiraAuditReport_(sheet, {
    params: params,
    creds: creds,
    issuesCount: issues.length,
    groupedData: reportData
  });

  writeTimeStatAutoSheet_(reportData);
  writeFirstPassRateAutoSheet_(reportData);

  return {
    ok: true,
    issuesFound: issues.length,
    transitionsFound: reportData.totalTransitions,
    sheetName: sheet.getName()
  };
}

function normalizeFormData_(formData) {
  const data = formData || {};

  return {
    dateFrom: (data.dateFrom || '').trim(),
    dateTo: (data.dateTo || '').trim() || getTodayIsoDate_(),
    targetReviewDays: Math.max(1, Number(data.targetReviewDays || 3) || 3),
    usersText: (data.usersText || '').trim(),
    projectsText: (data.projectsText || '').trim(),
    users: splitLinesOrComma_(data.usersText || ''),
    projects: splitLinesOrComma_(data.projectsText || '')
  };
}

function validateRuntimeParams_(params) {
  if (!params.users.length) {
    throw new Error('Add at least one user to the Users field.');
  }

  if (params.dateFrom && !isValidDate_(params.dateFrom)) {
    throw new Error('Date from must be in the format YYYY-MM-DD.');
  }

  if (params.dateTo && !isValidDate_(params.dateTo)) {
    throw new Error('Date to must be in the format YYYY-MM-DD.');
  }

  if (params.dateFrom && params.dateTo && params.dateFrom > params.dateTo) {
    throw new Error('Date from cannot be later than date to.');
  }
}

function buildJql_(params) {
  const usersClause = params.users.map(function(v) {
    return '"' + escapeJqlValue_(v) + '"';
  }).join(', ');

  const currentAssigneeClause = 'assignee in (' + usersClause + ')';
  let historyAssigneeClause = 'assignee WAS IN (' + usersClause + ')';

  if (params.dateFrom && params.dateTo) {
    historyAssigneeClause =
      'assignee WAS IN (' + usersClause + ') DURING ("' + params.dateFrom + '", "' + params.dateTo + '")';
  } else if (params.dateFrom) {
    historyAssigneeClause =
      'assignee WAS IN (' + usersClause + ') AFTER "' + params.dateFrom + '"';
  } else if (params.dateTo) {
    historyAssigneeClause =
      'assignee WAS IN (' + usersClause + ') BEFORE "' + params.dateTo + '"';
  }

  const parts = ['(' + currentAssigneeClause + ' OR ' + historyAssigneeClause + ')'];

  if (params.projects.length) {
    const projectsClause = params.projects.map(function(v) {
      return '"' + escapeJqlValue_(v) + '"';
    }).join(', ');
    parts.push('project in (' + projectsClause + ')');
  }

  if (params.dateFrom) {
    parts.push('updated >= "' + params.dateFrom + '"');
  }

  if (params.dateTo) {
    parts.push('updated <= "' + params.dateTo + '"');
  }

  return parts.join(' AND ') + ' ORDER BY updated ASC, key ASC';
}

function fetchAllIssues_(creds, jql) {
  let nextPageToken = '';
  let allIssues = [];

  const fields = getBaseFields_();

  while (true) {
    const queryParams = {
      jql: jql,
      maxResults: CONFIG.SEARCH_PAGE_SIZE,
      fields: fields
    };

    if (nextPageToken) {
      queryParams.nextPageToken = nextPageToken;
    }

    const endpoint = '/rest/api/3/search/jql?' + toQueryString_(queryParams);
    const response = jiraRequest_(creds, endpoint, 'get');

    const issues = response.issues || [];
    allIssues = allIssues.concat(issues);

    nextPageToken = response.nextPageToken || '';

    if (!nextPageToken || issues.length === 0) {
      break;
    }
  }

  return allIssues;
}

function getBaseFields_() {
  const fields = ['summary', 'assignee', 'status', 'created', 'issuetype', 'parent'];
  if (CONFIG.CONTENT_TYPE_FIELD) fields.push(CONFIG.CONTENT_TYPE_FIELD);
  if (CONFIG.EPIC_LINK_FIELD) fields.push(CONFIG.EPIC_LINK_FIELD);
  return fields;
}

function fetchAllChangelog_(creds, issueKey) {
  let startAt = 0;
  const maxResults = CONFIG.CHANGELOG_PAGE_SIZE;
  let allValues = [];

  while (true) {
    const endpoint =
      '/rest/api/3/issue/' + encodeURIComponent(issueKey) +
      '/changelog?startAt=' + startAt + '&maxResults=' + maxResults;

    const response = jiraRequest_(creds, endpoint, 'get');
    const values = response.values || [];

    allValues = allValues.concat(values);
    startAt += values.length;

    if (!values.length || response.isLast === true) {
      break;
    }

    if (response.total && startAt >= response.total) {
      break;
    }
  }

  return allValues;
}

function fetchIssueByKeyCached_(creds, issueKey, issueCache) {
  if (!issueKey) return null;
  if (issueCache[issueKey]) return issueCache[issueKey];

  const endpoint = '/rest/api/3/issue/' + encodeURIComponent(issueKey) + '?' + toQueryString_({ fields: getBaseFields_() });
  const issue = jiraRequest_(creds, endpoint, 'get');
  issueCache[issueKey] = issue;
  return issue;
}

function resolveTeamUsersForAudit_(creds, requestedUsers) {
  return requestedUsers.map(function(inputUser) {
    const normalizedInput = normalizeTeamIdentity_(inputUser);
    let resolved = null;

    try {
      const endpoint = '/rest/api/3/user/search?' + toQueryString_({ query: inputUser });
      const users = jiraRequest_(creds, endpoint, 'get') || [];
      resolved = users[0] || null;

      for (let i = 0; i < users.length; i++) {
        const candidate = users[i];
        const candidateEmail = normalizeTeamIdentity_(candidate.emailAddress || '');
        const candidateAccountId = normalizeTeamIdentity_(candidate.accountId || '');
        const candidateName = normalizeTeamIdentity_(candidate.displayName || '');
        if (candidateEmail === normalizedInput || candidateAccountId === normalizedInput || candidateName === normalizedInput) {
          resolved = candidate;
          break;
        }
      }
    } catch (e) {}

    return {
      canonical: String(inputUser || '').trim(),
      inputUser: String(inputUser || '').trim(),
      email: resolved && resolved.emailAddress ? resolved.emailAddress : String(inputUser || '').trim(),
      displayName: resolved && resolved.displayName ? resolved.displayName : String(inputUser || '').trim(),
      accountId: resolved && resolved.accountId ? resolved.accountId : ''
    };
  });
}

function buildTeamIdentityIndex_(teamUsers, requestedUsers) {
  const identifierToCanonical = {};
  const canonicalToLabel = {};

  teamUsers.forEach(function(user, idx) {
    const canonical = user.canonical || requestedUsers[idx];
    canonicalToLabel[canonical] = user.displayName && user.displayName !== canonical
      ? user.displayName + ' <' + canonical + '>'
      : canonical;

    [
      canonical,
      user.inputUser,
      user.email,
      user.displayName,
      user.accountId
    ].forEach(function(value) {
      const key = normalizeTeamIdentity_(value);
      if (key) {
        identifierToCanonical[key] = canonical;
      }
    });
  });

  return {
    identifierToCanonical: identifierToCanonical,
    canonicalToLabel: canonicalToLabel
  };
}

function normalizeTeamIdentity_(value) {
  return String(value || '').trim().toLowerCase();
}

function parseDateStartOfDay_(value) {
  if (!value) return null;
  const d = new Date(value + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function parseDateEndOfDay_(value) {
  if (!value) return null;
  const d = new Date(value + 'T23:59:59.999');
  return isNaN(d.getTime()) ? null : d;
}

function parseJiraDateSafe_(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function isWeekend_(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function startOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getWorkingDurationMs_(fromValue, toValue) {
  const start = parseJiraDateSafe_(fromValue);
  const end = parseJiraDateSafe_(toValue);

  if (!start || !end) return null;
  if (end <= start) return 0;

  let total = 0;
  let cursor = new Date(start);

  while (cursor < end) {
    const dayStart = startOfDay_(cursor);
    const dayEnd = endOfDay_(cursor);

    const segmentStart = new Date(Math.max(cursor.getTime(), start.getTime()));
    const segmentEnd = new Date(Math.min(dayEnd.getTime(), end.getTime()));

    if (!isWeekend_(segmentStart) && segmentEnd > segmentStart) {
      total += (segmentEnd.getTime() - segmentStart.getTime());
    }

    cursor = new Date(dayEnd.getTime() + 1);
  }

  return total;
}

function isDateWithinRange_(dateValue, params) {
  const d = parseJiraDateSafe_(dateValue);
  if (!d) return false;

  const from = parseDateStartOfDay_(params && params.dateFrom);
  const to = parseDateEndOfDay_(params && params.dateTo);

  if (from && d < from) return false;
  if (to && d > to) return false;

  return true;
}

function filterChangelogItemsByAuditRange_(items, params) {
  return (items || []).filter(function(history) {
    return isDateWithinRange_(history.created, params);
  });
}

function setIssueKeyLink_(cell, issueKey, baseUrl) {
  if (!issueKey || issueKey === 'none') {
    return;
  }

  const richText = SpreadsheetApp.newRichTextValue()
    .setText(issueKey)
    .setLinkUrl(baseUrl.replace(/\/+$/, '') + '/browse/' + issueKey)
    .build();

  cell.setRichTextValue(richText);
}

function getStatusEventsSorted_(issue) {
  const source = issue.rangeEvents || issue.events || [];
  return source
    .filter(function(e) {
      return e.eventType === 'Status';
    })
    .slice()
    .sort(function(a, b) {
      return new Date(a.changedAt) - new Date(b.changedAt);
    });
}

function getStageRank_(statusValue) {
  const status = normalizeTeamIdentity_(statusValue || '');

  if (
    status === 'todo' ||
    status === 'to do' ||
    status === 'open' ||
    status === 'backlog' ||
    status === 'selected for development'
  ) {
    return 1;
  }

  if (
    status.indexOf('in progress') >= 0 ||
    status.indexOf('hold') >= 0 ||
    status.indexOf('blocked') >= 0
  ) {
    return 2;
  }

  if (
    status === 'review' ||
    status.indexOf('in review') >= 0
  ) {
    return 3;
  }

  if (
    status.indexOf('done') >= 0 ||
    status.indexOf('approved') >= 0 ||
    status.indexOf('published') >= 0 ||
    status.indexOf('closed') >= 0
  ) {
    return 4;
  }

  return 0;
}

function isReverseTransition_(fromValue, toValue) {
  const fromRank = getStageRank_(fromValue);
  const toRank = getStageRank_(toValue);

  if (!fromRank || !toRank) return false;
  return toRank < fromRank;
}

function getCycleSegments_(issue, params) {
  const events = getStatusEventsSorted_(issue);
  const segments = [];

  let cycleStarted = false;
  let cycleTodoStartedAt = null;
  let progressStartedAt = null;
  let reviewStartedAt = null;
  let cycleWentToReview = false;
  let cycleHasBackflow = false;

  events.forEach(function(e) {
    if (e.eventType !== 'Status') return;

    if (e.isBackflow && !e.excludeFromEfficiencyBackflow) {
      cycleHasBackflow = true;
    }

    if (isTodoToProgressTransition_(e.fromValue, e.toValue)) {
      cycleStarted = true;
      cycleTodoStartedAt = e.changedAt;
      progressStartedAt = e.changedAt;
      reviewStartedAt = null;
      cycleWentToReview = false;
      cycleHasBackflow = false;
      return;
    }

    if (!cycleStarted) {
      return;
    }

    if (isProgressToReviewTransition_(e.fromValue, e.toValue)) {
      if (progressStartedAt) {
        const progressToReviewMs = getWorkingDurationMs_(progressStartedAt, e.changedAt);

        if (progressToReviewMs !== null && progressToReviewMs >= 0) {
          reviewStartedAt = e.changedAt;
          cycleWentToReview = true;

          segments.push({
            type: 'progress_to_review',
            ms: progressToReviewMs,
            startedAt: progressStartedAt,
            endedAt: e.changedAt,
            hasBackflow: cycleHasBackflow,
            cycleTodoStartedAt: cycleTodoStartedAt,
            isCompleteCycle: false
          });
        }
      }

      progressStartedAt = null;
      return;
    }

    if (isProgressToHoldTransition_(e.fromValue, e.toValue)) {
      if (progressStartedAt) {
        const progressToHoldMs = getWorkingDurationMs_(progressStartedAt, e.changedAt);

        if (progressToHoldMs !== null && progressToHoldMs >= 0) {
          segments.push({
            type: 'progress_to_hold',
            ms: progressToHoldMs,
            startedAt: progressStartedAt,
            endedAt: e.changedAt,
            hasBackflow: cycleHasBackflow,
            cycleTodoStartedAt: cycleTodoStartedAt,
            isCompleteCycle: false
          });
        }
      }

      progressStartedAt = null;
      return;
    }

    if (isReviewToDoneTransition_(e.fromValue, e.toValue)) {
      if (!cycleTodoStartedAt || !reviewStartedAt || !cycleWentToReview) {
        cycleStarted = false;
        cycleTodoStartedAt = null;
        progressStartedAt = null;
        reviewStartedAt = null;
        cycleWentToReview = false;
        cycleHasBackflow = false;
        return;
      }

      const reviewToDoneMs = getWorkingDurationMs_(reviewStartedAt, e.changedAt);
      const fullCycleMs = getWorkingDurationMs_(cycleTodoStartedAt, e.changedAt);

      segments.push({
        type: 'review_to_done',
        ms: reviewToDoneMs !== null && reviewToDoneMs >= 0 ? reviewToDoneMs : null,
        startedAt: reviewStartedAt,
        endedAt: e.changedAt,
        hasBackflow: cycleHasBackflow,
        cycleTodoStartedAt: cycleTodoStartedAt,
        cycleWentToProgress: true,
        cycleWentToReview: true,
        fullCycleMs: fullCycleMs !== null && fullCycleMs >= 0 ? fullCycleMs : null,
        isCompleteCycle: true
      });

      cycleStarted = false;
      cycleTodoStartedAt = null;
      progressStartedAt = null;
      reviewStartedAt = null;
      cycleWentToReview = false;
      cycleHasBackflow = false;
    }
  });

  return segments;
}

function buildCompletedCyclesFromSegments_(segments) {
  const cycles = [];
  let pendingProgressToReview = null;
  let pendingProgressToHold = [];

  (segments || []).forEach(function(segment) {
    if (segment.type === 'progress_to_review') {
      pendingProgressToReview = segment;
      return;
    }

    if (segment.type === 'progress_to_hold') {
      pendingProgressToHold.push(segment);
      return;
    }

    if (segment.type === 'review_to_done' && segment.isCompleteCycle) {
      cycles.push({
        progressToReview: pendingProgressToReview,
        progressToHolds: pendingProgressToHold.slice(),
        reviewToDone: segment,
        hasBackflow: !!segment.hasBackflow,
        isFirstPass: !segment.hasBackflow
      });

      pendingProgressToReview = null;
      pendingProgressToHold = [];
    }
  });

  return cycles;
}

function getCanonicalTeamMember_(value, teamIdentityIndex) {
  return teamIdentityIndex.identifierToCanonical[normalizeTeamIdentity_(value)] || '';
}

function findMatchingTeamMembersForIssue_(assignee, events, teamIdentityIndex) {
  const found = {};
  const candidates = [];

  if (assignee) {
    [assignee.accountId, assignee.emailAddress, assignee.displayName].forEach(function(v) {
      if (v) candidates.push(v);
    });
  }

  (events || []).forEach(function(e) {
    if (e.eventType === 'Assignee') {
      if (e.fromValue) candidates.push(e.fromValue);
      if (e.toValue) candidates.push(e.toValue);
    }
  });

  candidates.forEach(function(candidate) {
    const canonical = getCanonicalTeamMember_(candidate, teamIdentityIndex);
    if (canonical) {
      found[canonical] = true;
    }
  });

  return Object.keys(found);
}

function buildEnhancedJiraAuditReport_(issues, creds, params, issueCache, teamUsers, teamIdentityIndex) {
  const grouped = {};
  const issueEventsCache = {};
  const epicMap = {};
  const epicIssueMap = {};
  let totalTransitions = 0;

  teamUsers.forEach(function(user) {
    grouped[user.canonical] = {
      requestedUser: user.canonical,
      userLabel: teamIdentityIndex.canonicalToLabel[user.canonical] || user.canonical,
      issues: [],
      transitionStats: {}
    };
  });

  issues.forEach(function(issue) {
    const issueKey = issue.key;
    const issueSummary = safeGet_(issue, ['fields', 'summary']) || '';
    const issueCreated = safeGet_(issue, ['fields', 'created']) || '';
    const assignee = safeGet_(issue, ['fields', 'assignee']);
    const assigneeName = getAssigneeName_(issue);
    const issueTypeName = getIssueTypeName_(issue) || 'none';
    const contentType = getContentTypeValue_(issue) || 'none';
    const designImprovementType = isDesignImprovement_(issue) ? issueTypeName : 'none';

    const epicInfo = resolveEpicInfo_(issue, creds, issueCache);
    const epicKey = epicInfo ? epicInfo.key : '';
    const epicSummary = epicInfo ? epicInfo.summary : 'none';
    const epicStatus = epicInfo ? (safeGet_(epicInfo.issueObj, ['fields', 'status', 'name']) || 'none') : 'none';
    const epicContentType = epicInfo ? (getContentTypeValue_(epicInfo.issueObj) || 'none') : 'none';
    const epicDesignImprovementType = epicInfo && isDesignImprovement_(epicInfo.issueObj)
      ? getIssueTypeName_(epicInfo.issueObj)
      : 'none';

    if (epicKey) {
      epicMap[epicKey] = {
        epicKey: epicKey,
        epicTitle: epicSummary || '',
        epicStatus: epicStatus || 'none'
      };

      if (!epicIssueMap[epicKey]) {
        epicIssueMap[epicKey] = [];
      }
      epicIssueMap[epicKey].push(issue);
    } else if (String(issueTypeName).toLowerCase() === 'epic') {
      epicMap[issueKey] = {
        epicKey: issueKey,
        epicTitle: issueSummary || '',
        epicStatus: safeGet_(issue, ['fields', 'status', 'name']) || 'none'
      };

      if (!epicIssueMap[issueKey]) {
        epicIssueMap[issueKey] = [];
      }
    }

    const fullChangelogItems = fetchAllChangelog_(creds, issueKey);
    const filteredChangelog = filterChangelogItemsByAuditRange_(fullChangelogItems, params);
    const fullEvents = buildIssueEvents_(fullChangelogItems, teamIdentityIndex);
    const rangeEvents = buildIssueEvents_(filteredChangelog, teamIdentityIndex);

    issueEventsCache[issueKey] = fullEvents;

    const matchedUsers = findMatchingTeamMembersForIssue_(assignee, fullEvents, teamIdentityIndex);
    if (!matchedUsers.length) {
      return;
    }

    const statusEventsInRange = rangeEvents.filter(function(e) {
      return e.eventType === 'Status';
    });
    totalTransitions += statusEventsInRange.length;

    matchedUsers.forEach(function(canonical) {
      if (!grouped[canonical]) return;

      grouped[canonical].issues.push({
        issueKey: issueKey,
        issueSummary: issueSummary,
        issueCreated: issueCreated,
        assigneeName: assigneeName,
        issueTypeName: issueTypeName,
        contentType: contentType,
        designImprovementType: designImprovementType,
        epicKey: epicKey || 'none',
        epicSummary: epicSummary || 'none',
        epicStatus: epicStatus || 'none',
        epicContentType: epicContentType || 'none',
        epicDesignImprovementType: epicDesignImprovementType || 'none',
        events: fullEvents,
        rangeEvents: rangeEvents
      });

      statusEventsInRange.forEach(function(e) {
        const key = (e.fromValue || '') + ' → ' + (e.toValue || '');
        grouped[canonical].transitionStats[key] = (grouped[canonical].transitionStats[key] || 0) + 1;
      });
    });
  });

  Object.keys(grouped).forEach(function(userKey) {
    grouped[userKey].issues.sort(function(a, b) {
      return a.issueKey.localeCompare(b.issueKey);
    });
  });

  const flatIssues = flattenGroupedIssues_(grouped);
  const teamTransitionStats = buildCombinedTransitionStats_(grouped);
  const teamKpi = buildKpiFromIssues_(flatIssues, teamTransitionStats, params);
  const perUserKpi = {};

  Object.keys(grouped).forEach(function(userKey) {
    perUserKpi[userKey] = buildKpiFromIssues_(
      grouped[userKey].issues || [],
      grouped[userKey].transitionStats || {},
      params
    );
  });

  return {
    grouped: grouped,
    totalTransitions: totalTransitions,
    teamSummaryColumns: buildTeamSummaryColumns_(grouped),
    epicSections: buildEpicAssigneeChangeSectionFromLoadedIssues_(
      epicMap,
      epicIssueMap,
      issueEventsCache,
      teamIdentityIndex,
      params
    ),
    teamKpi: teamKpi,
    perUserKpi: perUserKpi,
    params: params
  };
}

function buildCombinedTransitionStats_(grouped) {
  const totals = {};

  Object.keys(grouped).forEach(function(userKey) {
    const stats = grouped[userKey].transitionStats || {};
    Object.keys(stats).forEach(function(k) {
      totals[k] = (totals[k] || 0) + stats[k];
    });
  });

  return totals;
}

function buildTeamSummaryColumns_(grouped) {
  const preferredOrder = [
    'TODO → In Progress',
    'To Do → In Progress',
    'Open → In Progress',
    'Backlog → In Progress',
    'In Progress → In Review',
    'In Progress → Review',
    'In Review → Done',
    'In Review → Approved',
    'Approved → Published',
    'Approved → Closed',
    'Published → Closed',
    'In Progress → On Hold',
    'On Hold → In Progress',
    'In Progress → Cancelled',
    'In Progress → Canceled'
  ];

  const allKeys = {};
  Object.keys(grouped).forEach(function(userKey) {
    Object.keys(grouped[userKey].transitionStats || {}).forEach(function(k) {
      allKeys[k] = true;
    });
  });

  const ordered = [];
  preferredOrder.forEach(function(k) {
    if (allKeys[k]) {
      ordered.push(k);
      delete allKeys[k];
    }
  });

  Object.keys(allKeys).sort().forEach(function(k) {
    ordered.push(k);
  });

  return ordered;
}

function flattenGroupedIssues_(grouped) {
  const seen = {};
  const out = [];

  Object.keys(grouped).forEach(function(userKey) {
    (grouped[userKey].issues || []).forEach(function(issue) {
      if (!seen[issue.issueKey]) {
        seen[issue.issueKey] = true;
        out.push(issue);
      }
    });
  });

  return out;
}

function buildKpiFromIssues_(issues, transitionStats, params) {
  const progressToReviewDurations = [];
  const reviewToDoneDurations = [];
  const progressToHoldDurations = [];
  const todoToApprovedDurations = [];

  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  let firstPassAcceptedCount = 0;
  let holdCount = 0;
  let backflowCount = 0;

  (issues || []).forEach(function(issue) {
    const segments = getCycleSegments_(issue, params);
    const completedCycles = buildCompletedCyclesFromSegments_(segments);

    segments.forEach(function(segment) {
      if (segment.type === 'progress_to_hold') {
        holdCount++;

        if (segment.ms !== null && segment.ms >= 0) {
          progressToHoldDurations.push(segment.ms);
        }
      }
    });

    completedCycles.forEach(function(cycle) {
      startedCount++;
      reviewSubmittedCount++;
      completedCount++;

      if (cycle.progressToReview && cycle.progressToReview.ms !== null && cycle.progressToReview.ms >= 0) {
        progressToReviewDurations.push(cycle.progressToReview.ms);
      }

      if (cycle.reviewToDone && cycle.reviewToDone.ms !== null && cycle.reviewToDone.ms >= 0) {
        reviewToDoneDurations.push(cycle.reviewToDone.ms);
      }

      if (cycle.reviewToDone && cycle.reviewToDone.fullCycleMs !== null && cycle.reviewToDone.fullCycleMs >= 0) {
        todoToApprovedDurations.push(cycle.reviewToDone.fullCycleMs);
      }

      if (cycle.isFirstPass) {
        firstPassAcceptedCount++;
      }

      if (cycle.hasBackflow) {
        backflowCount++;
      }
    });
  });

  const avgProgressToReviewMs = averageMs_(progressToReviewDurations);
  const avgReviewToDoneMs = averageMs_(reviewToDoneDurations);
  const avgProgressToHoldMs = averageMs_(progressToHoldDurations);
  const avgTodoToApprovedMs = averageMs_(todoToApprovedDurations);

  return {
    startedCount: startedCount,
    reviewSubmittedCount: reviewSubmittedCount,
    completedCount: completedCount,
    firstPassAcceptedCount: firstPassAcceptedCount,
    holdCount: holdCount,
    backflowCount: backflowCount,
    avgProgressToReviewMs: avgProgressToReviewMs,
    avgReviewToDoneMs: avgReviewToDoneMs,
    avgProgressToHoldMs: avgProgressToHoldMs,
    avgTodoToApprovedMs: avgTodoToApprovedMs,
    targetReviewDays: Number(params && params.targetReviewDays ? params.targetReviewDays : 3),
    efficiencyIndex: calculateEfficiencyIndex_({
      startedCount: startedCount,
      reviewSubmittedCount: reviewSubmittedCount,
      completedCount: completedCount,
      firstPassAcceptedCount: firstPassAcceptedCount,
      backflowCount: backflowCount,
      avgProgressToReviewMs: avgProgressToReviewMs,
      targetReviewDays: Number(params && params.targetReviewDays ? params.targetReviewDays : 3)
    })
  };
}

function isTodoToProgressTransition_(fromValue, toValue) {
  return isTodoLike_(fromValue) && containsNormalized_(toValue, 'in progress');
}

function averageMs_(items) {
  if (!items || !items.length) return null;
  const sum = items.reduce(function(acc, value) {
    return acc + value;
  }, 0);
  return Math.round(sum / items.length);
}

function calculateEfficiencyIndex_(data) {
  const startedCount = Number(data.startedCount || 0);
  const completedCount = Number(data.completedCount || 0);
  const firstPassAcceptedCount = Number(data.firstPassAcceptedCount || 0);
  const backflowCount = Number(data.backflowCount || 0);
  const targetReviewDays = Number(data.targetReviewDays || 3);
  const targetReviewHours = targetReviewDays * 24;

  if (startedCount <= 0 || completedCount <= 0) {
    return 0;
  }

  const completionRate = Math.min(1, completedCount / Math.max(startedCount, 1));
  const firstPassRate = Math.min(1, firstPassAcceptedCount / Math.max(completedCount, 1));
  const backflowRate = backflowCount / Math.max(completedCount, 1);

  const completionScore = Math.round(completionRate * 35);
  const firstPassScore = Math.round(firstPassRate * 35);

  let speedScore = 0;
  const progressToReviewHours =
    data.avgProgressToReviewMs !== null && data.avgProgressToReviewMs !== undefined
      ? data.avgProgressToReviewMs / 3600000
      : null;

  if (progressToReviewHours !== null) {
    if (progressToReviewHours <= targetReviewHours) {
      speedScore = 30;
    } else if (progressToReviewHours <= targetReviewHours + 24) {
      speedScore = 24;
    } else if (progressToReviewHours <= targetReviewHours + 48) {
      speedScore = 18;
    } else if (progressToReviewHours <= targetReviewHours + 96) {
      speedScore = 10;
    } else {
      speedScore = 0;
    }
  }

  const backflowPenalty = Math.min(20, Math.round(backflowRate * 20));

  const rawScore = completionScore + firstPassScore + speedScore - backflowPenalty;

  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

function getEfficiencyStatus_(score) {
  const value = Number(score || 0);

  if (value >= 95) return 'Excellent';
  if (value >= 80) return 'Healthy';
  if (value >= 65) return 'Watch';
  if (value >= 50) return 'Risk';
  return 'Critical';
}

function getEfficiencyNote_(kpi, params) {
  const startedCount = Number(kpi.startedCount || 0);
  const completedCount = Number(kpi.completedCount || 0);
  const firstPassAcceptedCount = Number(kpi.firstPassAcceptedCount || 0);
  const backflowCount = Number(kpi.backflowCount || 0);

  const targetReviewDays = Number((params && params.targetReviewDays) || kpi.targetReviewDays || 3);
  const targetReviewHours = targetReviewDays * 24;

  const completionRate = startedCount > 0
    ? completedCount / startedCount
    : 0;

  const firstPassRate = completedCount > 0
    ? firstPassAcceptedCount / completedCount
    : 0;

  const backflowRate = completedCount > 0
    ? backflowCount / completedCount
    : 0;

  const completionScore = Math.round(Math.min(1, completionRate) * 35);
  const firstPassScore = Math.round(Math.min(1, firstPassRate) * 35);

  const progressToReviewHours =
    kpi.avgProgressToReviewMs !== null && kpi.avgProgressToReviewMs !== undefined
      ? kpi.avgProgressToReviewMs / 3600000
      : null;

  let speedScore = 0;
  if (progressToReviewHours !== null) {
    if (progressToReviewHours <= targetReviewHours) {
      speedScore = 30;
    } else if (progressToReviewHours <= targetReviewHours + 24) {
      speedScore = 24;
    } else if (progressToReviewHours <= targetReviewHours + 48) {
      speedScore = 18;
    } else if (progressToReviewHours <= targetReviewHours + 96) {
      speedScore = 10;
    } else {
      speedScore = 0;
    }
  }

  const backflowPenalty = Math.min(20, Math.round(backflowRate * 20));
  const finalScore = Number(kpi.efficiencyIndex || 0);

  return (
    'Efficiency Index formula:\n' +
    'Index = Completion Score + First Pass Score + Speed Score - Backflow Penalty\n\n' +
    'Started cycles: ' + startedCount + '\n' +
    'Completed cycles: ' + completedCount + '\n' +
    'Accepted from first pass: ' + firstPassAcceptedCount + '\n' +
    'Backflow cycles: ' + backflowCount + '\n' +
    'Avg Progress→Review: ' + formatDuration_(kpi.avgProgressToReviewMs) + '\n' +
    'Avg Review→Done: ' + formatDuration_(kpi.avgReviewToDoneMs) + '\n' +
    'Avg To Do→Done/Approved: ' + formatDuration_(kpi.avgTodoToApprovedMs) + '\n\n' +
    'Completion Score: ' + completionScore + '\n' +
    'First Pass Score: ' + firstPassScore + '\n' +
    'Speed Score: ' + speedScore + '\n' +
    'Backflow Penalty: ' + backflowPenalty + '\n\n' +
    'Important:\n' +
    '- Efficiency Index is calculated only from full cycles completed inside the selected date range\n' +
    '- Partial cycles are excluded from the index to avoid inflated scores\n' +
    '- Task Path still shows full changelog for investigation\n\n' +
    'Final Index = ' + finalScore
  );
}

function applyEfficiencyStatusStyle_(range, status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'excellent') {
    range.setBackground('#b6d7a8');
    return;
  }
  if (normalized === 'healthy') {
    range.setBackground('#d9ead3');
    return;
  }
  if (normalized === 'watch') {
    range.setBackground('#fff2cc');
    return;
  }
  if (normalized === 'risk') {
    range.setBackground('#f4cccc');
    return;
  }
  if (normalized === 'critical') {
    range.setBackground('#ea9999');
    return;
  }
}

function isProgressToReviewTransition_(fromValue, toValue) {
  return containsNormalized_(fromValue, 'in progress') &&
    (containsNormalized_(toValue, 'in review') || normalizeTeamIdentity_(toValue) === 'review');
}

function isReviewToDoneTransition_(fromValue, toValue) {
  return (containsNormalized_(fromValue, 'in review') || normalizeTeamIdentity_(fromValue) === 'review') &&
    (containsNormalized_(toValue, 'done') || containsNormalized_(toValue, 'approved'));
}

function isProgressToHoldTransition_(fromValue, toValue) {
  return containsNormalized_(fromValue, 'in progress') &&
    (containsNormalized_(toValue, 'on hold') || containsNormalized_(toValue, 'blocked'));
}

function buildEpicAssigneeChangeSectionFromLoadedIssues_(epicMap, epicIssueMap, issueEventsCache, teamIdentityIndex, params) {
  const epicKeys = Object.keys(epicMap).sort();
  const sections = [];

  epicKeys.forEach(function(epicKey) {
    const epicInfo = epicMap[epicKey];
    const childIssues = epicIssueMap[epicKey] || [];
    const changeRows = [];

    childIssues.forEach(function(child) {
      if (String(getIssueTypeName_(child) || '').toLowerCase() === 'epic') {
        return;
      }

      const childEvents = issueEventsCache[child.key] || [];
      childEvents.forEach(function(e) {
        if (e.eventType !== 'Assignee') return;
        if (!isDateWithinRange_(e.changedAt, params)) return;

        const fromCanonical = getCanonicalTeamMember_(e.fromValue, teamIdentityIndex);
        const toCanonical = getCanonicalTeamMember_(e.toValue, teamIdentityIndex);

        if (fromCanonical && !toCanonical) {
          changeRows.push({
            epicKey: epicInfo.epicKey,
            epicTitle: epicInfo.epicTitle,
            taskKey: child.key,
            taskSummary: safeGet_(child, ['fields', 'summary']) || '',
            changeType: 'Handed off',
            fromAssignee: e.fromValue || '',
            toAssignee: e.toValue || '',
            changedBy: e.changedBy || '',
            changeDate: e.changedAt || '',
            fillColor: '#fff2cc'
          });
        } else if (!fromCanonical && toCanonical) {
          changeRows.push({
            epicKey: epicInfo.epicKey,
            epicTitle: epicInfo.epicTitle,
            taskKey: child.key,
            taskSummary: safeGet_(child, ['fields', 'summary']) || '',
            changeType: 'Returned to team',
            fromAssignee: e.fromValue || '',
            toAssignee: e.toValue || '',
            changedBy: e.changedBy || '',
            changeDate: e.changedAt || '',
            fillColor: '#d9ead3'
          });
        }
      });
    });

    changeRows.sort(function(a, b) {
      return new Date(a.changeDate) - new Date(b.changeDate);
    });

    sections.push({
      epicKey: epicInfo.epicKey,
      epicTitle: epicInfo.epicTitle,
      epicStatus: epicInfo.epicStatus,
      rows: changeRows
    });
  });

  return sections;
}

function writeEnhancedJiraAuditReport_(sheet, data) {
  sheet.setFrozenRows(4);

  let row = 1;

  sheet.getRange(row, 1).setValue('JIRA REPORT');
  sheet.getRange(row, 1, 1, 8)
    .setFontWeight('bold')
    .setFontSize(16)
    .setBackground('#d9ead3');
  row++;

  sheet.getRange(row, 1, 1, 2).setValues([[
    'Date range',
    (data.params.dateFrom || '') + ' → ' + (data.params.dateTo || '')
  ]]);
  sheet.getRange(row, 1, 1, 2)
    .setFontWeight('bold')
    .setBackground('#ddebf7');
  row++;

  sheet.getRange(row, 1, 1, 2).setValues([['Issues found', data.issuesCount]]);
  sheet.getRange(row + 1, 1, 1, 2).setValues([['Status transitions found', data.groupedData.totalTransitions]]);
  sheet.getRange(row, 1, 2, 2)
    .setFontWeight('bold')
    .setBackground('#f3f3f3');
  sheet.getRange(row, 2, 2, 1).setNumberFormat('0');
  row += 4;

  row = writeTeamKpiSection_(sheet, row, data.groupedData.teamKpi, data.params);
  row += 2;

  row = writeTeamSummarySection_(sheet, row, data.groupedData);
  row += 2;

  row = writePerUserSummarySection_(sheet, row, data.groupedData);
  row += 2;

  row = writeEpicAssigneeSection_(sheet, row, data.groupedData, data.creds.baseUrl);
  row += 2;

  row = writeTaskPathSection_(sheet, row, data.groupedData, data.creds.baseUrl, data.params);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 320);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 160);
  sheet.setColumnWidth(8, 160);
  sheet.setColumnWidth(9, 160);
  sheet.setColumnWidth(10, 160);
}

function writeTeamKpiSection_(sheet, startRow, teamKpi, params) {
  let row = startRow;

  sheet.getRange(row, 1).setValue('TEAM KPI');
  sheet.getRange(row, 1, 1, 9).setFontWeight('bold').setFontSize(14).setBackground('#b6d7a8');
  row++;

  const efficiencyStatus = getEfficiencyStatus_(teamKpi.efficiencyIndex);

  const header = [
  'Avg In Progress → Review',
  'Avg Review → Done/Approved',
  'Avg To Do → Done/Approved',
  'Accepted From First Pass',
  'Avg In Progress → Hold',
  'Backflow Count',
  'Completed Count',
  'Efficiency Index',
  'Efficiency Status'
];

const values = [[
  formatDuration_(teamKpi.avgProgressToReviewMs),
  formatDuration_(teamKpi.avgReviewToDoneMs),
  formatDuration_(teamKpi.avgTodoToApprovedMs),
  teamKpi.firstPassAcceptedCount || 0,
  formatDuration_(teamKpi.avgProgressToHoldMs),
  teamKpi.backflowCount || 0,
  teamKpi.completedCount || 0,
  teamKpi.efficiencyIndex || 0,
  efficiencyStatus
]];

  sheet.getRange(row, 1, 1, header.length).setValues([header]);
  sheet.getRange(row, 1, 1, header.length).setFontWeight('bold').setBackground('#d9ead3');
  sheet.getRange(row, 3).setFontColor('#146FFB').setFontWeight('bold');
  sheet.getRange(row, 4).setFontColor('#146FFB').setFontWeight('bold');
  row++;

  sheet.getRange(row, 1, 1, values[0].length).setValues(values);

  const progressReviewCell = sheet.getRange(row, 1);
const reviewDoneCell = sheet.getRange(row, 2);
const todoApprovedCell = sheet.getRange(row, 3);
const firstPassCell = sheet.getRange(row, 4);
const progressHoldCell = sheet.getRange(row, 5);
const indexCell = sheet.getRange(row, 8);
const statusCell = sheet.getRange(row, 9);

applyLongDurationAlertStyle_(progressReviewCell, teamKpi.avgProgressToReviewMs);
applyLongDurationAlertStyle_(reviewDoneCell, teamKpi.avgReviewToDoneMs);
applyLongDurationAlertStyle_(todoApprovedCell, teamKpi.avgTodoToApprovedMs);
applyLongDurationAlertStyle_(progressHoldCell, teamKpi.avgProgressToHoldMs);

todoApprovedCell.setFontWeight('bold').setFontColor('#146FFB');
firstPassCell.setFontWeight('bold').setFontColor('#146FFB');

  indexCell.setFontWeight('bold').setFontSize(16).setBackground('#e2f0d9');
  indexCell.setNote(getEfficiencyNote_(teamKpi, params));

  statusCell.setFontWeight('bold');
  applyEfficiencyStatusStyle_(statusCell, efficiencyStatus);

  row++;

  return row;
}

function writeTeamSummarySection_(sheet, startRow, groupedData) {
  const grouped = groupedData.grouped;
  const userKeys = Object.keys(grouped);
  const transitionColumns = groupedData.teamSummaryColumns || [];

  sheet.getRange(startRow, 1).setValue('SECTION 1. TEAM SUMMARY');
  sheet.getRange(startRow, 1, 1, Math.max(2, transitionColumns.length + 2))
    .setFontWeight('bold')
    .setBackground('#d9ead3');

  const headerRow = startRow + 1;
  const header = ['Team member'].concat(transitionColumns).concat(['Total']);
  sheet.getRange(headerRow, 1, 1, header.length).setValues([header]);
  sheet.getRange(headerRow, 1, 1, header.length).setFontWeight('bold').setBackground('#d9ead3');

  const body = [];
  userKeys.forEach(function(userKey) {
    const stats = grouped[userKey].transitionStats || {};
    const values = transitionColumns.map(function(k) {
      return stats[k] || 0;
    });
    const total = values.reduce(function(sum, v) {
      return sum + v;
    }, 0);
    body.push([grouped[userKey].userLabel || userKey].concat(values).concat([total]));
  });

  const totalValues = transitionColumns.map(function(k) {
    return userKeys.reduce(function(sum, userKey) {
      return sum + (grouped[userKey].transitionStats[k] || 0);
    }, 0);
  });
  const grandTotal = totalValues.reduce(function(sum, v) {
    return sum + v;
  }, 0);
  body.push(['TOTAL'].concat(totalValues).concat([grandTotal]));

  if (body.length) {
    sheet.getRange(headerRow + 1, 1, body.length, header.length).setValues(body);
    sheet.getRange(headerRow + body.length, 1, 1, header.length).setFontWeight('bold').setBackground('#e2f0d9');
    applyBandingSafe_(sheet, headerRow, headerRow + body.length, 1, header.length);
  }

  sheet.autoResizeColumns(1, header.length);
  return headerRow + body.length;
}

function getLastKnownStatusBeforeEvent_(events, eventIndex) {
  for (let i = eventIndex; i >= 0; i--) {
    const event = events[i];
    if (event && event.eventType === 'Status' && event.toValue) {
      return event.toValue;
    }
  }
  return '';
}

function writePerUserSummarySection_(sheet, startRow, groupedData) {
  const grouped = groupedData.grouped;
  const userKeys = Object.keys(grouped);
  let row = startRow;

  sheet.getRange(row, 1).setValue('SECTION 2. PER-USER SUMMARY');
  sheet.getRange(row, 1, 1, 13).setFontWeight('bold').setBackground('#cfe2f3');
  row += 2;

  userKeys.forEach(function(userKey) {
    const userBlock = grouped[userKey];
    const stats = userBlock.transitionStats || {};
    const kpi = groupedData.perUserKpi[userKey] || {};
    const efficiencyStatus = getEfficiencyStatus_(kpi.efficiencyIndex);

    sheet.getRange(row, 1, 1, 13).setValues([[
      'USER', userBlock.userLabel || userKey, '', '', '', '', '', '', '', '', '', '', ''
    ]]);
    sheet.getRange(row, 1, 1, 13)
      .setFontWeight('bold')
      .setFontSize(13)
      .setBackground('#cfe2f3');
    row++;

    const kpiHeader = [
      'Started cycles',
      'Cycles reached review',
      'Completed cycles',
      'Accepted From First Pass',
      'Avg Progress → Review',
      'Avg Review → Done',
      'Avg To Do → Done/Approved',
      'Avg Progress → Hold',
      'Backflow Count',
      'Efficiency Index',
      'Efficiency Status'
    ];

    const kpiValues = [[
      kpi.startedCount || 0,
      kpi.reviewSubmittedCount || 0,
      kpi.completedCount || 0,
      kpi.firstPassAcceptedCount || 0,
      formatDuration_(kpi.avgProgressToReviewMs),
      formatDuration_(kpi.avgReviewToDoneMs),
      formatDuration_(kpi.avgTodoToApprovedMs),
      formatDuration_(kpi.avgProgressToHoldMs),
      kpi.backflowCount || 0,
      kpi.efficiencyIndex || 0,
      efficiencyStatus
    ]];

    sheet.getRange(row, 1, 1, kpiHeader.length).setValues([kpiHeader]);
    sheet.getRange(row, 1, 1, kpiHeader.length)
      .setFontWeight('bold')
      .setBackground('#ddebf7');

    sheet.getRange(row, 4).setFontColor('#146FFB').setFontWeight('bold');
    sheet.getRange(row, 7).setFontColor('#146FFB').setFontWeight('bold');
    row++;

    sheet.getRange(row, 1, 1, kpiHeader.length).setValues(kpiValues);

    const firstPassCell = sheet.getRange(row, 4);
    const progressReviewCell = sheet.getRange(row, 5);
    const reviewDoneCell = sheet.getRange(row, 6);
    const todoApprovedCell = sheet.getRange(row, 7);
    const progressHoldCell = sheet.getRange(row, 8);
    const indexCell = sheet.getRange(row, 10);
    const statusCell = sheet.getRange(row, 11);

    applyLongDurationAlertStyle_(progressReviewCell, kpi.avgProgressToReviewMs);
    applyLongDurationAlertStyle_(reviewDoneCell, kpi.avgReviewToDoneMs);
    applyLongDurationAlertStyle_(todoApprovedCell, kpi.avgTodoToApprovedMs);
    applyLongDurationAlertStyle_(progressHoldCell, kpi.avgProgressToHoldMs);

    firstPassCell.setFontWeight('bold').setFontColor('#146FFB');
    todoApprovedCell.setFontWeight('bold').setFontColor('#146FFB');

    indexCell
      .setFontWeight('bold')
      .setFontSize(14)
      .setBackground('#e2f0d9');
    indexCell.setNote(getEfficiencyNote_(kpi, groupedData.params));

    statusCell.setFontWeight('bold');
    applyEfficiencyStatusStyle_(statusCell, efficiencyStatus);

    row += 2;

    const breakdownHeader = ['From → To', 'Count'];
    sheet.getRange(row, 1, 1, 2).setValues([breakdownHeader]);
    sheet.getRange(row, 1, 1, 2)
      .setFontWeight('bold')
      .setBackground('#ddebf7');
    row++;

    const breakdownRows = Object.keys(stats)
      .sort(function(a, b) {
        return (stats[b] || 0) - (stats[a] || 0) || a.localeCompare(b);
      })
      .map(function(k) {
        return [k, stats[k]];
      });

    if (!breakdownRows.length) {
      breakdownRows.push(['No status transitions', '']);
    }

    sheet.getRange(row, 1, breakdownRows.length, 2).setValues(breakdownRows);
    row += breakdownRows.length + 2;
  });

  return row;
}

function writeEpicAssigneeSection_(sheet, startRow, groupedData, baseUrl) {
  let row = startRow;
  const sections = (groupedData.epicSections || []).filter(function(section) {
    return section.rows && section.rows.length;
  });

  const header = [
    'Epic Key',
    'Epic Title',
    'Task Key',
    'Task Summary',
    'Change Type',
    'From Assignee',
    'To Assignee',
    'Changed By',
    'Change Date'
  ];

  sheet.getRange(row, 1).setValue('SECTION 3. EPICS WITH ASSIGNEE CHANGE LOG');
  sheet.getRange(row, 1, 1, header.length)
    .setFontWeight('bold')
    .setBackground('#fce5cd');
  row += 2;

  if (!sections.length) {
    sheet.getRange(row, 1).setValue('No epic assignee changes found');
    return row + 2;
  }

  sections.forEach(function(section) {
    sheet.getRange(row, 1, 1, 3).setValues([[
      'EPIC',
      section.epicKey,
      section.epicTitle + ' | Status: ' + (section.epicStatus || 'none')
    ]]);
    sheet.getRange(row, 1, 1, header.length)
      .setBackground('#fce5cd')
      .setFontWeight('bold');

    if (section.epicKey) {
      setIssueKeyLink_(sheet.getRange(row, 2), section.epicKey, baseUrl);
    }

    row++;

    sheet.getRange(row, 1, 1, header.length).setValues([header]);
    sheet.getRange(row, 1, 1, header.length)
      .setFontWeight('bold')
      .setBackground('#fff2cc');
    row++;

    const values = section.rows.map(function(item) {
      return [
        item.epicKey,
        item.epicTitle,
        item.taskKey,
        item.taskSummary,
        item.changeType,
        item.fromAssignee,
        item.toAssignee,
        item.changedBy,
        parseJiraDateOrDateOnly_(item.changeDate)
      ];
    });

    sheet.getRange(row, 1, values.length, header.length).setValues(values);
    sheet.getRange(row, 9, values.length, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');

    for (let i = 0; i < section.rows.length; i++) {
      const actualRow = row + i;
      const item = section.rows[i];
      const fill = item.fillColor || '#ffffff';

      sheet.getRange(actualRow, 1, 1, header.length).setBackground(fill);

      if (item.epicKey) {
        setIssueKeyLink_(sheet.getRange(actualRow, 1), item.epicKey, baseUrl);
      }

      if (item.taskKey) {
        setIssueKeyLink_(sheet.getRange(actualRow, 3), item.taskKey, baseUrl);
      }
    }

    row += values.length + 1;
  });

  return row;
}

function writeTaskPathSection_(sheet, startRow, groupedData, baseUrl, params) {
  const grouped = groupedData.grouped;
  const userKeys = Object.keys(grouped);
  let row = startRow;
  const MAX_ISSUES_PER_USER = 20;

  sheet.getRange(row, 1).setValue('SECTION 4. TASK PATH DETAILS');
  sheet.getRange(row, 1, 1, 8)
    .setFontWeight('bold')
    .setBackground('#cfe2f3');
  row += 2;

  userKeys.forEach(function(userKey) {
    const userBlock = grouped[userKey];
    const userLabel = userBlock.userLabel || userKey;

    const interestingIssues = userBlock.issues.filter(function(issue) {
      const allEvents = issue.events || [];

      const hasAssigneeChange = allEvents.some(function(e) {
        return e.eventType === 'Assignee' && isDateWithinRange_(e.changedAt, params);
      });

      const hasBackflow = allEvents.some(function(e) {
        return e.eventType === 'Status' && e.isBackflow && isDateWithinRange_(e.changedAt, params);
      });

      const hasStatusChanges = allEvents.some(function(e) {
        return e.eventType === 'Status' && isDateWithinRange_(e.changedAt, params);
      });

      const isDesignImprovement = issue.designImprovementType && issue.designImprovementType !== 'none';

      return hasAssigneeChange || hasBackflow || hasStatusChanges || isDesignImprovement;
    }).slice(0, MAX_ISSUES_PER_USER);

    sheet.getRange(row, 1, 1, 8).setValues([['USER', userLabel, '', '', '', '', '', '']]);
    sheet.getRange(row, 1, 1, 8)
      .setFontWeight('bold')
      .setFontSize(15)
      .setBackground('#d9ead3');
    row++;

    if (!interestingIssues.length) {
      sheet.getRange(row, 1).setValue('No issues found');
      row += 2;
      return;
    }

    interestingIssues.forEach(function(issue) {
      sheet.getRange(row, 1, 1, 6).setValues([[
        String(issue.issueTypeName).toLowerCase() === 'epic' ? 'EPIC' : 'ISSUE',
        issue.issueKey,
        issue.issueSummary,
        issue.contentType,
        issue.epicKey,
        issue.designImprovementType
      ]]);
      sheet.getRange(row, 1, 1, 6)
        .setFontWeight('bold')
        .setBackground('#ddebf7');

      if (issue.designImprovementType && issue.designImprovementType !== 'none') {
        sheet.getRange(row, 1, 1, 6).setBackground('#f4cccc');
      }

      setIssueKeyLink_(sheet.getRange(row, 2), issue.issueKey, baseUrl);
      row++;

      sheet.getRange(row, 1, 1, 7).setValues([[
        'Changed At',
        'Changed By',
        'Event Type',
        'From',
        'To',
        'Time Since Previous Status',
        'Team Movement'
      ]]);
      sheet.getRange(row, 1, 1, 7)
        .setFontWeight('bold')
        .setBackground('#fce5cd');
      row++;

      const events = issue.events || [];
      if (!events.length) {
        sheet.getRange(row, 1, 1, 7).setValues([['', '', '', '', 'No changes', '', '']]);
        row += 2;
        return;
      }

      for (let i = 0; i < events.length; i++) {
        const e = events[i];

        sheet.getRange(row, 1, 1, 7).setValues([[
          parseJiraDateOrDateOnly_(e.changedAt),
          e.changedBy,
          e.eventType,
          e.fromValue,
          e.toValue,
          e.eventType === 'Status' ? formatDuration_(e.timeSincePreviousStatusMs) : '',
          buildTeamMovementLabel_(e)
        ]]);
        sheet.getRange(row, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');

        if (e.eventType === 'Status' && e.isBackflow && isDateWithinRange_(e.changedAt, params)) {
          sheet.getRange(row, 1, 1, 7).setBackground('#f4cccc');
        } else if (e.eventType === 'Assignee' && buildTeamMovementLabel_(e) === 'Handed off' && isDateWithinRange_(e.changedAt, params)) {
          sheet.getRange(row, 1, 1, 7).setBackground('#fff2cc');
        } else if (e.eventType === 'Assignee' && buildTeamMovementLabel_(e) === 'Returned to team' && isDateWithinRange_(e.changedAt, params)) {
          sheet.getRange(row, 1, 1, 7).setBackground('#d9ead3');
        }

        row++;

        if (e.eventType === 'Assignee' && e.isHandoff && isDateWithinRange_(e.changedAt, params)) {
          const statusAtTransfer = getLastKnownStatusBeforeEvent_(events, i);

          sheet.getRange(row, 1, 1, 8).setValues([[
            'Outside Team Assignee',
            e.toValue || '',
            'Status At Transfer',
            statusAtTransfer || '',
            'Changed By',
            e.changedBy || '',
            'Date',
            parseJiraDateOrDateOnly_(e.changedAt)
          ]]);

          sheet.getRange(row, 1, 1, 8)
            .setBackground('#fff2cc')
            .setFontWeight('bold');

          sheet.getRange(row, 8).setNumberFormat('yyyy-mm-dd hh:mm:ss');
          row++;
        }

        if (e.eventType === 'Assignee' && e.isReturnToTeam && isDateWithinRange_(e.changedAt, params)) {
          const statusAtTransfer = getLastKnownStatusBeforeEvent_(events, i);

          sheet.getRange(row, 1, 1, 8).setValues([[
            'Returned To Team',
            e.toValue || '',
            'Status At Return',
            statusAtTransfer || '',
            'Changed By',
            e.changedBy || '',
            'Date',
            parseJiraDateOrDateOnly_(e.changedAt)
          ]]);

          sheet.getRange(row, 1, 1, 8)
            .setBackground('#d9ead3')
            .setFontWeight('bold');

          sheet.getRange(row, 8).setNumberFormat('yyyy-mm-dd hh:mm:ss');
          row++;
        }
      }

      row += 2;
    });
  });

  return row;
}

function buildTeamMovementLabel_(event) {
  if (!event || event.eventType !== 'Assignee') return '';
  if (event.isHandoff) return 'Handed off';
  if (event.isReturnToTeam) return 'Returned to team';
  return '';
}

function applyBandingSafe_(sheet, startRow, endRow, startCol, numCols) {
  return;
}

function containsNormalized_(value, needle) {
  return normalizeTeamIdentity_(value).indexOf(normalizeTeamIdentity_(needle)) >= 0;
}

function isTodoLike_(value) {
  const normalized = normalizeTeamIdentity_(value);
  return normalized === 'todo' ||
    normalized === 'to do' ||
    normalized === 'backlog' ||
    normalized === 'open' ||
    normalized === 'selected for development';
}

function resolveEpicInfo_(issue, creds, issueCache) {
  const issueTypeName = String(getIssueTypeName_(issue)).toLowerCase();

  if (issueTypeName === 'epic') {
    return {
      key: issue.key,
      summary: safeGet_(issue, ['fields', 'summary']) || '',
      issueObj: issue
    };
  }

  const parent = safeGet_(issue, ['fields', 'parent']);
  if (parent) {
    const parentTypeName = safeGet_(parent, ['fields', 'issuetype', 'name']) || '';
    const parentSummary = safeGet_(parent, ['fields', 'summary']) || '';
    if (String(parentTypeName).toLowerCase() === 'epic') {
      const parentObj = parent.key ? fetchIssueByKeyCached_(creds, parent.key, issueCache) : parent;
      return {
        key: parent.key,
        summary: parentSummary || safeGet_(parentObj, ['fields', 'summary']) || '',
        issueObj: parentObj
      };
    }
    if (!parentTypeName && parent.key) {
      const fullParent = fetchIssueByKeyCached_(creds, parent.key, issueCache);
      if (String(getIssueTypeName_(fullParent)).toLowerCase() === 'epic') {
        return {
          key: fullParent.key,
          summary: safeGet_(fullParent, ['fields', 'summary']) || '',
          issueObj: fullParent
        };
      }
    }
  }

  if (CONFIG.EPIC_LINK_FIELD) {
    const epicLinkKey = safeGet_(issue, ['fields', CONFIG.EPIC_LINK_FIELD]);
    if (epicLinkKey) {
      const epicIssue = fetchIssueByKeyCached_(creds, epicLinkKey, issueCache);
      return {
        key: epicIssue.key,
        summary: safeGet_(epicIssue, ['fields', 'summary']) || '',
        issueObj: epicIssue
      };
    }
  }

  return null;
}

function getIssueTypeName_(issue) {
  return safeGet_(issue, ['fields', 'issuetype', 'name']) || 'none';
}

function getContentTypeValue_(issue) {
  if (!issue) return 'none';
  if (!CONFIG.CONTENT_TYPE_FIELD) return 'none';

  const value = safeGet_(issue, ['fields', CONFIG.CONTENT_TYPE_FIELD]);
  if (value === null || value === undefined || value === '') return 'none';

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map(function(v) {
      return extractFieldDisplayValue_(v);
    }).filter(Boolean).join(', ') || 'none';
  }

  return extractFieldDisplayValue_(value) || 'none';
}

function extractFieldDisplayValue_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value.value !== undefined) return String(value.value);
  if (value.name !== undefined) return String(value.name);
  if (value.displayName !== undefined) return String(value.displayName);
  if (value.label !== undefined) return String(value.label);
  return '';
}

function isDesignImprovement_(issue) {
  return String(getIssueTypeName_(issue)).trim().toLowerCase() ===
    String(CONFIG.DESIGN_IMPROVEMENT_TYPE_NAME).trim().toLowerCase();
}

function buildIssueEvents_(changelogItems, teamIdentityIndex) {
  const events = [];

  changelogItems.forEach(function(history) {
    const changedAt = history.created || '';
    const changedBy = getAuthorName_(history);

    (history.items || []).forEach(function(item) {
      if (item.field === 'status') {
        events.push({
          eventType: 'Status',
          changedAt: changedAt,
          changedBy: changedBy,
          fromValue: item.fromString || '',
          toValue: item.toString || '',
          timeSincePreviousStatusMs: null,
          isBackflow: false,
          isHandoff: false,
          isReturnToTeam: false,
          excludeFromEfficiencyBackflow: false
        });
      }

      if (item.field === 'assignee') {
        const fromValue = item.fromString || '';
        const toValue = item.toString || '';
        const fromCanonical = teamIdentityIndex ? getCanonicalTeamMember_(fromValue, teamIdentityIndex) : '';
        const toCanonical = teamIdentityIndex ? getCanonicalTeamMember_(toValue, teamIdentityIndex) : '';

        events.push({
          eventType: 'Assignee',
          changedAt: changedAt,
          changedBy: changedBy,
          fromValue: fromValue,
          toValue: toValue,
          timeSincePreviousStatusMs: null,
          isBackflow: false,
          isHandoff: !!(fromCanonical && !toCanonical),
          isReturnToTeam: !!(!fromCanonical && toCanonical),
          excludeFromEfficiencyBackflow: false
        });
      }
    });
  });

  events.sort(function(a, b) {
    return new Date(a.changedAt) - new Date(b.changedAt);
  });

  let prevStatusAt = null;

  events.forEach(function(e) {
    if (e.eventType !== 'Status') return;

    e.timeSincePreviousStatusMs = prevStatusAt
      ? getWorkingDurationMs_(prevStatusAt, e.changedAt)
      : null;

    prevStatusAt = e.changedAt;

    const normalizedFrom = normalizeTeamIdentity_(e.fromValue || '');
    const normalizedTo = normalizeTeamIdentity_(e.toValue || '');

    const isReviewToHold =
      (normalizedFrom === 'review' || normalizedFrom.indexOf('in review') >= 0) &&
      (normalizedTo.indexOf('hold') >= 0 || normalizedTo.indexOf('blocked') >= 0);

    e.excludeFromEfficiencyBackflow = isReviewToHold;
    e.isBackflow = isReverseTransition_(e.fromValue, e.toValue);
  });

  return events;
}

function parseJiraDateOrDateOnly_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') return value;

  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;

  return value;
}

function formatDuration_(ms) {
  if (ms === null || ms === undefined || ms === '') return '';

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days) parts.push(days + 'd');
  if (hours) parts.push(hours + 'h');
  if (minutes || parts.length === 0) parts.push(minutes + 'm');

  return parts.join(' ');
}

function applyLongDurationAlertStyle_(cell, durationMs) {
  const tenDaysMs = 10 * 24 * 60 * 60 * 1000;

  if (durationMs !== null && durationMs !== undefined && durationMs > tenDaysMs) {
    cell
      .setBackground('#f4cccc')
      .setFontColor('#cc0000')
      .setFontWeight('bold');
  }
}

function getActiveReportSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existing = ss.getSheetByName('Jira Report');
  return existing || ss.insertSheet('Jira Report');
}

function prepareSheet_(sheet) {
  const existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }

  const maxRows = Math.max(sheet.getMaxRows(), 1);
  const maxCols = Math.max(sheet.getMaxColumns(), 1);

  sheet.clearContents();
  sheet.clearFormats();
  sheet.clearNotes();
  sheet.getRange(1, 1, maxRows, maxCols).clearDataValidations();
}

function getAssigneeName_(issue) {
  const assignee = safeGet_(issue, ['fields', 'assignee']);
  if (!assignee) return '';
  return assignee.displayName || assignee.accountId || assignee.emailAddress || '';
}

function getAuthorName_(history) {
  const author = history.author || {};
  return author.displayName || author.accountId || author.emailAddress || '';
}

function testSidebarAuth() {
  return {
    ok: true,
    user: Session.getActiveUser().getEmail(),
    time: new Date().toISOString()
  };
}

function writeTimeStatAutoSheet_(reportData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'Time Statistics';
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    const maxRows = Math.max(sheet.getMaxRows(), 1);
    const maxCols = Math.max(sheet.getMaxColumns(), 1);
    sheet.clearContents();
    sheet.clearFormats();
    sheet.clearNotes();
    sheet.getRange(1, 1, maxRows, maxCols).clearDataValidations();
  }

  const params = reportData.params || {};
  const monthlyWorkingHours = 164;
  const daysInPeriod = getDaysInPeriod_(params.dateFrom, params.dateTo);

  const cycles = extractProgressReviewCyclesFromReport_(reportData);
  const grouped = groupCyclesForTimeStat_(cycles, daysInPeriod, monthlyWorkingHours);

  writeTimeStatTable_(sheet, grouped, monthlyWorkingHours);
}

function extractProgressReviewCyclesFromReport_(reportData) {
  const grouped = reportData.grouped || {};
  const params = reportData.params || {};
  const result = [];

  Object.keys(grouped).forEach(function(userKey) {
    const userBlock = grouped[userKey];
    const userLabel = userBlock.userLabel || userKey;
    const issues = userBlock.issues || [];

    issues.forEach(function(issue) {
      const segments = getCycleSegments_(issue, params);

      segments.forEach(function(segment) {
        if (segment.type !== 'progress_to_review') return;
        if (segment.ms === null || segment.ms < 0) return;

        result.push({
          userKey: userKey,
          userLabel: userLabel,
          taskType: issue.contentType && issue.contentType !== 'none'
            ? issue.contentType
            : (issue.issueTypeName || 'Other'),
          issueKey: issue.issueKey,
          startedAt: segment.startedAt,
          reviewedAt: segment.endedAt,
          durationMin: Math.round(segment.ms / 60000)
        });
      });
    });
  });

  return result;
}

function groupCyclesForTimeStat_(cycles, daysInPeriod, monthlyWorkingHours) {
  const grouped = {};

  cycles.forEach(function(cycle) {
    const userKey = cycle.userKey;
    const userLabel = cycle.userLabel;
    const taskType = cycle.taskType || 'Other';
    const groupKey = userKey + '||' + taskType;

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        userKey: userKey,
        userLabel: userLabel,
        taskType: taskType,
        cycles: [],
        monthlyQty: 0,
        minMonthlyQty: 0,
        maxMonthlyQty: 0,
        avgMonthlyQty: 0,
        minTimeMin: 0,
        maxTimeMin: 0,
        avgTimeMin: 0,
        avgTotalTimeHrs: 0,
        loadPercentage: 0,
        status: '',
        requiredHeadcount: 0
      };
    }

    grouped[groupKey].cycles.push(cycle);
  });

  Object.keys(grouped).forEach(function(groupKey) {
    const item = grouped[groupKey];
    const durations = item.cycles.map(function(c) { return c.durationMin; });
    const count = item.cycles.length;

    const monthlyQty = count / Math.max(daysInPeriod, 1) * 30;

    item.monthlyQty = monthlyQty;
    item.minMonthlyQty = monthlyQty;
    item.maxMonthlyQty = monthlyQty;
    item.avgMonthlyQty = monthlyQty;

    item.minTimeMin = Math.min.apply(null, durations);
    item.maxTimeMin = Math.max.apply(null, durations);
    item.avgTimeMin = Math.round(
      durations.reduce(function(sum, v) { return sum + v; }, 0) / durations.length
    );

    item.avgTotalTimeHrs = Math.round((item.avgMonthlyQty * item.avgTimeMin / 60) * 100) / 100;
    item.loadPercentage = Math.round((item.avgTotalTimeHrs / monthlyWorkingHours) * 10000) / 100;
    item.requiredHeadcount = Math.round((item.avgTotalTimeHrs / monthlyWorkingHours) * 100) / 100;
    item.status = getLoadStatus_(item.loadPercentage);
  });

  return grouped;
}

function writeTimeStatTable_(sheet, grouped, monthlyWorkingHours) {
  const header = [
    'Task Type',
    'Min Monthly Qty',
    'Max Monthly Qty',
    'Avg Monthly Qty',
    'Min Time (min)',
    'Max Time (min)',
    'Avg Time (min)',
    'Avg Total Time (hrs)',
    'Load percentage',
    'Status',
    'Required Headcount',
    'Monthly working hours'
  ];

  let row = 1;

  sheet.getRange(row, 1, 1, header.length).setValues([header]);
  sheet.getRange(row, 1, 1, header.length)
    .setFontWeight('bold')
    .setBackground('#fff2cc')
    .setWrap(true)
    .setVerticalAlignment('middle');
  row++;

  const items = Object.keys(grouped).map(function(k) {
    return grouped[k];
  });

  const usersMap = {};
  items.forEach(function(item) {
    if (!usersMap[item.userLabel]) usersMap[item.userLabel] = [];
    usersMap[item.userLabel].push(item);
  });

  Object.keys(usersMap).sort().forEach(function(userLabel) {
    const rows = usersMap[userLabel].sort(function(a, b) {
      return a.taskType.localeCompare(b.taskType);
    });

    const totalHours = rows.reduce(function(sum, item) {
      return sum + item.avgTotalTimeHrs;
    }, 0);
    const totalLoad = Math.round((totalHours / monthlyWorkingHours) * 10000) / 100;
    const totalHeadcount = Math.round((totalHours / monthlyWorkingHours) * 100) / 100;
    const totalStatus = getLoadStatus_(totalLoad);

    sheet.getRange(row, 1, 1, header.length).setValues([[
      userLabel, '', '', '', '', '', '', Math.round(totalHours * 100) / 100,
      totalLoad + '%', totalStatus, totalHeadcount, monthlyWorkingHours
    ]]);
    sheet.getRange(row, 1, 1, header.length)
      .setFontWeight('bold')
      .setBackground('#cfe2f3')
      .setWrap(true)
      .setVerticalAlignment('middle');

    if (totalStatus === 'Overloaded') {
      sheet.getRange(row, 10).setBackground('#f4cccc');
    } else if (totalStatus === 'Normal') {
      sheet.getRange(row, 10).setBackground('#d9ead3');
    } else {
      sheet.getRange(row, 10).setBackground('#fff2cc');
    }

    row++;

    rows.forEach(function(item) {
      sheet.getRange(row, 1, 1, header.length).setValues([[
        item.taskType,
        round2_(item.minMonthlyQty),
        round2_(item.maxMonthlyQty),
        round2_(item.avgMonthlyQty),
        item.minTimeMin,
        item.maxTimeMin,
        item.avgTimeMin,
        item.avgTotalTimeHrs,
        item.loadPercentage + '%',
        item.status,
        item.requiredHeadcount,
        ''
      ]]);

      sheet.getRange(row, 1, 1, header.length)
        .setWrap(true)
        .setVerticalAlignment('middle');

      if (item.status === 'Overloaded') {
        sheet.getRange(row, 10).setBackground('#f4cccc');
      } else if (item.status === 'Normal') {
        sheet.getRange(row, 10).setBackground('#d9ead3');
      } else {
        sheet.getRange(row, 10).setBackground('#fff2cc');
      }

      row++;
    });

    row++;
  });

  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 130);
  sheet.setColumnWidth(7, 130);
  sheet.setColumnWidth(8, 150);
  sheet.setColumnWidth(9, 130);
  sheet.setColumnWidth(10, 130);
  sheet.setColumnWidth(11, 150);
  sheet.setColumnWidth(12, 150);

  sheet.getDataRange().setHorizontalAlignment('left');
  sheet.getDataRange().setVerticalAlignment('middle');

  for (let r = 1; r <= sheet.getLastRow(); r++) {
    sheet.setRowHeight(r, 28);
  }
}

function getDaysInPeriod_(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return 30;

  const start = new Date(dateFrom);
  const end = new Date(dateTo);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 30;

  const diffMs = end - start;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;

  return Math.max(days, 1);
}

function getLoadStatus_(loadPercentage) {
  const value = Number(loadPercentage || 0);

  if (value > 100) return 'Overloaded';
  if (value >= 50) return 'Normal';
  return 'Low load';
}

function round2_(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function buildTimeStatAutoFromLastRun() {
  const props = PropertiesService.getUserProperties();

  const params = {
    dateFrom: props.getProperty('LAST_DATE_FROM') || '',
    dateTo: props.getProperty('LAST_DATE_TO') || getTodayIsoDate_(),
    targetReviewDays: props.getProperty('LAST_TARGET_REVIEW_DAYS') || '3',
    usersText: props.getProperty('LAST_USERS_TEXT') || '',
    projectsText: props.getProperty('LAST_PROJECTS_TEXT') || ''
  };

  const normalizedParams = normalizeFormData_(params);
  const creds = getJiraCredentials_();
  const jql = buildJql_(normalizedParams);

  const issueCache = {};
  const teamUsers = resolveTeamUsersForAudit_(creds, normalizedParams.users);
  const teamIdentityIndex = buildTeamIdentityIndex_(teamUsers, normalizedParams.users);

  let issues = fetchAllIssues_(creds, jql);

  issues.forEach(function(issue) {
    issueCache[issue.key] = issue;
  });

  const reportData = buildEnhancedJiraAuditReport_(
    issues,
    creds,
    normalizedParams,
    issueCache,
    teamUsers,
    teamIdentityIndex
  );

  writeTimeStatAutoSheet_(reportData);

  return {
    ok: true,
    sheetName: 'Time Statistics'
  };
}

function writeFirstPassRateAutoSheet_(reportData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'First Pass Rate';
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    const maxRows = Math.max(sheet.getMaxRows(), 1);
    const maxCols = Math.max(sheet.getMaxColumns(), 1);
    sheet.clearContents();
    sheet.clearFormats();
    sheet.clearNotes();
    sheet.getRange(1, 1, maxRows, maxCols).clearDataValidations();
  }

  const metrics = buildFirstPassRateMetrics_(reportData);

  const header = [
    'Metric',
    'How it is calculated',
    'Completed tasks',
    'Returned tasks',
    'Accepted from first pass',
    'First pass rate, %',
    'Status'
  ];

  const officialStatus = getFirstPassStatus_(metrics.official.firstPassRatePercent);
  const operationalStatus = getFirstPassStatus_(metrics.operational.firstPassRatePercent);

  const rows = [
    [
      'Official first pass',
      'Completed full cycles inside the selected period that had no backflow before completion',
      metrics.official.completedTasks,
      metrics.official.notFirstPassTasks,
      metrics.official.acceptedFirstPassTasks,
      metrics.official.firstPassRatePercent,
      officialStatus
    ],
    [
      'Operational first pass',
      'Completed full cycles inside the selected period that had no return into earlier working stages before completion',
      metrics.operational.completedTasks,
      metrics.operational.notFirstPassTasks,
      metrics.operational.acceptedFirstPassTasks,
      metrics.operational.firstPassRatePercent,
      operationalStatus
    ]
  ];

  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(1, 1, 1, header.length)
    .setFontWeight('bold')
    .setBackground('#fff2cc')
    .setWrap(true);

  sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  sheet.getRange(2, 1, rows.length, header.length).setWrap(true);

  sheet.getRange(2, 3, rows.length, 3).setNumberFormat('0');
  sheet.getRange(2, 6, rows.length, 1).setNumberFormat('0.00');

  applyFirstPassStatusStyle_(sheet.getRange(2, 7), officialStatus);
  applyFirstPassStatusStyle_(sheet.getRange(3, 7), operationalStatus);

  applyFirstPassRateCellStyle_(sheet.getRange(2, 6), metrics.official.firstPassRatePercent);
  applyFirstPassRateCellStyle_(sheet.getRange(3, 6), metrics.operational.firstPassRatePercent);

  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 210);
  sheet.setColumnWidth(2, 520);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 190);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 140);

  for (let r = 1; r <= Math.max(sheet.getLastRow(), 3); r++) {
    sheet.setRowHeight(r, 38);
  }

  const timeStatsSheet = ss.getSheetByName('Time Statistics');
  if (timeStatsSheet) {
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(timeStatsSheet.getIndex() + 1);
  }
}

function getFirstPassStatus_(percent) {
  const value = Number(percent || 0);

  if (value >= 98) return 'Excellent';
  if (value >= 95) return 'Healthy';
  if (value >= 90) return 'Watch';
  if (value >= 80) return 'Risk';
  return 'Critical';
}

function applyFirstPassStatusStyle_(range, status) {
  const normalized = String(status || '').toLowerCase();

  range.setFontWeight('bold');

  if (normalized === 'excellent') {
    range.setBackground('#b6d7a8').setFontColor('#274e13');
    return;
  }
  if (normalized === 'healthy') {
    range.setBackground('#d9ead3').setFontColor('#274e13');
    return;
  }
  if (normalized === 'watch') {
    range.setBackground('#fff2cc').setFontColor('#7f6000');
    return;
  }
  if (normalized === 'risk') {
    range.setBackground('#f4cccc').setFontColor('#990000');
    return;
  }
  if (normalized === 'critical') {
    range.setBackground('#ea9999').setFontColor('#990000');
    return;
  }
}

function applyFirstPassRateCellStyle_(range, percent) {
  const value = Number(percent || 0);

  range.setFontWeight('bold');

  if (value >= 98) {
    range.setBackground('#d9ead3').setFontColor('#274e13');
    return;
  }
  if (value >= 95) {
    range.setBackground('#e2f0d9').setFontColor('#274e13');
    return;
  }
  if (value >= 90) {
    range.setBackground('#fff2cc').setFontColor('#7f6000');
    return;
  }
  if (value >= 80) {
    range.setBackground('#fce5cd').setFontColor('#b45f06');
    return;
  }

  range.setBackground('#f4cccc').setFontColor('#990000');
}

function buildFirstPassRateMetrics_(reportData) {
  const issues = flattenGroupedIssues_(reportData.grouped || {});

  let completedTasks = 0;
  let officialNotFirstPass = 0;
  let operationalNotFirstPass = 0;

  issues.forEach(function(issue) {
    const segments = getCycleSegments_(issue, reportData.params || {});
    const completedCycles = buildCompletedCyclesFromSegments_(segments);

    completedCycles.forEach(function(cycle) {
      completedTasks++;

      if (cycle.hasBackflow) {
        officialNotFirstPass++;
        operationalNotFirstPass++;
      }
    });
  });

  const officialAccepted = Math.max(0, completedTasks - officialNotFirstPass);
  const operationalAccepted = Math.max(0, completedTasks - operationalNotFirstPass);

  return {
    official: {
      completedTasks: completedTasks,
      notFirstPassTasks: officialNotFirstPass,
      acceptedFirstPassTasks: officialAccepted,
      firstPassRatePercent: completedTasks
        ? round2_((officialAccepted / completedTasks) * 100)
        : 0
    },
    operational: {
      completedTasks: completedTasks,
      notFirstPassTasks: operationalNotFirstPass,
      acceptedFirstPassTasks: operationalAccepted,
      firstPassRatePercent: completedTasks
        ? round2_((operationalAccepted / completedTasks) * 100)
        : 0
    }
  };
}