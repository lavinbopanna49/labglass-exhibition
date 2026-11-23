
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import "./Login.css";

import pmecImage from "./assets/pmec.jpg";
import logoImage from "./assets/labglass_logo.jpg";

import photo1 from "./assets/6.webp";
import photo2 from "./assets/5.webp";
import photo3 from "./assets/1122.webp";
import photo4 from "./assets/glass-on-fire.webp";
import photo5 from "./assets/people-working.webp";
import photo6 from "./assets/batchreactors-3000ml-5000ml.webp";

const photos = [
  photo2,
  photo4,
  photo3,
  photo5,
  photo1,
  photo6,
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhoto((current) => (current + 1) % photos.length);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

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

      {/* LEFT: Rotating factory photographs */}
      <section className="login-photo-panel">
        <div className="photo-background">
          {photos.map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt=""
              className={`rotating-photo ${
                activePhoto === index ? "active" : ""
              } ${index === 5 ? "portrait-photo" : ""}`}
            />
          ))}
        </div>

        <div className="photo-shade"></div>

        <div className="photo-caption">
          <span>H.S.MARTIN INDIA PROCESS SYSTEMS (INDIA) PVT. LTD.</span>
          <p>Precision In Every Glass</p>
        </div>

        <div className="photo-indicators">
          {photos.map((_, index) => (
            <span
              key={index}
              className={activePhoto === index ? "selected" : ""}
            />
          ))}
        </div>
      </section>

      {/* RIGHT: Login panel */}
      <section className="login-right-panel">

        {/* AGI / H.S. Martin banner */}
        <img
          className="login-pmec"
          src={pmecImage}
          alt="AGI Group - H.S. Martin India"
        />

        <div className="login-form-container">
          <form className="login-card" onSubmit={handleLogin}>

            <div className="login-brand">
              <img src={logoImage} alt="H.S. Martin India" />
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

        <div className="login-footer">
          H.S. Martin India
        </div>

      </section>
    </main>
  );
}

export default Login;
