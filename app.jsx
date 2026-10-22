const { useEffect, useRef, useState } = React;

const defaultTrainingExamples = [
  ["dela Cruz, Maria Clara S.", "dela Cruz", "Maria Clara", "S."],
  ["Roxas, Juan Carlos R.", "Roxas", "Juan Carlos", "R."],
  ["delos Santos, Mark Anthony D.", "delos Santos", "Mark Anthony", "D."],
  ["San Jose, Angela Mae V.", "San Jose", "Angela Mae", "V."],
  ["de Castro Jr., Jhoanna Marie E.", "de Castro Jr.", "Jhoanna Marie", "E."]
];

const mockupTrainingExamples = [
  ["SANTOS, LIA MARIE", "SANTOS", "LIA MARIE", ""],
  ["REYES, MARCO LUIS", "REYES", "MARCO", "LUIS"],
  ["DELA CRUZ, ANA JOY", "DELA CRUZ", "ANA JOY", ""]
];

const compoundPrefixes = ["de la", "dela", "de los", "delos", "del", "de", "san", "santa", "van", "von"];
const suffixes = ["jr", "jr.", "sr", "sr.", "i", "ii", "iii", "iv", "v"];

function clean(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function headerKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function nameKey(value) {
  return clean(value).toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
}

function nameTokens(value) {
  return clean(value).replace(/,/g, " ").split(" ").filter(Boolean);
}

function preserveNameTokens(source, parts) {
  const available = new Map();
  for (const token of nameTokens(source)) {
    const key = nameKey(token);
    available.set(key, (available.get(key) || 0) + 1);
  }
  for (const part of parts) {
    for (const token of nameTokens(part)) {
      const key = nameKey(token);
      const remaining = available.get(key) || 0;
      if (remaining > 0) available.set(key, remaining - 1);
    }
  }
  const missing = [];
  for (const token of nameTokens(source)) {
    const key = nameKey(token);
    const remaining = available.get(key) || 0;
    if (remaining > 0) {
      missing.push(token);
      available.set(key, remaining - 1);
    }
  }
  return missing;
}

function formatNameParts(last, first, middle, suffix) {
  return [last, first].filter(Boolean).join(", ") + (middle ? ` ${middle}` : "") + (suffix ? ` ${suffix}` : "");
}

function membershipFeeValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  const text = clean(value);
  if (!text) return "";
  const normalized = text.replace(/[₱$,\s]/g, "");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : text;
}

function findColumn(headers, candidates) {
  const keys = headers.map(headerKey);
  for (const candidate of candidates) {
    const index = keys.indexOf(headerKey(candidate));
    if (index >= 0) return headers[index];
  }
  return null;
}

function titleCase(value) {
  return clean(value).toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
}

function splitSuffix(value) {
  const words = clean(value).split(" ").filter(Boolean);
  const suffixIndex = words.findIndex(word => suffixes.includes(word.toLowerCase()));
  if (suffixIndex < 0) return { value: clean(value), suffix: "" };
  const suffix = words[suffixIndex].replace(/\.$/, "").toUpperCase() + ".";
  return {
    value: words.filter((_, index) => index !== suffixIndex).join(" "),
    suffix
  };
}

function parseFullName(value) {
  const original = clean(value);
  if (!original) return { first: "", middle: "", last: "", original: "" };

  let last = "";
  let given = original;
  if (original.includes(",")) {
    const parts = original.split(",");
    last = clean(parts.shift());
    given = clean(parts.join(","));
  } else {
    const words = original.split(" ");
    last = words.pop() || "";
    given = words.join(" ");
  }

  const firstWithoutSuffix = splitSuffix(given);
  given = firstWithoutSuffix.value;
  const lastWithoutSuffix = splitSuffix(last);
  last = lastWithoutSuffix.value;
  const suffix = firstWithoutSuffix.suffix || lastWithoutSuffix.suffix;

  const givenParts = given.split(" ").filter(Boolean);
  const middle = givenParts.length > 1 && /^[A-Za-z]\.?$/.test(givenParts.at(-1))
    ? givenParts.pop()
    : "";
  return { first: givenParts.join(" "), middle, last, suffix, original };
}

