import { useState, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabase";
import Dashboard from "./Dashboard.jsx";
import Login from "./login.jsx";

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
    "Laboratory Beakers",
    "Measuring Cylinders",
    "Test Tubes",
    "Laboratory Flasks",
    "Pipettes",
    "Other Glassware",
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

    alert("Thank you, " + form.name + "! Your registration has been saved.");

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
    <div className="container">
      <button
        type="button"
        onClick={() => setPage("dashboard")}
      >
        Employee Dashboard
      </button>

      <h1>LabGlass</h1>
      <h2>Exhibition Visitor Registration</h2>
      <p>Please fill in your details below.</p>

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

        {products.map((product) => (
          <label className="checkbox" key={product}>
            <input
              type="checkbox"
              checked={form.interests.includes(product)}
              onChange={() => handleInterest(product)}
            />
            {product}
          </label>
        ))}

        <label>Additional Requirements</label>
        <textarea
          name="requirements"
          value={form.requirements}
          onChange={handleChange}
          rows="4"
        />

        <button type="submit">Submit Registration</button>
      </form>
    </div>
  );
}

export default App;