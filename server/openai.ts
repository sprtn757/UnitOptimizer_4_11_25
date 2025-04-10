import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Helper function to execute a function with exponential backoff for rate limit handling
 * @param fn The async function to execute
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns The result of the function
 */
async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      // Don't retry if we've hit the maximum retries
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Only retry on rate limit errors (429)
      if (error.status === 429) {
        // Calculate delay with exponential backoff and jitter
        const delay = initialDelay * Math.pow(2, retries) * (0.5 + Math.random());
        console.log(`Rate limit hit, retrying in ${delay}ms (retry ${retries + 1}/${maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
      } else {
        // Not a rate limit error, don't retry
        throw error;
      }
    }
  }
}

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
    // Use exponential backoff for the API call
    return await withExponentialBackoff(async () => {
      // Prepare the contents for analysis
      const lessonContent = request.lessonContents.join("\n\n--- NEXT LESSON ---\n\n");
      
      // Construct the prompt
      const prompt = `
      As an educational expert, analyze these curriculum materials for ${request.gradeLevel} grade ${request.subjectArea} 
      on the topic of ${request.unitOfStudy || 'the given topic'}. Identify gaps and misalignments with California K12 content standards.
      
      LESSON CONTENT:
      ${lessonContent}
      
      ASSESSMENT:
      ${request.assessmentContent || 'No assessment provided'}
      
      STUDENT RESPONSES:
      ${request.studentResponses || 'No student responses provided'}
      
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
      
      // Type the messages array to satisfy TypeScript
      const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [
        { 
          role: "system", 
          content: "You are an expert educational analyst specializing in curriculum alignment and assessment." 
        } as OpenAI.Chat.ChatCompletionSystemMessageParam,
        { 
          role: "user", 
          content: prompt 
        } as OpenAI.Chat.ChatCompletionUserMessageParam
      ];
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0].message.content || "";
      
      // Parse the response
      try {
        const analysisResult: CurriculumAnalysisResult = JSON.parse(content);
        return analysisResult;
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        throw new Error("Failed to parse the analysis results. The API returned invalid JSON.");
      }
    }, 3, 2000); // 3 retries, starting with 2-second delay
  } catch (error: any) {
    console.error("Error analyzing curriculum:", error);
    
    // Provide more specific error messages for common API issues
    if (error.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later or check your OpenAI API quota.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("Authentication error with the OpenAI API. Please check your API key.");
    } else if (error.code === "insufficient_quota") {
      throw new Error("Your OpenAI API quota has been exceeded. Please check your billing details.");
    } else if (error.message && error.message.includes("JSON")) {
      throw new Error("Failed to parse the analysis results. Please try again.");
    } else {
      throw new Error("Failed to analyze curriculum materials. Please try again later.");
    }
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
    // Use exponential backoff for the API call
    return await withExponentialBackoff(async () => {
      // Construct the conversation history
      const conversationHistory = previousMessages.map(msg => ({
        role: msg.isUser ? "user" : "assistant" as const,
        content: msg.content
      }));
      
      // Convert analysis result to string for context
      const analysisContext = JSON.stringify(analysisResult);
      
      // System message with context
      const systemMessage = {
        role: "system" as const,
        content: `You are an AI curriculum assistant helping teachers improve their ${gradeLevel} grade ${subjectArea} 
        curriculum for the unit on ${unitOfStudy || 'the given topic'}. Use this analysis result for context: ${analysisContext}`
      };
      
      // Add the new user message
      const userMessage = {
        role: "user" as const,
        content: message
      };
      
      // Type the messages array to satisfy TypeScript
      const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [
        systemMessage as OpenAI.Chat.ChatCompletionSystemMessageParam,
        ...conversationHistory as OpenAI.Chat.ChatCompletionMessageParam[],
        userMessage as OpenAI.Chat.ChatCompletionUserMessageParam
      ];
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 1000
      });
      
      return response.choices[0].message.content ?? "I couldn't generate a response. Please try again.";
    }, 3, 2000); // 3 retries, starting with 2-second delay
  } catch (error: any) {
    console.error("Error getting chat response:", error);
    
    // Provide more specific error messages for common API issues
    if (error.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later or check your OpenAI API quota.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("Authentication error with the OpenAI API. Please check your API key.");
    } else if (error.code === "insufficient_quota") {
      throw new Error("Your OpenAI API quota has been exceeded. Please check your billing details.");
    } else {
      throw new Error("Failed to get AI response. Please try again later.");
    }
  }
}
