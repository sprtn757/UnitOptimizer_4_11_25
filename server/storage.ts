import { 
  users, type User, type InsertUser,
  files, type File, type InsertFile,
  analyses, type Analysis, type InsertAnalysis,
  messages, type Message, type InsertMessage,
  standards, type Standard, type InsertStandard
} from "@shared/schema";

import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // File methods
  getFile(id: number): Promise<File | undefined>;
  getFilesByUserId(userId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  deleteFile(id: number): Promise<boolean>;
  
  // Analysis methods
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getAnalysesByUserId(userId: number): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByAnalysisId(analysisId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Standard methods
  getStandard(id: number): Promise<Standard | undefined>;
  getStandardByCode(code: string): Promise<Standard | undefined>;
  getStandardsByGradeAndSubject(gradeLevel: string, subjectArea: string): Promise<Standard[]>;
  createStandard(standard: InsertStandard): Promise<Standard>;
}

export class DatabaseStorage implements IStorage {
  // Cache for standards since they rarely change
  private standardsCache: Map<string, Standard> = new Map();
  private standardsByGradeSubjectCache: Map<string, Standard[]> = new Map();
  
  // Cache for files and analyses
  private fileCache: Map<number, File> = new Map();
  private analysisCache: Map<number, Analysis> = new Map();
  
  constructor() {
    // Initialize database with some sample standards if they don't exist
    this.initializeStandards();
  }

  // Initialize with some sample California K12 standards
  private async initializeStandards() {
    try {
      // Check if standards table is empty
      const existingStandards = await db.select().from(standards).limit(1);
      
      if (existingStandards.length === 0) {
        const scienceStandards = [
          { code: "MS-ESS1-1", description: "Develop and use a model of the Earth-sun-moon system to describe the cyclic patterns of lunar phases, eclipses of the sun and moon, and seasons.", gradeLevel: "6", subjectArea: "science" },
          { code: "MS-ESS1-2", description: "Develop and use a model to describe the role of gravity in the motions within galaxies and the solar system.", gradeLevel: "6", subjectArea: "science" },
          { code: "MS-ESS1-3", description: "Analyze and interpret data to determine scale properties of objects in the solar system.", gradeLevel: "6", subjectArea: "science" },
          { code: "MS-ESS1-4", description: "Construct a scientific explanation based on evidence from rock strata for how the geologic time scale is used to organize Earth's 4.6-billion-year-old history.", gradeLevel: "6", subjectArea: "science" }
        ];
        
        for (const standard of scienceStandards) {
          await this.createStandard(standard);
        }
      }
    } catch (error) {
      console.error("Error initializing standards:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // File methods
  async getFile(id: number): Promise<File | undefined> {
    // Check cache first
    if (this.fileCache.has(id)) {
      return this.fileCache.get(id);
    }
    
    // If not in cache, get from database
    const [file] = await db.select().from(files).where(eq(files.id, id));
    
    // Store in cache if found
    if (file) {
      this.fileCache.set(id, file);
    }
    
    return file;
  }

  async getFilesByUserId(userId: number): Promise<File[]> {
    // No caching for this method as it could return many results that change frequently
    return await db.select().from(files).where(eq(files.userId, userId));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(insertFile).returning();
    
    // Update cache with the new file
    if (file) {
      this.fileCache.set(file.id, file);
    }
    
    return file;
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id)).returning({ id: files.id });
    
    // Remove from cache if deleted
    if (result.length > 0) {
      this.fileCache.delete(id);
      return true;
    }
    
    return false;
  }

  // Analysis methods
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    // Check cache first
    if (this.analysisCache.has(id)) {
      return this.analysisCache.get(id);
    }
    
    // If not in cache, get from database
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    
    // Store in cache if found
    if (analysis) {
      this.analysisCache.set(id, analysis);
    }
    
    return analysis;
  }

  async getAnalysesByUserId(userId: number): Promise<Analysis[]> {
    // No caching for this method as it could return many results that change
    return await db.select().from(analyses).where(eq(analyses.userId, userId));
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db.insert(analyses).values(insertAnalysis).returning();
    
    // Update cache with the new analysis
    if (analysis) {
      this.analysisCache.set(analysis.id, analysis);
    }
    
    return analysis;
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessagesByAnalysisId(analysisId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.analysisId, analysisId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  // Standard methods
  async getStandard(id: number): Promise<Standard | undefined> {
    // Standards are less likely to change, so we cache them by ID
    const idKey = `id-${id}`;
    if (this.standardsCache.has(idKey)) {
      return this.standardsCache.get(idKey);
    }
    
    const [standard] = await db.select().from(standards).where(eq(standards.id, id));
    
    if (standard) {
      this.standardsCache.set(idKey, standard);
      this.standardsCache.set(`code-${standard.code}`, standard);
    }
    
    return standard;
  }

  async getStandardByCode(code: string): Promise<Standard | undefined> {
    // Check cache first
    const codeKey = `code-${code}`;
    if (this.standardsCache.has(codeKey)) {
      return this.standardsCache.get(codeKey);
    }
    
    const [standard] = await db.select().from(standards).where(eq(standards.code, code));
    
    if (standard) {
      this.standardsCache.set(codeKey, standard);
      this.standardsCache.set(`id-${standard.id}`, standard);
    }
    
    return standard;
  }

  async getStandardsByGradeAndSubject(gradeLevel: string, subjectArea: string): Promise<Standard[]> {
    // Create cache key for this specific query
    const cacheKey = `${gradeLevel}-${subjectArea}`;
    
    // Check cache first
    if (this.standardsByGradeSubjectCache.has(cacheKey)) {
      return this.standardsByGradeSubjectCache.get(cacheKey)!;
    }
    
    // If not in cache, get from database
    const results = await db
      .select()
      .from(standards)
      .where(
        and(
          eq(standards.gradeLevel, gradeLevel),
          eq(standards.subjectArea, subjectArea)
        )
      );
    
    // Store in cache
    this.standardsByGradeSubjectCache.set(cacheKey, results);
    
    // Also cache individual standards
    for (const standard of results) {
      this.standardsCache.set(`id-${standard.id}`, standard);
      this.standardsCache.set(`code-${standard.code}`, standard);
    }
    
    return results;
  }

  async createStandard(insertStandard: InsertStandard): Promise<Standard> {
    const [standard] = await db.insert(standards).values(insertStandard).returning();
    
    if (standard) {
      // Update various caches
      this.standardsCache.set(`id-${standard.id}`, standard);
      this.standardsCache.set(`code-${standard.code}`, standard);
      
      // Clear the grade/subject cache since it might be affected
      const cacheKey = `${standard.gradeLevel}-${standard.subjectArea}`;
      this.standardsByGradeSubjectCache.delete(cacheKey);
    }
    
    return standard;
  }
}

export const storage = new DatabaseStorage();
