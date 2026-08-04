/**
 * Client-side export utilities — no external dependencies.
 *
 * exportCSV   — RFC 4180 CSV with BOM (opens cleanly in Excel)
 * exportExcel — Minimal XLSX written as raw XML (SpreadsheetML / Office Open XML)
 *               Works without the xlsx npm package.
 * exportJSON  — Pretty-printed JSON
 */

// ── helpers ───────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function escapeCSV(v: unknown): string {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function escapeXML(v: unknown): string {
    return String(v == null ? "" : v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// ── CSV export ────────────────────────────────────────────────────────────────

export function exportCSV(columns: string[], rows: unknown[], filename = "data.csv") {
    const lines = [
        columns.map(escapeCSV).join(","),
        ...rows.map((r: any) => columns.map((c) => escapeCSV(r[c])).join(",")),
    ];
    // UTF-8 BOM so Excel auto-detects encoding
    const csv = "\uFEFF" + lines.join("\r\n");
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

// ── JSON export ───────────────────────────────────────────────────────────────

export function exportJSON(rows: unknown[], filename = "data.json") {
    triggerDownload(
        new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
        filename
    );
}

// ── Excel (XLSX) export — pure SpreadsheetML ──────────────────────────────────
//
// Produces a valid .xlsx file using Office Open XML without any npm packages.
// Structure:
//   [Content_Types].xml
//   _rels/.rels
//   xl/workbook.xml
//   xl/_rels/workbook.xml.rels
//   xl/worksheets/sheet1.xml
//   xl/styles.xml
//   xl/sharedStrings.xml  (optional, skipped for simplicity — inline strings used)
//
// Columns are written as header row (bold, light-blue fill) + data rows.
// Numbers are written as numeric cells; everything else as inline-string cells.

/** Build a minimal XLSX binary using the Zip/OOXML structure */
export async function exportExcel(columns: string[], rows: unknown[], filename = "data.xlsx") {
    // -- cell helpers --
    const col2letter = (n: number): string => {
        let s = "";
        let num = n + 1; // 1-based
        while (num > 0) {
            const rem = (num - 1) % 26;
            s = String.fromCharCode(65 + rem) + s;
            num = Math.floor((num - 1) / 26);
        }
        return s;
    };

    const cellAddr = (col: number, row: number) => `${col2letter(col)}${row}`;

    // Build worksheet rows XML
    const xmlRows: string[] = [];

    // Header row (row 1)
    const headerCells = columns
        .map((col, ci) => `<c r="${cellAddr(ci, 1)}" s="1" t="inlineStr"><is><t>${escapeXML(col)}</t></is></c>`)
        .join("");
    xmlRows.push(`<row r="1">${headerCells}</row>`);

    // Data rows
    rows.forEach((r: any, ri) => {
        const rowNum = ri + 2;
        const cells = columns.map((col, ci) => {
            const val = r[col];
            const addr = cellAddr(ci, rowNum);
            if (val == null) {
                return `<c r="${addr}" t="inlineStr"><is><t></t></is></c>`;
            }
            const num = Number(val);
            if (!isNaN(num) && String(val).trim() !== "") {
                return `<c r="${addr}"><v>${num}</v></c>`;
            }
            return `<c r="${addr}" t="inlineStr"><is><t>${escapeXML(val)}</t></is></c>`;
        }).join("");
        xmlRows.push(`<row r="${rowNum}">${cells}</row>`);
    });

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${xmlRows.join("")}</sheetData>
</worksheet>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9E1F2"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
    Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
</Relationships>`;

    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="xl/workbook.xml"/>
</Relationships>`;

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml"
    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

    // Build a ZIP file (OOXML = ZIP)
    // Use the browser's CompressionStream (DEFLATE) via a micro zip builder
    const enc = new TextEncoder();

    const files: { name: string; data: Uint8Array }[] = [
        { name: "[Content_Types].xml",        data: enc.encode(contentTypes)   },
        { name: "_rels/.rels",                data: enc.encode(rootRels)       },
        { name: "xl/workbook.xml",            data: enc.encode(workbookXml)    },
        { name: "xl/_rels/workbook.xml.rels", data: enc.encode(workbookRels)   },
        { name: "xl/worksheets/sheet1.xml",   data: enc.encode(sheetXml)       },
        { name: "xl/styles.xml",              data: enc.encode(stylesXml)      },
    ];

    const zipBytes = buildZip(files);
    triggerDownload(
        new Blob([zipBytes.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        filename
    );
}

// ── Minimal ZIP builder (DEFLATE-stored entries — Store method 0) ─────────────
// Implements enough of the ZIP spec (PKZIP 2.0) for Excel to open the file.
// All entries are stored uncompressed (method=0) to avoid needing the
// DEFLATE algorithm — Excel/LibreOffice handle stored OOXML fine.

function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
    const parts: Uint8Array[] = [];
    const centralDir: { header: Uint8Array; offset: number }[] = [];
    let offset = 0;

    for (const file of files) {
        const nameBytes = new TextEncoder().encode(file.name);
        const crc = crc32(file.data);
        const size = file.data.length;

        // Local file header (30 + name)
        const localHeader = new Uint8Array(30 + nameBytes.length);
        const lv = new DataView(localHeader.buffer);
        lv.setUint32(0,  0x04034b50, true); // signature
        lv.setUint16(4,  20,         true); // version needed
        lv.setUint16(6,  0,          true); // flags
        lv.setUint16(8,  0,          true); // compression: stored
        lv.setUint16(10, 0,          true); // mod time
        lv.setUint16(12, 0,          true); // mod date
        lv.setUint32(14, crc,        true); // crc-32
        lv.setUint32(18, size,       true); // compressed size
        lv.setUint32(22, size,       true); // uncompressed size
        lv.setUint16(26, nameBytes.length, true);
        lv.setUint16(28, 0,          true); // extra field length
        localHeader.set(nameBytes, 30);

        // Central directory entry (46 + name)
        const cdEntry = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(cdEntry.buffer);
        cv.setUint32(0,  0x02014b50, true); // signature
        cv.setUint16(4,  20,         true); // version made by
        cv.setUint16(6,  20,         true); // version needed
        cv.setUint16(8,  0,          true); // flags
        cv.setUint16(10, 0,          true); // compression: stored
        cv.setUint16(12, 0,          true); // mod time
        cv.setUint16(14, 0,          true); // mod date
        cv.setUint32(16, crc,        true); // crc-32
        cv.setUint32(20, size,       true); // compressed size
        cv.setUint32(24, size,       true); // uncompressed size
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0,          true); // extra
        cv.setUint16(32, 0,          true); // comment
        cv.setUint16(34, 0,          true); // disk start
        cv.setUint16(36, 0,          true); // int attribs
        cv.setUint32(38, 0,          true); // ext attribs
        cv.setUint32(42, offset,     true); // local header offset
        cdEntry.set(nameBytes, 46);

        parts.push(localHeader, file.data);
        centralDir.push({ header: cdEntry, offset });
        offset += localHeader.length + size;
    }

    // Central directory
    const cdOffset = offset;
    let cdSize = 0;
    for (const { header } of centralDir) {
        parts.push(header);
        cdSize += header.length;
    }

    // End of central directory
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0,  0x06054b50, true);
    ev.setUint16(4,  0,          true); // disk num
    ev.setUint16(6,  0,          true); // disk with cd
    ev.setUint16(8,  files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize,     true);
    ev.setUint32(16, cdOffset,   true);
    ev.setUint16(20, 0,          true); // comment length
    parts.push(eocd);

    // Concatenate
    const total = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of parts) { out.set(p, pos); pos += p.length; }
    return out;
}

// CRC-32 lookup table
const CRC_TABLE: Uint32Array = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
    }
    return t;
})();

function crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
