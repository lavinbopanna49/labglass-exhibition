
import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import "./Dashboard.css";
import { supabase } from "./supabase";

function getProbabilityLevel(value) {
  if (value >= 70) return "High";
  if (value >= 40) return "Medium";
  return "Low";
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  // LIVE DATABASE CONNECTION
  useEffect(() => {
    let mounted = true;

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

        setVisitors((current) => {
          const currentById = new Map(
            current.map((visitor) => [visitor.id, visitor])
          );

          const fetchedIds = new Set(
            (data || []).map((visitor) => visitor.id)
          );

          const merged = (data || []).map(
            (visitor) =>
              currentById.get(visitor.id) || visitor
          );

          const newRecords = current.filter(
            (visitor) => !fetchedIds.has(visitor.id)
          );

          return [...merged, ...newRecords].sort(
            (a, b) =>
              new Date(b.created_at) - new Date(a.created_at)
          );
        });
      }

      setLoading(false);
    }

    const channel = supabase
      .channel("visitors-live-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitors",
        },
        (payload) => {
          if (!mounted) return;

          // New visitor registration
          if (payload.eventType === "INSERT") {
            setVisitors((current) => {
              if (
                current.some(
                  (visitor) => visitor.id === payload.new.id
                )
              ) {
                return current;
              }

              return [payload.new, ...current];
            });
          }

          // Existing visitor updated
          if (payload.eventType === "UPDATE") {
            setVisitors((current) =>
              current.map((visitor) =>
                visitor.id === payload.new.id
                  ? payload.new
                  : visitor
              )
            );
          }

          // Visitor deleted
          if (payload.eventType === "DELETE") {
            setVisitors((current) =>
              current.filter(
                (visitor) => visitor.id !== payload.old.id
              )
            );
          }
        }
      )
      .subscribe((status) => {
        if (!mounted) return;

        if (status === "SUBSCRIBED") {
          fetchVisitors();
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          setError(
            "Live connection failed. Please check your internet connection."
          );
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // LOGOUT
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Logout failed: " + error.message);
    }
  }

  // UPDATE VISITOR
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

  // CHANGE PROBABILITY
  function changeProbability(visitorId, value) {
    setVisitors((current) =>
      current.map((visitor) =>
        visitor.id === visitorId
          ? {
              ...visitor,
              customer_probability: Number(value),
            }
          : visitor
      )
    );
  }

  async function saveProbability(visitorId, value) {
    await updateVisitor(visitorId, {
      customer_probability: Number(value),
    });
  }

  // EXCEL EXPORT
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

      function prepareSheet(sheet, columns, rows) {
        sheet.columns = columns;

        rows.forEach((row) => sheet.addRow(row));

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
          to: `${String.fromCharCode(64 + columns.length)}1`,
        };

        sheet.columns.forEach((column) => {
          column.width = Math.min(
            Math.max(column.header.length + 5, 15),
            35
          );
        });
      }

      const allVisitors = workbook.addWorksheet("All Visitors");

      prepareSheet(
        allVisitors,
        [
          { header: "Name", key: "name" },
          { header: "Company", key: "company" },
          { header: "Designation", key: "designation" },
          { header: "Phone", key: "phone" },
          { header: "Email", key: "email" },
          { header: "Country", key: "country" },
          { header: "Product Interests", key: "interests" },
          { header: "Requirements", key: "requirements" },
          { header: "Probability of Ordering", key: "probability" },
          { header: "Follow-up Required", key: "followup" },
          { header: "Follow-up Date", key: "date" },
          { header: "Follow-up Notes", key: "notes" },
          { header: "Registration Date", key: "created" },
        ],
        visitors.map((v) => ({
          name: v.name,
          company: v.company,
          designation: v.designation || "",
          phone: v.phone,
          email: v.email || "",
          country: v.country || "",
          interests: (v.interests || []).join(", "),
          requirements: v.requirements || "",
          probability: `${v.customer_probability || 0}%`,
          followup: v.follow_up_required ? "Yes" : "No",
          date: v.follow_up_date || "",
          notes: v.follow_up_notes || "",
          created: v.created_at
            ? new Date(v.created_at).toLocaleString()
            : "",
        }))
      );

      const enquiries = workbook.addWorksheet(
        "Probability of Ordering"
      );

      prepareSheet(
        enquiries,
        [
          { header: "Name", key: "name" },
          { header: "Company", key: "company" },
          { header: "Phone", key: "phone" },
          { header: "Email", key: "email" },
          { header: "Probability of Ordering", key: "probability" },
          { header: "Probability Level", key: "level" },
        ],
        visitors.map((v) => ({
          name: v.name,
          company: v.company,
          phone: v.phone,
          email: v.email || "",
          probability: `${v.customer_probability || 0}%`,
          level: getProbabilityLevel(
            v.customer_probability || 0
          ),
        }))
      );

      const followups = workbook.addWorksheet("Follow-ups");

      prepareSheet(
        followups,
        [
          { header: "Name", key: "name" },
          { header: "Company", key: "company" },
          { header: "Phone", key: "phone" },
          { header: "Email", key: "email" },
          { header: "Follow-up Required", key: "required" },
          { header: "Follow-up Date", key: "date" },
          { header: "Follow-up Notes", key: "notes" },
        ],
        visitors
          .filter((v) => v.follow_up_required)
          .map((v) => ({
            name: v.name,
            company: v.company,
            phone: v.phone,
            email: v.email || "",
            required: "Yes",
            date: v.follow_up_date || "",
            notes: v.follow_up_notes || "",
          }))
      );

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

  // DASHBOARD COUNTS
  const companyCount = new Set(
    visitors.map((visitor) => visitor.company).filter(Boolean)
  ).size;

  const countryCount = new Set(
    visitors.map((visitor) => visitor.country).filter(Boolean)
  ).size;

  const productCount = visitors.reduce(
    (total, visitor) =>
      total + (visitor.interests || []).length,
    0
  );

  // SEARCH
  const filteredVisitors = visitors.filter((visitor) => {
    const searchText = search.toLowerCase();

    return (
      (visitor.name || "").toLowerCase().includes(searchText) ||
      (visitor.company || "").toLowerCase().includes(searchText) ||
      (visitor.email || "").toLowerCase().includes(searchText) ||
      (visitor.phone || "").toLowerCase().includes(searchText)
    );
  });

  const followUpVisitors = filteredVisitors.filter(
    (visitor) => visitor.follow_up_required
  );

  // PROBABILITY PANEL
  function renderProbability(visitor) {
    const probability = Number(
      visitor.customer_probability || 0
    );

    const probabilityLevel = getProbabilityLevel(probability);

    return (
      <div className="probability-panel">
        <div className="probability-heading">
          <h4>Probability of Ordering</h4>

          <span
            className={`probability-badge ${probabilityLevel.toLowerCase()}`}
          >
            {probabilityLevel}
          </span>
        </div>

        <div className="probability-value">
          {probability}%
        </div>

        <div className="probability-track">
          <div
            className={`probability-fill ${probabilityLevel.toLowerCase()}`}
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
          onChange={(e) =>
            changeProbability(visitor.id, e.target.value)
          }
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

  // FOLLOW-UP PANEL
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
                      ? {
                          ...item,
                          follow_up_notes: e.target.value,
                        }
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

  // VISITOR CARD
  function renderVisitorCard(visitor, options = {}) {
    const {
      probability = true,
      followUp = true,
    } = options;

    return (
      <div className="stat-card visitor-card" key={visitor.id}>
        <h3>{visitor.name}</h3>

        <p><strong>Company:</strong> {visitor.company}</p>
        <p><strong>Designation:</strong> {visitor.designation || "Not provided"}</p>
        <p><strong>Phone:</strong> {visitor.phone}</p>
        <p><strong>Email:</strong> {visitor.email || "Not provided"}</p>
        <p><strong>Country:</strong> {visitor.country || "Not provided"}</p>
        <p><strong>Interests:</strong> {(visitor.interests || []).join(", ") || "None selected"}</p>
        <p><strong>Requirements:</strong> {visitor.requirements || "None"}</p>

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

  // VISITOR LIST
  function renderVisitorList(list, options = {}) {
    if (loading) {
      return <p>Loading visitor records...</p>;
    }

    if (error) {
      return <p>Could not load visitors: {error}</p>;
    }

    if (list.length === 0) {
      return (
        <div className="empty-state">
          <h3>No visitors found</h3>
          <p>Visitor registrations will appear here.</p>
        </div>
      );
    }

    return (
      <div className="visitor-list">
        {list.map((visitor) =>
          renderVisitorCard(visitor, options)
        )}
      </div>
    );
  }

  // DASHBOARD DISPLAY
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>H. S. MARTIN</h2>
          <p>INDIA</p>
        </div>

        <nav>
          {["Overview", "All Visitors", "Enquiries", "Follow-ups"].map(
            (tab) => (
              <button
                type="button"
                key={tab}
                className={`menu-item ${
                  activeTab === tab ? "active" : ""
                }`}
                onClick={() => {
                  setActiveTab(tab);
                  setSearch("");
                }}
              >
                {tab}
              </button>
            )
          )}
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{activeTab}</h1>
            <p>H. S. Martin India | Exhibition Management</p>
          </div>

          <div>
            <span className="admin-label">Employee Panel</span>

            <button type="button" onClick={handleLogout}>
              Logout
            </button>
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
                <h2>{companyCount}</h2>
              </div>

              <div className="stat-card">
                <p>Countries</p>
                <h2>{countryCount}</h2>
              </div>

              <div className="stat-card">
                <p>Product Interests</p>
                <h2>{productCount}</h2>
              </div>
            </section>

            <section className="visitor-section">
              <div className="visitor-heading">
                <div>
                  <h2>Recent Registrations</h2>
                  <p>Your latest exhibition visitors</p>
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

        {/* ALL VISITORS */}
        {activeTab === "All Visitors" && (
          <section className="visitor-section">
            <div className="visitor-heading">
              <div>
                <h2>All Registered Visitors</h2>
                <p>View and manage complete visitor records</p>
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
              placeholder="Search by visitor, company, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {renderVisitorList(filteredVisitors)}
          </section>
        )}

        {/* ENQUIRIES */}
        {activeTab === "Enquiries" && (
          <section className="visitor-section">
            <div className="visitor-heading">
              <div>
                <h2>Customer Enquiries</h2>
                <p>
                  Assess and update the probability of converting each
                  visitor into a customer
                </p>
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

        {/* FOLLOW-UPS */}
        {activeTab === "Follow-ups" && (
          <section className="visitor-section">
            <div className="visitor-heading">
              <div>
                <h2>Follow-up Management</h2>
                <p>
                  Visitors marked for follow-up and their next actions
                </p>
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

export default Dashboard;
