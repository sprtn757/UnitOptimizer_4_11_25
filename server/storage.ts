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
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFilesByUserId(userId: number): Promise<File[]> {
    return await db.select().from(files).where(eq(files.userId, userId));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(insertFile).returning();
    return file;
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id)).returning({ id: files.id });
    return result.length > 0;
  }

  // Analysis methods
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis;
  }

  async getAnalysesByUserId(userId: number): Promise<Analysis[]> {
    return await db.select().from(analyses).where(eq(analyses.userId, userId));
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db.insert(analyses).values(insertAnalysis).returning();
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
    const [standard] = await db.select().from(standards).where(eq(standards.id, id));
    return standard;
  }

  async getStandardByCode(code: string): Promise<Standard | undefined> {
    const [standard] = await db.select().from(standards).where(eq(standards.code, code));
    return standard;
  }

  async getStandardsByGradeAndSubject(gradeLevel: string, subjectArea: string): Promise<Standard[]> {
    return await db
      .select()
      .from(standards)
      .where(
        and(
          eq(standards.gradeLevel, gradeLevel),
          eq(standards.subjectArea, subjectArea)
        )
      );
  }

  async createStandard(insertStandard: InsertStandard): Promise<Standard> {
    const [standard] = await db.insert(standards).values(insertStandard).returning();
    return standard;
  }
}

export const storage = new DatabaseStorage();
