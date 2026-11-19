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

  if (checkingSession) {
    return <p>Checking login...</p>;
  }

  if (!session) {
    return <Login onLogin={() => {}} onBack={() => {}} />;
  }

  return <Dashboard />;
}

export default App;