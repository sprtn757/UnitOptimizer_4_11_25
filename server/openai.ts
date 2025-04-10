import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CurriculumAnalysisRequest {
  gradeLevel: string;
  subjectArea: string;
  unitOfStudy: string;
  lessonContents: string[];
  assessmentContent: string;
  studentResponses: string;
}

export interface StandardGap {
  standardCode: string;
  standardDescription: string;
  coverage: number;
  alignment: 'Strong' | 'Moderate' | 'Weak';
  gapDetails: string;
  affectedQuestions: string[];
}

export interface CurriculumAnalysisResult {
  standardsGaps: StandardGap[];
  studentPerformanceIssues: {
    issue: string;
    relatedStandards: string[];
    affectedQuestions: string[];
    description: string;
  }[];
  recommendations: {
    recommendation: string;
    targetStandards: string[];
    priority: 'High' | 'Medium' | 'Low';
    description: string;
  }[];
  overallSummary: string;
}

export async function analyzeCurriculum(request: CurriculumAnalysisRequest): Promise<CurriculumAnalysisResult> {
  try {
    // Prepare the contents for analysis
    const lessonContent = request.lessonContents.join("\n\n--- NEXT LESSON ---\n\n");
    
    // Construct the prompt
    const prompt = `
    As an educational expert, analyze these curriculum materials for ${request.gradeLevel} grade ${request.subjectArea} 
    on the topic of ${request.unitOfStudy}. Identify gaps and misalignments with California K12 content standards.
    
    LESSON CONTENT:
    ${lessonContent}
    
    ASSESSMENT:
    ${request.assessmentContent}
    
    STUDENT RESPONSES:
    ${request.studentResponses}
    
    Based on these materials:
    1. Identify standards that are insufficiently covered
    2. Find weaknesses in student performance related to specific standards
    3. Provide specific recommendations to improve alignment and instruction
    
    Provide your analysis in JSON format with these sections:
    - standardsGaps: Array of gaps with standardCode, standardDescription, coverage (0-100), alignment (Strong/Moderate/Weak), gapDetails, and affectedQuestions
    - studentPerformanceIssues: Array of issues with issue name, relatedStandards, affectedQuestions, and description
    - recommendations: Array of suggestions with recommendation, targetStandards, priority (High/Medium/Low), and description
    - overallSummary: A brief summary of the analysis
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert educational analyst specializing in curriculum alignment and assessment." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const analysisResult: CurriculumAnalysisResult = JSON.parse(response.choices[0].message.content);
    return analysisResult;
  } catch (error) {
    console.error("Error analyzing curriculum:", error);
    throw new Error("Failed to analyze curriculum materials");
  }
}

export async function getChatResponse(
  message: string, 
  gradeLevel: string,
  subjectArea: string,
  unitOfStudy: string,
  analysisResult: CurriculumAnalysisResult,
  previousMessages: { content: string, isUser: boolean }[]
): Promise<string> {
  try {
    // Construct the conversation history
    const conversationHistory = previousMessages.map(msg => ({
      role: msg.isUser ? "user" : "assistant",
      content: msg.content
    }));
    
    // Convert analysis result to string for context
    const analysisContext = JSON.stringify(analysisResult);
    
    // System message with context
    const systemMessage = {
      role: "system",
      content: `You are an AI curriculum assistant helping teachers improve their ${gradeLevel} grade ${subjectArea} 
      curriculum for the unit on ${unitOfStudy}. Use this analysis result for context: ${analysisContext}`
    };
    
    // Add the new user message
    const userMessage = {
      role: "user",
      content: message
    };
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemMessage, ...conversationHistory, userMessage],
      max_tokens: 1000
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error getting chat response:", error);
    throw new Error("Failed to get AI response");
  }
}
