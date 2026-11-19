import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import "./Dashboard.css";
import { supabase } from "./supabase";

const initialForm = {
  name: "",
  company: "",
  designation: "",
  phone: "",
  email: "",
  country: "",
  state: "",
  interests: [],
  requirements: "",
};

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

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

function getProbabilityLevel(value) {
  if (value >= 70) return "High";
  if (value >= 40) return "Medium";
  return "Low";
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("employee");

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data: userData } = await supabase.auth.getUser();
      const { data: roleData, error: roleError } =
        await supabase.rpc("get_user_role");

      if (!mounted) return;

      setUser(userData?.user || null);

      if (roleError) {
        console.error("Could not load user role:", roleError.message);
      } else {
        setUserRole(roleData || "employee");
      }
    }

    loadUser();

    async function fetchVisitors() {
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        setError(error.message);
      } else {
        setError("");
        setVisitors(data || []);
      }

      setLoading(false);
    }

    fetchVisitors();

    const channel = supabase
      .channel("visitors-live-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitors",
        },
        () => {
          fetchVisitors();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Logout failed: " + error.message);
    }
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleInterest(product) {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(product)
        ? current.interests.filter((item) => item !== product)
        : [...current.interests, product],
    }));
  }

  async function handleSaveVisitor(event) {
    event.preventDefault();

    const trimmedName = form.name.trim();

    if (!trimmedName) {
      alert("Please enter the visitor's name.");
      return;
    }

    if (!user) {
      alert("Your login session could not be found. Please log in again.");
      return;
    }

    setSaving(true);

    const visitorData = {
      name: trimmedName,
      company: form.company,
      designation: form.designation,
      phone: form.phone,
      email: form.email,
      country: form.country,
      state: form.state,
      interests: form.interests,
      requirements: form.requirements,
    };

    let result;

    if (editingVisitor) {
      result = await supabase
        .from("visitors")
        .update(visitorData)
        .eq("id", editingVisitor.id);
    } else {
      result = await supabase.from("visitors").insert({
        ...visitorData,
        employee_id: user.id,
        consent_to_contact: false,
      });
    }

    setSaving(false);

    if (result.error) {
      alert("Could not save visitor: " + result.error.message);
      return;
    }

    alert(
      editingVisitor
        ? "Visitor details updated successfully."
        : "New visitor saved successfully."
    );

    setForm(initialForm);
    setEditingVisitor(null);
    setActiveTab("All Visitors");

    const { data } = await supabase
      .from("visitors")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setVisitors(data);
  }

  function startEdit(visitor) {
    setEditingVisitor(visitor);
    setForm({
      name: visitor.name || "",
      company: visitor.company || "",
      designation: visitor.designation || "",
      phone: visitor.phone || "",
      email: visitor.email || "",
      country: visitor.country || "",
      state: visitor.state || "",
      interests: visitor.interests || [],
      requirements: visitor.requirements || "",
    });
    setActiveTab("Edit Visitor");
  }

  function cancelEdit() {
    setEditingVisitor(null);
    setForm(initialForm);
    setActiveTab("All Visitors");
  }

  async function updateVisitor(visitorId, updates) {
    const { error } = await supabase
      .from("visitors")
      .update(updates)
      .eq("id", visitorId);

    if (error) {
      alert("Could not save changes: " + error.message);
      return false;
    }

    setVisitors((current) =>
      current.map((visitor) =>
        visitor.id === visitorId
          ? { ...visitor, ...updates }
          : visitor
      )
    );

    return true;
  }

  function changeProbability(visitorId, value) {
    setVisitors((current) =>
      current.map((visitor) =>
        visitor.id === visitorId
          ? { ...visitor, customer_probability: Number(value) }
          : visitor
      )
    );
  }

  async function saveProbability(visitorId, value) {
    await updateVisitor(visitorId, {
      customer_probability: Number(value),
    });
  }

  async function exportToExcel() {
    if (visitors.length === 0) {
      alert("There are no visitor records to export.");
      return;
    }

    setExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "H. S. Martin India";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("All Visitors");

      sheet.columns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Company", key: "company", width: 25 },
        { header: "Designation", key: "designation", width: 20 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 28 },
        { header: "Country", key: "country", width: 18 },
        { header: "State / UT", key: "state", width: 22 },
        { header: "Product Interests", key: "interests", width: 45 },
        { header: "Requirements", key: "requirements", width: 35 },
        { header: "Probability", key: "probability", width: 15 },
        { header: "Follow-up Required", key: "followup", width: 18 },
        { header: "Follow-up Date", key: "date", width: 18 },
        { header: "Follow-up Notes", key: "notes", width: 35 },
        { header: "Registration Date", key: "created", width: 25 },
      ];

      visitors.forEach((v) => {
        sheet.addRow({
          name: v.name,
          company: v.company,
          designation: v.designation || "",
          phone: v.phone,
          email: v.email || "",
          country: v.country || "",
          state: v.state || "",
          interests: (v.interests || []).join(", "),
          requirements: v.requirements || "",
          probability: `${v.customer_probability || 0}%`,
          followup: v.follow_up_required ? "Yes" : "No",
          date: v.follow_up_date || "",
          notes: v.follow_up_notes || "",
          created: v.created_at
            ? new Date(v.created_at).toLocaleString()
            : "",
        });
      });

      sheet.getRow(1).font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };

      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF174A75" },
      };

      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = {
        from: "A1",
        to: "N1",
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `HSMartin_Exhibition_Visitors_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("Excel workbook exported successfully!");
    } catch (err) {
      alert("Excel export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  }

  const companyCount = new Set(
    visitors.map((v) => v.company).filter(Boolean)
  ).size;

  const stateCount = new Set(
    visitors.map((v) => v.state).filter(Boolean)
  ).size;

  const productCount = visitors.reduce(
    (total, visitor) => total + (visitor.interests || []).length,
    0
  );

  const filteredVisitors = visitors.filter((visitor) => {
    const term = search.toLowerCase();

    return (
      (visitor.name || "").toLowerCase().includes(term) ||
      (visitor.company || "").toLowerCase().includes(term) ||
      (visitor.email || "").toLowerCase().includes(term) ||
      (visitor.phone || "").toLowerCase().includes(term) ||
      (visitor.country || "").toLowerCase().includes(term) ||
      (visitor.state || "").toLowerCase().includes(term)
    );
  });

  const followUpVisitors = filteredVisitors.filter(
    (visitor) => visitor.follow_up_required
  );

  function renderVisitorForm() {
    return (
      <section className="visitor-section">
        <div className="visitor-heading">
          <div>
            <h2>{editingVisitor ? "Edit Visitor Details" : "Enter New Visitor"}</h2>
            <p>
              {editingVisitor
                ? "Update the visitor's information below."
                : "Enter the details collected from the exhibition visitor."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveVisitor} className="visitor-entry-form">
          <label>Full Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleFormChange}
            required
          />

          <label>Company Name</label>
          <input
            name="company"
            value={form.company}
            onChange={handleFormChange}
          />

          <label>Designation</label>
          <input
            name="designation"
            value={form.designation}
            onChange={handleFormChange}
          />

          <label>Phone Number</label>
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleFormChange}
          />

          <label>Email Address</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleFormChange}
          />

          <label>Country</label>
          <input
            name="country"
            value={form.country}
            onChange={handleFormChange}
            placeholder="Enter country"
          />

          <label>State / Union Territory</label>
          <select
            name="state"
            value={form.state}
            onChange={handleFormChange}
          >
            <option value="">Select State / UT</option>
            {states.map((state) => (
              <option value={state} key={state}>
                {state}
              </option>
            ))}
          </select>

          <h3>Products Interested In</h3>
          <p>Select all products the visitor is interested in.</p>

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
            rows="4"
            value={form.requirements}
            onChange={handleFormChange}
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingVisitor
                  ? "Save Changes"
                  : "Save Visitor"}
            </button>

            {editingVisitor && (
              <button type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    );
  }

  function renderProbability(visitor) {
    const probability = Number(visitor.customer_probability || 0);
    const level = getProbabilityLevel(probability);

    return (
      <div className="probability-panel">
        <div className="probability-heading">
          <h4>Probability of Ordering</h4>
          <span className={`probability-badge ${level.toLowerCase()}`}>
            {level}
          </span>
        </div>

        <div className="probability-value">{probability}%</div>

        <div className="probability-track">
          <div
            className={`probability-fill ${level.toLowerCase()}`}
            style={{ width: `${probability}%` }}
          />
        </div>

        <input
          className="probability-slider"
          type="range"
          min="0"
          max="100"
          step="5"
          value={probability}
          aria-label={`Probability of ordering for ${visitor.name}`}
          onChange={(e) => changeProbability(visitor.id, e.target.value)}
          onPointerUp={(e) =>
            saveProbability(visitor.id, e.currentTarget.value)
          }
          onKeyUp={(e) =>
            saveProbability(visitor.id, e.currentTarget.value)
          }
        />

        <div className="probability-scale">
          <span>0% - Unlikely</span>
          <span>100% - Very likely</span>
        </div>
      </div>
    );
  }

  function renderFollowUp(visitor) {
    return (
      <div className="follow-up-panel">
        <h4>Follow-up Information</h4>

        <label className="follow-up-toggle">
          <input
            type="checkbox"
            checked={visitor.follow_up_required || false}
            onChange={(e) =>
              updateVisitor(visitor.id, {
                follow_up_required: e.target.checked,
              })
            }
          />
          <span>Follow-up Required</span>
        </label>

        <div className="follow-up-fields">
          <div className="follow-up-field">
            <label>Follow-up Date</label>
            <input
              type="date"
              value={visitor.follow_up_date || ""}
              onChange={(e) =>
                updateVisitor(visitor.id, {
                  follow_up_date: e.target.value || null,
                })
              }
            />
          </div>

          <div className="follow-up-field">
            <label>Follow-up Notes</label>
            <textarea
              rows="3"
              value={visitor.follow_up_notes || ""}
              placeholder="Enter follow-up details..."
              onChange={(e) =>
                setVisitors((current) =>
                  current.map((item) =>
                    item.id === visitor.id
                      ? { ...item, follow_up_notes: e.target.value }
                      : item
                  )
                )
              }
              onBlur={(e) =>
                updateVisitor(visitor.id, {
                  follow_up_notes: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  function renderVisitorCard(visitor, options = {}) {
    const { probability = true, followUp = true } = options;

    return (
      <div className="stat-card visitor-card" key={visitor.id}>
        <h3>{visitor.name}</h3>

        <p><strong>Company:</strong> {visitor.company}</p>
        <p><strong>Designation:</strong> {visitor.designation || "Not provided"}</p>
        <p><strong>Phone:</strong> {visitor.phone}</p>
        <p><strong>Email:</strong> {visitor.email || "Not provided"}</p>
        <p><strong>Country:</strong> {visitor.country || "Not provided"}</p>
        <p><strong>State / UT:</strong> {visitor.state || "Not provided"}</p>
        <p><strong>Interests:</strong> {(visitor.interests || []).join(", ") || "None selected"}</p>
        <p><strong>Requirements:</strong> {visitor.requirements || "None"}</p>

        <button
          type="button"
          onClick={() => startEdit(visitor)}
          style={{ marginTop: "10px" }}
        >
          Edit Visitor
        </button>

        {probability && renderProbability(visitor)}

        {followUp && (
          <>
            <hr />
            {renderFollowUp(visitor)}
          </>
        )}

        <p>
          <strong>Registered:</strong>{" "}
          {visitor.created_at
            ? new Date(visitor.created_at).toLocaleString()
            : "Unknown"}
        </p>
      </div>
    );
  }

  function renderVisitorList(list, options = {}) {
    if (loading) return <p>Loading visitor records...</p>;
    if (error) return <p>Could not load visitors: {error}</p>;

    if (list.length === 0) {
      return (
        <div className="empty-state">
          <h3>No visitors found</h3>
          <p>Visitor records will appear here when employees add them.</p>
        </div>
      );
    }

    return (
      <div className="visitor-list">
        {list.map((visitor) => renderVisitorCard(visitor, options))}
      </div>
    );
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>H. S. MARTIN</h2>
          <p>INDIA</p>
        </div>

        <nav>
          {[
            "Overview",
            "New Visitor",
            "All Visitors",
            "Enquiries",
            "Follow-ups",
          ].map((tab) => (
            <button
              type="button"
              key={tab}
              className={`menu-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setSearch("");
                setEditingVisitor(null);
                setForm(initialForm);
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{activeTab}</h1>
            <p>H. S. Martin India | Exhibition Management</p>
          </div>

          <div>
            <span className="admin-label">
              {userRole === "admin" ? "Admin Panel" : "Employee Panel"}
            </span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {activeTab === "New Visitor" && renderVisitorForm()}

        {activeTab === "Edit Visitor" && renderVisitorForm()}

        {activeTab === "Overview" && (
          <>
            <section className="stats">
              <div className="stat-card">
                <p>Total Visitors</p>
                <h2>{visitors.length}</h2>
              </div>

              <div className="stat-card">
                <p>Companies</p>
                <h2>{companyCount}</h2>
              </div>

              <div className="stat-card">
                <p>States</p>
                <h2>{stateCount}</h2>
              </div>

              <div className="stat-card">
                <p>Product Interests</p>
                <h2>{productCount}</h2>
              </div>
            </section>

            <section className="visitor-section">
              <div className="visitor-heading">
                <div>
                  <h2>Recent Visitors</h2>
                  <p>Latest exhibition visitor records</p>
                </div>

                <button
                  type="button"
                  className="export-button"
                  onClick={exportToExcel}
                  disabled={exporting || loading}
                >
                  {exporting ? "Preparing Excel..." : "Export Excel"}
                </button>
              </div>

              {renderVisitorList(visitors.slice(0, 5), {
                probability: false,
                followUp: false,
              })}
            </section>
          </>
        )}

        {activeTab === "All Visitors" && (
          <section className="visitor-section">
            <div className="visitor-heading">
              <div>
                <h2>All Visitors</h2>
                <p>View and manage visitor records</p>
              </div>

              <button
                type="button"
                className="export-button"
                onClick={exportToExcel}
                disabled={exporting || loading}
              >
                {exporting ? "Preparing Excel..." : "Export Excel"}
              </button>
            </div>

            <input
              className="search-box"
              type="text"
              placeholder="Search by visitor, company, email, phone, country or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {renderVisitorList(filteredVisitors)}
          </section>
        )}

        {activeTab === "Enquiries" && (
          <section className="visitor-section">
            <div className="visitor-heading">
              <div>
                <h2>Customer Enquiries</h2>
                <p>Assess the probability of converting visitors into customers.</p>
              </div>
            </div>

            <input
              className="search-box"
              type="text"
              placeholder="Search enquiries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {renderVisitorList(filteredVisitors, {
              probability: true,
              followUp: false,
            })}
          </section>
        )}

        {activeTab === "Follow-ups" && (
          <section className="visitor-section">
            <div className="visitor-heading">
              <div>
                <h2>Follow-up Management</h2>
                <p>Visitors marked for follow-up and their next actions.</p>
              </div>
            </div>

            <input
              className="search-box"
              type="text"
              placeholder="Search follow-ups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {renderVisitorList(followUpVisitors, {
              probability: false,
              followUp: true,
            })}
          </section>
        )}
      </main>
    </div>
  );
}