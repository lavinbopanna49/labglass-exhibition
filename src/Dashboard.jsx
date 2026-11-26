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
  Menu,
  X,
  LogOut,
  UserRound,
  SlidersHorizontal,
Building2,
MapPin,
ArrowUpDown,
ArrowDown,
} from "lucide-react";


const emptyVisitor = {
  name: "",
  company: "",
  designation: "",
  phone: "",
  email: "",
  country: "India",
  state: "",
  union_territory: "",
  interests: [],
  requirements: "",
  visit_required: false,
  send_brochures: false,
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

const indianStatesByRegion = {
  North: [
    "Haryana",
    "Himachal Pradesh",
    "Punjab",
    "Rajasthan",
    "Uttar Pradesh",
    "Uttarakhand",
  ],
  South: [
    "Andhra Pradesh",
    "Karnataka",
    "Kerala",
    "Tamil Nadu",
    "Telangana",
  ],
  East: [
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Jharkhand",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Sikkim",
    "Tripura",
    "West Bengal",
  ],
  West: [
    "Goa",
    "Gujarat",
    "Madhya Pradesh",
    "Maharashtra",
  ],
};

const indianUnionTerritories = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function probabilityLevel(value) {
  if (value >= 70) return "High";
  if (value >= 40) return "Medium";
  return "Low";
}

export default function Dashboard() {
const [exhibitionFilterText, setExhibitionFilterText] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(
  typeof window !== "undefined" ? window.innerWidth > 768 : true
);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("employee");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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

  // Previous / Next visitor navigation
  const [editNavigationList, setEditNavigationList] = useState([]);
  const [editNavigationIndex, setEditNavigationIndex] = useState(0);

  const [search, setSearch] = useState("");
  const [filterExhibition, setFilterExhibition] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterState, setFilterState] = useState("");
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
        supabase
          .from("exhibitions")
          .select("*")
          .order("year", { ascending: false }),
        supabase
          .from("visitors")
          .select("*")
          .order("created_at", { ascending: false }),
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
  useEffect(() => {
  function handleResize() {
    setIsSidebarOpen(window.innerWidth > 768);
  }

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);

  // HANDLE BROWSER BACK BUTTON
  useEffect(() => {
    function handleBackToOverview() {
      setActiveTab("Overview");
    }

    window.addEventListener(
      "app-back-to-overview",
      handleBackToOverview
    );

    return () => {
      window.removeEventListener(
        "app-back-to-overview",
        handleBackToOverview
      );
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

  // CHANGE VISITOR FIELD
  function changeVisitorField(event) {
    const { name, value } = event.target;

    const capitalizeFields = ["name", "company", "designation"];

    const updatedValue = capitalizeFields.includes(name)
      ? value.replace(/\b\w/g, (char) => char.toUpperCase())
      : value;

    setVisitorForm((current) => ({
      ...current,
      [name]: updatedValue,
    }));
  }

  // TOGGLE PRODUCT INTEREST
  function toggleInterest(product) {
    setVisitorForm((current) => ({
      ...current,
      interests: current.interests.includes(product)
        ? current.interests.filter((item) => item !== product)
        : [...current.interests, product],
    }));
  }

  // LOAD VISITOR DETAILS INTO THE EDIT FORM
  function loadVisitorIntoForm(visitor) {
    setEditingVisitor(visitor);

    setVisitorForm({
      name: visitor.name || "",
      company: visitor.company || "",
      designation: visitor.designation || "",
      phone: visitor.phone || "",
      email: visitor.email || "",
      country: visitor.country || "India",
      state: visitor.state || "",
      union_territory: visitor.union_territory || "",
      interests: visitor.interests || [],
      requirements: visitor.requirements || "",
      visit_required: visitor.visit_required || false,
      send_brochures: visitor.send_brochures || false,
    });

    setSelectedExhibition(visitor.exhibition_id || "");
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
      visit_required: visitorForm.visit_required,
      send_brochures: visitorForm.send_brochures,
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

    if (editingVisitor) {
      const updatedVisitor = {
        ...editingVisitor,
        ...visitorData,
      };

      setVisitors((current) =>
        current.map((visitor) =>
          visitor.id === editingVisitor.id
            ? updatedVisitor
            : visitor
        )
      );

      setEditNavigationList((current) =>
        current.map((visitor) =>
          visitor.id === editingVisitor.id
            ? updatedVisitor
            : visitor
        )
      );

      setEditingVisitor(updatedVisitor);

      alert("Visitor updated successfully.");

      // Stay on the same edit screen
      return;
    }

    alert("Visitor saved successfully.");

    setVisitorForm(emptyVisitor);
    setActiveTab("New Visitor");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

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
  function editVisitor(visitor, navigationList = filteredVisitors) {
    const list = navigationList.length
      ? navigationList
      : [visitor];

    const visitorIndex = list.findIndex(
      (item) => item.id === visitor.id
    );

    setEditNavigationList(list);
    setEditNavigationIndex(visitorIndex >= 0 ? visitorIndex : 0);

    loadVisitorIntoForm(visitor);

    setActiveTab("Edit Visitor");
  }

  // PREVIOUS / NEXT VISITOR
  function navigateEditVisitor(direction) {
    const nextIndex = editNavigationIndex + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= editNavigationList.length
    ) {
      return;
    }

    setEditNavigationIndex(nextIndex);

    const nextVisitor = editNavigationList[nextIndex];

    loadVisitorIntoForm(nextVisitor);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // CANCEL EDIT
  function cancelEdit() {
    setEditingVisitor(null);
    setVisitorForm(emptyVisitor);
    setEditNavigationList([]);
    setEditNavigationIndex(0);
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
        { header: "Union Territory", key: "union_territory", width: 30 },
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
          union_territory: visitor.union_territory || "",
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

      const matchesState =
        !filterState || visitor.state === filterState;

      return (
        matchesSearch &&
        matchesExhibition &&
        matchesCompany &&
        matchesState
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

  // SPREADSHEET-STYLE VISITOR TABLE
  
  // DISPLAY VISITOR LIST
 function visitorList(list) {
  if (loading) return <p>Loading records...</p>;
  if (error) return <p>Database message: {error}</p>;
  if (!list.length) return <p>No visitors found.</p>;

  return (
    <div className="table-scroll-wrapper">

      {/* TOP HORIZONTAL SCROLLBAR */}
      <div
        className="table-scroll-top"
        onScroll={(event) => {
          const bottom = event.currentTarget.nextElementSibling;
          if (bottom) bottom.scrollLeft = event.currentTarget.scrollLeft;
        }}
      >
        <div className="table-scroll-top-inner"></div>
      </div>

      {/* MAIN TABLE */}
      <div
        className="table-scroll"
        onScroll={(event) => {
          const top = event.currentTarget.previousElementSibling;
          if (top) top.scrollLeft = event.currentTarget.scrollLeft;
        }}
      >
        <table className="crm-table">
          <thead>
            <tr>
              <th>Visitor Name</th>
              <th>Company</th>
              <th>Designation</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Country</th>
              <th>State / UT</th>
              <th>Exhibition</th>
              <th>Product Interests</th>
              <th>Requirements</th>
              <th>Follow-up</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {list.map((visitor) => (
              <tr key={visitor.id}>
                <td className="crm-name-cell">
                  {visitor.name || "—"}
                </td>

                <td>{visitor.company || "—"}</td>
                <td>{visitor.designation || "—"}</td>
                <td>{visitor.phone || "—"}</td>
                <td>{visitor.email || "—"}</td>
                <td>{visitor.country || "—"}</td>

                <td>
                  {visitor.state || visitor.union_territory || "—"}
                </td>

                <td>{exhibitionName(visitor.exhibition_id)}</td>

                <td>
                  {(visitor.interests || []).join(", ") || "—"}
                </td>

                <td className="crm-notes-cell">
                  {visitor.requirements || "—"}
                </td>

                <td>
                  <label className="crm-inline-control">
                    <input
                      type="checkbox"
                      checked={visitor.follow_up_required || false}
                      onChange={(event) =>
                        updateVisitor(visitor.id, {
                          follow_up_required: event.target.checked,
                        })
                      }
                    />
                    {visitor.follow_up_required ? "Yes" : "No"}
                  </label>
                </td>

                <td>
                  {visitor.created_at
                    ? new Date(visitor.created_at).toLocaleDateString()
                    : "—"}
                </td>

                <td>
                  <div className="crm-row-actions">
                    <button
                      type="button"
                      onClick={() => editVisitor(visitor, list)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="icon-delete-button"
                      title="Delete visitor"
                      aria-label={`Delete ${visitor.name}`}
                      onClick={() => deleteVisitor(visitor.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

  return (
    <div className="dashboard">
      {isSidebarOpen && window.innerWidth <= 768 && (
  <button
    type="button"
    className="sidebar-overlay"
    aria-label="Close sidebar"
    onClick={() => setIsSidebarOpen(false)}
  />
)}
      <aside
  className={`sidebar ${
    isSidebarOpen ? "sidebar-open" : "sidebar-closed"
  }`}
>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
           <img src="/hsm-watermark.png" alt="H.S. Martin Logo" /> 
          </div>
          <p>Exhibition Dashboard</p>
          <div className="sidebar-brand-text">
          
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
                  if (window.history.state?.appScreen !== "dashboard") {
                    window.history.pushState(
                      { appScreen: "dashboard" },
                      "",
                      window.location.href
                    );
                  }

                  setActiveTab(item.name);
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
          </div>

        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
  <button
    type="button"
    className="sidebar-toggle"
    aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
    onClick={() => setIsSidebarOpen((open) => !open)}
  >
    {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
  </button>

  <div className="header-title">
    <h1>{activeTab}</h1>
  </div>

  <div className="user-menu-container">
  <button
    type="button"
    className="user-menu-trigger"
    aria-label="Open user profile"
    onClick={() => setIsUserMenuOpen((open) => !open)}
  >
    <span className="user-avatar">
  <UserRound size={22} />
</span>
  </button>

  {isUserMenuOpen && (
    <div className="user-dropdown">
      <div className="profile-dropdown-info">
        <strong>
          {userRole === "admin" ? "Admin Panel" : "User Panel"}
        </strong>
        <small>Signed in</small>
        <p>{user?.email}</p>
      </div>

      <button
        type="button"
        onClick={logout}
        className="user-logout-button"
      >
        <LogOut size={17} />
        Logout
      </button>
    </div>
  )}
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
          <section className="visitor-section exhibitions-page">

            {/* AVAILABLE EXHIBITIONS FIRST */}
            <div className="exhibitions-heading">
              <div>
                <h2>Available Exhibitions</h2>
                <p>Select an exhibition to view its visitors.</p>
              </div>

              <span className="exhibition-count">
                {exhibitions.length} Exhibitions
              </span>
            </div>

            {exhibitions.length === 0 ? (
              <p>No exhibitions have been created yet.</p>
            ) : (
              <div className="exhibitions-grid">
                {exhibitions.map((exhibition) => {
                  const visitorCount = visitors.filter(
                    (visitor) => visitor.exhibition_id === exhibition.id
                  ).length;

                  return (
                    <div className="exhibition-card-wrapper" key={exhibition.id}>

                      <button
                        type="button"
                        className="exhibition-card-button"
                        onClick={() => {
                          setFilterExhibition(exhibition.id);
                          setSearch("");
                          setFilterCompany("");
                          setFilterState("");
                          setActiveTab("All Visitors");
                        }}
                      >
                        <div className="exhibition-card-top">
                          <span className="exhibition-card-icon">
                            <CalendarDays size={22} />
                          </span>

                          <span className="exhibition-card-arrow">
                            View Visitors →
                          </span>
                        </div>

                        <h3>{exhibition.exhibition_name}</h3>

                        <p className="exhibition-location">
                          {exhibition.location || "Location not specified"}
                        </p>

                        <div className="exhibition-card-footer">
                          <span>{exhibition.year}</span>
                          <span>
                            <Users size={15} />
                            {visitorCount} Visitors
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="exhibition-delete-button"
                        title="Delete exhibition"
                        aria-label={`Delete ${exhibition.exhibition_name}`}
                        onClick={() => deleteExhibition(exhibition)}
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>
                  );
                })}
              </div>
            )}

            {/* CREATE EXHIBITION BELOW */}
            <div className="create-exhibition-section">
              <div>
                <h2>Create New Exhibition</h2>
                <p>Add a new exhibition to your records.</p>
              </div>

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
            </div>

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
                onChange={(event) =>
                  setSelectedExhibition(event.target.value)
                }
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
                type="text"
                value={visitorForm.email}
                onChange={changeVisitorField}
                placeholder="Enter email address"
              />

              <label>Country</label>

              <input
                name="country"
                value={visitorForm.country}
                onChange={changeVisitorField}
              />

              <label>State / Union Territory</label>

              <select
                name="state_or_union_territory"
                value={visitorForm.state || visitorForm.union_territory}
                onChange={(event) => {
                  const selectedLocation = event.target.value;

                  const isUnionTerritory =
                    indianUnionTerritories.includes(selectedLocation);

                  setVisitorForm((current) => ({
                    ...current,
                    state: isUnionTerritory ? "" : selectedLocation,
                    union_territory: isUnionTerritory
                      ? selectedLocation
                      : "",
                  }));
                }}
              >
                <option value="">Select State / Union Territory</option>

                {Object.entries(indianStatesByRegion).map(([region, states]) => (
                  <optgroup label={region} key={region}>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </optgroup>
                ))}

                <optgroup label="Union Territories">
                  {indianUnionTerritories.map((territory) => (
                    <option key={territory} value={territory}>
                      {territory}
                    </option>
                  ))}
                </optgroup>
              </select>

              <h3>Products Interested In</h3>

              <div
                className="product-list"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;

                  const checkboxes = Array.from(
                    event.currentTarget.querySelectorAll(
                      'input[type="checkbox"]'
                    )
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

              <label>Additional Notes/Comments</label>

              <textarea
                name="requirements"
                rows="4"
                value={visitorForm.requirements}
                onChange={changeVisitorField}
              />

              <div className="visitor-checkbox-options">
                <label>
                  <input
                    type="checkbox"
                    name="visit_required"
                    checked={visitorForm.visit_required}
                    onChange={(event) =>
                      setVisitorForm((current) => ({
                        ...current,
                        visit_required: event.target.checked,
                      }))
                    }
                  />
                  Visit Required
                </label>

                <label>
                  <input
                    type="checkbox"
                    name="send_brochures"
                    checked={visitorForm.send_brochures}
                    onChange={(event) =>
                      setVisitorForm((current) => ({
                        ...current,
                        send_brochures: event.target.checked,
                      }))
                    }
                  />
                  Send Brochures
                </label>
              </div>

              {/* PREVIOUS / NEXT NAVIGATION */}
              {editingVisitor && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "15px",
                    margin: "15px 0",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => navigateEditVisitor(-1)}
                    disabled={editNavigationIndex === 0}
                  >
                    Previous
                  </button>

                  <span style={{ fontWeight: 600, color: "#555" }}>
                    Visitor {editNavigationIndex + 1} of{" "}
                    {editNavigationList.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => navigateEditVisitor(1)}
                    disabled={
                      editNavigationIndex >= editNavigationList.length - 1
                    }
                  >
                    Next
                  </button>
                </div>
              )}

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
           
<div className="visitor-toolbar">
  <div className="visitor-search toolbar-search">
    <Search size={19} />
    <input
      placeholder="Search by name, company, email or phone..."
      value={search}
      onChange={(event) => setSearch(event.target.value)}
    />
  </div>

  
<div className="visitor-filter-grid">

  {/* EXHIBITION SEARCH */}
  <label className="visitor-filter-field">
    <span><CalendarDays size={15} /> Exhibition</span>
    <input
      type="text"
      list="exhibition-options"
      placeholder="All Exhibitions"
      value={exhibitionFilterText}
      onChange={(event) => {
        const value = event.target.value;
        setExhibitionFilterText(value);

        const selected = exhibitions.find(
          (item) =>
            item.exhibition_name.toLowerCase() === value.trim().toLowerCase()
        );

        setFilterExhibition(selected ? selected.id : "");
      }}
    />
    <datalist id="exhibition-options">
      {exhibitions.map((item) => (
        <option key={item.id} value={item.exhibition_name} />
      ))}
    </datalist>
  </label>

  {/* COMPANY SEARCH */}
  <label className="visitor-filter-field">
    <span><Building2 size={15} /> Company</span>
    <input
      type="text"
      list="company-options"
      placeholder="All Companies"
      value={filterCompany}
      onChange={(event) => setFilterCompany(event.target.value)}
    />
    <datalist id="company-options">
      {[...new Set(visitors.map((v) => v.company).filter(Boolean))]
        .sort()
        .map((company) => (
          <option key={company} value={company} />
        ))}
    </datalist>
  </label>

  {/* STATE SEARCH */}
  <label className="visitor-filter-field">
    <span><MapPin size={15} /> State / UT</span>
    <input
      type="text"
      list="state-options"
      placeholder="All States"
      value={filterState}
      onChange={(event) => setFilterState(event.target.value)}
    />
    <datalist id="state-options">
      {[...new Set(visitors.map((v) => v.state).filter(Boolean))]
        .sort()
        .map((state) => (
          <option key={state} value={state} />
        ))}
    </datalist>
  </label>

  {/* SORT BY */}
  <label className="visitor-filter-field">
    <span><SlidersHorizontal size={15} /> Sort by</span>
    <select
      value={sortBy}
      onChange={(event) => setSortBy(event.target.value)}
    >
      <option value="created_at">Date Added</option>
      <option value="name">Visitor Name</option>
      <option value="company">Company</option>
      <option value="exhibition">Exhibition</option>
    </select>
  </label>

  {/* SORT DIRECTION */}
  <label className="visitor-filter-field">
    <span><ArrowDown size={15} /> Direction</span>
    <select
      value={sortOrder}
      onChange={(event) => setSortOrder(event.target.value)}
    >
      <option value="desc">Newest / Z–A</option>
      <option value="asc">Oldest / A–Z</option>
    </select>
  </label>

</div>

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

            {loading ? (
              <p>Loading follow-ups...</p>
            ) : error ? (
              <p>Database message: {error}</p>
            ) : (
              (() => {
                const followUpVisitors = filteredVisitors.filter(
                  (visitor) => visitor.follow_up_required
                );

                if (followUpVisitors.length === 0) {
                  return <p>No follow-ups required.</p>;
                }

                return (
                  <div className="table-scroll">
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>Visitor Name</th>
                          <th>Company</th>
                          <th>Phone</th>
                          <th>Exhibition</th>
                          <th>Follow-up Date</th>
                          <th>Follow-up Notes</th>
                        </tr>
                      </thead>

                      <tbody>
                        {followUpVisitors.map((visitor) => (
                          <tr key={visitor.id}>
                            <td className="crm-name-cell">
                              {visitor.name || "—"}
                            </td>

                            <td>{visitor.company || "—"}</td>

                            <td>{visitor.phone || "—"}</td>

                            <td>
                              {exhibitionName(visitor.exhibition_id)}
                            </td>

                            <td>
                             <input
  type="date"
  className="follow-up-date-input"
  defaultValue={visitor.follow_up_date || ""}
  onBlur={(event) => {
    const value = event.target.value;

    if (value !== (visitor.follow_up_date || "")) {
      updateVisitor(visitor.id, {
        follow_up_date: value || null,
      });
    }
  }}
/>
                            </td>

                            <td>
                              <textarea
                                className="follow-up-notes-input" 
                                defaultValue={visitor.follow_up_notes || ""}
                                placeholder="Enter follow-up notes..."
                                rows={2}
                                onBlur={(event) => {
                                  const value = event.target.value;

                                  if (value !== (visitor.follow_up_notes || "")) {
                                    updateVisitor(visitor.id, {
                                      follow_up_notes: value,
                                    });
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
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