import { 
  users, type User, type InsertUser,
  files, type File, type InsertFile,
  analyses, type Analysis, type InsertAnalysis,
  messages, type Message, type InsertMessage,
  standards, type Standard, type InsertStandard
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private analyses: Map<number, Analysis>;
  private messages: Map<number, Message>;
  private standards: Map<number, Standard>;
  private currentUserId: number;
  private currentFileId: number;
  private currentAnalysisId: number;
  private currentMessageId: number;
  private currentStandardId: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.analyses = new Map();
    this.messages = new Map();
    this.standards = new Map();
    this.currentUserId = 1;
    this.currentFileId = 1;
    this.currentAnalysisId = 1;
    this.currentMessageId = 1;
    this.currentStandardId = 1;
    
    this.initializeStandards();
  }

  // Initialize with some sample California K12 standards
  private initializeStandards() {
    const scienceStandards = [
      { code: "MS-ESS1-1", description: "Develop and use a model of the Earth-sun-moon system to describe the cyclic patterns of lunar phases, eclipses of the sun and moon, and seasons.", gradeLevel: "6", subjectArea: "science" },
      { code: "MS-ESS1-2", description: "Develop and use a model to describe the role of gravity in the motions within galaxies and the solar system.", gradeLevel: "6", subjectArea: "science" },
      { code: "MS-ESS1-3", description: "Analyze and interpret data to determine scale properties of objects in the solar system.", gradeLevel: "6", subjectArea: "science" },
      { code: "MS-ESS1-4", description: "Construct a scientific explanation based on evidence from rock strata for how the geologic time scale is used to organize Earth's 4.6-billion-year-old history.", gradeLevel: "6", subjectArea: "science" }
    ];
    
    scienceStandards.forEach(standard => {
      this.createStandard(standard);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // File methods
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByUserId(userId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId,
    );
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.currentFileId++;
    const file: File = { 
      ...insertFile, 
      id,
      uploadedAt: new Date()
    };
    this.files.set(id, file);
    return file;
  }

  async deleteFile(id: number): Promise<boolean> {
    return this.files.delete(id);
  }

  // Analysis methods
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async getAnalysesByUserId(userId: number): Promise<Analysis[]> {
    return Array.from(this.analyses.values()).filter(
      (analysis) => analysis.userId === userId,
    );
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const id = this.currentAnalysisId++;
    const analysis: Analysis = { 
      ...insertAnalysis, 
      id,
      createdAt: new Date()
    };
    this.analyses.set(id, analysis);
    return analysis;
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByAnalysisId(analysisId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (message) => message.analysisId === analysisId,
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  // Standard methods
  async getStandard(id: number): Promise<Standard | undefined> {
    return this.standards.get(id);
  }

  async getStandardByCode(code: string): Promise<Standard | undefined> {
    return Array.from(this.standards.values()).find(
      (standard) => standard.code === code,
    );
  }

  async getStandardsByGradeAndSubject(gradeLevel: string, subjectArea: string): Promise<Standard[]> {
    return Array.from(this.standards.values()).filter(
      (standard) => standard.gradeLevel === gradeLevel && standard.subjectArea === subjectArea,
    );
  }

  async createStandard(insertStandard: InsertStandard): Promise<Standard> {
    const id = this.currentStandardId++;
    const standard: Standard = { ...insertStandard, id };
    this.standards.set(id, standard);
    return standard;
  }
}

export const storage = new MemStorage();
