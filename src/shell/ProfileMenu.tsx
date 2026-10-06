import { useEffect, useId, useRef, useState } from "react";
import { useCurrentUser } from "../app/CurrentUserContext";
import { PersonAvatar } from "../components/PersonAvatar/PersonAvatar";
import type { Person } from "../domain/people/types";
import type { DevFixtureId } from "../domain/types";
import { personInitials } from "../domain/types";
import { profileSubtitle } from "../domain/types/profileSubtitle";
import { useTheme } from "../theme/ThemeProvider";
import type { ThemePreference } from "../theme/theme";
import "./ProfileMenu.css";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const DEV_FIXTURES: { id: DevFixtureId; label: string }[] = [
  { id: "employee", label: "Employee fixture" },
  { id: "lead", label: "Lead fixture (5 reports)" },
  { id: "director", label: "Director fixture (4 reports)" },
];

export function ProfileMenu({
  onOpenSettings,
  onLogout,
  person,
}: {
  onOpenSettings?: () => void;
  onLogout?: () => void;
  person?: Person | null;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { currentUser, devFixtureId, setDevFixture, isDevFixtureMode } =
    useCurrentUser();
  const { preference, setPreference } = useTheme();
  const initials = personInitials(currentUser.person.name);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className="profile-menu__avatar profile-menu__avatar--photo"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label="Open profile menu"
        onClick={() => setOpen((value) => !value)}
      >
        {person ? (
          <PersonAvatar
            person={person}
            personId={person.id}
            displayName={person.bamboo.displayName}
            size="sm"
            className="profile-menu__person-avatar"
          />
        ) : (
          <span className="profile-menu__initials">{initials}</span>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          className="profile-menu__popover metrio-popover-surface"
          role="menu"
          aria-label="Profile menu"
        >
          <div className="profile-menu__identity">
            <p className="profile-menu__name">{currentUser.person.name}</p>
            <p className="profile-menu__role">{profileSubtitle(currentUser)}</p>
          </div>

          <div className="profile-menu__divider" />

          <div className="profile-menu__section-label" id={`${menuId}-theme-label`}>
            Theme
          </div>
          <div
            className="profile-menu__theme"
            role="group"
            aria-labelledby={`${menuId}-theme-label`}
            data-testid="profile-menu-theme"
          >
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={preference === option.value ? "is-active" : undefined}
                aria-pressed={preference === option.value}
                onClick={() => setPreference(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="profile-menu__divider" />

          <div className="profile-menu__actions">
            <button
              type="button"
              role="menuitem"
              className="profile-menu__item"
              onClick={() => {
                onOpenSettings?.();
                setOpen(false);
              }}
            >
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              className="profile-menu__item profile-menu__item--danger"
              onClick={() => {
                onLogout?.();
                setOpen(false);
              }}
            >
              Log out
            </button>
          </div>

          {isDevFixtureMode ? (
            <>
              <div className="profile-menu__divider" />
              <div className="profile-menu__section-label">Dev fixtures</div>
              <div className="profile-menu__dev">
                {DEV_FIXTURES.map((fixture) => (
                  <button
                    key={fixture.id}
                    type="button"
                    className={
                      devFixtureId === fixture.id ? "is-active" : undefined
                    }
                    onClick={() => {
                      setDevFixture(fixture.id);
                      setOpen(false);
                    }}
                  >
                    {fixture.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
