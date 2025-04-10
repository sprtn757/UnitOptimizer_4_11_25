import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as XLSX from 'xlsx';
// Import PDF parser dynamically to avoid errors with test files
const pdfParse = (buffer: Buffer) => {
  const parse = require('pdf-parse');
  return parse(buffer);
};

const execAsync = promisify(exec);

export interface FileContentResult {
  text: string;
  error?: string;
}

/**
 * Extract text content from various file formats
 */
export async function extractTextFromFile(fileBuffer: Buffer, fileName: string): Promise<FileContentResult> {
  const fileExtension = path.extname(fileName).toLowerCase();
  
  try {
    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${Date.now()}-${fileName}`);
    
    // Write the buffer to a temp file
    await fs.promises.writeFile(tempFilePath, fileBuffer);
    
    let extractedText = '';
    
    switch (fileExtension) {
      case '.txt':
        extractedText = await fs.promises.readFile(tempFilePath, 'utf-8');
        break;
        
      case '.pdf':
        // Use pdf-parse library directly
        try {
          // Read the PDF file
          const pdfBuffer = await fs.promises.readFile(tempFilePath);
          
          // Parse the PDF
          const pdfData = await pdfParse(pdfBuffer);
          
          // Extract the text
          extractedText = pdfData.text || '';
          
          console.log("Successfully processed PDF file: " + fileName);
        } catch (pdfError: any) {
          console.error("PDF processing error:", pdfError);
          throw new Error(`PDF processing error: ${pdfError.message || String(pdfError)}`);
        }
        break;
        
      case '.docx':
      case '.doc':
        // Use mammoth for DOCX extraction
        const { stdout: docText } = await execAsync(`npx mammoth "${tempFilePath}" --output-format=text`);
        extractedText = docText;
        break;
        
      case '.xlsx':
      case '.xls':
        // Use xlsx library directly instead of command line
        try {
          // Read the workbook
          const workbook = XLSX.readFile(tempFilePath);
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON and then to string
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          extractedText = JSON.stringify(jsonData, null, 2);
          
          console.log("Successfully processed Excel file: " + fileName);
        } catch (xlsxError: any) {
          console.error("Excel processing error:", xlsxError);
          throw new Error(`Excel processing error: ${xlsxError.message || String(xlsxError)}`);
        }
        break;
        
      case '.pptx':
      case '.ppt':
        // For PowerPoint files, we'll extract what we can
        // Note: In a real app, you might want a more specialized library
        const { stdout: pptText } = await execAsync(`npx textract "${tempFilePath}"`);
        extractedText = pptText;
        break;
        
      default:
        return {
          text: '',
          error: `Unsupported file type: ${fileExtension}`
        };
    }
    
    // Clean up the temp file
    await fs.promises.unlink(tempFilePath);
    
    return { text: extractedText };
  } catch (error: any) {
    console.error(`Error extracting text from ${fileName}:`, error);
    return {
      text: '',
      error: `Failed to extract text: ${error.message || String(error)}`
    };
  }
}
