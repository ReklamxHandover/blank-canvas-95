import { createFileRoute } from "@tanstack/react-router";
import App from "../App.jsx";
import { AppProvider } from "../context/AppContext.jsx";
import { LanguageProvider } from "../context/LanguageContext.jsx";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <LanguageProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </LanguageProvider>
  );
}
