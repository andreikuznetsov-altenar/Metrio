function getWSkinsInitialFormData() {
  const props = PropertiesService.getUserProperties();

  return {
    dateFrom: props.getProperty('WSK_LAST_DATE_FROM') || '',
    dateTo: props.getProperty('WSK_LAST_DATE_TO') || getTodayIsoDate_(),
    targetReviewDays: props.getProperty('WSK_LAST_TARGET_REVIEW_DAYS') || '3',
    usersText: props.getProperty('WSK_LAST_USERS_TEXT') || '',
    projectsText: props.getProperty('WSK_LAST_PROJECTS_TEXT') || ''
  };
}

function saveWSkinsLastFormData_(params) {
  const props = PropertiesService.getUserProperties();
  props.setProperty('WSK_LAST_DATE_FROM', params.dateFrom || '');
  props.setProperty('WSK_LAST_DATE_TO', params.dateTo || '');
  props.setProperty('WSK_LAST_TARGET_REVIEW_DAYS', String(params.targetReviewDays || '3'));
  props.setProperty('WSK_LAST_USERS_TEXT', params.usersText || '');
  props.setProperty('WSK_LAST_PROJECTS_TEXT', params.projectsText || '');
}

function runWSkinsLastSavedReport() {
  return runWSkinsJiraStatusAuditReport(getWSkinsInitialFormData());
}

function runWSkinsJiraStatusAuditReport(formData) {
  const params = normalizeWSkinsFormData_(formData);
  validateWSkinsRuntimeParams_(params);
  saveWSkinsLastFormData_(params);

  const creds = getJiraCredentials_();
  const jql = buildWSkinsJql_(params);

  const sheet = getOrCreateSheet_('Jira Report Wskins');
  prepareWSkinsSheet_(sheet);

  const issueCache = {};
  const teamUsers = resolveWSkinsTeamUsersForAudit_(creds, params.users);
  const teamIdentityIndex = buildWSkinsTeamIdentityIndex_(teamUsers, params.users);

  let issues = fetchWSkinsAllIssues_(creds, jql);
  issues = filterIssuesByCreatedRange_(issues, params);

  issues.forEach(function(issue) {
    issueCache[issue.key] = issue;
  });

  const reportData = buildWSkinsEnhancedJiraAuditReport_(
    issues,
    creds,
    params,
    issueCache,
    teamUsers,
    teamIdentityIndex
  );

  writeWSkinsEnhancedJiraAuditReport_(sheet, {
    params: params,
    creds: creds,
    issuesCount: issues.length,
    groupedData: reportData,
    issueCache: issueCache
  });

  writeWSkinsTimeStatAutoSheet_(reportData, params);
  writeWSkinsFirstPassRateAutoSheet_(reportData, params);

  return {
    ok: true,
    issuesFound: issues.length,
    transitionsFound: reportData.totalTransitions,
    sheetName: sheet.getName()
  };
}

