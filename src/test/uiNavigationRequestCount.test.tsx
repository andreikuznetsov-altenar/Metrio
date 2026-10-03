import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { PerformanceDataProvider, usePerformanceData } from "../app/PerformanceDataContext";
import { createPerformanceDateRange } from "../domain/performance/performanceDateRange";
import { usePersonBriefModel } from "../hooks/usePersonBriefModel";
import { useResourceLibrary } from "../hooks/useResourceLibrary";
import { searchLocalCommandPalette } from "../domain/commandPalette/localCommandSearch";
import { listNotificationEventsOrThrow } from "../platform/notificationEvents";
import { performanceDataLifecycleEmptyResult } from "./helpers/performanceDataLifecycleEmptyResult";

vi.mock("../services/performance/performanceDataService", () => ({
  fetchPerformanceData: vi.fn(),
}));

vi.mock("../services/performance/performanceRefreshSideEffects", () => ({
  applyPerformanceRefreshSideEffects: vi.fn(async () => undefined),
  markPerformanceIntegrationsStale: vi.fn(async () => undefined),
}));

vi.mock("../services/refresh/backgroundRefresh", () => ({
  registerCoalescedBackgroundRefresh: vi.fn(async () => () => {}),
}));

vi.mock("../services/commandPalette/remoteCommandSearch", () => ({
  searchRemoteCommandPalette: vi.fn(async () => ({ results: [], hint: null })),
  REMOTE_SEARCH_MIN_LENGTH: 2,
}));

import { fetchPerformanceData } from "../services/performance/performanceDataService";
import { searchRemoteCommandPalette } from "../services/commandPalette/remoteCommandSearch";

const mockFetch = vi.mocked(fetchPerformanceData);
const mockRemoteSearch = vi.mocked(searchRemoteCommandPalette);

function performanceWrapper(selfPersonId = "person-sam") {
  const dateRange = createPerformanceDateRange("30d");
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      PerformanceDataProvider,
      {
        enabled: true,
        showLoadingOverlay: false,
        dateRange,
        reviewTarget: "team",
        audience: "team",
        selfPersonId,
        managerTeamTray: false,
      },
      children,
    );
  };
}

function useBriefOnLoadedData(personId: string) {
  const { data, status } = usePerformanceData();
  const brief = usePersonBriefModel({
    personId,
    periodPreset: "30d",
    data,
    selfPersonId: "person-sam",
    surveyData: null,
    knowledgeLinks: [],
    jiraBaseUrl: "https://jira.example.com",
  });
  return { status, brief, data };
}

describe("UI navigation request counts", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(performanceDataLifecycleEmptyResult());
    mockRemoteSearch.mockClear();
  });

  it("does not refetch performance when Person Brief model builds on loaded data", async () => {
    const { result } = renderHook(() => useBriefOnLoadedData("person-sam"), {
      wrapper: performanceWrapper("person-sam"),
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not call remote command search for local-only palette query", () => {
    searchLocalCommandPalette({
      query: "home",
      people: [],
      projects: [],
      knowledgePages: [],
      recents: [],
      jiraBaseUrl: "https://jira.example.com",
      feedbackEnabled: true,
    });
    expect(mockRemoteSearch).not.toHaveBeenCalled();
  });

  it("opening resource library state does not fetch performance", () => {
    const { result } = renderHook(() => useResourceLibrary());
    act(() => {
      result.current.openLibrary();
    });
    expect(mockFetch).not.toHaveBeenCalled();
    act(() => {
      result.current.closeLibrary();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("notification list read is local and does not fetch performance", () => {
    expect(() => listNotificationEventsOrThrow()).not.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("provider rerender without date change does not refetch", async () => {
    const { rerender } = renderHook(() => usePerformanceData(), {
      wrapper: performanceWrapper(),
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("simulated route navigation keeps a single fetch when dataset key is unchanged", async () => {
    let dateRange = createPerformanceDateRange("30d");
    function NavWrapper({ children }: { children: ReactNode }) {
      return createElement(
        PerformanceDataProvider,
        {
          enabled: true,
          showLoadingOverlay: false,
          dateRange,
          reviewTarget: "team",
          audience: "team",
          selfPersonId: "person-sam",
          managerTeamTray: false,
        },
        children,
      );
    }
    const { rerender } = renderHook(() => usePerformanceData(), {
      wrapper: NavWrapper,
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    dateRange = createPerformanceDateRange("30d");
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
