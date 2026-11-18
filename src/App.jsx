
import { useState, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabase";
import Dashboard from "./Dashboard.jsx";
import Login from "./Login.jsx";
import logo from "./assets/labglass_logo.jpg";
import background from "./assets/bg.jpg";

function App() {
  const [page, setPage] = useState("registration");
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [form, setForm] = useState({
    name: "",
    company: "",
    designation: "",
    phone: "",
    email: "",
    country: "",
    interests: [],
    requirements: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const products = [
    "Jacketed Glass Reactors (100 mL to 100 L), including Double-Jacketed (Vacuum-Insulated) Systems",
    "Glass Wiped Film Evaporators",
    "Short Path Distillation Systems",
    "Glass Filter Reactors and Nutsche Filter Units (1 L to 20 L)",
    "Continuous Stirred Tank Reactor (CSTR) Systems",
    "Photochemical Reactors",
    "Fractional Distillation Systems with Insulated Columns and Structured Packing",
    "Jointed Laboratory Glassware, including Adapters, Condensers, Flasks, Columns, and Custom-Designed Items",
    "Glassware Spares for Rotary Evaporators (Compatible with All Major Brands)",
    "Schlenk Line Glassware, including Manifolds, Flasks, and Tubes",
    "Other Glass Items",
  ];

  function handleChange(event) {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  }

  function handleInterest(product) {
    const updated = form.interests.includes(product)
      ? form.interests.filter((item) => item !== product)
      : [...form.interests, product];

    setForm({ ...form, interests: updated });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const { error } = await supabase.from("visitors").insert({
      name: form.name,
      company: form.company,
      designation: form.designation,
      phone: form.phone,
      email: form.email,
      country: form.country,
      interests: form.interests,
      requirements: form.requirements,
      consent_to_contact: false,
    });

    if (error) {
      alert("Registration failed: " + error.message);
      return;
    }

    alert(
      "Thank you, " + form.name + "! Your registration has been saved."
    );

    setForm({
      name: "",
      company: "",
      designation: "",
      phone: "",
      email: "",
      country: "",
      interests: [],
      requirements: "",
    });
  }

  if (page === "dashboard") {
    if (checkingSession) {
      return <p>Checking login...</p>;
    }

    if (!session) {
      return (
        <Login
          onLogin={() => setPage("dashboard")}
          onBack={() => setPage("registration")}
        />
      );
    }

    return <Dashboard />;
  }

  return (
    <div
      className="registration-page"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.35), rgba(255,255,255,0.35)), url(${background})`,
      }}
    >
      <div className="container">

        <div className="registration-topbar">
          <img
            src={logo}
            alt="H.S. Martin Logo"
            className="company-logo"
          />

          <button
            type="button"
            className="employee-info-button"
            onClick={() => setPage("dashboard")}
            title="Employee Login"
            aria-label="Employee Login"
          >
            i
          </button>
        </div>

        <div className="registration-header">
          <h2>Exhibition Visitor Registration</h2>
          <p>Please fill in your details below.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>Full Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label>Company Name *</label>
          <input
            name="company"
            value={form.company}
            onChange={handleChange}
            required
          />

          <label>Designation</label>
          <input
            name="designation"
            value={form.designation}
            onChange={handleChange}
          />

          <label>Phone Number *</label>
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            required
          />

          <label>Email Address</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />

          <label>Country</label>
          <input
            name="country"
            value={form.country}
            onChange={handleChange}
          />

          <h3>Products Interested In</h3>

          <p className="product-hint">
            Select all products you are interested in.
          </p>

          <div className="product-list">
            {products.map((product) => (
              <label className="product-option" key={product}>
                <input
                  type="checkbox"
                  checked={form.interests.includes(product)}
                  onChange={() => handleInterest(product)}
                />
                <span>{product}</span>
              </label>
            ))}
          </div>

          <label>Additional Requirements</label>
          <textarea
            name="requirements"
            value={form.requirements}
            onChange={handleChange}
            rows="4"
          />

          <button type="submit">
            Submit Registration
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
