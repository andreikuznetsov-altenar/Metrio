import { useCallback, useEffect, useMemo, useState } from "react";
import type { Person } from "../domain/people/types";
import { buildUpcomingMeetings } from "../domain/calendar/buildUpcomingMeetings";
import type { UpcomingMeetingsModel } from "../domain/calendar/calendarTypes";
import type { PersonLookup } from "../domain/calendar/classifyMeeting";
import {
  clearCalendarCache,
  readCalendarCache,
  writeCalendarCache,
} from "../platform/calendarCache";
import { fetchGoogleCalendarEvents } from "../services/calendar/calendarClient";
import { loadPreferences } from "../platform/preferences";
import { readCalendarVisualFixture } from "../fixtures/calendarVisualFixture";

export function useUpcomingMeetings(input: {
  enabled: boolean;
  selfEmail: string;
  selfPersonId: string;
  teamPersons: Person[];
  directReportIds: string[];
  managerPersonId?: string;
}): {
  model: UpcomingMeetingsModel | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [model, setModel] = useState<UpcomingMeetingsModel | null>(() =>
    input.enabled ? readCalendarCache() : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authorizedPeople: PersonLookup[] = useMemo(
    () =>
      input.teamPersons
        .map((p) => ({
          email: (p.bamboo.workEmail || "").trim(),
          personId: p.id,
          displayName: p.bamboo.displayName,
        }))
        .filter((p) => p.email),
    [input.teamPersons],
  );

  const teamMemberIds = useMemo(
    () => input.teamPersons.map((p) => p.id),
    [input.teamPersons],
  );

  const refresh = useCallback(async () => {
    if (!input.enabled) {
      setModel(null);
      return;
    }
    const cached = readCalendarCache();
    if (cached) {
      setModel(cached);
      return;
    }

    const fixture = readCalendarVisualFixture();
    if (fixture) {
      const built = buildUpcomingMeetings({
        events: fixture.events,
        selfEmail: input.selfEmail || fixture.selfEmail,
        selfPersonId: input.selfPersonId,
        authorizedPeople,
        directReportIds: input.directReportIds,
        teamMemberIds,
        managerPersonId: input.managerPersonId,
      });
      writeCalendarCache(built);
      setModel(built);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const prefs = await loadPreferences();
      const selfEmail =
        input.selfEmail ||
        prefs.workEmail ||
        prefs.google.accountEmail ||
        "";
      const events = await fetchGoogleCalendarEvents();
      const built = buildUpcomingMeetings({
        events,
        selfEmail,
        selfPersonId: input.selfPersonId,
        authorizedPeople,
        directReportIds: input.directReportIds,
        teamMemberIds,
        managerPersonId: input.managerPersonId,
      });
      writeCalendarCache(built);
      setModel(built);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [
    input.enabled,
    input.selfEmail,
    input.selfPersonId,
    input.directReportIds,
    input.managerPersonId,
    authorizedPeople,
    teamMemberIds,
  ]);

  useEffect(() => {
    if (!input.enabled) {
      setModel(null);
      return;
    }
    void refresh();
  }, [input.enabled, refresh]);

  useEffect(() => {
    if (!input.enabled) return;
    const id = window.setInterval(() => void refresh(), 20 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [input.enabled, refresh]);

  return { model, loading, error, refresh };
}

export function disconnectCalendarCache(): void {
  clearCalendarCache();
}
