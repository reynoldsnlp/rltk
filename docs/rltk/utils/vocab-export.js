/**
 * Serializers for exporting vocabulary-table rows
 * ({ lemma, pos, translation, count, keywordStars, ll }) as CSV, Excel (.xlsx),
 * Quizlet and Anki import formats.
 *
 * Exposed as the global `window.RLTK_VOCAB_EXPORT`.
 */
(function (global) {
    'use strict';

    // Spreadsheet columns: the whole vocabulary table, with raw numbers.
    const COLUMNS = [
        ['Word', r => r.lemma || '', 18],
        ['Part of speech', r => r.pos || '', 14],
        ['Translation', r => r.translation || '', 50],
        ['Frequency on page', r => Number(r.count) || 0, 10],
        ['Significance (stars)', r => Number(r.keywordStars) || 1, 10],
        ['Log-likelihood', r => Number(r.ll) || 0, 14]
    ];
    const table = rows => [COLUMNS.map(([name]) => name), ...rows.map(r => COLUMNS.map(([, get]) => get(r)))];
    // Tabs/newlines would break the line-based Quizlet/Anki formats.
    const flat = s => String(s || '').replace(/[\t\r\n]+/g, ' ');
    const escapeXml = s => String(s).replace(/[<>&"]/g, c =>
        ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);

    function toCsv(rows) {
        const cell = v => {
            const s = String(v);
            return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        return table(rows).map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
    }

    // Quizlet's "Import" box expects one `term<TAB>definition` per line (plain text).
    function toQuizlet(rows) {
        return rows.map(r => {
            const definition = r.pos ? `${flat(r.translation)} (${flat(r.pos)})` : flat(r.translation);
            return `${flat(r.lemma)}\t${definition.trim()}`;
        }).join('\n');
    }

    // Anki text import (Anki 2.1.55+ header lines): HTML front/back plus tags.
    function toAnki(rows) {
        const lines = rows.map(r => {
            const pos = r.pos ? `<div style="color: #888; font-size: 0.6em;">${escapeXml(flat(r.pos))}</div>` : '';
            const front = `<div style="font-size: 2em;">${escapeXml(flat(r.lemma))}</div>${pos}`;
            const back = `<div style="font-size: 1.2em;">${escapeXml(flat(r.translation))}</div>`;
            const tags = ['RLTK', r.pos].filter(Boolean).map(t => flat(t).replace(/\s+/g, '_')).join(' ');
            return `${front}\t${back}\t${tags}`;
        });
        return `#separator:tab\n#html:true\n#tags column:3\n${lines.join('\n')}\n`;
    }

    const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
        for (let k = 0; k < 8; k++) n = n & 1 ? 0xEDB88320 ^ (n >>> 1) : n >>> 1;
        return n >>> 0;
    });

    function crc32(bytes) {
        let c = 0xFFFFFFFF;
        for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    // Little-endian binary record from [[value, byteSize], ...].
    function record(spec) {
        const out = new Uint8Array(spec.reduce((n, [, size]) => n + size, 0));
        const view = new DataView(out.buffer);
        let p = 0;
        for (const [value, size] of spec) {
            if (size === 4) view.setUint32(p, value, true);
            else view.setUint16(p, value, true);
            p += size;
        }
        return out;
    }

    // Minimal uncompressed ("stored") ZIP archive of { name: text } entries.
    function zip(files) {
        const enc = new TextEncoder();
        const local = [];
        const central = [];
        let offset = 0;
        for (const [name, text] of Object.entries(files)) {
            const nameBytes = enc.encode(name);
            const data = enc.encode(text);
            // version, flags, method, time, date (1980-01-01), crc, sizes, name length, extra length
            const common = [[20, 2], [0, 2], [0, 2], [0, 2], [0x21, 2], [crc32(data), 4],
                [data.length, 4], [data.length, 4], [nameBytes.length, 2], [0, 2]];
            const header = record([[0x04034B50, 4], ...common]);
            local.push(header, nameBytes, data);
            // made-by, common, comment length, disk, internal + external attributes, offset
            central.push(record([[0x02014B50, 4], [20, 2], ...common,
                [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]]), nameBytes);
            offset += header.length + nameBytes.length + data.length;
        }
        const count = Object.keys(files).length;
        const centralSize = central.reduce((n, part) => n + part.length, 0);
        const end = record([[0x06054B50, 4], [0, 2], [0, 2], [count, 2], [count, 2],
            [centralSize, 4], [offset, 4], [0, 2]]);
        return [...local, ...central, end];
    }

    const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const NS = 'http://schemas.openxmlformats.org';
    // Single-sheet .xlsx workbook as a Blob: bold, frozen, filterable header row.
    function toXlsx(rows) {
        const cell = (v, style) => typeof v === 'number'
            ? `<c${style}><v>${v}</v></c>`
            : `<c t="inlineStr"${style}><is><t>${escapeXml(v)}</t></is></c>`;
        const sheetRows = table(rows)
            .map((r, i) => `<row>${r.map(v => cell(v, i === 0 ? ' s="1"' : '')).join('')}</row>`).join('');
        const cols = COLUMNS.map(([, , width], i) =>
            `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join('');
        const lastCell = `${String.fromCharCode(64 + COLUMNS.length)}${rows.length + 1}`;
        const parts = zip({
            '[Content_Types].xml': `${XML}<Types xmlns="${NS}/package/2006/content-types">`
                + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
                + `<Default Extension="xml" ContentType="application/xml"/>`
                + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
                + `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
                + `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
                + `</Types>`,
            '_rels/.rels': `${XML}<Relationships xmlns="${NS}/package/2006/relationships">`
                + `<Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`
                + `</Relationships>`,
            'xl/workbook.xml': `${XML}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships">`
                + `<sheets><sheet name="Vocabulary" sheetId="1" r:id="rId1"/></sheets></workbook>`,
            'xl/_rels/workbook.xml.rels': `${XML}<Relationships xmlns="${NS}/package/2006/relationships">`
                + `<Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`
                + `<Relationship Id="rId2" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
                + `</Relationships>`,
            // Style 1 = bold (used by the header row).
            'xl/styles.xml': `${XML}<styleSheet xmlns="${NS}/spreadsheetml/2006/main">`
                + `<fonts count="2"><font/><font><b/></font></fonts>`
                + `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>`
                + `<borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>`
                + `<cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs>`
                + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
            'xl/worksheets/sheet1.xml': `${XML}<worksheet xmlns="${NS}/spreadsheetml/2006/main">`
                + `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
                + `<cols>${cols}</cols><sheetData>${sheetRows}</sheetData>`
                + `<autoFilter ref="A1:${lastCell}"/></worksheet>`
        });
        return new Blob(parts, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    global.RLTK_VOCAB_EXPORT = { toCsv, toQuizlet, toAnki, toXlsx };
})(typeof self !== 'undefined' ? self : this);
