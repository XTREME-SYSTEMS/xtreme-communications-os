import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import * as XLSX from 'npm:xlsx@0.18.5';

// PCU Master List Importer — downloads an xlsx file, parses all sheets,
// normalizes columns across varying year-based structures, deduplicates,
// and bulk-creates XtremeCrmContact records.
// Actions: import (full import), preview (dry run, returns sample without writing)

function cleanStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  return s || null;
}

function normalizePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (typeof raw === 'number') s = String(Math.round(raw));
  s = s.replace(/[^\d+]/g, '');
  if (!s) return null;
  if (s.startsWith('+')) return s;
  if (s.length === 11 && s.startsWith('1')) return '+' + s;
  if (s.length === 10) return '+1' + s;
  if (s.length > 10) return '+' + s;
  return null;
}

function normalizeEmail(raw) {
  const s = cleanStr(raw);
  if (!s) return null;
  return s.toLowerCase().replace(/\s+/g, '');
}

function normalizeRow(row, sheetName) {
  const find = (...keys) => {
    for (const k of keys) {
      const lk = k.toLowerCase().trim();
      for (const rk of Object.keys(row)) {
        if (rk.toLowerCase().trim() === lk) return row[rk];
      }
    }
    return null;
  };

  const firstName = cleanStr(find('First Name', 'First Name ', 'First Name\n'));
  const lastName = cleanStr(find('Last Name', 'Last Name ', 'col_3', 'Last Name\n'));
  const company = cleanStr(find('Company Name', 'Company Name\n', 'COMPANY', 'Company Name '));
  const phone = normalizePhone(find('Phone Number', 'Phone Number ', 'Phone Number\n'));
  const email = normalizeEmail(find('Email'));
  const city = cleanStr(find('City'));
  const state = cleanStr(find('State', 'State '));
  const zipRaw = find('zip', 'Zip Code', 'Zip', 'Zip Code ');
  const zip = zipRaw ? String(Math.round(Number(zipRaw)) || zipRaw).trim() : null;
  const address = cleanStr(find('Address', 'Address ', 'Adress', 'Adress ', 'Address\n'));
  const aptSuite = cleanStr(find('Apt/Suite', 'Apt/Suite '));
  const status = cleanStr(find('Status', 'Status '));
  const salesman = cleanStr(find('SALESMAN', 'SLSM #', 'SLSM # '));
  const locationField = cleanStr(find('LOCATION'));
  const pcu = cleanStr(find('PCU'));
  const etc = cleanStr(find('ETC'));
  const countertops = cleanStr(find('COUNTERTOPS'));

  let fullName = null;
  if (firstName && lastName) fullName = firstName + ' ' + lastName;
  else if (firstName) fullName = firstName;
  else if (lastName) fullName = lastName;
  else if (company) fullName = company;
  if (!fullName) return null;

  const locParts = [address, aptSuite, city, state, zip].filter(Boolean);
  const locationStr = locParts.join(', ') || locationField || null;

  const tags = ['pcu_alumni', 'cohort_' + sheetName];
  if (pcu) tags.push('pcu');
  if (etc) tags.push('etc');
  if (countertops) tags.push('countertops');

  const noteParts = [];
  if (salesman) noteParts.push('Salesman: ' + salesman);
  if (status) noteParts.push('Status: ' + status);
  if (locationField) noteParts.push('Location: ' + locationField);
  const notes = noteParts.join(' | ') || null;

  return {
    full_name: fullName,
    email: email,
    phone: phone,
    company: company,
    industry: 'Construction / Epoxy / Flooring',
    location: locationStr,
    lifecycle_stage: 'lead',
    lead_source: 'import',
    tags: tags,
    notes: notes,
    last_contact_channel: 'none',
    follow_up_enabled: false,
  };
}

function chunkArray(arr, size) {
  const result = [];
  let offset = 0;
  let batch = arr.slice(offset, offset + size);
  while (batch.length > 0) {
    result.push(batch);
    offset += size;
    batch = arr.slice(offset, offset + size);
  }
  return result;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}

    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ error: 'file_url required' }, { status: 400 });

    const isPreview = body.action === 'preview';

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) return Response.json({ error: 'failed to download file', status: fileRes.status }, { status: 502 });
    const buffer = await fileRes.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const sheetStats = [];
    const allContacts = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      let parsed = 0;
      let skipped = 0;
      for (const row of rows) {
        const contact = normalizeRow(row, sheetName);
        if (contact) { allContacts.push(contact); parsed++; }
        else skipped++;
      }
      sheetStats.push({ sheet: sheetName, rows: rows.length, parsed, skipped });
    }

    const seenEmail = new Set();
    const seenPhone = new Set();
    const unique = [];
    let dupCount = 0;
    for (const c of allContacts) {
      const emailKey = c.email ? c.email.toLowerCase() : null;
      const phoneKey = c.phone ? c.phone.replace(/\D/g, '') : null;
      if (emailKey && seenEmail.has(emailKey)) { dupCount++; continue; }
      if (!emailKey && phoneKey && seenPhone.has(phoneKey)) { dupCount++; continue; }
      if (emailKey) seenEmail.add(emailKey);
      if (phoneKey) seenPhone.add(phoneKey);
      unique.push(c);
    }

    if (isPreview) {
      return Response.json({
        action: 'preview',
        total_rows: allContacts.length,
        unique_contacts: unique.length,
        duplicates_removed: dupCount,
        sheets: sheetStats,
        sample: unique.slice(0, 10),
      });
    }

    const batches = chunkArray(unique, 500);
    let created = 0;
    let failed = 0;
    for (const batch of batches) {
      try {
        await base44.asServiceRole.entities.XtremeCrmContact.bulkCreate(batch);
        created += batch.length;
      } catch (err) {
        failed += batch.length;
      }
    }

    return Response.json({
      status: 'completed',
      total_rows: allContacts.length,
      unique_contacts: unique.length,
      duplicates_removed: dupCount,
      created: created,
      failed: failed,
      sheets: sheetStats,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}