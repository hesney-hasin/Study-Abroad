// Parses professor data from AI markdown responses
export interface ParsedProfessor {
  name: string;
  title?: string;
  university?: string;
  department?: string;
  researchAreas: string[];
  email?: string;
  profileUrl?: string;
  fundingStatus?: string;
  recentWork?: string;
  fitReason?: string;
}

/**
 * Extracts professor entries from markdown-formatted AI responses.
 * Looks for the pattern: **Professor Name** — Title, Department
 */
export function parseProfessorsFromMarkdown(markdown: string): ParsedProfessor[] {
  const professors: ParsedProfessor[] = [];
  
  // Split by professor header pattern: **Name** — or **Name** -
  const blocks = markdown.split(/(?=\*\*[A-Z][\w\s.'-]+\*\*\s*[—–-])/);
  
  for (const block of blocks) {
    // Match professor name and title
    const headerMatch = block.match(/\*\*([^*]+)\*\*\s*[—–-]\s*(.*)/);
    if (!headerMatch) continue;

    const name = headerMatch[1].trim();
    const titleLine = headerMatch[2]?.trim() || '';
    
    // Skip non-professor headers (too short or generic)
    if (name.length < 3 || /^(why|how|what|note|tip|step)/i.test(name)) continue;

    const prof: ParsedProfessor = {
      name,
      title: titleLine || undefined,
      researchAreas: [],
    };

    // Extract university
    const uniMatch = block.match(/🏛️\s*(.+)/);
    if (uniMatch) prof.university = uniMatch[1].trim();

    // Extract research areas
    const researchMatch = block.match(/🔬\s*\*\*Research Areas?:?\*\*\s*(.+)/i);
    if (researchMatch) {
      prof.researchAreas = researchMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    }

    // Extract email
    const emailMatch = block.match(/📧\s*\*\*Email:?\*\*\s*(\S+@\S+)/i);
    if (emailMatch) prof.email = emailMatch[1].trim();

    // Extract profile URL
    const profileMatch = block.match(/🔗\s*\*\*Profile:?\*\*\s*\[.*?\]\((https?:\/\/[^\s)]+)\)/i);
    if (profileMatch) prof.profileUrl = profileMatch[1];

    // Extract funding
    const fundingMatch = block.match(/💰\s*\*\*Funding:?\*\*\s*(.+)/i);
    if (fundingMatch) prof.fundingStatus = fundingMatch[1].trim();

    // Extract recent work
    const workMatch = block.match(/📄\s*\*\*Recent Work:?\*\*\s*(.+)/i);
    if (workMatch) prof.recentWork = workMatch[1].trim();

    // Extract fit reason
    const fitMatch = block.match(/✅\s*\*\*Why a good fit:?\*\*\s*(.+)/i);
    if (fitMatch) prof.fitReason = fitMatch[1].trim();

    // Also try to extract department from title line
    if (titleLine) {
      const deptMatch = titleLine.match(/,\s*(.+)/);
      if (deptMatch) prof.department = deptMatch[1].trim();
    }

    professors.push(prof);
  }

  return professors;
}

/**
 * Export professors to CSV string
 */
const FIELD_MAP: Record<string, { header: string; getValue: (p: ParsedProfessor) => string }> = {
  name: { header: 'Name', getValue: p => p.name },
  title: { header: 'Title', getValue: p => p.title || '' },
  university: { header: 'University', getValue: p => p.university || '' },
  department: { header: 'Department', getValue: p => p.department || '' },
  researchAreas: { header: 'Research Areas', getValue: p => p.researchAreas.join('; ') },
  email: { header: 'Email', getValue: p => p.email || '' },
  profileUrl: { header: 'Profile URL', getValue: p => p.profileUrl || '' },
  fundingStatus: { header: 'Funding Status', getValue: p => p.fundingStatus || '' },
  recentWork: { header: 'Recent Work', getValue: p => p.recentWork || '' },
  fitReason: { header: 'Why a Good Fit', getValue: p => p.fitReason || '' },
};

const ALL_FIELD_KEYS = Object.keys(FIELD_MAP);

export function professorsToCsv(professors: ParsedProfessor[], fields?: string[]): string {
  const keys = fields && fields.length > 0 ? fields.filter(f => f in FIELD_MAP) : ALL_FIELD_KEYS;
  const headers = keys.map(k => FIELD_MAP[k].header);
  
  const escape = (val: string | undefined) => {
    if (!val) return '';
    const escaped = val.replace(/"/g, '""');
    return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const rows = professors.map(p =>
    keys.map(k => escape(FIELD_MAP[k].getValue(p))).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate HTML table for .xls export (Google Sheets compatible)
 */
export function professorsToHtmlTable(professors: ParsedProfessor[], fields?: string[]): string {
  const keys = fields && fields.length > 0 ? fields.filter(f => f in FIELD_MAP) : ALL_FIELD_KEYS;
  const headers = keys.map(k => FIELD_MAP[k].header);
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const headerRow = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const rows = professors.map(p => {
    const cells = keys.map(k => `<td>${esc(FIELD_MAP[k].getValue(p))}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${headerRow}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

/**
 * Download a file from a Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Download CSV file
 */
export function downloadCsv(csvContent: string, filename: string = 'professors.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
