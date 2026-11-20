import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import "./Dashboard.css";
import { supabase } from "./supabase";
import {
  LayoutDashboard,
  CalendarDays,
  UserPlus,
  Users,
  MessageSquare,
  ClipboardList,
  ClipboardCheck,
  Search,
  Trash2,
} from "lucide-react";

const emptyVisitor = {
  name: "",
  company: "",
  designation: "",
  phone: "",
  email: "",
  country: "",
  state: "",
  interests: [],
  requirements: ""
};

const products = [
  "Reaction Units",
  "Filter Reactors",
  "Nutsche Filters",
  "Thin Film Evaporators",
  "Short Path Evaporators",
  "Rotary Evaporators",
  "Pressure Reactors",
  "Scrubbers",
  "Quartz Glass Products",
  "Custom Design Glassware",
  "OEM Glassware Products",
];

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry",
];

function probabilityLevel(value) {
  if (value >= 70) return "High";
  if (value >= 40) return "Medium";
  return "Low";
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("employee");

  const [exhibitions, setExhibitions] = useState([]);
  const [selectedExhibition, setSelectedExhibition] = useState("");
  const [exhibitionForm, setExhibitionForm] = useState({
    exhibition_name: "",
    location: "",
    year: new Date().getFullYear(),
  });

  const [visitors, setVisitors] = useState([]);
  const [visitorForm, setVisitorForm] = useState(emptyVisitor);
  const [editingVisitor, setEditingVisitor] = useState(null);

  const [search, setSearch] = useState("");
  const [filterExhibition, setFilterExhibition] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);

      const [
        userResult,
        roleResult,
        exhibitionResult,
        visitorResult,
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("get_user_role"),
        supabase.from("exhibitions").select("*").order("year", { ascending: false }),
        supabase.from("visitors").select("*").order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      if (userResult.error) {
        setError(userResult.error.message);
      } else {
        setUser(userResult.data.user);
      }

      if (roleResult.error) {
        setError(roleResult.error.message);
      } else {
        setUserRole(roleResult.data || "employee");
      }

      if (exhibitionResult.error) {
        setError(exhibitionResult.error.message);
      } else {
        setExhibitions(exhibitionResult.data || []);
        if (exhibitionResult.data?.length) {
          setSelectedExhibition(exhibitionResult.data[0].id);
        }
      }

      if (visitorResult.error) {
        setError(visitorResult.error.message);
      } else {
        setVisitors(visitorResult.data || []);
      }

      setLoading(false);
    }

    loadData();

    const channel = supabase
      .channel("exhibition-visitors-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitors",
        },
        async () => {
          const { data, error: fetchError } = await supabase
            .from("visitors")
            .select("*")
            .order("created_at", { ascending: false });

          if (!active) return;

          if (fetchError) {
            setError(fetchError.message);
          } else {
            setVisitors(data || []);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
  }

  // CREATE EXHIBITION
  async function createExhibition(event) {
    event.preventDefault();

    if (!user) {
      alert("Your login session could not be found. Please log in again.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("exhibitions")
      .insert({
        exhibition_name: exhibitionForm.exhibition_name.trim(),
        location: exhibitionForm.location.trim(),
        year: Number(exhibitionForm.year),
        created_by: user.id,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      alert("Could not create exhibition: " + error.message);
      return;
    }

    setExhibitions((current) => [data, ...current]);
    setSelectedExhibition(data.id);

    setExhibitionForm({
      exhibition_name: "",
      location: "",
      year: new Date().getFullYear(),
    });

    alert("Exhibition created successfully.");
    setActiveTab("New Visitor");
  }

  // DELETE EXHIBITION
  async function deleteExhibition(exhibition) {
    const confirmed = window.confirm(
      `Delete "${exhibition.exhibition_name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("exhibitions")
      .delete()
      .eq("id", exhibition.id);

    if (error) {
      if (error.code === "23503") {
        alert(
          "This exhibition has visitor records linked to it. Delete or reassign those records before deleting the exhibition."
        );
      } else {
        alert("Could not delete exhibition: " + error.message);
      }
      return;
    }

    setExhibitions((current) =>
      current.filter((item) => item.id !== exhibition.id)
    );

    if (selectedExhibition === exhibition.id) {
      setSelectedExhibition("");
    }

    alert("Exhibition deleted successfully.");
  }

  function changeVisitorField(event) {
    const { name, value } = event.target;

    setVisitorForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function toggleInterest(product) {
    setVisitorForm((current) => ({
      ...current,
      interests: current.interests.includes(product)
        ? current.interests.filter((item) => item !== product)
        : [...current.interests, product],
    }));
  }

  // SAVE VISITOR
  async function saveVisitor(event) {
    event.preventDefault();

    if (!visitorForm.name.trim()) {
      alert("Please enter the visitor's name.");
      return;
    }

    if (!selectedExhibition) {
      alert("Please select an exhibition first.");
      return;
    }

    if (!user) {
      alert("Your login session could not be found. Please log in again.");
      return;
    }

    setSaving(true);

    const visitorData = {
      ...visitorForm,
      name: visitorForm.name.trim(),
      exhibition_id: selectedExhibition,
    };

    let result;

    if (editingVisitor) {
      result = await supabase
        .from("visitors")
        .update(visitorData)
        .eq("id", editingVisitor.id);
    } else {
      result = await supabase
        .from("visitors")
        .insert({
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
        ? "Visitor updated successfully."
        : "Visitor saved successfully."
    );

    setVisitorForm(emptyVisitor);
    setEditingVisitor(null);
    setActiveTab("New Visitor");

    const { data, error } = await supabase
      .from("visitors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setVisitors(data || []);
    }
  }

  // EDIT VISITOR
  function editVisitor(visitor) {
    setEditingVisitor(visitor);

    setVisitorForm({
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

    setSelectedExhibition(visitor.exhibition_id || "");
    setActiveTab("Edit Visitor");
  }

  function cancelEdit() {
    setEditingVisitor(null);
    setVisitorForm(emptyVisitor);
    setActiveTab("All Visitors");
  }

  // UPDATE VISITOR
  async function updateVisitor(visitorId, updates) {
    const { error } = await supabase
      .from("visitors")
      .update(updates)
      .eq("id", visitorId);

    if (error) {
      alert("Could not update visitor: " + error.message);
      return;
    }

    setVisitors((current) =>
      current.map((visitor) =>
        visitor.id === visitorId
          ? { ...visitor, ...updates }
          : visitor
      )
    );
  }

  // DELETE VISITOR
  async function deleteVisitor(visitorId) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this visitor entry?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("visitors")
      .delete()
      .eq("id", visitorId);

    if (error) {
      alert("Could not delete visitor: " + error.message);
      return;
    }

    setVisitors((current) =>
      current.filter((visitor) => visitor.id !== visitorId)
    );

    alert("Visitor entry deleted successfully.");
  }

  // EXPORT EXCEL
  async function exportExcel() {
    if (!visitors.length) {
      alert("There are no visitor records to export.");
      return;
    }

    setExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Visitors");

      sheet.columns = [
        { header: "Visitor Name", key: "name", width: 25 },
        { header: "Company", key: "company", width: 25 },
        { header: "Designation", key: "designation", width: 20 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 28 },
        { header: "Country", key: "country", width: 18 },
        { header: "State", key: "state", width: 20 },
        { header: "Exhibition", key: "exhibition", width: 28 },
        { header: "Interests", key: "interests", width: 40 },
        { header: "Requirements", key: "requirements", width: 35 },
        { header: "Probability", key: "probability", width: 15 },
        { header: "Follow-up Required", key: "followup", width: 18 },
        { header: "Follow-up Date", key: "date", width: 18 },
        { header: "Follow-up Notes", key: "notes", width: 35 },
      ];

      visitors.forEach((visitor) => {
        const exhibition = exhibitions.find(
          (item) => item.id === visitor.exhibition_id
        );

        sheet.addRow({
          name: visitor.name,
          company: visitor.company || "",
          designation: visitor.designation || "",
          phone: visitor.phone || "",
          email: visitor.email || "",
          country: visitor.country || "",
          state: visitor.state || "",
          exhibition: exhibition?.exhibition_name || "",
          interests: (visitor.interests || []).join(", "),
          requirements: visitor.requirements || "",
          probability: `${visitor.customer_probability || 0}%`,
          followup: visitor.follow_up_required ? "Yes" : "No",
          date: visitor.follow_up_date || "",
          notes: visitor.follow_up_notes || "",
        });
      });

      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "HSMartin_Exhibition_Visitors.xlsx";
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Excel export failed: " + err.message);
    }

    setExporting(false);
  }

  // FILTER AND SORT VISITORS
  const filteredVisitors = visitors
    .filter((visitor) => {
      const term = search.toLowerCase();

      const matchesSearch =
        (visitor.name || "").toLowerCase().includes(term) ||
        (visitor.company || "").toLowerCase().includes(term) ||
        (visitor.email || "").toLowerCase().includes(term) ||
        (visitor.phone || "").toLowerCase().includes(term);

      const matchesExhibition =
        !filterExhibition || visitor.exhibition_id === filterExhibition;

      const matchesCompany =
        !filterCompany || visitor.company === filterCompany;

      const visitorExhibition = exhibitions.find(
        (item) => item.id === visitor.exhibition_id
      );

      const matchesYear =
        !filterYear || String(visitorExhibition?.year) === filterYear;

      return (
        matchesSearch &&
        matchesExhibition &&
        matchesCompany &&
        matchesYear
      );
    })
    .sort((a, b) => {
      let valueA;
      let valueB;

      if (sortBy === "exhibition") {
        valueA =
          exhibitions.find((item) => item.id === a.exhibition_id)
            ?.exhibition_name || "";
        valueB =
          exhibitions.find((item) => item.id === b.exhibition_id)
            ?.exhibition_name || "";
      } else if (sortBy === "created_at") {
        valueA = new Date(a.created_at).getTime();
        valueB = new Date(b.created_at).getTime();
      } else {
        valueA = a[sortBy] || "";
        valueB = b[sortBy] || "";
      }

      let comparison;

      if (sortBy === "created_at") {
        comparison = valueA - valueB;
      } else {
        comparison = String(valueA).localeCompare(String(valueB));
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const exhibitionName = (id) =>
    exhibitions.find((item) => item.id === id)?.exhibition_name ||
    "Unknown exhibition";

  // VISITOR CARD
  function visitorCard(visitor, showActions = true) {
    const probability = Number(visitor.customer_probability || 0);
    const level = probabilityLevel(probability);

    return (
      <div className="stat-card visitor-card" key={visitor.id}>
        <h3>{visitor.name}</h3>

        <p><strong>Company:</strong> {visitor.company || "Not provided"}</p>
        <p><strong>Designation:</strong> {visitor.designation || "Not provided"}</p>
        <p><strong>Phone:</strong> {visitor.phone || "Not provided"}</p>
        <p><strong>Email:</strong> {visitor.email || "Not provided"}</p>
        <p><strong>Country:</strong> {visitor.country || "Not provided"}</p>
        <p><strong>State:</strong> {visitor.state || "Not provided"}</p>
        <p><strong>Exhibition:</strong> {exhibitionName(visitor.exhibition_id)}</p>
        <p>
          <strong>Interests:</strong>{" "}
          {(visitor.interests || []).join(", ") || "None selected"}
        </p>
        <p><strong>Requirements:</strong> {visitor.requirements || "None"}</p>

        {showActions && (
          <>
            <button
              type="button"
              onClick={() => editVisitor(visitor)}
            >
              Edit Visitor
            </button>

            <button
              type="button"
              className="icon-delete-button"
              title="Delete visitor"
              aria-label="Delete visitor"
              onClick={() => deleteVisitor(visitor.id)}
            >
              <Trash2 size={18} />
            </button>

            <div className="probability-panel">
              <div className="probability-heading">
                <h4>Probability of Ordering</h4>
                <span className={`probability-badge ${level.toLowerCase()}`}>
                  {probability}% · {level}
                </span>
              </div>

              <input
                className="probability-slider"
                type="range"
                min="0"
                max="100"
                step="5"
                value={probability}
                style={{ "--probability": `${probability}%` }}
                onChange={(event) =>
                  setVisitors((current) =>
                    current.map((item) =>
                      item.id === visitor.id
                        ? {
                            ...item,
                            customer_probability: Number(event.target.value),
                          }
                        : item
                    )
                  )
                }
                onPointerUp={(event) =>
                  updateVisitor(visitor.id, {
                    customer_probability: Number(event.currentTarget.value),
                  })
                }
              />

              <div className="probability-scale">
                <span>0% — Unlikely</span>
                <span>100% — Very likely</span>
              </div>
            </div>

            <label>
              <input
                type="checkbox"
                checked={visitor.follow_up_required || false}
                onChange={(event) =>
                  updateVisitor(visitor.id, {
                    follow_up_required: event.target.checked,
                  })
                }
              />
              Follow-up required
            </label>

            <label>Follow-up date</label>
            <input
              type="date"
              value={visitor.follow_up_date || ""}
              onChange={(event) =>
                updateVisitor(visitor.id, {
                  follow_up_date: event.target.value || null,
                })
              }
            />

            <label>Follow-up notes</label>
            <textarea
              rows="2"
              defaultValue={visitor.follow_up_notes || ""}
              onBlur={(event) =>
                updateVisitor(visitor.id, {
                  follow_up_notes: event.target.value,
                })
              }
            />
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

  function visitorList(list) {
    if (loading) return <p>Loading records...</p>;
    if (error) return <p>Database message: {error}</p>;
    if (!list.length) return <p>No visitors found.</p>;

    return (
      <div className="visitor-list">
        {list.map((visitor) => visitorCard(visitor))}
      </div>
    );
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">HSM</div>

          <div className="sidebar-brand-text">
            <h2>H. S. MARTIN</h2>
            <p>INDIA</p>
          </div>
        </div>

        <nav>
          {[
            { name: "Overview", icon: LayoutDashboard },
            { name: "Exhibitions", icon: CalendarDays },
            { name: "New Visitor", icon: UserPlus },
            { name: "All Visitors", icon: Users },
            { name: "Enquiries", icon: MessageSquare },
            { name: "Follow-ups", icon: ClipboardList },
            { name: "Orders & Feedback", icon: ClipboardCheck },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.name}
                className={`menu-item ${activeTab === item.name ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(item.name);
                  setSearch("");

                  if (item.name !== "Edit Visitor") {
                    setEditingVisitor(null);
                    setVisitorForm(emptyVisitor);
                  }
                }}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-profile">
          <div className="sidebar-profile-info">
            <strong>{user?.email}</strong>
            <span>Signed in</span>
          </div>

          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
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
          </div>
        </header>

        {/* OVERVIEW */}
        {activeTab === "Overview" && (
          <>
            <section className="stats">
              <div className="stat-card">
                <p>Total Visitors</p>
                <h2>{visitors.length}</h2>
              </div>

              <div className="stat-card">
                <p>Companies</p>
                <h2>
                  {new Set(visitors.map((v) => v.company).filter(Boolean)).size}
                </h2>
              </div>

              <div className="stat-card">
                <p>Exhibitions</p>
                <h2>{exhibitions.length}</h2>
              </div>

              <div className="stat-card">
                <p>Product Interests</p>
                <h2>
                  {visitors.reduce(
                    (total, v) => total + (v.interests || []).length,
                    0
                  )}
                </h2>
              </div>
            </section>

            <section className="visitor-section overview-visitors">
              <div className="visitor-heading">
                <h2>Recent Visitors</h2>

                <button
                  type="button"
                  onClick={exportExcel}
                  disabled={exporting}
                >
                  {exporting ? "Preparing..." : "Export Excel"}
                </button>
              </div>

              {visitorList(visitors.slice(0, 5))}
            </section>
          </>
        )}

        {/* EXHIBITIONS */}
        {activeTab === "Exhibitions" && (
          <section className="visitor-section">
            <h2>Create New Exhibition</h2>

            <form
              className="visitor-entry-form"
              onSubmit={createExhibition}
            >
              <label>Exhibition Name *</label>

              <input
                required
                value={exhibitionForm.exhibition_name}
                onChange={(event) =>
                  setExhibitionForm((current) => ({
                    ...current,
                    exhibition_name: event.target.value,
                  }))
                }
              />

              <label>Location *</label>

              <input
                required
                value={exhibitionForm.location}
                onChange={(event) =>
                  setExhibitionForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              />

              <label>Year *</label>

              <input
                required
                type="number"
                min="2000"
                max="2100"
                value={exhibitionForm.year}
                onChange={(event) =>
                  setExhibitionForm((current) => ({
                    ...current,
                    year: event.target.value,
                  }))
                }
              />

              <button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Exhibition"}
              </button>
            </form>

            <h2>Available Exhibitions</h2>

            {exhibitions.length === 0 ? (
              <p>No exhibitions have been created yet.</p>
            ) : (
              exhibitions.map((exhibition) => (
                <div
                  className="stat-card exhibition-card"
                  key={exhibition.id}
                >
                  <div>
                    <h3>{exhibition.exhibition_name}</h3>
                    <p>Location: {exhibition.location}</p>
                    <p>Year: {exhibition.year}</p>
                  </div>

                  <button
                    type="button"
                    className="icon-delete-button"
                    title="Delete exhibition"
                    aria-label="Delete exhibition"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      deleteExhibition(exhibition);
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </section>
        )}

        {/* NEW VISITOR / EDIT VISITOR */}
        {(activeTab === "New Visitor" || activeTab === "Edit Visitor") && (
          <section className="visitor-section">
            <h2>
              {editingVisitor ? "Edit Visitor" : "Enter New Visitor"}
            </h2>

            <form
  className="visitor-entry-form"
  onSubmit={saveVisitor}
  onKeyDownCapture={(event) => {
    if (
      event.key === "Enter" &&
      event.target.matches('input[type="checkbox"]') &&
      event.target.closest(".product-list")
    ) {
      event.preventDefault();
      event.stopPropagation();

      const checkboxes = Array.from(
        event.currentTarget.querySelectorAll(
          '.product-list input[type="checkbox"]'
        )
      );

      const currentIndex = checkboxes.indexOf(event.target);

      toggleInterest(products[currentIndex]);

      if (checkboxes[currentIndex + 1]) {
        checkboxes[currentIndex + 1].focus();
      } else {
        event.currentTarget
          .querySelector('textarea[name="requirements"]')
          ?.focus();
      }
    }
  }}
>
              <label>Exhibition *</label>

              <select
                required
                value={selectedExhibition}
                onChange={(event) => setSelectedExhibition(event.target.value)}
              >
                <option value="">Select an exhibition</option>

                {exhibitions.map((exhibition) => (
                  <option key={exhibition.id} value={exhibition.id}>
                    {exhibition.exhibition_name} - {exhibition.year}
                  </option>
                ))}
              </select>

              <label>Full Name *</label>
              <input
                name="name"
                required
                value={visitorForm.name}
                onChange={changeVisitorField}
              />

              <label>Company Name</label>
              <input
                name="company"
                value={visitorForm.company}
                onChange={changeVisitorField}
              />

              <label>Designation</label>
              <input
                name="designation"
                value={visitorForm.designation}
                onChange={changeVisitorField}
              />

              <label>Phone Number</label>
              <input
                name="phone"
                type="tel"
                value={visitorForm.phone}
                onChange={changeVisitorField}
              />

              <label>Email Address</label>
              <input
                name="email"
                type="email"
                value={visitorForm.email}
                onChange={changeVisitorField}
              />

              <label>Country</label>
              <input
                name="country"
                value={visitorForm.country}
                onChange={changeVisitorField}
              />

              <label>State / Union Territory</label>

              <select
                name="state"
                value={visitorForm.state}
                onChange={changeVisitorField}
              >
                <option value="">Select State / UT</option>

                {indianStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>

              <h3>Products Interested In</h3>

              <div
  className="product-list"
  onKeyDown={(event) => {
    if (event.key !== "Enter") return;

    const checkboxes = Array.from(
      event.currentTarget.querySelectorAll('input[type="checkbox"]')
    );

    const currentIndex = checkboxes.indexOf(event.target);

    if (currentIndex === -1) return;

    event.preventDefault();

    const currentProduct = products[currentIndex];

    toggleInterest(currentProduct);

    const nextCheckbox = checkboxes[currentIndex + 1];

    if (nextCheckbox) {
      nextCheckbox.focus();
    } else {
      event.currentTarget
        .closest("form")
        ?.querySelector('textarea[name="requirements"]')
        ?.focus();
    }
  }}
>
  {products.map((product) => (
    <label className="product-option" key={product}>
      <input
        type="checkbox"
        checked={visitorForm.interests.includes(product)}
        onChange={() => toggleInterest(product)}
      />
      {product}
    </label>
  ))}
</div>

              <label>Additional Requirements</label>

              <textarea
                name="requirements"
                rows="4"
                value={visitorForm.requirements}
                onChange={changeVisitorField}
              />

              <button
                type="submit"
                disabled={saving || exhibitions.length === 0}
              >
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
            </form>
          </section>
        )}

        {/* ALL VISITORS */}
        {activeTab === "All Visitors" && (
          <section className="visitor-section">
            <div className="visitor-heading">
              <h2>All Visitors</h2>

              <button
                type="button"
                onClick={exportExcel}
                disabled={exporting}
              >
                {exporting ? "Preparing..." : "Export Excel"}
              </button>
            </div>

            <div className="visitor-search">
              <Search size={18} />

              <input
                placeholder="Search by name, company, email or phone..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="visitor-filters">
              <select
                value={filterExhibition}
                onChange={(event) => setFilterExhibition(event.target.value)}
              >
                <option value="">All Exhibitions</option>

                {exhibitions.map((exhibition) => (
                  <option key={exhibition.id} value={exhibition.id}>
                    {exhibition.exhibition_name}
                  </option>
                ))}
              </select>

              <select
                value={filterCompany}
                onChange={(event) => setFilterCompany(event.target.value)}
              >
                <option value="">All Companies</option>

                {[...new Set(visitors.map((v) => v.company).filter(Boolean))]
                  .sort()
                  .map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
              </select>

              <select
                value={filterYear}
                onChange={(event) => setFilterYear(event.target.value)}
              >
                <option value="">All Years</option>

                {[...new Set(exhibitions.map((item) => item.year))]
                  .sort((a, b) => b - a)
                  .map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="created_at">Date Added</option>
                <option value="company">Company</option>
                <option value="exhibition">Exhibition</option>
                <option value="name">Visitor Name</option>
              </select>

              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>

            {visitorList(filteredVisitors)}
          </section>
        )}

        {/* ENQUIRIES */}
        {activeTab === "Enquiries" && (
          <section className="visitor-section">
            <h2>Customer Enquiries</h2>
            {visitorList(filteredVisitors)}
          </section>
        )}

        {/* FOLLOW-UPS */}
        {activeTab === "Follow-ups" && (
          <section className="visitor-section">
            <h2>Follow-up Management</h2>
            {visitorList(
              filteredVisitors.filter((v) => v.follow_up_required)
            )}
          </section>
        )}

        {/* ORDERS AND FEEDBACK */}
        {activeTab === "Orders & Feedback" && (
          <section className="visitor-section orders-feedback">
            <h2>Orders & Customer Feedback</h2>
            <p>Track order status and record customer satisfaction.</p>

            {loading ? (
              <p>Loading visitor records...</p>
            ) : visitors.length === 0 ? (
              <p>No visitor records found.</p>
            ) : (
              <div className="visitor-list">
                {visitors.map((visitor) => (
                  <div
                    className="stat-card visitor-card"
                    key={visitor.id}
                  >
                    <h3>{visitor.name}</h3>

                    <p>
                      <strong>Company:</strong>{" "}
                      {visitor.company || "Not provided"}
                    </p>

                    <p>
                      <strong>Exhibition:</strong>{" "}
                      {exhibitionName(visitor.exhibition_id)}
                    </p>

                    <hr />

                    <h4>Order Status</h4>

                    <label>
                      <input
                        type="checkbox"
                        checked={visitor.order_placed || false}
                        onChange={(event) =>
                          updateVisitor(visitor.id, {
                            order_placed: event.target.checked,
                          })
                        }
                      />
                      Order placed
                    </label>

                    <h4>Items Ordered</h4>

                    <textarea
                      rows="3"
                      placeholder="Example: Jacketed Glass Reactor - 2 units"
                      defaultValue={visitor.items_ordered || ""}
                      onBlur={(event) =>
                        updateVisitor(visitor.id, {
                          items_ordered: event.target.value,
                        })
                      }
                    />

                    <hr />

                    <h4>Customer Satisfaction</h4>

                    <div className="satisfaction-options">
                      {[
                        { value: 1, emoji: "😡", label: "Very poor" },
                        { value: 2, emoji: "🙁", label: "Poor" },
                        { value: 3, emoji: "😐", label: "Average" },
                        { value: 4, emoji: "🙂", label: "Good" },
                        { value: 5, emoji: "😄", label: "Excellent" },
                      ].map((rating) => (
                        <button
                          key={rating.value}
                          type="button"
                          className={`satisfaction-option ${
                            Number(visitor.satisfaction_level) === rating.value
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            updateVisitor(visitor.id, {
                              satisfaction_level: rating.value,
                            })
                          }
                        >
                          <span>{rating.emoji}</span>
                          <small>{rating.label}</small>
                        </button>
                      ))}
                    </div>

                    <p>
                      <strong>Selected rating:</strong>{" "}
                      {visitor.satisfaction_level
                        ? `${visitor.satisfaction_level} out of 5`
                        : "Not rated yet"}
                    </p>

                    <hr />

                    <h4>Employee Feedback (Internal Notes)</h4>

                    <textarea
                      rows="3"
                      placeholder="Enter your feedback or observations..."
                      defaultValue={visitor.employee_feedback || ""}
                      onBlur={(event) =>
                        updateVisitor(visitor.id, {
                          employee_feedback: event.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}