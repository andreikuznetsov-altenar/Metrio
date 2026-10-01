import "./AppHeader.css";

export function ConnectionBrandHeader() {
  return (
    <div className="app-header">
      <div className="app-header__start">
        <div className="app-header__brand">
          <span className="app-header__logo" aria-hidden />
          <span className="app-header__title">Metrio</span>
        </div>
      </div>
    </div>
  );
}
