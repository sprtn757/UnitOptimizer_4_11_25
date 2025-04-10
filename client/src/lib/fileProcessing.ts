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
      let errorMessage = "Failed to analyze curriculum";
      let responseClone = response.clone(); // Clone the response so we can read it twice
      
      try {
        // Try to parse error response as JSON
        const errorData = await responseClone.json();
        errorMessage = errorData.message || errorMessage;
        
        // Handle specific error types
        if (response.status === 429 || errorData.errorType === 'rate_limit') {
          errorMessage = "API rate limit exceeded. Please try again later.";
        } else if (response.status === 402 || errorData.errorType === 'quota_exceeded') {
          errorMessage = "OpenAI API quota exceeded. Please contact support to update your plan.";
        } else if (response.status === 401 || errorData.errorType === 'auth_error') {
          errorMessage = "Authentication error with the OpenAI API. Please check your credentials.";
        }
      } catch (parseError) {
        // If we can't parse as JSON, use the text response
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch (e) {
          // Do nothing, fall back to default error message
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const responseData = await response.json();
    return responseData;
  } catch (error: any) {
    console.error("Error analyzing curriculum:", error);
    
    // Preserve the detailed error message if it exists
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Failed to analyze curriculum");
    }
  }
}
