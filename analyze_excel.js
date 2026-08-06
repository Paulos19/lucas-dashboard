const xlsx = require('xlsx');
const fs = require('fs');

try {
  const filePath = 'bradesco_leads_2026-07-09 (1).xlsx';
  console.log(`Analyzing: ${filePath}`);
  
  const workbook = xlsx.readFile(filePath);
  const result = {};

  for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
      result[sheetName] = {
          totalRows: data.length,
          headers: data.length > 0 ? Object.keys(data[0]) : [],
          sample: data.slice(0, 5) // first 5 rows
      };
  }

  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error("Error analyzing excel file:", e);
}
