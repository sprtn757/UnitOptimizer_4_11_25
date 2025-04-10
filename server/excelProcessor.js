// Direct Excel processor using xlsx library
const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Process an Excel file and extract its content as text
 * @param {string} filePath Path to the Excel file
 * @returns {string} The extracted text content
 */
function processExcelFile(filePath) {
  try {
    // Read the workbook
    const workbook = XLSX.readFile(filePath);
    
    // Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON and then to string
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    return JSON.stringify(jsonData, null, 2);
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw error;
  }
}

// If this script is called directly from the command line
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('No file path provided');
    process.exit(1);
  }
  
  try {
    const result = processExcelFile(filePath);
    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error('Failed to process Excel file:', error);
    process.exit(1);
  }
}

module.exports = { processExcelFile };