import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as XLSX from 'xlsx';

const execAsync = promisify(exec);

// Set larger timeout and buffer size for large files
const execOptions = {
  timeout: 300000, // 5 minutes timeout
  maxBuffer: 100 * 1024 * 1024 // 100MB buffer size
};

export interface FileContentResult {
  text: string;
  error?: string;
}

/**
 * Chunk a large string to prevent memory issues
 * @param text Text to chunk
 * @param chunkSize Size of each chunk
 * @returns Chunked text
 */
function chunkText(text: string, chunkSize = 1024 * 1024): string {
  if (text.length <= chunkSize) {
    return text;
  }
  
  // For very large text, keep only the beginning, middle and end
  const beginChunk = text.substring(0, chunkSize / 2);
  const endChunk = text.substring(text.length - chunkSize / 2);
  
  return `${beginChunk}\n...[Content truncated due to size]...\n${endChunk}`;
}

/**
 * Compresses text by removing redundant whitespace, duplicate paragraphs,
 * and extracting key content to reduce token count
 * @param text Text to compress
 * @returns Compressed text
 */
export function compressText(text: string): string {
  // Step 1: Normalize whitespace and line endings
  let compressed = text.replace(/\r\n/g, '\n')
                      .replace(/\s+/g, ' ')
                      .replace(/\n\s+/g, '\n')
                      .replace(/\n{3,}/g, '\n\n');
  
  // Step 2: Remove duplicate paragraphs (common in slides)
  const paragraphs = compressed.split('\n\n');
  const uniqueParagraphs = new Set<string>();
  const filteredParagraphs: string[] = [];
  
  for (const paragraph of paragraphs) {
    // Skip very short paragraphs (likely headers/footers)
    if (paragraph.length < 10) continue;
    
    // Skip exact duplicates
    if (uniqueParagraphs.has(paragraph)) continue;
    
    uniqueParagraphs.add(paragraph);
    filteredParagraphs.push(paragraph);
  }
  
  // Step 3: Extract key content
  // Focus on paragraphs with educational keywords
  const keyParagraphs = filteredParagraphs.filter(p => {
    const lowercase = p.toLowerCase();
    return (
      // Keep paragraphs likely to contain actual lesson content
      lowercase.includes('standard') ||
      lowercase.includes('objective') ||
      lowercase.includes('learn') ||
      lowercase.includes('student') ||
      lowercase.includes('assessment') ||
      lowercase.includes('skill') ||
      lowercase.includes('concept') ||
      lowercase.includes('understand') ||
      lowercase.includes('analyze') ||
      lowercase.includes('evaluate') ||
      // Keep longer paragraphs (likely to be main content)
      p.length > 100
    );
  });
  
  // If we have too few key paragraphs, use all filtered paragraphs instead
  const finalParagraphs = keyParagraphs.length < 5 ? filteredParagraphs : keyParagraphs;
  
  // Create a compressed text with a reasonable size limit
  return finalParagraphs.join('\n\n');
}

/**
 * Extract text content from various file formats
 * Optimized for handling large files
 */
