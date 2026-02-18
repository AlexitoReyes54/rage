## Lead CRM Documentation


## 🚀 Getting Started

To run the CRM, ensure you have [Bun](https://bun.sh) installed, then execute:

```bash
bun run crm.ts

```

The CRM will be available at `http://localhost:3000`.

---

## 📋 Core Features

### 1. Adding Leads

There are two ways to get leads into your database:

#### **Individual Entry**

At the bottom of the page, locate the **"Add Individual Lead"** card.

* **Name:** The lead's full name (Required).
* **Phone/Email:** Contact details.
* **Instagram:** Enter the handle (e.g., `@johndoe`). The CRM will automatically generate a clickable link to their profile in the table.

#### **Bulk Import (CSV)**

To import a large list of leads at once:

1. Create a CSV file (using Excel, Google Sheets, or Notepad).
2. Ensure your CSV follows this specific column order **without headers** (or skip the first row):
`Name, Phone, Email, Instagram`
3. Click **"Choose File"** in the **Bulk Import** card and select your `.csv`.
4. Click **"Upload & Import"**.

---

### 2. Messaging Templates

Stop re-typing the same messages! Use the **Active Template** tool to speed up your workflow.

1. **Create a Template:** Enter a title (e.g., "Intro Message") and the content.
2. **Using Variables:** Use `{name}` in your content. The CRM will automatically replace this with the lead's actual name when you copy it.
* *Example:* `Hi {name}, I saw your profile and loved your content!`


3. **To Use:** Select your template from the dropdown menu, then click the **"Copy"** button next to any lead in the table. The personalized message is now in your clipboard, ready to paste.

---

### 3. Pipeline Management

The CRM uses a color-coded status system to track progress:

| Status | Color | Description |
| --- | --- | --- |
| **New** | Blue | Fresh lead, no contact yet. |
| **Contacted** | Yellow | Message sent. |
| **Interested** | Orange | Lead has replied or shown interest. |
| **Client** | Red | Deal closed! |

* **Manual Update:** Use the dropdown menu in the "Status" column to change a lead's state.
* **Quick Promote:** Click the **`>`** button to move a lead to the next logical step in the pipeline instantly.

---

### 4. Search and Filters

* **Filtering:** Click the status buttons (All, New, Contacted, etc.) at the top of the table to view only leads in that category.
* **Searching:** Use the search bar to find leads by **Name, Email, Phone, or Instagram handle**. The list updates in real-time as you type.

---

## 🛠 Troubleshooting

* **Instagram Links:** If you enter the handle without the `@` symbol, the CRM will still link correctly to `instagram.com/username`.
* **Database Reset:** If you need to clear all data, delete the `crm.db` file in your folder and restart the server.
* **Port Issues:** If port 3000 is taken, change the `const PORT = 3000;` line at the top of the script.
