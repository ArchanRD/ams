const ExcelJS = require('exceljs');
const { ApiError } = require('../utils/apiError');
const { createMember } = require('./member.service');
const { markAttendance } = require('./attendance.service');

const HEADER_ALIASES = {
  name: ['name', 'member name', 'full name'],
  phone: ['phone', 'mobile', 'phone number', 'mobile number', 'contact'],
  type: ['type', 'member type'],
  area: ['area', 'location'],
  date: ['date', 'attendance date'],
  status: ['status', 'attendance status'],
};

const ATTENDANCE_STATUSES = new Set(['PRESENT', 'ABSENT', 'HALF_DAY']);
const MEMBER_TYPES = new Set(['devotee', 'volunteer']);

const getCellValue = (cellValue) => {
  if (cellValue == null) {
    return '';
  }

  if (typeof cellValue === 'object' && Array.isArray(cellValue.richText)) {
    return cellValue.richText.map((part) => part.text).join('');
  }

  if (typeof cellValue === 'object' && typeof cellValue.text === 'string') {
    return cellValue.text;
  }

  return cellValue;
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + value * 86400000);
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    return stringValue;
  }

  const parsed = new Date(stringValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeType = (value) => {
  const stringValue = String(value || '').trim().toLowerCase();
  if (!stringValue) {
    return 'devotee';
  }

  if (!MEMBER_TYPES.has(stringValue)) {
    throw new Error('Type must be either devotee or volunteer');
  }

  return stringValue;
};

const normalizeStatus = (value) => {
  const stringValue = String(value || '').trim().toUpperCase();
  if (!stringValue) {
    return 'PRESENT';
  }

  if (!ATTENDANCE_STATUSES.has(stringValue)) {
    throw new Error('Status must be PRESENT, ABSENT, or HALF_DAY');
  }

  return stringValue;
};

const buildHeaderMap = (headerRow) => {
  const headerMap = {};

  headerRow.eachCell((cell, columnNumber) => {
    const label = String(getCellValue(cell.value) || '').trim().toLowerCase();
    if (!label) {
      return;
    }

    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(label) && !headerMap[field]) {
        headerMap[field] = columnNumber;
      }
    }
  });

  return headerMap;
};

const getRowValue = (row, columnNumber) => {
  if (!columnNumber) {
    return null;
  }

  return getCellValue(row.getCell(columnNumber).value);
};

const parseWorksheet = (worksheet) => {
  const headerRow = worksheet.getRow(1);
  const headerMap = buildHeaderMap(headerRow);
  const rows = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const name = String(getRowValue(row, headerMap.name) || '').trim();
    const phone = String(getRowValue(row, headerMap.phone) || '').trim();
    const typeValue = getRowValue(row, headerMap.type);
    const areaValue = getRowValue(row, headerMap.area);
    const dateValue = headerMap.date ? getRowValue(row, headerMap.date) : null;
    const statusValue = headerMap.status ? getRowValue(row, headerMap.status) : null;

    if (!name && !phone && !typeValue && !areaValue && !dateValue && !statusValue) {
      return;
    }

    rows.push({
      rowNumber,
      name,
      phone,
      type: typeValue,
      area: String(areaValue || '').trim() || undefined,
      date: dateValue,
      status: statusValue,
    });
  });

  return { headerMap, rows };
};

const importMembersFromBuffer = async (buffer, importedBy) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
  if (!worksheet) {
    throw new ApiError(400, 'No worksheets found in the uploaded Excel file.');
  }

  const { headerMap, rows } = parseWorksheet(worksheet);

  if (!headerMap.name || !headerMap.phone) {
    throw new ApiError(
      400,
      'The first row must include Name and Phone columns.',
    );
  }

  if (rows.length === 0) {
    throw new ApiError(400, 'No member rows found in the uploaded Excel file.');
  }

  const summary = {
    total: rows.length,
    created: 0,
    existing: 0,
    attendanceMarked: 0,
    errors: [],
  };

  for (const row of rows) {
    try {
      if (row.name.length < 2) {
        throw new Error('Name is required and must be at least 2 characters.');
      }

      const normalizedPhone = row.phone.replace(/\D/g, '');
      if (normalizedPhone.length < 7) {
        throw new Error('Phone number is required and must have at least 7 digits.');
      }

      const memberResult = await createMember({
        name: row.name,
        phone: row.phone,
        type: normalizeType(row.type),
        area: row.area,
      });

      if (memberResult.alreadyExists) {
        summary.existing += 1;
      } else {
        summary.created += 1;
      }

      if (row.date) {
        const normalizedDate = normalizeDate(row.date);
        if (!normalizedDate) {
          throw new Error('Date must be a valid Excel date or YYYY-MM-DD value.');
        }

        try {
          await markAttendance({
            memberId: memberResult.member.id,
            date: normalizedDate,
            status: normalizeStatus(row.status),
            markedBy: importedBy,
            overwrite: false,
          });
          summary.attendanceMarked += 1;
        } catch (error) {
          if (error instanceof ApiError && error.statusCode === 409) {
            continue;
          }

          throw error;
        }
      }
    } catch (error) {
      summary.errors.push({
        row: row.rowNumber,
        name: row.name || '(blank)',
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : 'Unable to import this row.',
      });
    }
  }

  return summary;
};

const buildImportTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Members Import');

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Area', key: 'area', width: 18 },
    { header: 'Date', key: 'date', width: 14 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.addRow({
    name: 'Aarav Mehta',
    phone: '9876543210',
    type: 'devotee',
    area: 'Mumbai',
    date: '2026-03-15',
  });
  worksheet.addRow({
    name: 'Diya Sharma',
    phone: '9876543211',
    type: 'volunteer',
    area: 'Pune',
    date: '',
  });

  const notesSheet = workbook.addWorksheet('Notes');
  notesSheet.getColumn(1).width = 88;
  notesSheet.addRow(['Import format reference']);
  notesSheet.getRow(1).font = { bold: true };
  notesSheet.addRow(['Name: required, minimum 2 characters.']);
  notesSheet.addRow(['Phone: required, minimum 7 digits, used as the unique member ID.']);
  notesSheet.addRow(['Type: optional, allowed values are devotee or volunteer. Defaults to devotee.']);
  notesSheet.addRow(['Area: optional text field.']);
  notesSheet.addRow(['Date: optional, must be YYYY-MM-DD or a valid Excel date cell.']);
  notesSheet.addRow(['Status: optional extra column. If omitted, attendance defaults to PRESENT for rows with a Date.']);
  notesSheet.addRow(['Status values, when provided, must be PRESENT, ABSENT, or HALF_DAY.']);
  notesSheet.addRow(['If Date is blank, no attendance record is created for that row.']);

  return workbook;
};

module.exports = {
  importMembersFromBuffer,
  buildImportTemplate,
};