
import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import "./Dashboard.css";
import { supabase } from "./supabase";

function Dashboard() {
  const [search, setSearch] = useState("");
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchVisitors() {
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setVisitors(data || []);
      }

      setLoading(false);
    }

    fetchVisitors();
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Logout failed: " + error.message);
    }
  }

  async function updateVisitor(visitorId, updates) {
    const { error } = await supabase
      .from("visitors")
      .update(updates)
      .eq("id", visitorId);

    if (error) {
      alert("Could not save changes: " + error.message);
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

  async function exportToExcel() {
    if (visitors.length === 0) {
      alert("There are no visitor records to export.");
      return;
    }

    setExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();

      workbook.creator = "LabGlass";
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
          { header: "Enquiry Status", key: "status" },
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
          status: v.enquiry_status || "New",
          followup: v.follow_up_required ? "Yes" : "No",
          date: v.follow_up_date || "",
          notes: v.follow_up_notes || "",
          created: v.created_at
            ? new Date(v.created_at).toLocaleString()
            : "",
        }))
      );

      const enquiries = workbook.addWorksheet("Enquiries");

      prepareSheet(
        enquiries,
        [
          { header: "Name", key: "name" },
          { header: "Company", key: "company" },
          { header: "Phone", key: "phone" },
          { header: "Email", key: "email" },
          { header: "Product Interests", key: "interests" },
          { header: "Enquiry Status", key: "status" },
        ],
        visitors.map((v) => ({
          name: v.name,
          company: v.company,
          phone: v.phone,
          email: v.email || "",
          interests: (v.interests || []).join(", "),
          status: v.enquiry_status || "New",
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
      link.download = `LabGlass_Exhibition_Visitors_${new Date()
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

  const filteredVisitors = visitors.filter((visitor) => {
    const searchText = search.toLowerCase();

    return (
      (visitor.name || "").toLowerCase().includes(searchText) ||
      (visitor.company || "").toLowerCase().includes(searchText) ||
      (visitor.email || "").toLowerCase().includes(searchText) ||
      (visitor.phone || "").toLowerCase().includes(searchText)
    );
  });

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

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>LabGlass</h2>
        <p>Exhibition CRM</p>

        <nav>
          <button className="menu-item">Overview</button>
          <button className="menu-item">All Visitors</button>
          <button className="menu-item">Enquiries</button>
          <button className="menu-item">Follow-ups</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Visitor Dashboard</h1>
            <p>Exhibition visitor management</p>
          </div>

          <div>
            <span className="admin-label">Employee Panel</span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

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
              <h2>Registered Visitors</h2>
              <p>View and manage exhibition registrations</p>
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

          {loading && <p>Loading visitor records...</p>}
          {error && <p>Could not load visitors: {error}</p>}

          {!loading && !error && filteredVisitors.length === 0 && (
            <div className="empty-state">
              <h3>No visitors found</h3>
              <p>Visitor registrations will appear here.</p>
            </div>
          )}

          {!loading && !error && filteredVisitors.length > 0 && (
            <div className="visitor-list">
              {filteredVisitors.map((visitor) => (
                <div className="stat-card" key={visitor.id}>
                  <h3>{visitor.name}</h3>
                  <p><strong>Company:</strong> {visitor.company}</p>
                  <p><strong>Designation:</strong> {visitor.designation || "Not provided"}</p>
                  <p><strong>Phone:</strong> {visitor.phone}</p>
                  <p><strong>Email:</strong> {visitor.email || "Not provided"}</p>
                  <p><strong>Country:</strong> {visitor.country || "Not provided"}</p>
                  <p><strong>Interests:</strong> {(visitor.interests || []).join(", ") || "None selected"}</p>
                  <p><strong>Requirements:</strong> {visitor.requirements || "None"}</p>

                  <p><strong>Enquiry Status:</strong></p>
                  <select
                    value={visitor.enquiry_status || "New"}
                    onChange={(e) =>
                      updateVisitor(visitor.id, {
                        enquiry_status: e.target.value,
                      })
                    }
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested">Interested</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Converted">Converted</option>
                  </select>

                  <hr />

                  <h4>Follow-up Tracking</h4>

                  <label>
                    <input
                      type="checkbox"
                      checked={visitor.follow_up_required || false}
                      onChange={(e) =>
                        updateVisitor(visitor.id, {
                          follow_up_required: e.target.checked,
                        })
                      }
                    />
                    Follow-up Required
                  </label>

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

                  <p>
                    <strong>Registered:</strong>{" "}
                    {visitor.created_at
                      ? new Date(visitor.created_at).toLocaleString()
                      : "Unknown"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
