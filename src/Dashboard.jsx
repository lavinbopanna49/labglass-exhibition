import { useState, useEffect, useRef } from "react";
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
  const tableScrollWrapperRef = useRef(null);
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
  const [companyDirectorySearch, setCompanyDirectorySearch] = useState("");
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
    startNewVisitor();
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
 
// START A COMPLETELY NEW VISITOR
function startNewVisitor() {
  setEditingVisitor(null);
  setVisitorForm(emptyVisitor);
  setEditNavigationList([]);
  setEditNavigationIndex(0);
  setActiveTab("New Visitor");
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
  !filterCompany ||
  (visitor.company || "").trim().toLowerCase() ===
    filterCompany.trim().toLowerCase();

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

// ADD THE SCROLL WIDTH EFFECT HERE
// KEEP TOP AND BOTTOM SCROLLBAR WIDTHS MATCHED
useEffect(() => {
  const wrapper = tableScrollWrapperRef.current;
  if (!wrapper) return;

  const top = wrapper.querySelector(".table-scroll-top");
  const bottom = wrapper.querySelector(".table-scroll");
  const table = wrapper.querySelector(".crm-table");
  const topInner = wrapper.querySelector(".table-scroll-top-inner");

  if (!top || !bottom || !table || !topInner) return;

  const updateWidth = () => {
  const maxScroll = bottom.scrollWidth - bottom.clientWidth;
  topInner.style.width = `${maxScroll + top.clientWidth}px`;
};

  updateWidth();

  const observer = new ResizeObserver(updateWidth);
  observer.observe(table);
  observer.observe(bottom);
  observer.observe(top);

  return () => observer.disconnect();
}, [activeTab, visitors.length, filteredVisitors.length]);

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
   <div
  className="table-scroll-wrapper"
  ref={tableScrollWrapperRef}
>

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

  if (item.name === "New Visitor") {
    startNewVisitor();
  } else {
    setActiveTab(item.name);
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
              <button
  type="button"
  className="stat-card analytics-link-card"
  onClick={() => setActiveTab("Visitor Analytics")}
>
  <p>Total Visitors</p>
  <h2>{visitors.length}</h2>
  <span>View visitor analytics →</span>
</button>

              <button
                type="button"
                className="stat-card analytics-link-card"
                onClick={() => setActiveTab("All Companies")}
              >
                <p>Companies</p>
                <h2>
                  {new Set(visitors.map((v) => (v.company || "").trim().toLowerCase()).filter(Boolean)).size}
                </h2>
                <span>View all companies →</span>
              </button>

              <button
                type="button"
                className="stat-card analytics-link-card"
                onClick={() => setActiveTab("Exhibitions")}
              >
                <p>Exhibitions</p>
                <h2>{exhibitions.length}</h2>
                <span>View exhibitions →</span>
              </button>

              <button
                type="button"
                className="stat-card analytics-link-card"
                onClick={() => setActiveTab("Product Interests")}
              >
                <p>Product Interests</p>
                <h2>
                  {visitors.reduce(
                    (total, v) => total + (v.interests || []).length,
                    0
                  )}
                </h2>
                <span>View product interests →</span>
              </button>
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
        {/* ALL COMPANIES */}
{activeTab === "All Companies" && (() => {
  const companyMap = new Map();

  visitors.forEach((visitor) => {
    const companyName = (visitor.company || "").trim();
    if (!companyName) return;

    const companyKey = companyName.toLowerCase();
    if (!companyMap.has(companyKey)) {
      companyMap.set(companyKey, {
        name: companyName,
        representatives: [],
        interests: new Set(),
        visitorCount: 0,
      });
    }

    const company = companyMap.get(companyKey);
    company.visitorCount += 1;

    const representativeName = (visitor.name || "").trim();
    const designation = (visitor.designation || "").trim();
    if (representativeName) {
      const representativeKey = `${representativeName.toLowerCase()}|${designation.toLowerCase()}`;
      if (!company.representatives.some((rep) => rep.key === representativeKey)) {
        company.representatives.push({
          key: representativeKey,
          name: representativeName,
          designation,
        });
      }
    }

    (visitor.interests || []).forEach((interest) => {
      if (interest) company.interests.add(interest);
    });
  });

  const companies = Array.from(companyMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const companySearchTerm = companyDirectorySearch.trim().toLowerCase();
  const filteredCompanies = companies.filter((company) => {
    if (!companySearchTerm) return true;
    const representativeText = company.representatives
      .map((rep) => `${rep.name} ${rep.designation}`)
      .join(" ");
    const interestsText = Array.from(company.interests).join(" ");
    return `${company.name} ${representativeText} ${interestsText}`
      .toLowerCase()
      .includes(companySearchTerm);
  });

  return (
    <section className="visitor-section analytics-page">
      <div className="analytics-heading">
        <div>
          <h2>All Companies</h2>
          <p>Companies, their representatives and the products they are interested in.</p>
        </div>
        <button type="button" onClick={() => setActiveTab("Overview")}>
          Back to Overview
        </button>
      </div>

      <div style={{ margin: "18px 0 14px", maxWidth: "340px", position: "relative" }}>
        <Search
          size={17}
          style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#7b8794", pointerEvents: "none" }}
        />
        <input
          type="search"
          value={companyDirectorySearch}
          onChange={(event) => setCompanyDirectorySearch(event.target.value)}
          placeholder="Search companies..."
          aria-label="Search companies, representatives or product interests"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", border: "1px solid #d7dee8", borderRadius: "8px", fontSize: "14px", outlineOffset: "2px" }}
        />
      </div>

      <div className="analytics-summary-grid">
        <div className="analytics-summary-card">
          <span>Total Companies</span>
          <strong>{companies.length}</strong>
        </div>
        <div className="analytics-summary-card">
          <span>Total Representatives</span>
          <strong>{companies.reduce((total, company) => total + company.representatives.length, 0)}</strong>
        </div>
        <div className="analytics-summary-card">
          <span>Visitors Recorded</span>
          <strong>{visitors.length}</strong>
        </div>
      </div>

      <div className="analytics-panel">
        {companies.length === 0 ? (
          <p>No companies have been recorded yet.</p>
        ) : filteredCompanies.length === 0 ? (
          <p>No companies match “{companyDirectorySearch}”.</p>
        ) : (
          <div className="company-directory-table-wrap" style={{ overflowX: "auto" }}>
            <table className="company-directory-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "14px" }}>Company</th>
                  <th style={{ textAlign: "left", padding: "14px" }}>Representatives</th>
                  <th style={{ textAlign: "left", padding: "14px" }}>Product Interests</th>
                  <th style={{ textAlign: "center", padding: "14px" }}>Visitors</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company.name.toLowerCase()}>
                    <td style={{ padding: "14px", verticalAlign: "top" }}>
                      <button
                        type="button"
                        className="company-name-link"
                        style={{ border: "none", padding: 0, background: "transparent", color: "#2563a8", font: "inherit", fontWeight: 600, textAlign: "left", cursor: "pointer" }}
                        onClick={() => {
                          setFilterCompany(company.name);
                          setFilterExhibition("");
                          setFilterState("");
                          setSearch("");
                          setActiveTab("All Visitors");
                        }}
                      >
                        {company.name}
                      </button>
                    </td>
                    <td style={{ padding: "14px", verticalAlign: "top" }}>
                      {company.representatives.length === 0 ? "—" : company.representatives.map((rep) => (
                        <div key={rep.key} style={{ marginBottom: "10px" }}>
                          <strong>{rep.name}</strong>
                          {rep.designation && <div style={{ fontSize: "0.88em", opacity: 0.72, marginTop: "2px" }}>{rep.designation}</div>}
                        </div>
                      ))}
                    </td>
                    <td style={{ padding: "14px", verticalAlign: "top" }}>
                      {company.interests.size ? Array.from(company.interests).join(", ") : "—"}
                    </td>
                    <td style={{ padding: "14px", textAlign: "center", verticalAlign: "top" }}>
                      {company.visitorCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
})()}

        {/* VISITOR ANALYTICS */}
{activeTab === "Visitor Analytics" && (() => {
  const totalVisitors = visitors.length;

  const uniqueCompanies = new Set(
    visitors.map((visitor) => visitor.company?.trim()).filter(Boolean)
  ).size;

  const visitorsWithOrders = visitors.filter(
    (visitor) => visitor.order_placed === true
  );

  const ordersWithValue = visitorsWithOrders.filter(
    (visitor) =>
      visitor.order_value !== null &&
      visitor.order_value !== undefined &&
      visitor.order_value !== "" &&
      Number.isFinite(Number(visitor.order_value))
  );

  const recordedOrderValue = ordersWithValue.reduce(
    (total, visitor) => total + Number(visitor.order_value),
    0
  );

  const stateCounts = {};

  visitors.forEach((visitor) => {
    const stateName = visitor.state || visitor.union_territory;

    if (stateName) {
      stateCounts[stateName] = (stateCounts[stateName] || 0) + 1;
    }
  });

  const popularStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1]);

  const monthlyVisitors = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - i);

    const month = date.getMonth();
    const year = date.getFullYear();

    const count = visitors.filter((visitor) => {
      if (!visitor.created_at) return false;

      const visitorDate = new Date(visitor.created_at);

      return (
        visitorDate.getMonth() === month &&
        visitorDate.getFullYear() === year
      );
    }).length;

    monthlyVisitors.push({
      label: date.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
      count,
    });
  }

  const highestMonthlyCount = Math.max(
    1,
    ...monthlyVisitors.map((month) => month.count)
  );

  return (
    <section className="visitor-section analytics-page">
      <div className="analytics-heading">
        <div>
          <h2>Visitor Analytics</h2>
          <p>Understand visitor activity, product interest and order performance.</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("Overview")}
        >
          Back to Overview
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="analytics-summary-grid">
        <div className="analytics-summary-card">
          <span>Total Visitors</span>
          <strong>{totalVisitors}</strong>
        </div>

        <div className="analytics-summary-card">
          <span>Unique Companies</span>
          <strong>{uniqueCompanies}</strong>
        </div>

        <div className="analytics-summary-card">
          <span>Orders Placed</span>
          <strong>{visitorsWithOrders.length}</strong>
        </div>

        <div className="analytics-summary-card">
          <span>Recorded Order Value</span>
          <strong>
            {recordedOrderValue.toLocaleString("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 2,
            })}
          </strong>
          <small>
            {ordersWithValue.length} of {visitorsWithOrders.length} orders have a value entered
          </small>
        </div>
      </div>

      {/* MONTHLY VISITOR TREND */}
      <div className="analytics-panel">
        <h3>Visitor Registration Trend</h3>
        <p>Visitors registered in each of the last six months.</p>

        <div className="analytics-monthly-chart">
          {monthlyVisitors.map((month) => (
            <div className="analytics-month-column" key={month.label}>
              <strong>{month.count}</strong>

              <div className="analytics-month-bar-area">
                <div
                  className="analytics-month-bar"
                  style={{
                    height: `${(month.count / highestMonthlyCount) * 100}%`,
                  }}
                />
              </div>

              <span>{month.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* STATE-WISE VISITORS */}
      <div className="analytics-panel">
          <h3>Visitors by State / Union Territory</h3>
          <p>Where your visitors are coming from.</p>

          {popularStates.length === 0 ? (
            <p>No state information available yet.</p>
          ) : (
            <div className="analytics-ranking-list">
              {popularStates.map(([stateName, count]) => (
                <div className="analytics-ranking-item" key={stateName}>
                  <div className="analytics-ranking-label">
                    <span>{stateName}</span>
                    <strong>{count}</strong>
                  </div>

                  <div className="analytics-ranking-track">
                    <div
                      className="analytics-ranking-fill state-ranking-fill"
                      style={{
                        width: `${(count / popularStates[0][1]) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* ORDER ANALYSIS */}
      <div className="analytics-panel">
        <h3>Order Analysis</h3>
        <p>Order information recorded in your visitor database.</p>

        <div className="analytics-order-grid">
          <div>
            <span>Orders placed</span>
            <strong>{visitorsWithOrders.length}</strong>
          </div>

          <div>
            <span>Orders with value entered</span>
            <strong>{ordersWithValue.length}</strong>
          </div>

          <div>
            <span>Orders without value</span>
            <strong>{visitorsWithOrders.length - ordersWithValue.length}</strong>
          </div>

          <div>
            <span>Recorded order value</span>
            <strong>
              ₹{recordedOrderValue.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
})()}

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



        {/* PRODUCT INTERESTS PAGE */}
        {activeTab === "Product Interests" && (
          <section className="visitor-section">
            <div className="visitor-heading">
              <div>
                <h2>Product Interests & Additional Requirements</h2>
                <p>View product preferences and requirements recorded from all exhibition visitors.</p>
              </div>
              <button type="button" onClick={() => setActiveTab("Overview")}>Back to Overview</button>
            </div>

            <div className="analytics-panel all-visitors-data-panel">
              <h3>Product Interests</h3>
              <p>Products selected by visitors across all exhibitions.</p>
              {(() => {
                const productCounts = {};
                visitors.forEach((visitor) => {
                  (visitor.interests || []).forEach((product) => {
                    const productName = String(product || "").trim();
                    if (productName) productCounts[productName] = (productCounts[productName] || 0) + 1;
                  });
                });
                const productRows = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
                return productRows.length === 0 ? (
                  <p>No product interest data available yet.</p>
                ) : (
                  <div className="table-scroll">
                    <table className="crm-table analytics-data-table">
                      <thead><tr><th>Product</th><th>Number of Visitors</th></tr></thead>
                      <tbody>
                        {productRows.map(([product, count]) => (
                          <tr key={product}><td>{product}</td><td>{count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="analytics-panel all-visitors-data-panel">
              <h3>Additional Requirements</h3>
              <p>Requirements recorded for visitors across all exhibitions.</p>
              {(() => {
                const requirementRows = visitors.filter(
                  (visitor) => String(visitor.requirements || "").trim()
                );
                return requirementRows.length === 0 ? (
                  <p>No additional requirements recorded yet.</p>
                ) : (
                  <div className="table-scroll">
                    <table className="crm-table analytics-data-table">
                      <thead><tr><th>Visitor Name</th><th>Company</th><th>Additional Requirement</th></tr></thead>
                      <tbody>
                        {requirementRows.map((visitor) => (
                          <tr key={visitor.id}>
                            <td>{visitor.name || "—"}</td>
                            <td>{visitor.company || "—"}</td>
                            <td className="crm-notes-cell">{visitor.requirements}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
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
    <th>Visit Required</th>
    <th>Brochure Sent</th>
    <th>Order Placed</th>
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
                            {/* Visit Required */}
<td>
  <label className="crm-inline-control">
    <input
      type="checkbox"
      checked={visitor.visit_required || false}
      onChange={(event) =>
        updateVisitor(visitor.id, {
          visit_required: event.target.checked,
        })
      }
    />
    {visitor.visit_required ? "Yes" : "No"}
  </label>
</td>

{/* Brochure Sent */}
<td>
  <label className="crm-inline-control">
    <input
      type="checkbox"
      checked={visitor.send_brochures || false}
      onChange={(event) =>
        updateVisitor(visitor.id, {
          send_brochures: event.target.checked,
        })
      }
    />
    {visitor.send_brochures ? "Yes" : "No"}
  </label>
</td>

{/* Order Placed */}
<td>
  <label className="crm-inline-control">
    <input
      type="checkbox"
      checked={visitor.order_placed || false}
      onChange={(event) =>
        updateVisitor(visitor.id, {
          order_placed: event.target.checked,
        })
      }
    />
    {visitor.order_placed ? "Yes" : "No"}
  </label>
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
           ) : !visitors.some((visitor) => visitor.order_placed === true) ? (
              <p>No visitor records found.</p>
            ) : (
              <div className="visitor-list">
                {visitors
  .filter((visitor) => visitor.order_placed === true)
  .map((visitor) => (
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

<h4>Order Value (Optional)</h4>

<div className="order-value-field">
  <span>₹</span>
  <input
    type="number"
    min="0"
    step="0.01"
    placeholder="Enter order value"
    defaultValue={visitor.order_value ?? ""}
    onBlur={(event) => {
      const value = event.target.value;
      const newValue = value === "" ? null : Number(value);

      if (newValue !== visitor.order_value) {
        updateVisitor(visitor.id, {
          order_value: newValue,
        });
      }
    }}
  />
</div>

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