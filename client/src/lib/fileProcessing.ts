import { apiRequest } from "./queryClient";

export interface UploadedFile {
  id: number;
  name: string;
  type: string;
  size: number;
}

interface AnalyzeRequestBody {
  gradeLevel: string;
  subjectArea: string;
  unitOfStudy: string;
  fileIds: number[];
}

interface StandardGap {
  standardCode: string;
  standardDescription: string;
  coverage: number;
  alignment: 'Strong' | 'Moderate' | 'Weak';
  gapDetails: string;
  affectedQuestions: string[];
}

interface StudentPerformanceIssue {
  issue: string;
  relatedStandards: string[];
  affectedQuestions: string[];
  description: string;
}

interface Recommendation {
  recommendation: string;
  targetStandards: string[];
  priority: 'High' | 'Medium' | 'Low';
  description: string;
}

export interface AnalysisResult {
  standardsGaps: StandardGap[];
  studentPerformanceIssues: StudentPerformanceIssue[];
  recommendations: Recommendation[];
  overallSummary: string;
}

export interface AnalysisResponse {
  analysisId: number;
  result: AnalysisResult;
}

export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append("files", file);
  });
  
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }
    
    const data = await response.json();
    return data.files;
  } catch (error) {
    console.error("Error uploading files:", error);
    throw new Error("Failed to upload files");
  }
}

export async function analyzeCurriculum(data: AnalyzeRequestBody): Promise<AnalysisResponse> {
  try {
    const response = await apiRequest("POST", "/api/analyze", data);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error analyzing curriculum:", error);
    throw new Error("Failed to analyze curriculum");
  }
}
