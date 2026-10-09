import { useCallback, useEffect, useRef, useState } from "react";
import { resolveBambooSubdomain } from "../config/product";
import type {
  BambooGoal,
  BambooGoalStatusFilter,
} from "../domain/goals/bambooGoalTypes";
import {
  BambooClient,
  BambooPermissionError,
} from "../services/bamboo/bambooClient";
import {
  getBambooGoalsCacheEntry,
  invalidateBambooGoalsCache,
  isBambooGoalsCacheFresh,
  setBambooGoalsCacheEntry,
} from "../services/bamboo/bambooGoalsCache";

export type BambooGoalsLoadState =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "forbidden"
  | "error";

export interface UseBambooEmployeeGoalsResult {
  goals: BambooGoal[];
  state: BambooGoalsLoadState;
  stale: boolean;
  errorMessage: string | null;
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  invalidate: () => void;
}

/**
 * Lazy per-employee Bamboo goals fetch with 15-minute TTL cache.
 * Does NOT fetch for the whole roster — only when the consumer mounts/opens.
 */
export function useBambooEmployeeGoals(
  employeeId: string | null | undefined,
  filter: BambooGoalStatusFilter = "status-inProgress",
  enabled = true,
): UseBambooEmployeeGoalsResult {
  const [goals, setGoals] = useState<BambooGoal[]>([]);
  const [state, setState] = useState<BambooGoalsLoadState>("idle");
  const [stale, setStale] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestGen = useRef(0);

  const invalidate = useCallback(() => {
    if (employeeId) invalidateBambooGoalsCache(employeeId);
  }, [employeeId]);

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      const id = String(employeeId || "").trim();
      if (!enabled || !id) {
        setGoals([]);
        setState("idle");
        setStale(false);
        setErrorMessage(null);
        return;
      }

      const cached = getBambooGoalsCacheEntry(id, filter);
      const fresh = isBambooGoalsCacheFresh(cached);
      if (cached && (!opts?.force ? fresh : false)) {
        setGoals(cached.goals);
        setStale(false);
        setErrorMessage(cached.errorMessage ?? null);
        setState(
          cached.state === "forbidden"
            ? "forbidden"
            : cached.state === "error"
              ? "error"
              : cached.goals.length === 0
                ? "empty"
                : "ready",
        );
        return;
      }

      if (cached && cached.goals.length > 0) {
        setGoals(cached.goals);
        setStale(true);
        setState(cached.goals.length === 0 ? "empty" : "ready");
      } else {
        setState("loading");
      }

      const gen = ++requestGen.current;
      const subdomain = resolveBambooSubdomain();
      if (!subdomain) {
        setState("error");
        setErrorMessage("BambooHR is not configured.");
        return;
      }

      try {
        const client = new BambooClient({ subdomain });
        const list = await client.listGoals(id, filter);
        if (gen !== requestGen.current) return;
        setBambooGoalsCacheEntry({
          employeeId: id,
          filter,
          goals: list,
          fetchedAt: Date.now(),
          state: "ready",
        });
        setGoals(list);
        setStale(false);
        setErrorMessage(null);
        setState(list.length === 0 ? "empty" : "ready");
      } catch (e) {
        if (gen !== requestGen.current) return;
        if (e instanceof BambooPermissionError || (e as { status?: number })?.status === 403) {
          setBambooGoalsCacheEntry({
            employeeId: id,
            filter,
            goals: cached?.goals ?? [],
            fetchedAt: Date.now(),
            state: "forbidden",
            errorMessage: "Goals aren't available with your BambooHR access.",
          });
          setErrorMessage("Goals aren't available with your BambooHR access.");
          setState("forbidden");
          if (cached?.goals?.length) {
            setGoals(cached.goals);
            setStale(true);
          } else {
            setGoals([]);
          }
          return;
        }
        const message =
          e instanceof Error ? e.message : "Could not load BambooHR goals.";
        if (cached?.goals?.length) {
          setGoals(cached.goals);
          setStale(true);
          setState("ready");
          setErrorMessage(message);
          setBambooGoalsCacheEntry({
            ...cached,
            state: "error",
            errorMessage: message,
          });
        } else {
          setGoals([]);
          setState("error");
          setErrorMessage(message);
          setBambooGoalsCacheEntry({
            employeeId: id,
            filter,
            goals: [],
            fetchedAt: Date.now(),
            state: "error",
            errorMessage: message,
          });
        }
      }
    },
    [employeeId, filter, enabled],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { goals, state, stale, errorMessage, refresh, invalidate };
}