function splitGivenName(given, trainingData) {
  const value = clean(given);
  const normalized = nameKey(value);
  const learnedFirstNames = trainingData
    .map(item => clean(item.first_name))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  const learnedMatch = learnedFirstNames.find(first => {
    const firstKey = nameKey(first);
    return normalized === firstKey || normalized.startsWith(`${firstKey} `);
  });

  if (learnedMatch) {
    const remainder = value.slice(learnedMatch.length).trim();
    return { first: learnedMatch, middle: remainder };
  }

  const parts = value.split(" ").filter(Boolean);
  if (parts.length > 1) {
    return { first: parts.slice(0, -1).join(" "), middle: parts.at(-1) };
  }
  return { first: value, middle: "" };
}

function formatRow(row, headers, trainingData) {
  const payorNameColumn = findColumn(headers, ["Payor Name", "Payor Full Name"]);
  const firstColumn = findColumn(headers, ["First Name", "Member First Name", "Payor First Name", "firstname"]);
  const middleColumn = findColumn(headers, ["Middle Name", "Member Middle Name", "Payor Middle Name", "middlename"]);
  const lastColumn = findColumn(headers, ["Last Name", "Member Last Name", "Payor Last Name", "lastname"]);
  const fullColumn = payorNameColumn || findColumn(headers, ["Full Name", "Full name seen in document", "Name", "Employee Name"]);

  let first = firstColumn ? clean(row[firstColumn]) : "";
  let middle = middleColumn ? clean(row[middleColumn]) : "";
  let last = lastColumn ? clean(row[lastColumn]) : "";
  let suffix = clean(row[findColumn(headers, ["Suffix", "Payor Suffix", "Member Suffix"])]);
  const source = fullColumn ? clean(row[fullColumn]) : [last, first, middle].filter(Boolean).join(", ");
  const learned = trainingData.find(item => nameKey(item.payor_name || item.full_name) === nameKey(source));
  const parsedSource = fullColumn ? parseFullName(source) : null;

  if (learned) {
    first = clean(learned.first_name);
    middle = clean(learned.middle_name);
    last = clean(learned.last_name);
    suffix = suffix || parsedSource.suffix;
  } else if ((!first || !last) && fullColumn) {
    const given = splitGivenName(parsedSource.first, trainingData);
    first = first || given.first;
    middle = middle || given.middle || parsedSource.middle;
    last = last || parsedSource.last;
    suffix = suffix || parsedSource.suffix;
  }

  const normalizedFirst = splitSuffix(first);
  first = normalizedFirst.value;
  suffix = suffix || normalizedFirst.suffix;
  if (fullColumn) {
    const missing = preserveNameTokens(source, [last, first, middle, suffix]);
    if (missing.length) middle = [middle, ...missing].filter(Boolean).join(" ");
  }
  const formatted = formatNameParts(last, first, middle, suffix);
  return { source, first, middle, last, suffix, formatted };
}

function readWorkbook(file, trainingData, onComplete, onError) {
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const workbook = XLSX.read(event.target.result, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames.find(name => !/guide|read me/i.test(name)) || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      if (!rows.length) throw new Error("The selected sheet does not contain any data rows.");
      const headers = Object.keys(rows[0]);
      const formatted = rows.map((row, index) => ({ id: index + 1, ...formatRow(row, headers, trainingData), raw: row }));
      onComplete({ file, sheetName, headers, rows: formatted, originalRows: formatted });
    } catch (error) {
      onError(error.message || "Unable to read this workbook.");
    }
  };
  reader.onerror = () => onError("Unable to read the selected file.");
  reader.readAsArrayBuffer(file);
}

