import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as XLSX from 'xlsx';

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
        try {
          // Use proper shell escaping for the path
          const escapedPath = tempFilePath.replace(/'/g, "'\\''"); // Escape single quotes
          const { stdout } = await execAsync(`node -e "const pdfParse = require('pdf-parse'); const fs = require('fs'); fs.readFile('${escapedPath}', (err, buffer) => { if (err) { console.error(err); process.exit(1); } pdfParse(buffer).then(data => { console.log(data.text); process.exit(0); }).catch(err => { console.error(err); process.exit(1); }); })"`);
          
          extractedText = stdout;
          console.log("Successfully processed PDF file: " + fileName);
        } catch (pdfError: any) {
          console.error("PDF processing error:", pdfError);
          // Let's try a simpler approach if that fails
          try {
            const { stdout } = await execAsync(`strings "${tempFilePath}"`);
            extractedText = stdout;
            console.log("Used fallback method for PDF: " + fileName);
          } catch (fallbackError) {
            throw new Error(`PDF processing error: ${pdfError.message || String(pdfError)}`);
          }
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
        try {
          // Call our dedicated Excel processor script
          const { stdout } = await execAsync(`node server/excelProcessor.js "${tempFilePath}"`);
          
          extractedText = stdout;
          console.log("Successfully processed Excel file: " + fileName);
        } catch (xlsxError: any) {
          console.error("Excel processing error:", xlsxError);
          
          // Try a simpler approach for Excel files
          try {
            // Just read the file as UTF-8 and see if we get anything useful
            extractedText = await fs.promises.readFile(tempFilePath, 'utf-8');
            if (!extractedText || extractedText.length < 10) {
              throw new Error("Could not extract meaningful text");
            }
            console.log("Used text fallback method for Excel: " + fileName);
          } catch (fallbackError) {
            throw new Error(`Excel processing error: ${xlsxError.message || String(xlsxError)}`);
          }
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