export async function extractTextFromFile(fileBuffer: Buffer, fileName: string): Promise<FileContentResult> {
  const fileExtension = path.extname(fileName).toLowerCase();
  const fileSizeMB = fileBuffer.length / (1024 * 1024);
  
  try {
    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${Date.now()}-${fileName}`);
    
    // Write the buffer to a temp file
    await fs.promises.writeFile(tempFilePath, fileBuffer);
    
    console.log(`Processing ${fileName} (${fileSizeMB.toFixed(2)}MB)`);
    let extractedText = '';
    
    // Special handling for large files
    if (fileSizeMB > 30) {
      console.log(`Large file detected (${fileSizeMB.toFixed(2)}MB): ${fileName}`);
    }
    
    try {
      switch (fileExtension) {
        case '.txt':
          extractedText = await fs.promises.readFile(tempFilePath, 'utf-8');
          break;
          
        case '.pdf':
          try {
            if (fileSizeMB > 30) {
              // For large PDFs, use a more efficient approach
              const { stdout } = await execAsync(`strings "${tempFilePath}" | head -n 20000`, execOptions);
              extractedText = stdout;
              console.log(`Used optimized method for large PDF: ${fileName}`);
            } else {
              // Use proper shell escaping for the path
              const escapedPath = tempFilePath.replace(/'/g, "'\\''"); // Escape single quotes
              const { stdout } = await execAsync(`node -e "const pdfParse = require('pdf-parse'); const fs = require('fs'); fs.readFile('${escapedPath}', (err, buffer) => { if (err) { console.error(err); process.exit(1); } pdfParse(buffer, {max: 50}).then(data => { console.log(data.text); process.exit(0); }).catch(err => { console.error(err); process.exit(1); }); })"`, execOptions);
              
              extractedText = stdout;
              console.log("Successfully processed PDF file: " + fileName);
            }
          } catch (pdfError: any) {
            console.error("PDF processing error:", pdfError);
            // Let's try a simpler approach if that fails
            try {
              const { stdout } = await execAsync(`strings "${tempFilePath}" | head -n 10000`, execOptions);
              extractedText = stdout;
              console.log("Used fallback method for PDF: " + fileName);
            } catch (fallbackError) {
              throw new Error(`PDF processing error: ${pdfError.message || String(pdfError)}`);
            }
          }
          break;
          
        case '.docx':
        case '.doc':
          try {
            // Use mammoth for DOCX extraction with timeout
            const { stdout: docText } = await execAsync(`npx mammoth "${tempFilePath}" --output-format=text`, execOptions);
            extractedText = docText;
          } catch (docError) {
            console.error("DOCX processing error:", docError);
            // Fallback to basic text extraction
            const { stdout } = await execAsync(`strings "${tempFilePath}" | head -n 10000`, execOptions);
            extractedText = stdout;
            console.log("Used fallback method for DOCX: " + fileName);
          }
          break;
          
        case '.xlsx':
        case '.xls':
          try {
            // For large Excel files, use a more efficient approach
            if (fileSizeMB > 20) {
              // Use XLSX library with sheet limiting
              const workbook = XLSX.readFile(tempFilePath, { sheetRows: 2000 }); // Limit rows
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet);
              extractedText = JSON.stringify(jsonData, null, 2);
              console.log(`Used optimized method for large Excel: ${fileName}`);
            } else {
              // Import the Excel processor directly
              const excelProcessor = require('./excelProcessor');
              extractedText = excelProcessor.processExcelFile(tempFilePath);
              console.log("Successfully processed Excel file: " + fileName);
            }
          } catch (xlsxError: any) {
            console.error("Excel processing error:", xlsxError);
            
            // Try a different approach using the XLSX library directly
            try {
              const workbook = XLSX.readFile(tempFilePath, { sheetRows: 1000 });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet);
              extractedText = JSON.stringify(jsonData, null, 2);
              console.log("Used XLSX library directly for Excel: " + fileName);
            } catch (xlsxError2) {
              // Last resort fallback
              try {
                const { stdout } = await execAsync(`strings "${tempFilePath}" | head -n 5000`, execOptions);
                extractedText = stdout;
                console.log("Used text fallback method for Excel: " + fileName);
              } catch (fallbackError) {
                throw new Error(`Excel processing error: ${xlsxError.message || String(xlsxError)}`);
              }
            }
          }
          break;
          
        case '.pptx':
        case '.ppt':
          try {
            // For PowerPoint files, we'll extract what we can with optimized settings
            const { stdout: pptText } = await execAsync(`npx textract "${tempFilePath}"`, execOptions);
            extractedText = pptText;
          } catch (pptError) {
            console.error("PPT processing error:", pptError);
            // Fallback to basic text extraction
            const { stdout } = await execAsync(`strings "${tempFilePath}" | head -n 10000`, execOptions);
            extractedText = stdout;
            console.log("Used fallback method for PPT: " + fileName);
          }
          break;
          
        default:
          return {
            text: '',
            error: `Unsupported file type: ${fileExtension}`
          };
      }
      
      // For very large extracted text, chunk it to prevent memory issues
      if (extractedText.length > 5 * 1024 * 1024) { // 5MB of text
        console.log(`Large text extracted (${(extractedText.length / (1024 * 1024)).toFixed(2)}MB), truncating`);
        extractedText = chunkText(extractedText);
      }
      
      // Clean up the temp file
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error(`Warning: Failed to delete temp file ${tempFilePath}:`, unlinkError);
      }
      
      return { text: extractedText };
    } catch (processingError: any) {
      console.error(`Error processing ${fileName}:`, processingError);
      
      // Try to clean up the temp file
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (unlinkError) {
        console.error(`Warning: Failed to delete temp file ${tempFilePath}:`, unlinkError);
      }
      
      throw processingError;
    }
  } catch (error: any) {
    console.error(`Error extracting text from ${fileName}:`, error);
    return {
      text: '',
      error: `Failed to extract text: ${error.message || String(error)}`
    };
  }
}