function downloadFileName(originalFileName) {
  const fallback = "formatted-names.xlsx";
  if (!originalFileName) return fallback;

  const extensionIndex = originalFileName.lastIndexOf(".");
  const baseName = extensionIndex > 0 ? originalFileName.slice(0, extensionIndex) : originalFileName;
  const cleanedBaseName = baseName.split("-")[0].replace(/\b\d+\b/g, "").replace(/\s+/g, " ").trim();
  return `${cleanedBaseName || "formatted-names"}.xlsx`;
}

function downloadWorkbook(rows, originalFileName, companyDeployment, agent) {
  const output = rows.map(row => {
    const source = row.raw || {};
    const value = (...names) => {
      const column = findColumn(Object.keys(source), names);
      return column ? source[column] : "";
    };
    return {
      "Company / Deployment": clean(companyDeployment) || value("Company / Deployment", "Company", "Deployment"),
      "Payor First Name": row.first,
      "Payor Middle Name": row.middle,
      "Payor Last Name": row.last,
      "Payor Suffix": row.suffix,
      "Member First Name": value("Member First Name"),
      "Member Middle Name": value("Member Middle Name"),
      "Member Last Name": value("Member Last Name"),
      "Member Suffix": value("Member Suffix"),
      "Birth Date": value("Birth Date", "Birthday", "Date of Birth"),
      "Sex": value("Sex"),
      "Civil Status": value("Civil Status"),
      "Contact Number": value("Contact Number", "Contact", "Phone", "Mobile"),
      "Relation To Payor": value("Relation To Payor", "Relationship"),
      "Occupation": value("Occupation"),
      "Employee Number": value("Employee Number", "Employee No."),
      "Email Address": value("Email Address", "Email"),
      "Premium": membershipFeeValue(value("Premium", "Membership Fee", "Membership Fee (₱)")),
      "AGENT": clean(agent) || value("AGENT", "Agent"),
    };
  });
  const sheet = XLSX.utils.json_to_sheet(output);
  const lastColumn = XLSX.utils.encode_col(Object.keys(output[0]).length - 1);
  const lastRow = output.length + 1;
  sheet["!autofilter"] = { ref: `A1:${lastColumn}${lastRow}` };
  sheet["!cols"] = [
    { wch: 24 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
    { wch: 9 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 20 },
    { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 14 }
  ];
  const border = {
    top: { style: "thin", color: { rgb: "D9E5EE" } },
    bottom: { style: "thin", color: { rgb: "D9E5EE" } },
    left: { style: "thin", color: { rgb: "D9E5EE" } },
    right: { style: "thin", color: { rgb: "D9E5EE" } }
  };
  for (let column = 0; column < Object.keys(output[0]).length; column += 1) {
    const headerCell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    headerCell.s = {
      font: { name: "Aptos Display", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "155A85" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border
    };
    for (let row = 1; row < lastRow; row += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (!cell) continue;
      cell.s = {
        font: { name: "Aptos", sz: 10, color: { rgb: "17324D" } },
        fill: { fgColor: { rgb: row % 2 ? "F3F8FC" : "FFFFFF" } },
        alignment: { vertical: "center", wrapText: true },
        border
      };
    }
  }
  sheet["!rows"] = [{ hpt: 30 }, ...Array(output.length).fill({ hpt: 22 })];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Main Encoding");
  XLSX.writeFile(book, downloadFileName(originalFileName), { cellStyles: true });
}

function App() {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [companyDeployment, setCompanyDeployment] = useState("");
  const [agent, setAgent] = useState("");
  const [trainingData, setTrainingData] = useState([]);
  const [trainingStatus, setTrainingStatus] = useState("Loading dataset…");

  useEffect(() => {
    fetch("./dataset.json")
      .then(response => {
        if (!response.ok) throw new Error(`Dataset request failed (${response.status}).`);
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error("Dataset must contain an array of name examples.");
        setTrainingData(data);
        setTrainingStatus(`${data.length} learned examples loaded`);
      })
      .catch(error => {
        setTrainingStatus("Parser fallback active");
        setError(`Could not load dataset.json: ${error.message}`);
      });
  }, []);

  const processFile = file => {
    if (!file) return;
    setError("");
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setError("Please upload an Excel workbook (.xlsx or .xls) or CSV file.");
      return;
    }
    setFileName(file.name);
    setPage(1);
    readWorkbook(file, trainingData, setResult, setError);
  };

  const visibleRows = result?.rows.filter(row =>
    [row.source, row.formatted, row.first, row.last].join(" ").toLowerCase().includes(query.toLowerCase())
  ) || [];
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const pageRows = visibleRows.slice((page - 1) * pageSize, page * pageSize);
  const updateRow = (id, field, value) => {
    setResult(current => current ? {
      ...current,
      rows: current.rows.map(row => row.id === id
        ? { ...row, [field]: value, formatted: formatNameParts(field === "last" ? value : row.last, field === "first" ? value : row.first, field === "middle" ? value : row.middle, field === "suffix" ? value : row.suffix) }
        : row)
    } : current);
  };
  const joinMiddleWithFirst = id => {
    setResult(current => current ? {
      ...current,
      rows: current.rows.map(row => {
        if (row.id !== id) return row;
        const first = [row.first, row.middle].filter(Boolean).join(" ");
        return { ...row, first, middle: "", formatted: formatNameParts(row.last, first, "", row.suffix) };
      })
    } : current);
  };
  const joinAllMiddleWithFirst = () => {
    setResult(current => current ? {
      ...current,
      rows: current.rows.map(row => {
        if (!row.middle) return row;
        const first = [row.first, row.middle].filter(Boolean).join(" ");
        return { ...row, first, middle: "", formatted: formatNameParts(row.last, first, "", row.suffix) };
      })
    } : current);
  };
  const joinFirstMiddleWordWithFirst = id => {
    setResult(current => current ? {
      ...current,
      rows: current.rows.map(row => {
        if (row.id !== id || !row.middle) return row;
        const [firstMiddleWord, ...remainingMiddleWords] = clean(row.middle).split(" ");
        const first = [row.first, firstMiddleWord].filter(Boolean).join(" ");
        const middle = remainingMiddleWords.join(" ");
        return { ...row, first, middle, formatted: formatNameParts(row.last, first, middle, row.suffix) };
      })
    } : current);
  };
  const resetFile = () => {
    setResult(current => current ? { ...current, rows: current.originalRows } : current);
    setCompanyDeployment("");
    setAgent("");
    setQuery("");
    setPage(1);
  };

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div className="brand"><span className="brand-mark">N</span><span>name<span className="brand-accent">craft</span></span></div>
        <span className="topbar-note">Excel name formatter</span>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span className="status-dot"></span> {trainingStatus.toUpperCase()}</div>
        <h1>Names that look<br /><em>right</em>, every time.</h1>
        <p>Drop in your Excel list. Namecraft separates, cleans, and formats every name into a consistent, download-ready file.</p>
        {!result && (
          <div
            className={`dropzone ${isDragging ? "is-dragging" : ""}`}
            onDragOver={event => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={event => { event.preventDefault(); setIsDragging(false); processFile(event.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
          >
            <div className="upload-icon">↑</div>
            <div><strong>Drop your Excel file here</strong><span>or click to browse from your computer</span></div>
            <button className="browse-button" type="button">Browse files</button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={event => processFile(event.target.files[0])} />
          </div>
        )}
        {error && <div className="error-banner">! {error}</div>}
        {fileName && !result && <div className="file-pill">◫ {fileName}<span>Reading workbook…</span></div>}
      </section>

      {!result && (
        <section className="training-section">
          <div className="section-label">HOW IT FORMATS</div>
          <div className="training-card">
            <div className="training-copy"><h2>Reference dataset loaded.</h2><p>Namecraft checks dataset.json first for known Payor Name patterns, then uses the parser for names not found in the dataset.</p></div>
            <div className="example-list">{mockupTrainingExamples.map(example => <div className="example-row" key={example[0]}><span>{example[0]}</span><b>→</b><strong>{example[1]}, {example[2]}{example[3] ? ` ${example[3]}` : ""}</strong></div>)}</div>
          </div>
        </section>
      )}

      {result && (
        <section className="results-section">
          <div className="results-heading">
            <div><div className="eyebrow"><span className="status-dot"></span> PREVIEW READY</div><h2>{result.rows.length} names formatted</h2><p className="file-meta">◫ {fileName} <span>·</span> Sheet: {result.sheetName}</p></div>
            <div className="actions"><button className="secondary-button" onClick={resetFile}>Reset file</button><button className="secondary-button" onClick={() => { setResult(null); setFileName(""); setQuery(""); setPage(1); setCompanyDeployment(""); setAgent(""); }}>Upload another</button><button className="download-button" onClick={() => downloadWorkbook(result.rows, fileName, companyDeployment, agent)}>↓ Download .xlsx</button></div>
          </div>
          <div className="preview-toolbar">
            <div className="preview-title"><span className="table-icon">▤</span> PAYOR NAME PREVIEW</div>
            <div className="preview-inputs">
              <label className="company-field">Company / Deployment<input value={companyDeployment} onChange={event => setCompanyDeployment(event.target.value)} placeholder="Type company name" /></label>
              <label className="company-field">Agent<input value={agent} onChange={event => setAgent(event.target.value)} placeholder="Type agent name" /></label>
            </div>
            <div className="preview-tools"><button className="join-all-button" type="button" onClick={joinAllMiddleWithFirst}>Join middle to first (all rows)</button><label className="search-box">⌕<input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Search payor names…" /></label></div>
          </div>
          <div className="table-wrap"><table><thead><tr><th>#</th><th>PAYOR NAME</th><th>FIRST NAME</th><th>MIDDLE NAME</th><th>LAST NAME</th><th>SUFFIX</th><th>FORMATTED NAME</th><th>ACTION</th></tr></thead><tbody>{pageRows.map(row => <tr key={row.id}><td className="row-number">{String(row.id).padStart(2, "0")}</td><td className="muted">{row.source || "—"}</td><td><input className="name-edit" value={row.first} onChange={event => updateRow(row.id, "first", event.target.value)} /></td><td><input className="name-edit" value={row.middle} onChange={event => updateRow(row.id, "middle", event.target.value)} /></td><td><input className="name-edit" value={row.last} onChange={event => updateRow(row.id, "last", event.target.value)} /></td><td><input className="name-edit suffix-edit" value={row.suffix} onChange={event => updateRow(row.id, "suffix", event.target.value)} /></td><td className="formatted">{row.formatted || "Needs review"}</td><td><button className="join-button" type="button" disabled={!row.middle} onClick={event => { event.stopPropagation(); joinMiddleWithFirst(row.id); }}>Join entire middle to first</button><button className="join-button join-first-word-button" type="button" disabled={!row.middle} onClick={event => { event.stopPropagation(); joinFirstMiddleWordWithFirst(row.id); }}>Join first middle word to first</button></td></tr>)}</tbody></table></div>
          {visibleRows.length > 0 && <div className="pagination"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, visibleRows.length)} of {visibleRows.length}</span><div><button className="pagination-button" disabled={page === 1} onClick={() => setPage(current => current - 1)}>Previous</button><strong>Page {page} of {pageCount}</strong><button className="pagination-button" disabled={page === pageCount} onClick={() => setPage(current => current + 1)}>Next</button></div></div>}
          {!visibleRows.length && <div className="empty-state">No names match “{query}”.</div>}
        </section>
      )}
      <footer><span>NAMECRAFT</span><span className="privacy-note">Local processing · Your file stays in your browser · <b className="creator-watermark">Built by Gelo Andrei Nerona</b></span></footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
