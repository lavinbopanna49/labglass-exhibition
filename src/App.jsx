
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Dashboard from "./Dashboard.jsx";
import Login from "./Login.jsx";

function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!error) {
        setSession(data.session);
      }

      setCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Create browser history for Dashboard -> Overview -> Login
  useEffect(() => {
    if (!session) return;

    const currentUrl =
      window.location.pathname +
      window.location.search +
      window.location.hash;

    window.history.replaceState(
      { appScreen: "login" },
      "",
      currentUrl
    );

    window.history.pushState(
      { appScreen: "overview" },
      "",
      currentUrl
    );

    window.history.pushState(
      { appScreen: "dashboard" },
      "",
      currentUrl
    );

    function handlePopState(event) {
      if (event.state?.appScreen === "overview") {
        window.dispatchEvent(
          new Event("app-back-to-overview")
        );
      }

      if (event.state?.appScreen === "login") {
        supabase.auth.signOut();
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [Boolean(session)]);

  // Ask for confirmation when leaving or closing the website
  useEffect(() => {
    function confirmLeaving(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", confirmLeaving);

    return () => {
      window.removeEventListener("beforeunload", confirmLeaving);
    };
  }, []);

  if (checkingSession) {
    return <p>Checking login...</p>;
  }

  if (!session) {
    return <Login onLogin={() => {}} onBack={() => {}} />;
  }

  return <Dashboard />;
}

export default App;
