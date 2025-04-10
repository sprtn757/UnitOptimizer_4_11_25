import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { extractTextFromFile } from "./fileProcessing";
import { analyzeCurriculum, getChatResponse, type CurriculumAnalysisResult } from "./openai";
import { insertFileSchema, insertAnalysisSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

// Set up multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
    files: 10 // Maximum 10 files
  }
});

// A simple in-memory store for storing analysis results
// In a real app, this would be in a database
const analysisResultsCache = new Map<string, CurriculumAnalysisResult>();

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
  app.post('/api/upload', upload.array('files', 10), async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      
      const uploadedFiles = [];
      
      for (const file of req.files as Express.Multer.File[]) {
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
            errors: fileSchema.error.errors 
          });
        }
        
        // Extract text content based on file type
        const contentResult = await extractTextFromFile(file.buffer, file.originalname);
        
        if (contentResult.error) {
          return res.status(400).json({ message: contentResult.error });
        }
        
        // Store the file with extracted content
        const savedFile = await storage.createFile({
          ...fileSchema.data,
          content: contentResult.text
        });
        
        uploadedFiles.push({
          id: savedFile.id,
          name: savedFile.name,
          type: savedFile.type,
          size: savedFile.size
        });
      }
      
      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ message: 'Failed to upload files' });
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
      
      // Categorize files (simple categorization based on file type/name)
      const lessonFiles = files.filter(f => f.name.toLowerCase().includes('lesson'));
      const assessmentFiles = files.filter(f => 
        f.name.toLowerCase().includes('assessment') || 
        f.name.toLowerCase().includes('test') || 
        f.name.toLowerCase().includes('exam')
      );
      const responseFiles = files.filter(f => 
        f.name.toLowerCase().includes('response') || 
        f.name.toLowerCase().includes('result') || 
        f.name.toLowerCase().includes('answer')
      );
      
      if (lessonFiles.length === 0) {
        return res.status(400).json({ message: 'No lesson files found' });
      }
      
      if (assessmentFiles.length === 0) {
        return res.status(400).json({ message: 'No assessment files found' });
      }
      
      if (responseFiles.length === 0) {
        return res.status(400).json({ message: 'No student response files found' });
      }
      
      // Prepare data for analysis
      const analysisRequest = {
        gradeLevel,
        subjectArea,
        unitOfStudy,
        lessonContents: lessonFiles.map(f => f.content),
        assessmentContent: assessmentFiles.map(f => f.content).join('\n\n'),
        studentResponses: responseFiles.map(f => f.content).join('\n\n')
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
    } catch (error) {
      console.error('Error analyzing curriculum:', error);
      res.status(500).json({ message: 'Failed to analyze curriculum' });
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
