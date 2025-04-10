import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

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
        // Use pdf-parse (we'll use the exec approach since we can't import directly)
        const { stdout: pdfText } = await execAsync(`npx pdf-parse "${tempFilePath}"`);
        extractedText = pdfText;
        break;
        
      case '.docx':
      case '.doc':
        // Use mammoth for DOCX extraction
        const { stdout: docText } = await execAsync(`npx mammoth "${tempFilePath}" --output-format=text`);
        extractedText = docText;
        break;
        
      case '.xlsx':
      case '.xls':
        // Use xlsx for Excel processing - quotes around path to handle spaces in filenames
        const { stdout: xlsxText } = await execAsync(`npx xlsx "${tempFilePath}" --sheet=0 --raw`);
        extractedText = xlsxText;
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
