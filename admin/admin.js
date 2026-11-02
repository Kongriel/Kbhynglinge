const db = window.supabase.createClient(
  window.APP_CONFIG.SUPABASE_URL,
  window.APP_CONFIG.SUPABASE_PUBLISHABLE_KEY
);
const $ = id => document.getElementById(id);
let responses = [];
let filtered = [];

const roleLabels = {
  instructor: "Instruktør",
  gymnast: "Gymnast på hold",
  board: "Bestyrelsesmedlem",
  dgi_committee: "Medlem af DGI-udvalg",
  want_gymnast: "Ønsker gymnastikhold",
  want_instructor: "Ønsker at være instruktør",
  want_dgi_committee: "Ønsker DGI-udvalg"
};
const text = value => String(value ?? "");
const escapeHtml = value => text(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const yesNo = value => value ? "Ja" : "Nej";
const dateText = value => new Date(value).toLocaleString("da-DK", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
const roleText = row => [...(row.active_roles || []), ...(row.desired_roles || [])].map(x => roleLabels[x] || x).join(", ") || "–";

function showLogin(message = "") {
  $("loginView").hidden = false;
  $("dashboardView").hidden = true;
  $("loginError").hidden = !message;
  $("loginError").textContent = message;
}
function showDashboard() {
  $("loginView").hidden = true;
  $("dashboardView").hidden = false;
}
async function checkAdmin() {
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return false;
  const result = await db.from("ynglinge_admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (result.error) throw result.error;
  return Boolean(result.data);
}
async function start() {
  try {
    if (!(await checkAdmin())) return showLogin();
    showDashboard();
    await loadResponses();
  } catch (error) {
    console.error(error);
    showLogin("Kunne ikke kontrollere adminadgang. Tjek opsætningen.");
  }
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("loginError").hidden = true;
  $("loginBtn").disabled = true;
  try {
    const { error } = await db.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    if (error) throw error;
    if (!(await checkAdmin())) {
      await db.auth.signOut();
      return showLogin("Din bruger har ikke adgang til dette adminpanel.");
    }
    showDashboard();
    await loadResponses();
  } catch (error) {
    console.error(error);
    showLogin("Login mislykkedes. Tjek e-mail, adgangskode og adminrettigheder.");
  } finally {
    $("loginBtn").disabled = false;
  }
});

$("logoutBtn").addEventListener("click", async () => {
  await db.auth.signOut();
  responses = [];
  showLogin();
});
$("refreshBtn").addEventListener("click", loadResponses);
["searchInput", "activeFilter", "roleFilter", "mediaFilter", "aspirantFilter"].forEach(id => {
  $(id).addEventListener(id === "searchInput" ? "input" : "change", applyFilters);
});

async function loadResponses() {
  $("dashboardError").hidden = true;
  $("refreshBtn").disabled = true;
  try {
    const all = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await db.from("ynglinge_activity_responses")
        .select("id,created_at,name,age,is_active,active_roles,association_name,desired_roles,media_consent,aspirant_vejle")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      all.push(...data);
      if (data.length < pageSize) break;
    }
    responses = all;
    $("statTotal").textContent = all.length;
    $("statActive").textContent = all.filter(row => row.is_active).length;
    $("statInactive").textContent = all.filter(row => !row.is_active).length;
    $("statAspirant").textContent = all.filter(row => row.aspirant_vejle).length;
    applyFilters();
  } catch (error) {
    console.error(error);
    $("dashboardError").textContent = "Kunne ikke hente besvarelser. Tjek din adminadgang og Supabase-politikkerne.";
    $("dashboardError").hidden = false;
  } finally {
    $("refreshBtn").disabled = false;
  }
}
function matchesBoolean(value, filter) {
  return filter === "all" || value === (filter === "yes");
}
function applyFilters() {
  const search = $("searchInput").value.trim().toLocaleLowerCase("da-DK");
  const active = $("activeFilter").value;
  const role = $("roleFilter").value;
  const media = $("mediaFilter").value;
  const aspirant = $("aspirantFilter").value;
  filtered = responses.filter(row => {
    const searchable = [row.name, row.age, row.association_name, roleText(row)].join(" ").toLocaleLowerCase("da-DK");
    const roles = [...(row.active_roles || []), ...(row.desired_roles || [])];
    return searchable.includes(search) && matchesBoolean(row.is_active, active)
      && (role === "all" || roles.includes(role))
      && matchesBoolean(row.media_consent, media)
      && matchesBoolean(row.aspirant_vejle, aspirant);
  });
  $("resultCount").textContent = `Viser ${filtered.length} af ${responses.length} besvarelser`;
  $("emptyState").hidden = filtered.length !== 0;
  $("tableBody").innerHTML = filtered.map(row => `
    <tr><td>${escapeHtml(dateText(row.created_at))}</td><td>${escapeHtml(row.name)}</td>
    <td>${row.age}</td><td><span class="pill ${row.is_active ? "" : "no"}">${yesNo(row.is_active)}</span></td>
    <td>${escapeHtml(roleText(row))}</td><td>${escapeHtml(row.association_name || "–")}</td>
    <td>${yesNo(row.media_consent)}</td><td>${yesNo(row.aspirant_vejle)}</td></tr>`).join("");
  $("mobileCards").innerHTML = filtered.map(row => `
    <article class="response-card"><h3>${escapeHtml(row.name)}</h3><small>${escapeHtml(dateText(row.created_at))} · ${row.age} år</small>
    <dl><div><dt>Foreningsaktiv</dt><dd>${yesNo(row.is_active)}</dd></div>
    <div><dt>Aktivitet / ønske</dt><dd>${escapeHtml(roleText(row))}</dd></div>
    <div><dt>Forening</dt><dd>${escapeHtml(row.association_name || "–")}</dd></div>
    <div><dt>Billeder / video</dt><dd>${yesNo(row.media_consent)}</dd></div>
    <div><dt>Aspirantstævne</dt><dd>${yesNo(row.aspirant_vejle)}</dd></div></dl></article>`).join("");
}

$("exportBtn").addEventListener("click", () => {
  if (!filtered.length) return alert("Der er ingen besvarelser at eksportere.");
  const headers = ["Modtaget", "Navn", "Alder", "Foreningsaktiv", "Aktivitet / ønske", "Forening", "Billeder / video", "Aspirantstævne"];
  const csvSafe = value => {
    let str = text(value);
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(str)) str = "'" + str;
    return '"' + str.replace(/"/g, '""') + '"';
  };
  const rows = filtered.map(row => [dateText(row.created_at), row.name, row.age, yesNo(row.is_active), roleText(row), row.association_name || "", yesNo(row.media_consent), yesNo(row.aspirant_vejle)]);
  const csv = "\uFEFF" + [headers, ...rows].map(cells => cells.map(csvSafe).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `kbh-ynglinge-svar-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

start();
