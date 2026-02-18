import { Database } from "bun:sqlite";
const db = new Database('crm.db');

// --- DATABASE SETUP ---
// Added 'instagram TEXT' to the leads table
db.run(`CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT, instagram TEXT, status TEXT DEFAULT 'New')`);
db.run(`CREATE TABLE IF NOT EXISTS templates (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT)`);

const STATUS_ORDER = ['New', 'Contacted', 'Interested', 'Client'];
const PORT = 3000;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "POST") {
      const data = await req.formData();
      
      // AJAX: Update Status
      if (url.pathname === "/update-status") {
        db.prepare("UPDATE leads SET status = ? WHERE id = ?").run(data.get("status"), data.get("id"));
        return Response.json({ success: true, newStatus: data.get("status") });
      }

      // AJAX: Promote Status
      if (url.pathname === "/promote") {
        const current = data.get("current")?.toString() || "New";
        const currentIndex = STATUS_ORDER.indexOf(current);
        const nextStatus = STATUS_ORDER[Math.min(currentIndex + 1, STATUS_ORDER.length - 1)];
        db.prepare("UPDATE leads SET status = ? WHERE id = ?").run(nextStatus, data.get("id"));
        return Response.json({ success: true, nextStatus });
      }

      // Page Refresh Actions: Add Lead / Template / Bulk
      if (url.pathname === "/add") {
        // Updated to include instagram
        db.prepare("INSERT INTO leads (name, phone, email, instagram, status) VALUES (?, ?, ?, ?, 'New')")
          .run(data.get("name"), data.get("phone"), data.get("email"), data.get("instagram"));
      } 
      else if (url.pathname === "/bulk-import") {
        const file = data.get("csvfile") as File;
        if (file) {
          const text = await file.text();
          const rows = text.split("\n").slice(1);
          // Updated insert statement for bulk
          const insert = db.prepare("INSERT INTO leads (name, phone, email, instagram, status) VALUES (?, ?, ?, ?, 'New')");
          db.transaction(() => {
            for (const row of rows) {
              const [name, phone, email, instagram] = row.split(",").map(item => item?.trim());
              if (name) insert.run(name, phone, email, instagram);
            }
          })();
        }
      }
      else if (url.pathname === "/add-template") {
        db.prepare("INSERT INTO templates (title, content) VALUES (?, ?)")
          .run(data.get("title"), data.get("content"));
      }

      return new Response(null, { status: 302, headers: { Location: "/" } });
    }

    const leads: any = db.query("SELECT * FROM leads").all();
    const templates: any = db.query("SELECT * FROM templates").all();
    
    // Updated rows to include Instagram column and search metadata
    const rows = leads.map((lead: any) => `
        <tr id="lead-${lead.id}" class="lead-row status-${lead.status.toLowerCase()}" data-status="${lead.status}" data-search="${(lead.name + lead.phone + lead.email + (lead.instagram || '')).toLowerCase()}">
          <td>${lead.id}</td>
          <td><strong>${lead.name}</strong></td>
          <td>${lead.phone || '-'}</td>
          <td>${lead.email || '-'}</td>
          <td>${lead.instagram ? `<a href="https://instagram.com/${lead.instagram.replace('@','')}" target="_blank">@${lead.instagram.replace('@','')}</a>` : '-'}</td>
          <td>
            <div style="display:flex; gap:5px; align-items:center;">
              <select onchange="ajaxUpdateStatus(${lead.id}, this.value)">
                ${STATUS_ORDER.map(s => `<option value="${s}" ${lead.status === s ? 'selected' : ''}>${s}</option>`).join("")}
              </select>
              <button class="btn-promote" onclick="ajaxPromote(${lead.id}, '${lead.status}')"> > </button>
            </div>
          </td>
          <td><button class="btn-copy" onclick="handleCopy('${lead.name.replace(/'/g, "\\'")}')">Copy</button></td>
        </tr>`).join("");

    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          :root { --new: #e3f2fd; --contacted: #fff9c4; --interested: #ffcc80; --client: #ffab91; }
          body { font-family: system-ui; background: #f4f7f6; padding: 20px; }
          .container { max-width: 1200px; margin: auto; }
          .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 20px; }
          .status-new { background-color: var(--new); }
          .status-contacted { background-color: var(--contacted); }
          .status-interested { background-color: var(--interested); }
          .status-client { background-color: var(--client); }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #2d3436; color: white; }
          .btn-add { background: #00b894; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
          .btn-promote { background: #2d3436; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
          .btn-copy { background: #6c5ce7; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
          input, select { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .filter-btn { padding: 6px 12px; border: 1px solid #ddd; background: white; cursor: pointer; border-radius: 4px; }
          .filter-btn.active { background: #2d3436; color: white; }
          a { color: #e1306c; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Lead CRM</h2>

          <div class="card">
            <strong>Bulk Import (CSV)</strong>
            <p style="font-size: 0.8em; color: #666;">Format: name, phone, email, instagram</p>
            <form method="POST" action="/bulk-import" enctype="multipart/form-data" style="display:flex; gap:10px; margin-top:10px;">
              <input type="file" name="csvfile" accept=".csv" required>
              <button class="btn-add">Upload & Import</button>
            </form>
          </div>

          <div class="card">
            <strong>Active Template</strong>
            <select id="templateSelector" style="width: 100%; margin: 10px 0;">
              <option value="">-- Choose Template --</option>
              ${templates.map((t: any) => `<option value="${t.id}">${t.title}</option>`).join("")}
            </select>
            <form method="POST" action="/add-template" style="display:flex; gap:5px;">
              <input name="title" placeholder="Title" required>
              <input name="content" placeholder="Content... {name}" style="flex-grow:1" required>
              <button class="btn-add">Save Template</button>
            </form>
          </div>

          <div class="card">
            <strong>Add Individual Lead</strong>
            <form method="POST" action="/add" style="display:flex; gap:10px; margin-top:10px;">
              <input name="name" placeholder="Name" required>
              <input name="phone" placeholder="Phone">
              <input name="email" placeholder="Email">
              <input name="instagram" placeholder="Instagram (e.g. @user)">
              <button class="btn-add">Add</button>
            </form>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="display:flex; gap:5px;">
              <button class="filter-btn active" onclick="updateView('all', this)">All</button>
              ${STATUS_ORDER.map(s => `<button class="filter-btn" onclick="updateView('${s}', this)">${s}</button>`).join("")}
            </div>
            <input type="text" id="searchInput" placeholder="Search..." onkeyup="updateView()" style="width: 250px; border-radius: 20px;">
          </div>

          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Instagram</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <script>
          const TEMPLATES_DATA = ${JSON.stringify(templates.reduce((acc: any, t: any) => ({...acc, [t.id]: t.content}), {}))};
          let currentFilter = 'all';

          async function ajaxUpdateStatus(id, newStatus) {
            const body = new FormData();
            body.append('id', id);
            body.append('status', newStatus);
            await fetch('/update-status', { method: 'POST', body });
            updateRowStyle(id, newStatus);
          }

          async function ajaxPromote(id, currentStatus) {
            const row = document.querySelector('#lead-' + id);
            const actualStatus = row.getAttribute('data-status');
            const body = new FormData();
            body.append('id', id);
            body.append('current', actualStatus);
            const res = await fetch('/promote', { method: 'POST', body });
            const result = await res.json();
            if (result.success) {
              updateRowStyle(id, result.nextStatus);
              row.querySelector('select').value = result.nextStatus;
            }
          }

          function updateRowStyle(id, status) {
            const row = document.querySelector('#lead-' + id);
            row.className = 'lead-row status-' + status.toLowerCase();
            row.setAttribute('data-status', status);
            updateView();
          }

          function updateView(status, btn) {
            if (status) {
              currentFilter = status;
              document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
            }
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            document.querySelectorAll('.lead-row').forEach(row => {
              const matchesFilter = (currentFilter === 'all' || row.getAttribute('data-status') === currentFilter);
              const matchesSearch = row.getAttribute('data-search').includes(searchTerm);
              row.style.display = (matchesFilter && matchesSearch) ? '' : 'none';
            });
          }

          function handleCopy(clientName) {
            const templateId = document.getElementById('templateSelector').value;
            if (!templateId) return alert("Select a template!");
            const text = TEMPLATES_DATA[templateId].replace(/{name}/g, clientName);
            navigator.clipboard.writeText(text);
          }
        </script>
      </body>
      </html>
    `, { headers: { "Content-Type": "text/html" } });
  },
});

console.log('Working on port ' + PORT);