function normalizeWSkinsFormData_(formData) {
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

function validateWSkinsRuntimeParams_(params) {
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

function buildWSkinsJql_(params) {
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
    parts.push('created >= "' + params.dateFrom + '"');
  }

  if (params.dateTo) {
    parts.push('created <= "' + params.dateTo + '"');
  }

  return parts.join(' AND ') + ' ORDER BY created ASC, key ASC';
}

function fetchWSkinsAllIssues_(creds, jql) {
  let nextPageToken = '';
  let allIssues = [];
  const fields = getWSkinsBaseFields_();

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

function getWSkinsBaseFields_() {
  const fields = [
    'summary',
    'assignee',
    'status',
    'created',
    'issuetype',
    'parent',
    'priority',
    'subtasks'
  ];

  if (CONFIG.CONTENT_TYPE_FIELD) fields.push(CONFIG.CONTENT_TYPE_FIELD);

  return fields;
}

function fetchWSkinsAllChangelog_(creds, issueKey) {
  return fetchAllChangelog_(creds, issueKey);
}

function fetchWSkinsIssueByKeyCached_(creds, issueKey, issueCache) {
  if (!issueKey) return null;
  if (issueCache[issueKey]) return issueCache[issueKey];

  const endpoint = '/rest/api/3/issue/' + encodeURIComponent(issueKey) + '?' + toQueryString_({ fields: getWSkinsBaseFields_() });
  const issue = jiraRequest_(creds, endpoint, 'get');
  issueCache[issueKey] = issue;
  return issue;
}

function resolveWSkinsTeamUsersForAudit_(creds, requestedUsers) {
  return requestedUsers.map(function(inputUser) {
    const normalizedInput = normalizeAuditIdentity_(inputUser);
    let resolved = null;

    try {
      const endpoint = '/rest/api/3/user/search?' + toQueryString_({ query: inputUser });
      const users = jiraRequest_(creds, endpoint, 'get') || [];
      resolved = users[0] || null;

      for (let i = 0; i < users.length; i++) {
        const candidate = users[i];
        const candidateEmail = normalizeAuditIdentity_(candidate.emailAddress || '');
        const candidateAccountId = normalizeAuditIdentity_(candidate.accountId || '');
        const candidateName = normalizeAuditIdentity_(candidate.displayName || '');
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

function buildWSkinsTeamIdentityIndex_(teamUsers, requestedUsers) {
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
      const key = normalizeAuditIdentity_(value);
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

function getWSkinsCanonicalTeamMember_(value, teamIdentityIndex) {
  return teamIdentityIndex.identifierToCanonical[normalizeAuditIdentity_(value)] || '';
}

function findWSkinsMatchingTeamMembersForIssue_(assignee, events, teamIdentityIndex) {
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
    const canonical = getWSkinsCanonicalTeamMember_(candidate, teamIdentityIndex);
    if (canonical) {
      found[canonical] = true;
    }
  });

  return Object.keys(found);
}

function buildWSkinsEnhancedJiraAuditReport_(issues, creds, params, issueCache, teamUsers, teamIdentityIndex) {
  const grouped = {};
  let totalTransitions = 0;
  const allIssuesToProcess = [];
  const seenIssueKeys = {};

  teamUsers.forEach(function(user) {
    grouped[user.canonical] = {
      requestedUser: user.canonical,
      userLabel: teamIdentityIndex.canonicalToLabel[user.canonical] || user.canonical,
      issues: [],
      transitionStats: {}
    };
  });

  issues.forEach(function(issue) {
    if (!isIssueCreatedWithinRange_(issue, params)) return;

    if (issue && issue.key && !seenIssueKeys[issue.key]) {
      allIssuesToProcess.push(issue);
      seenIssueKeys[issue.key] = true;
    }

    const subtasks = getWSkinsLoadedSubtasksForIssue_(issue, creds, issueCache, params);
    subtasks.forEach(function(subtask) {
      if (subtask && subtask.key && !seenIssueKeys[subtask.key]) {
        allIssuesToProcess.push(subtask);
        seenIssueKeys[subtask.key] = true;
      }
    });
  });

  allIssuesToProcess.forEach(function(issue) {
    if (!isIssueCreatedWithinRange_(issue, params)) return;

    const issueKey = issue.key;
    const issueSummary = safeGet_(issue, ['fields', 'summary']) || '';
    const issueCreated = safeGet_(issue, ['fields', 'created']) || '';
    const assignee = safeGet_(issue, ['fields', 'assignee']);
    const assigneeName = getWSkinsAssigneeName_(issue);
    const issueTypeName = getWSkinsIssueTypeName_(issue) || 'none';
    const contentType = getWSkinsContentTypeValue_(issue) || 'none';
    const designImprovementType = isWSkinsDesignImprovement_(issue) ? issueTypeName : 'none';
    const priorityName = safeGet_(issue, ['fields', 'priority', 'name']) || '';
    const isSubtask = !!safeGet_(issue, ['fields', 'issuetype', 'subtask']);
    const parentKey = safeGet_(issue, ['fields', 'parent', 'key']) || '';
    const parentSummary = safeGet_(issue, ['fields', 'parent', 'fields', 'summary']) || '';

    const changelogItems = fetchWSkinsAllChangelog_(creds, issueKey);
    const filteredChangelog = filterChangelogItemsByAuditRange_(changelogItems, params);
    const events = buildWSkinsIssueEvents_(issue, filteredChangelog, teamIdentityIndex);

    const matchedUsers = findWSkinsMatchingTeamMembersForIssue_(assignee, events, teamIdentityIndex);
    if (!matchedUsers.length) {
      return;
    }

    const statusEvents = events.filter(function(e) {
      return e.eventType === 'Status';
    });
    totalTransitions += statusEvents.length;

    matchedUsers.forEach(function(canonical) {
      if (!grouped[canonical]) return;

      grouped[canonical].issues.push({
        issueKey: issueKey,
        issueSummary: issueSummary,
        issueCreated: issueCreated,
        assigneeName: assigneeName,
        assigneeEmail: safeGet_(issue, ['fields', 'assignee', 'emailAddress']) || '',
        assigneeAccountId: safeGet_(issue, ['fields', 'assignee', 'accountId']) || '',
        issueTypeName: issueTypeName,
        contentType: contentType,
        designImprovementType: designImprovementType,
        priorityName: priorityName,
        isSubtask: isSubtask,
        parentKey: parentKey || '',
        parentSummary: parentSummary || '',
        events: events
      });

      statusEvents.forEach(function(e) {
        const key = (e.fromValue || '') + ' → ' + (e.toValue || '');
        grouped[canonical].transitionStats[key] = (grouped[canonical].transitionStats[key] || 0) + 1;
      });
    });
  });

  Object.keys(grouped).forEach(function(userKey) {
    grouped[userKey].issues.sort(function(a, b) {
      const aParent = a.parentKey || a.issueKey;
      const bParent = b.parentKey || b.issueKey;

      if (aParent !== bParent) {
        return aParent.localeCompare(bParent);
      }

      if ((a.isSubtask ? 1 : 0) !== (b.isSubtask ? 1 : 0)) {
        return (a.isSubtask ? 1 : 0) - (b.isSubtask ? 1 : 0);
      }

      return a.issueKey.localeCompare(b.issueKey);
    });
  });

  const flatIssues = flattenWSkinsGroupedIssues_(grouped);
  const teamKpi = buildWSkinsKpiFromIssues_(flatIssues, params);
  const perUserKpi = {};

  Object.keys(grouped).forEach(function(userKey) {
    perUserKpi[userKey] = buildWSkinsKpiFromIssues_(
      grouped[userKey].issues || [],
      params
    );
  });

  return {
    grouped: grouped,
    totalTransitions: totalTransitions,
    teamSummaryColumns: buildWSkinsTeamSummaryColumns_(grouped),
    teamKpi: teamKpi,
    perUserKpi: perUserKpi,
    params: params
  };
}

function hasWSkinsRelevantAuditActivity_(events, params) {
  return (events || []).some(function(e) {
    return isDateWithinRange_(e.changedAt, params) &&
      (e.eventType === 'Status' || e.eventType === 'Assignee');
  });
}

function getWSkinsLoadedSubtasksForIssue_(issue, creds, issueCache, params) {
  const subtasks = safeGet_(issue, ['fields', 'subtasks']) || [];
  const result = [];

  subtasks.forEach(function(stub) {
    if (!stub || !stub.key) return;

    const fullSubtask = fetchWSkinsIssueByKeyCached_(creds, stub.key, issueCache);
    if (!fullSubtask) return;

    if (!isIssueCreatedWithinRange_(fullSubtask, params)) return;

    result.push(fullSubtask);
  });

  return result;
}

function isWSkinsSubtaskIssueObject_(issue) {
  return !!(issue && issue.isSubtask);
}

function buildWSkinsKpiFromIssues_(issues, params) {
  const allDurations = [];
  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  let backflowCount = 0;

  (issues || []).forEach(function(issue) {
    const issueResult = isWSkinsSubtaskIssueObject_(issue)
      ? calculateWSkinsSubtaskKpiContribution_(issue, params)
      : calculateWSkinsMainTaskKpiContribution_(issue, params);

    startedCount += Number(issueResult.startedCount || 0);
    reviewSubmittedCount += Number(issueResult.reviewSubmittedCount || 0);
    completedCount += Number(issueResult.completedCount || 0);
    backflowCount += Number(issueResult.backflowCount || 0);

    (issueResult.workDurationsMs || []).forEach(function(v) {
      if (v !== null && v !== undefined && !isNaN(v) && v >= 0) {
        allDurations.push(v);
      }
    });
  });

  const avgProgressToReviewMs = averageWSkinsMs_(allDurations);

  return {
    startedCount: startedCount,
    reviewSubmittedCount: reviewSubmittedCount,
    completedCount: completedCount,
    firstPassAcceptedCount: 0,
    holdCount: 0,
    backflowCount: backflowCount,
    avgProgressToReviewMs: avgProgressToReviewMs,
    avgReviewToDoneMs: null,
    avgProgressToHoldMs: null,
    avgTodoToApprovedMs: null,
    targetReviewDays: Number(params && params.targetReviewDays ? params.targetReviewDays : 3),
    efficiencyIndex: calculateWSkinsEfficiencyIndex_({
      startedCount: startedCount,
      reviewSubmittedCount: reviewSubmittedCount,
      targetReviewDays: Number(params && params.targetReviewDays ? params.targetReviewDays : 3),
      completedCount: completedCount,
      avgProgressToReviewMs: avgProgressToReviewMs,
      backflowCount: backflowCount
    })
  };
}

function calculateWSkinsMainTaskKpiContribution_(issue, params) {
  const events = (issue.events || []).filter(function(e) {
    return e.eventType === 'Status';
  }).slice().sort(function(a, b) {
    return new Date(a.changedAt) - new Date(b.changedAt);
  });

  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  let backflowCount = 0;
  const workDurationsMs = [];

  let inProgressStartedAt = null;
  let startedMarked = false;
  let reviewSubmittedMarked = false;
  let completedMarked = false;

  events.forEach(function(e) {
    const toStatus = normalizeStatusText_(e.toValue || '');
    const eventInRange = isDateWithinRange_(e.changedAt, params);

    if (isWSkinsOneOfStatuses_(toStatus, ['in progress'])) {
      if (eventInRange && !startedMarked) {
        startedCount++;
        startedMarked = true;
      }

      if (!completedMarked) {
        inProgressStartedAt = e.changedAt;
      }
      return;
    }

    if (
      inProgressStartedAt &&
      isWSkinsOneOfStatuses_(toStatus, ['internal review']) &&
      eventInRange &&
      !completedMarked
    ) {
      if (!reviewSubmittedMarked) {
        reviewSubmittedCount++;
        reviewSubmittedMarked = true;
      }

      completedCount++;
      completedMarked = true;

      const ms = getWorkingDurationMs_(inProgressStartedAt, e.changedAt);
      if (ms !== null && ms > 0) {
        workDurationsMs.push(ms);
      }

      inProgressStartedAt = null;
      return;
    }
  });

  return {
    startedCount: startedCount,
    reviewSubmittedCount: reviewSubmittedCount,
    completedCount: completedCount,
    backflowCount: backflowCount,
    workDurationsMs: workDurationsMs
  };
}

function calculateWSkinsSubtaskKpiContribution_(issue, params) {
  const events = (issue.events || []).filter(function(e) {
    return e.eventType === 'Status';
  }).slice().sort(function(a, b) {
    return new Date(a.changedAt) - new Date(b.changedAt);
  });

  let startedCount = 0;
  let reviewSubmittedCount = 0;
  let completedCount = 0;
  let backflowCount = 0;
  const workDurationsMs = [];

  let activeWorkStartedAt = null;
  let completedMarked = false;

  events.forEach(function(e) {
    const toStatus = normalizeStatusText_(e.toValue || '');
    const eventInRange = isDateWithinRange_(e.changedAt, params);

    if (e.isBackflow && !e.excludeFromEfficiencyBackflow && eventInRange) {
      backflowCount++;
    }

    if (isWSkinsOneOfStatuses_(toStatus, ['in progress'])) {
      if (eventInRange) {
        startedCount++;
        activeWorkStartedAt = e.changedAt;
      } else {
        activeWorkStartedAt = null;
      }
      return;
    }

    if (
      activeWorkStartedAt &&
      isWSkinsOneOfStatuses_(toStatus, ['on approval']) &&
      eventInRange
    ) {
      reviewSubmittedCount++;

      const ms = getWorkingDurationMs_(activeWorkStartedAt, e.changedAt);
      if (ms !== null && ms > 0) {
        workDurationsMs.push(ms);
      }

      activeWorkStartedAt = null;
      return;
    }

    if (
      !completedMarked &&
      isWSkinsOneOfStatuses_(toStatus, ['done']) &&
      eventInRange
    ) {
      completedCount++;
      completedMarked = true;
    }
  });

  return {
    startedCount: startedCount,
    reviewSubmittedCount: reviewSubmittedCount,
    completedCount: completedCount,
    backflowCount: backflowCount,
    workDurationsMs: workDurationsMs
  };
}

function getWSkinsStageRank_(issue, statusValue) {
  const model = getWSkinsIssueFlowModel_(issue);
  const status = normalizeStatusText_(statusValue);

  if (isWSkinsOneOfStatuses_(status, model.todo)) return 1;
  if (isWSkinsOneOfStatuses_(status, model.progress)) return 2;
  if (isWSkinsOneOfStatuses_(status, model.hold)) return 3;
  if (isWSkinsOneOfStatuses_(status, model.approval)) return 4;
  if (isWSkinsOneOfStatuses_(status, model.final)) return 5;
  if (isWSkinsOneOfStatuses_(status, model.ignoredFinal)) return 99;

  return 0;
}

function isWSkinsReverseTransition_(issue, fromValue, toValue) {
  const fromRank = getWSkinsStageRank_(issue, fromValue);
  const toRank = getWSkinsStageRank_(issue, toValue);

  if (!fromRank || !toRank) return false;
  if (toRank === 99 || fromRank === 99) return false;

  return toRank < fromRank;
}

function buildWSkinsTeamSummaryColumns_(grouped) {
  const preferredOrder = [
    'To Do → In Progress',
    'TODO → In Progress',
    'Not started WS → In Progress',
    'In Progress → Internal Review',
    'Internal Review → In Progress',
    'In Progress → On approval',
    'On approval → In Progress',
   'On approval → Done',
    'On approval → PRE-LIVE',
    'On approval → PRE-Live',
   'On approval → Live',
   'PRE-LIVE → LIVE',
   'PRE-Live → Live',
   'PRE-LIVE → Archived',
   'PRE-Live → Archived',
   'LIVE → Archived',
    'Live → Archived',
   'In Progress → To Do',
   'Internal Review → To Do'
  ];

  const allowed = {};
  preferredOrder.forEach(function(k) {
    allowed[k] = true;
  });

  const allKeys = {};
  Object.keys(grouped).forEach(function(userKey) {
    Object.keys(grouped[userKey].transitionStats || {}).forEach(function(k) {
      if (allowed[k]) {
        allKeys[k] = true;
      }
    });
  });

  const ordered = [];
  preferredOrder.forEach(function(k) {
    if (allKeys[k]) {
      ordered.push(k);
    }
  });

  return ordered;
}

function buildWSkinsCombinedTransitionStats_(grouped) {
  const totals = {};

  Object.keys(grouped).forEach(function(userKey) {
    const stats = grouped[userKey].transitionStats || {};
    Object.keys(stats).forEach(function(k) {
      totals[k] = (totals[k] || 0) + stats[k];
    });
  });

  return totals;
}

function flattenWSkinsGroupedIssues_(grouped) {
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

function averageWSkinsMs_(items) {
  if (!items || !items.length) return null;
  const sum = items.reduce(function(acc, value) {
    return acc + value;
  }, 0);
  return Math.round(sum / items.length);
}

function calculateWSkinsEfficiencyIndex_(data) {
  const startedCount = Number(data.startedCount || 0);
  const reviewSubmittedCount = Number(data.reviewSubmittedCount || 0);
  const completedCount = Number(data.completedCount || 0);
  const backflowCount = Number(data.backflowCount || 0);
  const targetReviewDays = Number(data.targetReviewDays || 3);
  const targetReviewHours = targetReviewDays * 24;

  const hasActivity =
    startedCount > 0 ||
    reviewSubmittedCount > 0 ||
    completedCount > 0;

  if (!hasActivity) {
    return 0;
  }

  const baseScore = 40;
  const completionBase = Math.max(startedCount, reviewSubmittedCount, 1);
  const completionRate = completedCount / completionBase;
  const completionScore = Math.min(45, Math.round(completionRate * 45));

  const progressToReviewHours = data.avgProgressToReviewMs
    ? data.avgProgressToReviewMs / 3600000
    : null;

  let progressToReviewScore = 10;
  if (progressToReviewHours !== null) {
    if (progressToReviewHours <= targetReviewHours) {
      progressToReviewScore = 20;
    } else if (progressToReviewHours <= targetReviewHours + 24) {
      progressToReviewScore = 17;
    } else if (progressToReviewHours <= targetReviewHours + 48) {
      progressToReviewScore = 13;
    } else if (progressToReviewHours <= targetReviewHours + 96) {
      progressToReviewScore = 9;
    } else {
      progressToReviewScore = 4;
    }
  }

  const backflowBase = Math.max(startedCount, 1);
  const backflowRate = backflowCount / backflowBase;
  const backflowPenalty = Math.min(35, Math.round(backflowRate * 20));

  const rawScore = baseScore + completionScore + progressToReviewScore - backflowPenalty;
  return Math.max(1, Math.min(100, Math.round(rawScore)));
}

function getWSkinsEfficiencyStatus_(score) {
  const value = Number(score || 0);

  if (value >= 95) return 'Excellent';
  if (value >= 80) return 'Healthy';
  if (value >= 65) return 'Watch';
  if (value >= 50) return 'Risk';
  return 'Critical';
}

function getWSkinsEfficiencyNote_(kpi, params) {
  const startedCount = Number(kpi.startedCount || 0);
  const reviewSubmittedCount = Number(kpi.reviewSubmittedCount || 0);
  const completedCount = Number(kpi.completedCount || 0);
  const backflowCount = Number(kpi.backflowCount || 0);
  const targetReviewDays = Number((params && params.targetReviewDays) || kpi.targetReviewDays || 3);
  const targetReviewHours = targetReviewDays * 24;

  const completionBase = Math.max(startedCount, reviewSubmittedCount, 1);
  const completionRate = completedCount / completionBase;
  const completionScore = Math.min(45, Math.round(completionRate * 45));

  const designerWorkHours = kpi.avgProgressToReviewMs
    ? kpi.avgProgressToReviewMs / 3600000
    : null;

  let workTimeScore = 10;
  if (designerWorkHours !== null) {
    if (designerWorkHours <= targetReviewHours) {
      workTimeScore = 20;
    } else if (designerWorkHours <= targetReviewHours + 24) {
      workTimeScore = 17;
    } else if (designerWorkHours <= targetReviewHours + 48) {
      workTimeScore = 13;
    } else if (designerWorkHours <= targetReviewHours + 96) {
      workTimeScore = 9;
    } else {
      workTimeScore = 4;
    }
  }

  const backflowBase = Math.max(startedCount, 1);
  const backflowRate = backflowCount / backflowBase;
  const backflowPenalty = Math.min(35, Math.round(backflowRate * 20));

  const finalScore = Number(kpi.efficiencyIndex || 0);

  return (
  'Efficiency Index formula:\n' +
  'Index = 40 + Completion Score + Designer Work Time Score - Backflow Penalty\n\n' +
  '1) Base Score = 40\n\n' +
  '2) Completion Score:\n' +
  'completionBase = max(Tasks Started, Reviews Submitted, 1)\n' +
  'completionRate = Completed / completionBase\n' +
  'completionScore = min(45, round(completionRate × 45))\n' +
  'Current: Completed=' + completedCount +
  ', Base=' + completionBase +
  ', Rate=' + completionRate.toFixed(2) +
  ', Score=' + completionScore + '\n\n' +
  '3) Designer Work Time Score:\n' +
  'Target days = ' + targetReviewDays + '\n' +
  '≤ target = 20\n' +
  '≤ target + 1 day = 17\n' +
  '≤ target + 2 days = 13\n' +
  '≤ target + 4 days = 9\n' +
  '> target + 4 days = 4\n' +
  'No data = 10\n' +
  'Current Avg: ' + formatDuration_(kpi.avgProgressToReviewMs) +
  ', Score=' + workTimeScore + '\n\n' +
  '4) Backflow Penalty:\n' +
  'backflowBase = max(Tasks Started, 1)\n' +
  'backflowRate = Backflow Count / backflowBase\n' +
  'backflowPenalty = min(35, round(backflowRate × 20))\n' +
  'Current: Backflow=' + backflowCount +
  ', Base=' + backflowBase +
  ', Rate=' + backflowRate.toFixed(2) +
  ', Penalty=' + backflowPenalty + '\n\n' +
  'Work time logic used in this report:\n' +
  '- Main task: In Progress → Internal Review\n' +
  '- Main task designer completion point: Internal Review\n' +
  '- Main task returns after Internal Review are not counted as backflow in KPI\n' +
  '- Subtask: In Progress → On Approval\n' +
  '- Subtask completion point: Done\n' +
  '- Subtask On Hold is removed from the workflow\n' +
  '- Subtask returns from later stages back into working stages are counted as backflow\n\n' +
  'Important:\n' +
  '- KPI and aggregates are calculated only for events inside the selected report date range\n' +
  '- Task Path keeps full changelog to avoid empty blocks\n\n' +
  'Final Index = ' + finalScore
  );
}

function applyWSkinsEfficiencyStatusStyle_(range, status) {
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

function writeWSkinsEnhancedJiraAuditReport_(sheet, data) {
  sheet.setFrozenRows(4);

  let row = 1;

  sheet.getRange(row, 1).setValue('JIRA REPORT WSKINS');
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

  row = writeWSkinsTeamKpiSection_(sheet, row, data.groupedData.teamKpi, data.params);
  row += 2;

  row = writeWSkinsTeamSummarySection_(sheet, row, data.groupedData);
  row += 2;

  row = writeWSkinsPerUserSummarySection_(sheet, row, data.groupedData);
  row += 2;

  row = writeWSkinsTaskPathSection_(
    sheet,
    row,
    data.groupedData,
    data.creds.baseUrl,
    data.creds,
    data.issueCache,
    data.params
  );

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

function writeWSkinsTeamKpiSection_(sheet, startRow, teamKpi, params) {
  let row = startRow;

  sheet.getRange(row, 1).setValue('TEAM KPI');
  sheet.getRange(row, 1, 1, 7)
    .setFontWeight('bold')
    .setFontSize(14)
    .setBackground('#b6d7a8');
  row++;

  const efficiencyStatus = getWSkinsEfficiencyStatus_(teamKpi.efficiencyIndex);

  const header = [
    'Tasks Started',
    'Reviews Submitted',
    'Completed',
    'Avg Designer Work Time',
    'Backflow Count',
    'Efficiency Index',
    'Efficiency Status'
  ];

  const values = [[
    teamKpi.startedCount || 0,
    teamKpi.reviewSubmittedCount || 0,
    teamKpi.completedCount || 0,
    formatDuration_(teamKpi.avgProgressToReviewMs),
    teamKpi.backflowCount || 0,
    teamKpi.efficiencyIndex || 0,
    efficiencyStatus
  ]];

  sheet.getRange(row, 1, 1, header.length).setValues([header]);
  sheet.getRange(row, 1, 1, header.length)
    .setFontWeight('bold')
    .setBackground('#d9ead3');
  row++;

  sheet.getRange(row, 1, 1, values[0].length).setValues(values);

  const workTimeCell = sheet.getRange(row, 4);
  const indexCell = sheet.getRange(row, 6);
  const statusCell = sheet.getRange(row, 7);

  applyLongDurationAlertStyle_(workTimeCell, teamKpi.avgProgressToReviewMs);

  indexCell
    .setFontWeight('bold')
    .setFontSize(16)
    .setBackground('#e2f0d9');
  indexCell.setNote(getWSkinsEfficiencyNote_(teamKpi, params));

  statusCell.setFontWeight('bold');
  applyWSkinsEfficiencyStatusStyle_(statusCell, efficiencyStatus);

  row++;
  return row;
}

function writeWSkinsTeamSummarySection_(sheet, startRow, groupedData) {
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
  }

  return headerRow + body.length;
}

function getWSkinsLastKnownStatusBeforeEvent_(events, eventIndex) {
  for (let i = eventIndex; i >= 0; i--) {
    const event = events[i];
    if (event && event.eventType === 'Status' && event.toValue) {
      return event.toValue;
    }
  }
  return '';
}

function writeWSkinsPerUserSummarySection_(sheet, startRow, groupedData) {
  const grouped = groupedData.grouped;
  const userKeys = Object.keys(grouped);
  let row = startRow;

  sheet.getRange(row, 1).setValue('SECTION 2. PER-USER SUMMARY');
  sheet.getRange(row, 1, 1, 9)
    .setFontWeight('bold')
    .setBackground('#cfe2f3');
  row += 2;

  userKeys.forEach(function(userKey) {
    const userBlock = grouped[userKey];
    const stats = userBlock.transitionStats || {};
    const kpi = groupedData.perUserKpi[userKey] || {};
    const efficiencyStatus = getWSkinsEfficiencyStatus_(kpi.efficiencyIndex);

    sheet.getRange(row, 1, 1, 9).setValues([[
      'USER', userBlock.userLabel || userKey, '', '', '', '', '', '', ''
    ]]);
    sheet.getRange(row, 1, 1, 9)
      .setFontWeight('bold')
      .setFontSize(13)
      .setBackground('#cfe2f3');
    row++;

    const kpiHeader = [
      'Tasks Started',
      'Reviews Submitted',
      'Completed',
      'Avg Designer Work Time',
      'Backflow Count',
      'Efficiency Index',
      'Efficiency Status'
    ];

    const kpiValues = [[
      kpi.startedCount || 0,
      kpi.reviewSubmittedCount || 0,
      kpi.completedCount || 0,
      formatDuration_(kpi.avgProgressToReviewMs),
      kpi.backflowCount || 0,
      kpi.efficiencyIndex || 0,
      efficiencyStatus
    ]];

    sheet.getRange(row, 1, 1, kpiHeader.length).setValues([kpiHeader]);
    sheet.getRange(row, 1, 1, kpiHeader.length)
      .setFontWeight('bold')
      .setBackground('#ddebf7');
    row++;

    sheet.getRange(row, 1, 1, kpiHeader.length).setValues(kpiValues);

    const workTimeCell = sheet.getRange(row, 4);
    const indexCell = sheet.getRange(row, 6);
    const statusCell = sheet.getRange(row, 7);

    applyLongDurationAlertStyle_(workTimeCell, kpi.avgProgressToReviewMs);

    indexCell
      .setFontWeight('bold')
      .setFontSize(14)
      .setBackground('#e2f0d9');
    indexCell.setNote(getWSkinsEfficiencyNote_(kpi, groupedData.params));

    statusCell.setFontWeight('bold');
    applyWSkinsEfficiencyStatusStyle_(statusCell, efficiencyStatus);

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

function writeWSkinsTaskPathSection_(sheet, startRow, groupedData, baseUrl, creds, issueCache, params) {
  const grouped = groupedData.grouped;
  const userKeys = Object.keys(grouped);
  let row = startRow;
  const MAX_MAIN_ISSUES_PER_USER = 20;

  sheet.getRange(row, 1).setValue('SECTION 3. TASK PATH DETAILS');
  sheet.getRange(row, 1, 1, 10).setFontWeight('bold').setBackground('#cfe2f3');
  row += 2;

  userKeys.forEach(function(userKey) {
    const userBlock = grouped[userKey];
    const userLabel = userBlock.userLabel || userKey;
    const allIssues = userBlock.issues || [];

    const mainIssues = allIssues.filter(function(issue) {
      return !issue.isSubtask;
    });

    const subtasks = allIssues.filter(function(issue) {
      return issue.isSubtask;
    });

    const subtasksByParent = {};
    subtasks.forEach(function(subtask) {
      const parentKey = subtask.parentKey || '__NO_PARENT__';
      if (!subtasksByParent[parentKey]) {
        subtasksByParent[parentKey] = [];
      }
      subtasksByParent[parentKey].push(subtask);
    });

    const interestingMainIssues = mainIssues.filter(function(issue) {
      const events = issue.events || [];

      const hasAssigneeChange = events.some(function(e) {
        return e.eventType === 'Assignee' && isDateWithinRange_(e.changedAt, params);
      });

      const hasBackflow = false;

      const hasStatusChanges = events.some(function(e) {
        return e.eventType === 'Status' && isDateWithinRange_(e.changedAt, params);
      });

      const hasSubtasks = (subtasksByParent[issue.issueKey] || []).length > 0;
      const isDesignImprovement = issue.designImprovementType && issue.designImprovementType !== 'none';

      return hasAssigneeChange || hasBackflow || hasStatusChanges || hasSubtasks || isDesignImprovement;
    }).slice(0, MAX_MAIN_ISSUES_PER_USER);

    const renderedParentKeys = {};
    interestingMainIssues.forEach(function(issue) {
      renderedParentKeys[issue.issueKey] = true;
    });

    const standaloneSubtasks = subtasks.filter(function(subtask) {
      return !renderedParentKeys[subtask.parentKey || ''] &&
        hasWSkinsRelevantAuditActivity_(subtask.events || [], params);
    }).sort(function(a, b) {
      const aParent = String(a.parentKey || '');
      const bParent = String(b.parentKey || '');
      if (aParent !== bParent) return aParent.localeCompare(bParent);
      return String(a.issueKey || '').localeCompare(String(b.issueKey || ''));
    });

    sheet.getRange(row, 1, 1, 10).setValues([['USER', userLabel, '', '', '', '', '', '', '', '']]);
    sheet.getRange(row, 1, 1, 10).setFontWeight('bold').setFontSize(15).setBackground('#d9ead3');
    row++;

    if (!interestingMainIssues.length && !standaloneSubtasks.length) {
      sheet.getRange(row, 1).setValue('No issues found');
      row += 2;
      return;
    }

    interestingMainIssues.forEach(function(issue) {
      row = writeWSkinsSingleIssueBlock_(sheet, row, issue, baseUrl, false);

      const childSubtasks = (subtasksByParent[issue.issueKey] || []).sort(function(a, b) {
        return String(a.issueKey || '').localeCompare(String(b.issueKey || ''));
      });

      childSubtasks.forEach(function(subtask) {
        row = writeWSkinsSingleIssueBlock_(sheet, row, subtask, baseUrl, true);
      });

      row += 1;
    });

    if (standaloneSubtasks.length) {
      sheet.getRange(row, 1, 1, 10).setValues([['SUBTASKS WITHOUT PARENT TASK IN THIS USER BLOCK', '', '', '', '', '', '', '', '', '']]);
      sheet.getRange(row, 1, 1, 10)
        .setFontWeight('bold')
        .setBackground('#fff2cc');
      row++;

      standaloneSubtasks.forEach(function(subtask) {
        row = writeWSkinsParentContextRow_(sheet, row, subtask, baseUrl, creds, issueCache);
        row = writeWSkinsSingleIssueBlock_(sheet, row, subtask, baseUrl, true);
        row += 1;
      });
    }

    row += 1;
  });

  return row;
}

function writeWSkinsParentContextRow_(sheet, row, subtask, baseUrl, creds, issueCache) {
  const parentKey = subtask.parentKey || '';
  const parentSummaryFromSubtask = subtask.parentSummary || '';

  if (!parentKey) {
    sheet.getRange(row, 1, 1, 7).setValues([[
      'PARENT TASK',
      '',
      'Parent not found',
      '',
      '',
      '',
      ''
    ]]);
    sheet.getRange(row, 1, 1, 7)
      .setFontWeight('bold')
      .setBackground('#fce5cd');
    return row + 1;
  }

  let parentIssue = null;
  try {
    parentIssue = fetchWSkinsIssueByKeyCached_(creds, parentKey, issueCache);
  } catch (e) {}

  const parentSummary = parentSummaryFromSubtask ||
    (parentIssue ? (safeGet_(parentIssue, ['fields', 'summary']) || '') : '');

  const parentPriority = parentIssue
    ? (safeGet_(parentIssue, ['fields', 'priority', 'name']) || '')
    : '';

  const parentContentType = parentIssue
    ? (getWSkinsContentTypeValue_(parentIssue) || '')
    : '';

  sheet.getRange(row, 1, 1, 7).setValues([[
    'PARENT TASK',
    '',
    parentSummary || '(no summary)',
    parentPriority || '',
    parentContentType || '',
    '',
    ''
  ]]);

  sheet.getRange(row, 1, 1, 7)
    .setFontWeight('bold')
    .setBackground('#fff2cc');

  setWSkinsIssueKeyLink_(sheet.getRange(row, 2), parentKey, baseUrl);

  return row + 1;
}

function writeWSkinsSingleIssueBlock_(sheet, row, issue, baseUrl, isSubtaskBlock) {
  const blockFill = isSubtaskBlock ? '#f3f3f3' : '#ddebf7';
  const typeLabel = isSubtaskBlock ? 'SUBTASK' : 'TASK';

  sheet.getRange(row, 1, 1, 7).setValues([[
    typeLabel,
    '',
    issue.issueSummary || '',
    issue.priorityName || '',
    issue.contentType || '',
    issue.parentKey || '',
    issue.designImprovementType || ''
  ]]);

  sheet.getRange(row, 1, 1, 7)
    .setFontWeight('bold')
    .setBackground(blockFill);

  setWSkinsIssueKeyLink_(sheet.getRange(row, 2), issue.issueKey, baseUrl);
  sheet.getRange(row, 4).setFontWeight('bold');

  if (issue.designImprovementType && issue.designImprovementType !== 'none') {
    sheet.getRange(row, 1, 1, 7).setBackground('#f4cccc');
  }

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
  sheet.getRange(row, 1, 1, 7).setFontWeight('bold').setBackground('#fce5cd');
  row++;

  const events = issue.events || [];
  if (!events.length) {
    sheet.getRange(row, 1, 1, 7).setValues([['', '', '', '', 'No changes', '', '']]);
    return row + 1;
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
      buildWSkinsTeamMovementLabel_(e)
    ]]);
    sheet.getRange(row, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');

    if (e.eventType === 'Status' && e.isBackflow && issue.isSubtask) {
     sheet.getRange(row, 1, 1, 7).setBackground('#f4cccc');
    } else if (e.eventType === 'Assignee' && buildWSkinsTeamMovementLabel_(e) === 'Handed off') {
      sheet.getRange(row, 1, 1, 7).setBackground('#fff2cc');
    } else if (e.eventType === 'Assignee' && buildWSkinsTeamMovementLabel_(e) === 'Returned to team') {
      sheet.getRange(row, 1, 1, 7).setBackground('#d9ead3');
    }

    row++;

    if (e.eventType === 'Assignee' && e.isHandoff) {
      const statusAtTransfer = getWSkinsLastKnownStatusBeforeEvent_(events, i);

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

    if (e.eventType === 'Assignee' && e.isReturnToTeam) {
      const statusAtTransfer = getWSkinsLastKnownStatusBeforeEvent_(events, i);

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

  return row;
}

function buildWSkinsTeamMovementLabel_(event) {
  if (!event || event.eventType !== 'Assignee') return '';
  if (event.isHandoff) return 'Handed off';
  if (event.isReturnToTeam) return 'Returned to team';
  return '';
}

function prepareWSkinsSheet_(sheet) {
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

function setWSkinsIssueKeyLink_(cell, issueKey, baseUrl) {
  if (!issueKey) {
    cell.setValue('');
    return;
  }

  const richText = SpreadsheetApp.newRichTextValue()
    .setText(issueKey)
    .setLinkUrl(baseUrl.replace(/\/+$/, '') + '/browse/' + issueKey)
    .build();

  cell.setRichTextValue(richText);
}

function getWSkinsIssueTypeName_(issue) {
  return safeGet_(issue, ['fields', 'issuetype', 'name']) || 'none';
}

function getWSkinsContentTypeValue_(issue) {
  if (!issue) return 'none';
  if (!CONFIG.CONTENT_TYPE_FIELD) return 'none';

  const value = safeGet_(issue, ['fields', CONFIG.CONTENT_TYPE_FIELD]);
  if (value === null || value === undefined || value === '') return 'none';

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map(function(v) {
      return extractWSkinsFieldDisplayValue_(v);
    }).filter(Boolean).join(', ') || 'none';
  }

  return extractWSkinsFieldDisplayValue_(value) || 'none';
}

function extractWSkinsFieldDisplayValue_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value.value !== undefined) return String(value.value);
  if (value.name !== undefined) return String(value.name);
  if (value.displayName !== undefined) return String(value.displayName);
  if (value.label !== undefined) return String(value.label);
  return '';
}

function isWSkinsDesignImprovement_(issue) {
  return String(getWSkinsIssueTypeName_(issue)).trim().toLowerCase() ===
    String(CONFIG.DESIGN_IMPROVEMENT_TYPE_NAME).trim().toLowerCase();
}

function buildWSkinsIssueEvents_(issue, changelogItems, teamIdentityIndex) {
  const events = [];

  (changelogItems || []).forEach(function(history) {
    const changedAt = history.created || '';
    const changedBy = getWSkinsAuthorName_(history);

    (history.items || []).forEach(function(item) {
      if (item.field === 'status') {
        const rawFromValue = item.fromString || '';
        const rawToValue = item.toString || '';

        const normalizedFromValue = normalizeWSkinsStatusForIssue_(issue, rawFromValue);
        const normalizedToValue = normalizeWSkinsStatusForIssue_(issue, rawToValue);

        events.push({
          eventType: 'Status',
          changedAt: changedAt,
          changedBy: changedBy,
          fromValue: normalizedFromValue,
          toValue: normalizedToValue,
          rawFromValue: rawFromValue,
          rawToValue: rawToValue,
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
        const fromCanonical = teamIdentityIndex ? getWSkinsCanonicalTeamMember_(fromValue, teamIdentityIndex) : '';
        const toCanonical = teamIdentityIndex ? getWSkinsCanonicalTeamMember_(toValue, teamIdentityIndex) : '';

        events.push({
          eventType: 'Assignee',
          changedAt: changedAt,
          changedBy: changedBy,
          fromValue: fromValue,
          toValue: toValue,
          rawFromValue: fromValue,
          rawToValue: toValue,
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

    if (isWSkinsSubtaskIssue_(issue)) {
      e.isBackflow = isWSkinsReverseTransition_(issue, e.fromValue, e.toValue);
    } else {
      e.isBackflow = false;
    }

    e.excludeFromEfficiencyBackflow = false;
  });

  return events;
}

function getWSkinsAssigneeName_(issue) {
  const assignee = safeGet_(issue, ['fields', 'assignee']);
  if (!assignee) return '';
  return assignee.displayName || assignee.accountId || assignee.emailAddress || '';
}

function getWSkinsAuthorName_(history) {
  const author = history.author || {};
  return author.displayName || author.accountId || author.emailAddress || '';
}

function isWSkinsSubtaskIssue_(issue) {
  if (!issue) return false;
  if (issue.isSubtask === true) return true;
  return !!safeGet_(issue, ['fields', 'issuetype', 'subtask']);
}

function isWSkinsOneOfStatuses_(value, names) {
  const normalized = normalizeStatusText_(value);
  return names.some(function(name) {
    return normalized === normalizeStatusText_(name);
  });
}

function normalizeWSkinsStatusForIssue_(issue, statusValue) {
  const raw = String(statusValue || '');
  const normalized = normalizeStatusText_(raw);

  if (!isWSkinsSubtaskIssue_(issue)) {
    if (normalized === 'on hold') {
      return 'Internal Review';
    }
  }

  return raw;
}

function getWSkinsIssueFlowModel_(issue) {
  if (isWSkinsSubtaskIssue_(issue)) {
    return {
      type: 'subtask',
      todo: ['to do', 'todo'],
      progress: ['in progress'],
      hold: [],
      approval: ['on approval'],
      final: ['done'],
      ignoredFinal: []
    };
  }

  return {
    type: 'main',
    todo: ['to do', 'todo', 'not started ws'],
    progress: ['in progress'],
    hold: ['internal review'],
    approval: ['on approval'],
    final: ['internal review'],
    ignoredFinal: ['on approval', 'pre-live', 'pre live', 'live', 'done', 'archive', 'archived']
  };
}

function writeWSkinsTimeStatAutoSheet_(reportData, params) {
  const sheet = getOrCreateSheet_('Time Statistics Wskins');
  prepareWSkinsSheet_(sheet);

  const monthlyWorkingHours = 164;
  const daysInPeriod = getWSkinsDaysInPeriod_(params.dateFrom, params.dateTo);
  const cycles = extractWSkinsProgressReviewCyclesFromReport_(reportData);
  const grouped = groupWSkinsCyclesForTimeStat_(cycles, daysInPeriod, monthlyWorkingHours);

  writeWSkinsTimeStatTable_(sheet, grouped, monthlyWorkingHours);
}

function extractWSkinsProgressReviewCyclesFromReport_(reportData) {
  const grouped = reportData.grouped || {};
  const params = reportData.params || {};
  const result = [];

  Object.keys(grouped).forEach(function(userKey) {
    const userBlock = grouped[userKey];
    const userLabel = userBlock.userLabel || userKey;
    const issues = userBlock.issues || [];

    issues.forEach(function(issue) {
      const events = (issue.events || [])
        .filter(function(e) {
          return e.eventType === 'Status' && isDateWithinRange_(e.changedAt, params);
        })
        .slice()
        .sort(function(a, b) {
          return new Date(a.changedAt) - new Date(b.changedAt);
        });

      if (!events.length) return;

      if (issue.isSubtask) {
        let currentProgressStartedAt = null;

        events.forEach(function(event) {
          const toValue = normalizeStatusText_(event.toValue || '');

          if (isWSkinsOneOfStatuses_(toValue, ['in progress'])) {
            currentProgressStartedAt = event.changedAt;
            return;
          }

          if (currentProgressStartedAt && isWSkinsOneOfStatuses_(toValue, ['on approval'])) {
            const durationMs = getWorkingDurationMs_(currentProgressStartedAt, event.changedAt);

            if (durationMs !== null && durationMs > 0) {
              result.push({
                userKey: userKey,
                userLabel: userLabel,
                taskType: 'Subtask',
                issueKey: issue.issueKey,
                startedAt: currentProgressStartedAt,
                reviewedAt: event.changedAt,
                durationMin: Math.max(1, Math.ceil(durationMs / 60000))
              });
            }

            currentProgressStartedAt = null;
          }
        });
      } else {
        let currentProgressStartedAt = null;

        events.forEach(function(event) {
          const toValue = normalizeStatusText_(event.toValue || '');

          if (isWSkinsOneOfStatuses_(toValue, ['in progress'])) {
            currentProgressStartedAt = event.changedAt;
            return;
          }

          if (currentProgressStartedAt && isWSkinsOneOfStatuses_(toValue, ['internal review'])) {
            const durationMs = getWorkingDurationMs_(currentProgressStartedAt, event.changedAt);

            if (durationMs !== null && durationMs > 0) {
              result.push({
                userKey: userKey,
                userLabel: userLabel,
                taskType: issue.contentType && issue.contentType !== 'none'
                  ? issue.contentType
                  : (issue.issueTypeName || 'Main task'),
                issueKey: issue.issueKey,
                startedAt: currentProgressStartedAt,
                reviewedAt: event.changedAt,
                durationMin: Math.max(1, Math.ceil(durationMs / 60000))
              });
            }

            currentProgressStartedAt = null;
          }
        });
      }
    });
  });

  return result;
}

function groupWSkinsCyclesForTimeStat_(cycles, daysInPeriod, monthlyWorkingHours) {
  const grouped = {};

  cycles.forEach(function(cycle) {
    const groupKey = cycle.userKey + '||' + (cycle.taskType || 'Other');

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        userKey: cycle.userKey,
        userLabel: cycle.userLabel,
        taskType: cycle.taskType || 'Other',
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
    item.status = getWSkinsLoadStatus_(item.loadPercentage);
  });

  return grouped;
}

function writeWSkinsTimeStatTable_(sheet, grouped, monthlyWorkingHours) {
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

    const totalLoadRatio = totalHours / monthlyWorkingHours;
    const totalLoadPercent = Math.round(totalLoadRatio * 10000) / 100;
    const totalHeadcount = Math.round(totalLoadRatio * 100) / 100;
    const totalStatus = getWSkinsLoadStatus_(totalLoadPercent);

    sheet.getRange(row, 1, 1, header.length).setValues([[
      userLabel, '', '', '', '', '', '', Math.round(totalHours * 100) / 100,
      totalLoadPercent / 100, totalStatus, totalHeadcount, monthlyWorkingHours
    ]]);

    sheet.getRange(row, 1, 1, header.length)
      .setFontWeight('bold')
      .setBackground('#cfe2f3')
      .setWrap(true)
      .setVerticalAlignment('middle');

    sheet.getRange(row, 9).setNumberFormat('0.00%');

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
        roundWSkins2_(item.minMonthlyQty),
        roundWSkins2_(item.maxMonthlyQty),
        roundWSkins2_(item.avgMonthlyQty),
        item.minTimeMin,
        item.maxTimeMin,
        item.avgTimeMin,
        item.avgTotalTimeHrs,
        item.loadPercentage / 100,
        item.status,
        item.requiredHeadcount,
        ''
      ]]);

      sheet.getRange(row, 1, 1, header.length)
        .setWrap(true)
        .setVerticalAlignment('middle');

      sheet.getRange(row, 9).setNumberFormat('0.00%');

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

  for (let c = 1; c <= 12; c++) {
    sheet.setColumnWidth(c, c === 1 ? 260 : (c === 8 ? 150 : (c >= 9 ? 150 : 130)));
  }

  sheet.getDataRange().setHorizontalAlignment('left');
  sheet.getDataRange().setVerticalAlignment('middle');

  for (let r = 1; r <= sheet.getLastRow(); r++) {
    sheet.setRowHeight(r, 28);
  }
}

function getWSkinsDaysInPeriod_(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return 30;

  const start = new Date(dateFrom);
  const end = new Date(dateTo);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 30;

  const diffMs = end - start;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;

  return Math.max(days, 1);
}

function getWSkinsLoadStatus_(loadPercentage) {
  const value = Number(loadPercentage || 0);

  if (value > 100) return 'Overloaded';
  if (value >= 50) return 'Normal';
  return 'Low load';
}

function roundWSkins2_(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function writeWSkinsFirstPassRateAutoSheet_(reportData, params) {
  const sheet = getOrCreateSheet_('First Pass Rate Wskins');
  prepareWSkinsSheet_(sheet);

  const metrics = buildWSkinsFirstPassRateMetrics_(reportData, params);

  const header = [
    'Metric',
    'How it is calculated',
    'Completed tasks',
    'Returned tasks',
    'Accepted from first pass',
    'First pass rate, %',
    'Status'
  ];

  const officialStatus = getWSkinsFirstPassStatus_(metrics.official.firstPassRatePercent);
  const operationalStatus = getWSkinsFirstPassStatus_(metrics.operational.firstPassRatePercent);

  const rows = [
  [
    'Official first pass',
    'Main task: reached Internal Review in the selected period and was not reopened afterward. Subtask: reached Done in the selected period and was not reopened afterward',
    metrics.official.completedTasks,
    metrics.official.notFirstPassTasks,
    metrics.official.acceptedFirstPassTasks,
    metrics.official.firstPassRatePercent,
    officialStatus
  ],
  [
    'Operational first pass',
    'Main task: same as official, without counting returns. Subtask: reached Done in the selected period without returning from approval or later stages back into working stages',
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

  applyWSkinsFirstPassStatusStyle_(sheet.getRange(2, 7), officialStatus);
  applyWSkinsFirstPassStatusStyle_(sheet.getRange(3, 7), operationalStatus);

  applyWSkinsFirstPassRateCellStyle_(sheet.getRange(2, 6), metrics.official.firstPassRatePercent);
  applyWSkinsFirstPassRateCellStyle_(sheet.getRange(3, 6), metrics.operational.firstPassRatePercent);

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
}

function buildWSkinsFirstPassRateMetrics_(reportData, params) {
  const issues = flattenWSkinsGroupedIssues_(reportData.grouped || {});

  let completedTasks = 0;
  let officialNotFirstPass = 0;
  let operationalNotFirstPass = 0;

  issues.forEach(function(issue) {
    const events = (issue.events || []).filter(function(e) {
      return e.eventType === 'Status' && isDateWithinRange_(e.changedAt, params);
    }).slice().sort(function(a, b) {
      return new Date(a.changedAt) - new Date(b.changedAt);
    });

    if (!events.length) return;

    const firstFinalIndex = findWSkinsFirstFinalStatusEventIndexForFlow_(issue, events);
    if (firstFinalIndex < 0) return;

    completedTasks++;

    if (hasWSkinsReopenAfterFirstFinalForFlow_(issue, events, firstFinalIndex)) {
      officialNotFirstPass++;
    }

    if (hasWSkinsOperationalReturnBeforeOrAfterFinalForFlow_(issue, events, firstFinalIndex)) {
      operationalNotFirstPass++;
    }
  });

  const officialAccepted = Math.max(0, completedTasks - officialNotFirstPass);
  const operationalAccepted = Math.max(0, completedTasks - operationalNotFirstPass);

  return {
    official: {
      completedTasks: completedTasks,
      notFirstPassTasks: officialNotFirstPass,
      acceptedFirstPassTasks: officialAccepted,
      firstPassRatePercent: completedTasks ? roundWSkins2_((officialAccepted / completedTasks) * 100) : 0
    },
    operational: {
      completedTasks: completedTasks,
      notFirstPassTasks: operationalNotFirstPass,
      acceptedFirstPassTasks: operationalAccepted,
      firstPassRatePercent: completedTasks ? roundWSkins2_((operationalAccepted / completedTasks) * 100) : 0
    }
  };
}

function findWSkinsFirstFinalStatusEventIndexForFlow_(issue, statusEvents) {
  const model = getWSkinsIssueFlowModel_(issue);

  for (let i = 0; i < statusEvents.length; i++) {
    if (isWSkinsOneOfStatuses_(statusEvents[i].toValue || '', model.final || [])) {
      return i;
    }
  }

  return -1;
}

function hasWSkinsReopenAfterFirstFinalForFlow_(issue, statusEvents, firstFinalIndex) {
  for (let i = firstFinalIndex + 1; i < statusEvents.length; i++) {
    const toValue = statusEvents[i].toValue || '';
    if (!isWSkinsFinalStatusLikeForFlow_(issue, toValue)) {
      return true;
    }
  }
  return false;
}

function hasWSkinsOperationalReturnBeforeOrAfterFinalForFlow_(issue, statusEvents, firstFinalIndex) {
  if (!isWSkinsSubtaskIssue_(issue)) {
    return false;
  }

  for (let i = 1; i < statusEvents.length; i++) {
    const fromValue = statusEvents[i].fromValue || '';
    const toValue = statusEvents[i].toValue || '';

    if (
      isWSkinsReviewOrFinalStatusLikeForFlow_(issue, fromValue) &&
      isWSkinsWorkingStatusLikeForFlow_(issue, toValue)
    ) {
      return true;
    }
  }

  return false;
}

function isWSkinsFinalStatusLikeForFlow_(issue, value) {
  const model = getWSkinsIssueFlowModel_(issue);
  return (
    isWSkinsOneOfStatuses_(value || '', model.final || []) ||
    isWSkinsOneOfStatuses_(value || '', model.ignoredFinal || [])
  );
}

function isWSkinsReviewOrFinalStatusLikeForFlow_(issue, value) {
  const model = getWSkinsIssueFlowModel_(issue);

  return (
    isWSkinsOneOfStatuses_(value || '', model.approval || []) ||
    isWSkinsOneOfStatuses_(value || '', model.final || [])
  );
}

function isWSkinsWorkingStatusLikeForFlow_(issue, value) {
  const model = getWSkinsIssueFlowModel_(issue);

  return (
    isWSkinsOneOfStatuses_(value || '', model.todo || []) ||
    isWSkinsOneOfStatuses_(value || '', model.progress || []) ||
    isWSkinsOneOfStatuses_(value || '', model.hold || [])
  );
}

function getWSkinsFirstPassStatus_(percent) {
  const value = Number(percent || 0);

  if (value >= 98) return 'Excellent';
  if (value >= 95) return 'Healthy';
  if (value >= 90) return 'Watch';
  if (value >= 80) return 'Risk';
  return 'Critical';
}

function applyWSkinsFirstPassStatusStyle_(range, status) {
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

function applyWSkinsFirstPassRateCellStyle_(range, percent) {
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

function getInitialFormDataWskins() {
  return getWSkinsInitialFormData();
}

function runJiraStatusAuditReportWskins(formData) {
  return runWSkinsJiraStatusAuditReport(formData);
}