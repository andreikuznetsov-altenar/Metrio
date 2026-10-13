import "./tauriMocks";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals, so RTL's automatic cleanup never registers. Unmount after every
// test so scheduled React work cannot fire after the jsdom environment is torn down (this was
// the intermittent "window is not defined" unhandled error that failed `npm test` runs).
afterEach(() => cleanup());

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
