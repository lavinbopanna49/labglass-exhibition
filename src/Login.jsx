
import { useState } from "react";
import { supabase } from "./supabase";
import "./Login.css";

import backgroundImage from "./assets/bg.jpg";
import pmecImage from "./assets/pmec.jpg";
import logoImage from "./assets/labglass_logo.jpg";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) setError(error.message);
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <img
        className="login-background"
        src={backgroundImage}
        alt=""
      />

      <img
        className="login-pmec"
        src={pmecImage}
        alt="PMEC"
      />

      <div className="login-overlay">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-brand">
            <img src={logoImage} alt="H. S. Martin India" />
          </div>

          <h3>User Login</h3>
          <p>Sign in to access the exhibition dashboard.</p>

          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default Login;
