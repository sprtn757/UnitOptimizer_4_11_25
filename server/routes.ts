import type { Express, Request, Response } from "express";

// Extended Request type with files property from multer - using correct typing
interface RequestWithFiles extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { extractTextFromFile } from "./fileProcessing";
import { analyzeCurriculum, getChatResponse, type CurriculumAnalysisResult } from "./openai";
import { insertFileSchema, insertAnalysisSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Set up multer for file uploads with increased limits
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 30, // Maximum 30 files
    fieldSize: 50 * 1024 * 1024, // 50MB field size limit
    fieldNameSize: 100, // Longer field names
    parts: 100 // More parts in multipart requests
  }
});

// A simple in-memory store for storing analysis results
// In a real app, this would be in a database
const analysisResultsCache = new Map<string, CurriculumAnalysisResult>();

// Function to process Excel files directly without using command line tools
async function processExcelFile(buffer: Buffer): Promise<string> {
  try {
    // Create a temporary file path
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${Date.now()}-temp-excel.xlsx`);
    
    // Write the buffer to a temp file
    await fs.promises.writeFile(tempFilePath, buffer);
    
    // Read the Excel file with the xlsx library
    const workbook = XLSX.readFile(tempFilePath);
    
    // Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON and then to string
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    const resultText = JSON.stringify(jsonData, null, 2);
    
    // Clean up the temp file
    await fs.promises.unlink(tempFilePath);
    
    return resultText;
  } catch (error) {
    console.error('Error processing Excel file:', error);
    // Return a simpler result if there's an error
    return 'Failed to process Excel file: ' + (error instanceof Error ? error.message : String(error));
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiRouter = app.route('/api');
  
  // Get standards by grade and subject
  app.get('/api/standards', async (req: Request, res: Response) => {
    try {
      const { gradeLevel, subjectArea } = req.query;
      
      if (!gradeLevel || !subjectArea) {
        return res.status(400).json({ message: 'Grade level and subject area are required' });
      }
      
      const standards = await storage.getStandardsByGradeAndSubject(
        gradeLevel as string, 
        subjectArea as string
      );
      
      res.json(standards);
    } catch (error) {
      console.error('Error fetching standards:', error);
      res.status(500).json({ message: 'Failed to fetch standards' });
    }
  });
  
  // Upload files
  app.post('/api/upload', upload.array('files', 30), async (req: Request, res: Response) => {
    try {
      const files = (req as RequestWithFiles).files;
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      
      // Validate all files first to fail fast if there are issues
      const fileSchemas = [];
      for (const file of files) {
        const fileSchema = insertFileSchema.safeParse({
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          content: '', // Will be populated with extracted text
          userId: 1 // Default user ID for now
        });
        
        if (!fileSchema.success) {
          return res.status(400).json({ 
            message: 'Invalid file data',
            fileName: file.originalname, 
            errors: fileSchema.error.errors 
          });
        }
        
        fileSchemas.push({
          file,
          schema: fileSchema.data,
          extension: path.extname(file.originalname).toLowerCase()
        });
      }
      
      // Process files in batches to prevent memory issues
      const batchSize = 5; // Process 5 files at a time
      const uploadedFiles = [];
      
      // Define the type for file schema items
      interface FileSchemaItem {
        file: Express.Multer.File;
        schema: any;
        extension: string;
      }
      
      // Function to process a batch of files
      const processBatch = async (batch: FileSchemaItem[]) => {
        const batchPromises = batch.map(async ({ file, schema, extension }) => {
          try {
            let extractedText = '';
            
            if (extension === '.xlsx' || extension === '.xls') {
              console.log('Processing Excel file:', file.originalname);
              extractedText = await processExcelFile(file.buffer);
            } else {
              // Use the regular file processor for non-Excel files
              const contentResult = await extractTextFromFile(file.buffer, file.originalname);
              if (contentResult.error) {
                throw new Error(contentResult.error);
              }
              extractedText = contentResult.text;
            }
            
            // Store the file with extracted content
            const savedFile = await storage.createFile({
              ...schema,
              content: extractedText
            });
            
            return {
              id: savedFile.id,
              name: savedFile.name,
              type: savedFile.type,
              size: savedFile.size
            };
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error processing file ${file.originalname}:`, error);
            throw new Error(`Failed to process file ${file.originalname}: ${errorMessage}`);
          }
        });
        
        return Promise.all(batchPromises);
      };
      
      // Process files in batches
      for (let i = 0; i < fileSchemas.length; i += batchSize) {
        const batch = fileSchemas.slice(i, i + batchSize);
        const batchResults = await processBatch(batch);
        uploadedFiles.push(...batchResults);
      }
      
      res.json({ files: uploadedFiles });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error uploading files:', error);
      res.status(500).json({ message: errorMessage || 'Failed to upload files' });
    }
  });
  
  // Process files and analyze curriculum
  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const { gradeLevel, subjectArea, unitOfStudy, fileIds } = req.body;
      
      if (!gradeLevel || !subjectArea || !unitOfStudy || !fileIds || !Array.isArray(fileIds)) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Fetch all files
      const files = [];
      for (const id of fileIds) {
        const file = await storage.getFile(parseInt(id));
        if (file) {
          files.push(file);
        }
      }
      
      if (files.length === 0) {
        return res.status(400).json({ message: 'No valid files found' });
      }
      
      // Categorize files (more flexible categorization)
      // If we have multiple files, try to categorize them
      let lessonFiles: typeof files = [];
      let assessmentFiles: typeof files = [];
      let responseFiles: typeof files = [];
      
      if (files.length > 1) {
        // First try to categorize based on naming patterns
        lessonFiles = files.filter(f => 
          f.name.toLowerCase().includes('lesson') || 
          f.name.toLowerCase().includes('slide') || 
          f.name.toLowerCase().includes('ppt') ||
          f.name.toLowerCase().includes('curriculum')
        );
        
        assessmentFiles = files.filter(f => 
          f.name.toLowerCase().includes('assessment') || 
          f.name.toLowerCase().includes('test') || 
          f.name.toLowerCase().includes('exam') ||
          f.name.toLowerCase().includes('quiz')
        );
        
        responseFiles = files.filter(f => 
          f.name.toLowerCase().includes('response') || 
          f.name.toLowerCase().includes('result') || 
          f.name.toLowerCase().includes('answer') ||
          f.name.toLowerCase().includes('student')
        );
      }
      
      // If we still don't have proper categorization and have multiple files
      if (files.length > 1 && (lessonFiles.length === 0 || assessmentFiles.length === 0)) {
        // Use file types as a fallback for categorization (common document vs spreadsheet distinction)
        const docTypes = ['doc', 'docx', 'pdf', 'ppt', 'pptx'];
        const spreadsheetTypes = ['xls', 'xlsx', 'csv'];
        
        if (lessonFiles.length === 0) {
          // Assume documents are lesson materials
          lessonFiles = files.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() || '';
            return docTypes.includes(ext);
          });
        }
        
        if (assessmentFiles.length === 0) {
          // If no assessment files found yet, use remaining files that aren't already categorized
          const remainingFiles = files.filter(f => 
            !lessonFiles.some(lf => lf.id === f.id) && 
            !responseFiles.some(rf => rf.id === f.id)
          );
          
          if (remainingFiles.length > 0) {
            assessmentFiles = remainingFiles;
          } else {
            // Last resort: treat first file as lesson and second as assessment
            assessmentFiles = [files[1] || files[0]];
          }
        }
      }
      
      // If we still have only one file, use it as both lesson and assessment
      if (files.length === 1) {
        lessonFiles = files;
        assessmentFiles = files;
      }
      
      // Let's not block the user if we're missing certain types of files
      if (lessonFiles.length === 0) {
        return res.status(400).json({ message: 'No lesson content identified. Please upload lesson slides or materials.' });
      }
      
      // Assessment files are optional - use placeholder if none are found
      const assessmentContent = assessmentFiles.length > 0 
        ? assessmentFiles.map(f => f.content).join('\n\n')
        : "No assessment content provided.";
      
      // Student response files are optional - use empty string if none are found
      const studentResponsesContent = responseFiles.length > 0 
        ? responseFiles.map(f => f.content).join('\n\n')
        : "No student response data provided.";
      
      console.log(`Processing ${lessonFiles.length} lesson files, ${assessmentFiles.length} assessment files, ${responseFiles.length} response files`);
      
      // Import compression function
      const { compressText } = require('./fileProcessing');
      
      // Apply compression to reduce token usage
      const compressedLessonContents = lessonFiles.map(f => {
        const originalSize = f.content.length;
        const compressed = compressText(f.content);
        const newSize = compressed.length;
        const reductionPercent = ((originalSize - newSize) / originalSize * 100).toFixed(1);
        console.log(`Compressed lesson file from ${(originalSize/1024).toFixed(1)}KB to ${(newSize/1024).toFixed(1)}KB (${reductionPercent}% reduction)`);
        return compressed;
      });
      
      // Apply compression to assessment content if it exists
      const compressedAssessmentContent = assessmentContent ? 
        compressText(assessmentContent) : assessmentContent;
      
      // Compression isn't as necessary for student responses, which are typically smaller
      
      // Prepare data for analysis
      const analysisRequest = {
        gradeLevel,
        subjectArea,
        unitOfStudy,
        lessonContents: compressedLessonContents,
        assessmentContent: compressedAssessmentContent,
        studentResponses: studentResponsesContent
      };
      
      // Analyze curriculum
      const analysisResult = await analyzeCurriculum(analysisRequest);
      
      // Save analysis
      const analysis = await storage.createAnalysis({
        gradeLevel,
        subjectArea,
        unitOfStudy,
        result: analysisResult,
        userId: 1 // Default user ID for now
      });
      
      // Store the result in the cache
      analysisResultsCache.set(analysis.id.toString(), analysisResult);
      
      // Create initial system message
      await storage.createMessage({
        content: `Hello! I've analyzed your ${gradeLevel} grade ${subjectArea} unit on ${unitOfStudy}. I can help you improve your curriculum based on the analysis. Feel free to ask me questions!`,
        isUser: false,
        analysisId: analysis.id
      });
      
      res.json({ 
        analysisId: analysis.id, 
        result: analysisResult 
      });
    } catch (error: any) {
      console.error('Error analyzing curriculum:', error);
      
      // Pass more specific error messages to the client
      const errorObj: any = {
        message: error.message || 'Failed to analyze curriculum'
      };
      
      // Use specific status codes and error types based on the error
      if (error.message && (error.message.includes('API rate limit exceeded') || error.message.includes('rate limit'))) {
        errorObj.errorType = 'rate_limit';
        res.status(429).json(errorObj);
      } else if (error.message && error.message.includes('quota')) {
        errorObj.errorType = 'quota_exceeded';
        res.status(402).json(errorObj);
      } else if (error.message && (error.message.includes('Authentication') || error.message.includes('API key'))) {
        errorObj.errorType = 'auth_error';
        res.status(401).json(errorObj);
      } else if (error.message && error.message.includes('parse')) {
        errorObj.errorType = 'parse_error';
        res.status(500).json(errorObj);
      } else if (error.status && error.status < 500) {
        // For 4xx errors, pass the error message directly
        res.status(error.status).json(errorObj);
      } else {
        // Generic 500 error
        res.status(500).json(errorObj);
      }
    }
  });
  
  // Get messages for an analysis
  app.get('/api/messages/:analysisId', async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.params;
      
      if (!analysisId) {
        return res.status(400).json({ message: 'Analysis ID is required' });
      }
      
      const messages = await storage.getMessagesByAnalysisId(parseInt(analysisId));
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });
  
  // Send a message and get AI response
  app.post('/api/messages', async (req: Request, res: Response) => {
    try {
      const { content, analysisId } = req.body;
      
      if (!content || !analysisId) {
        return res.status(400).json({ message: 'Message content and analysis ID are required' });
      }
      
      const messageSchema = insertMessageSchema.safeParse({
        content,
        isUser: true,
        analysisId: parseInt(analysisId)
      });
      
      if (!messageSchema.success) {
        return res.status(400).json({ 
          message: 'Invalid message data', 
          errors: messageSchema.error.errors 
        });
      }
      
      // Get the analysis
      const analysis = await storage.getAnalysis(parseInt(analysisId));
      
      if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' });
      }
      
      // Save user message
      const userMessage = await storage.createMessage(messageSchema.data);
      
      // Get previous messages for context
      const previousMessages = await storage.getMessagesByAnalysisId(parseInt(analysisId));
      
      // Get analysis result from cache or from the database
      const analysisResult = analysisResultsCache.get(analysisId) || analysis.result as CurriculumAnalysisResult;
      
      // Get AI response
      const aiResponse = await getChatResponse(
        content,
        analysis.gradeLevel,
        analysis.subjectArea,
        analysis.unitOfStudy,
        analysisResult,
        previousMessages
      );
      
      // Save AI response
      const botMessage = await storage.createMessage({
        content: aiResponse,
        isUser: false,
        analysisId: parseInt(analysisId)
      });
      
      res.json({ 
        userMessage, 
        botMessage 
      });
    } catch (error) {
      console.error('Error handling message:', error);
      res.status(500).json({ message: 'Failed to process message' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
