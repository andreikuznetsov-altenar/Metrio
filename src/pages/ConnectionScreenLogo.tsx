/** Canonical Metrio wordmark from `public/Logo.svg` (auth shells only). */
export function ConnectionScreenLogo() {
  return (
    <img
      src="/Logo.svg"
      alt="Metrio"
      className="connection-screen__logo"
      data-testid="connection-screen-logo"
      width={408}
      height={87}
      decoding="async"
    />
  );
}
