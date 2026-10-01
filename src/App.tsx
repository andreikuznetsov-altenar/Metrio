import { ThemeProvider } from "./app/ThemeProvider";
import { FoundationDevApp } from "./app/FoundationDevApp";
import { ProductShellPlaceholder } from "./app/ProductShellPlaceholder";

function AppContent() {
  if (import.meta.env.DEV) {
    return <FoundationDevApp />;
  }

  return <ProductShellPlaceholder />;
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
