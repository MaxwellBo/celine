function getEntryField(entry, field) {
  const atomNs = "http://www.w3.org/2005/Atom";
  const namespaced = entry.getElementsByTagNameNS(atomNs, field);
  if (namespaced.length > 0) return namespaced[0];
  const plain = entry.getElementsByTagName(field);
  return plain.length > 0 ? plain[0] : null;
}

function formatEntryDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderSummaryCell(summaryElement, changesCell) {
  if (!summaryElement) {
    changesCell.textContent = "";
    return;
  }

  const summaryText = (summaryElement.textContent ?? "").trim();
  const summaryType = (summaryElement.getAttribute("type") ?? "text").toLowerCase();

  if (summaryType === "html") {
    changesCell.innerHTML = summaryText;
    return;
  }

  changesCell.textContent = summaryText;
}

export async function renderChangelogTable({
  feedUrl,
  tableBodyId,
  limit = 10,
}) {
  const tableBody = document.getElementById(tableBodyId);
  if (!tableBody) return;

  try {
    const response = await fetch(feedUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, "application/xml");

    const atomNs = "http://www.w3.org/2005/Atom";
    const namespacedEntries = Array.from(xmlDoc.getElementsByTagNameNS(atomNs, "entry"));
    const plainEntries = Array.from(xmlDoc.getElementsByTagName("entry"));
    const entries = (namespacedEntries.length > 0 ? namespacedEntries : plainEntries).slice(0, limit);

    tableBody.replaceChildren();

    for (const entry of entries) {
      const version = getEntryField(entry, "title")?.textContent?.trim() ?? "";
      const link = getEntryField(entry, "link")?.getAttribute("href") ?? "";
      const summaryElement = getEntryField(entry, "summary");
      const updated = formatEntryDate(getEntryField(entry, "updated")?.textContent ?? "");

      const row = document.createElement("tr");

      const versionCell = document.createElement("td");
      if (link) {
        const anchor = document.createElement("a");
        anchor.href = link;
        anchor.textContent = version;
        versionCell.append(anchor);
      } else {
        versionCell.textContent = version;
      }

      const dateCell = document.createElement("td");
      dateCell.textContent = updated;

      const changesCell = document.createElement("td");
      renderSummaryCell(summaryElement, changesCell);

      row.append(versionCell, dateCell, changesCell);
      tableBody.append(row);
    }
  } catch (error) {
    console.error("Error loading changelog:", error);
  }
}
