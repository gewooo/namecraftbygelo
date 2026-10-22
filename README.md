# Namecraft

A browser-only React app for turning Excel name lists into the 19-column IMS Main Encoding template.

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

After upload, the Company / Deployment field can be used to fill that column for every exported row.

The Agent field similarly fills the `AGENT` column for every exported row when provided.

Agent suggestions are loaded from `Files/LIST OF AGENTS.xlsx`; choices and typed Agent values are saved in uppercase.

The editable preview also shows the membership fee as a number without a currency symbol.

If the uploaded sheet has no header row, the app assumes the standard 19-column IMS Main Encoding order and preserves the first row as data.

Each preview row includes `Middle → first` for moving that row's complete middle name into its first-name field.

Each row also includes `1st middle → first` for moving only the first word of the middle name into the first-name field while keeping the remaining middle name.

Each row also includes `Move last first word to middle` for changing `KRISTINE DE` + `GUZMAN` into `KRISTINE` + `DE GUZMAN`.

The `All rows` action applies the complete-middle-name change to every row in the uploaded file.

Use `Reset file` to discard all row edits and clear the Company / Deployment and Agent values.

Sex is not added automatically; existing `Sex` values are preserved and blank values remain blank.

Full-name tokens are preserved in the formatted fields; middle names are not shortened to initials, and unmatched words are not discarded.

The exported workbook uses a blue styled header, Aptos fonts, alternating row fills, borders, column widths, and an Excel autofilter over the `Main Encoding` table.
