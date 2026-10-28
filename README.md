# Namecraft

A browser-only React app for turning Excel name lists into the 19-column IMS Main Encoding template.

This tool is strictly for IMS NCR operations use.

Use `See dashboard` to review locally saved company payment totals and agent company counts for the current month. A record is saved when the formatted workbook is downloaded.

The dashboard is designed to require a separate email/password Supabase login. The login interface is currently present, but Supabase authentication still needs to be connected before credentials can be accepted.

## Supabase hierarchy

The planned Supabase structure is:

1. `organizations` — IMS NCR organizational scope.
2. `agents` — one row per agent, linked to an organization.
3. `companies` — one row per company/deployment, linked to an organization.
4. `payments` — one monthly payment record per company, linked to an agent and company.
The dashboard metrics map to `payments.amount`, `payments.paid_at`, `companies.name`, and the number of distinct `companies` grouped by `agents`. Keep member counts and premium totals directly on `payments`; no separate member-detail table is needed. Add Row Level Security so only authorized IMS NCR users can read or write these tables.

## Run it

Run a local web server from this folder (for example, `npx serve .`) and open the displayed URL. The app loads React, Babel, SheetJS, and `dataset.json` from the local folder, so no build step is required. Opening the HTML directly via `file://` prevents the browser from loading the dataset.

## Supported input

- `.xlsx`, `.xls`, and `.csv` files
- A full-name column such as `Full Name`, `Name`, or `Full name seen in document`
- A single `Payor Name` column, including the format used by the supplied collection workbook
- Separate `First Name`, `Middle Name`, and `Last Name` columns, including the `Member ...` and `Payor ...` headers used in the provided template

Files are processed locally in the browser. The complete preview is editable and paginated at 50 rows per page, while the download contains every formatted row in the IMS template layout.

`dataset.json` is used as a runtime reference dataset: exact Payor Name matches use its known first, middle, and last name fields; unseen names use the fallback parser.

The workbook in `Files/2026 Listing Format.xlsx` is kept as a reference template and is not loaded automatically. Choose a workbook to begin processing without modifying the source file. Membership fees exported to `Premium` are numeric values without currency symbols.

Member First Name, Middle Name, Last Name, and Suffix are exported as Excel `PROPER()` formulas that reference the corresponding Payor fields.

After upload, the Company / Deployment field can be used to fill that column for every exported row.

The Agent inputs fill the `AGENT` column using balanced contiguous ranges. Use the `+` button to add unlimited agents; for example, two agents across 50 rows receive rows 1–25 and 26–50. Each exported cell contains one agent only.

Each preview row has a Birthday date input. Entered birthdays are exported for their individual rows in `YYYY-MM-DD` format; existing birthday values are preserved and normalized to the same format when left unchanged.

Agent suggestions are loaded from `Files/LIST OF AGENTS.xlsx`; choices and typed Agent values are saved in uppercase.

The editable preview also shows the membership fee as a number without a currency symbol.

If the uploaded sheet has no header row, the app assumes the standard 19-column IMS Main Encoding order and preserves the first row as data.

Each row also includes `←` for moving only the first word of the middle name into the first-name field while keeping the remaining middle name.

Each row also includes `→` for changing `KRISTINE DE` + `GUZMAN` into `KRISTINE` + `DE GUZMAN`.

The `ALL` action applies the complete-middle-name change to every row in the uploaded file.

Select rows with the checkboxes to download only those rows. The `Download` action downloads only the formatted names workbook.

Use `Reset file` to discard all row edits and clear the Company / Deployment and Agent values.

Sex is not added automatically; existing `Sex` values are preserved and blank values remain blank.

Full-name tokens are preserved in the formatted fields; middle names are not shortened to initials, and unmatched words are not discarded.

Member Name fields are copied from the separated Payor Name fields in uppercase; no `PROPER` formula is added.

The exported workbook uses a blue styled header, Aptos fonts, alternating row fills, borders, column widths, and an Excel autofilter over the `Main Encoding` table.

The formatted workbook uses only the company name before the first hyphen, with no date, `NEW`, or extra suffix.

The preview table autofits to the available page width and wraps content instead of adding horizontal scrolling.
