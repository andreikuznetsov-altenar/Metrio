import { invoke } from "@tauri-apps/api/core";
import { getGoogleOAuthClientId } from "../../config/google";
import { parseInvokeError } from "../../platform/apiTypes";
import type { CalendarEventRaw } from "../../domain/calendar/calendarTypes";
import { mapRawEvent } from "../../domain/calendar/buildUpcomingMeetings";
import { subDays, addDays } from "date-fns";

export interface CalendarListDto {
  id: string;
  title: string;
  start: string;
  end: string;
  html_link?: string | null;
  hangout_link?: string | null;
  attendees: { email: string; display_name?: string | null; self_: boolean }[];
}

async function invokeCalendar<T>(command: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    throw parseInvokeError(e);
  }
}

export function calendarFetchWindow(now = new Date()): { timeMin: string; timeMax: string } {
  return {
    timeMin: subDays(now, 30).toISOString(),
    timeMax: addDays(now, 7).toISOString(),
  };
}

export async function fetchGoogleCalendarEvents(
  now = new Date(),
  clientId = getGoogleOAuthClientId(),
): Promise<CalendarEventRaw[]> {
  const { timeMin, timeMax } = calendarFetchWindow(now);
  const rows = await invokeCalendar<CalendarListDto[]>("google_calendar_list_events", {
    params: {
      client_id: clientId || null,
      time_min: timeMin,
      time_max: timeMax,
    },
  });
  return rows.map((row) => mapRawEvent(row));
}

export async function enableGoogleCalendarAccess(
  clientId = getGoogleOAuthClientId(),
): Promise<{ account_email: string }> {
  return invokeCalendar("google_oauth_enable_calendar", {
    params: { client_id: clientId || null },
  });
}
