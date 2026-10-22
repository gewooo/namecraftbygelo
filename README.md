# Namecraft

A browser-only React app for turning Excel name lists into the 19-column IMS Main Encoding template.

## Run it

Run a local web server from this folder (for example, `npx serve .`) and open the displayed URL. The app loads React, Babel, SheetJS, and `dataset.json` from the local folder, so no build step is required. Opening the HTML directly via `file://` prevents the browser from loading the dataset.

## Supported input

- `.xlsx`, `.xls`, and `.csv` files
- A full-name column such as `Full Name`, `Name`, or `Full name seen in document`
- A single `Payor Name` column, including the format used by the supplied collection workbook
- Separate `First Name`, `Middle Name`, and `Last Name` columns, including the `Member ...` and `Payor ...` headers used in the provided template

Files are processed locally in the browser. The preview shows the first 100 matching rows, while the download contains every formatted row in the IMS template layout.

`dataset.json` is used as a runtime reference dataset: exact Payor Name matches use its known first, middle, and last name fields; unseen names use the fallback parser.

The workbook in `Files/2026 Listing Format.xlsx` is kept as a reference template and is not loaded automatically. Choose a workbook to begin processing without modifying the source file. Membership fees exported to `Premium` are numeric values without currency symbols.

After upload, the Company / Deployment field can be used to fill that column for every exported row.

The exported workbook uses a blue styled header, Aptos fonts, alternating row fills, borders, column widths, and an Excel autofilter over the `Main Encoding` table.
