import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - JSX modules
import App from "@/App.jsx";
// @ts-expect-error - JSX modules
import { AppProvider } from "@/context/AppContext.jsx";
// @ts-expect-error - JSX modules
import { LanguageProvider } from "@/context/LanguageContext.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReklamX" },
      { name: "description", content: "ReklamX order pipeline." },
    ],
  }),
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
