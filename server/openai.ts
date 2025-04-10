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

/**
 * Estimates token count based on string length (rough approximation)
 * @param text Text to estimate token count for
 * @returns Estimated token count
 */
function estimateTokenCount(text: string): number {
  // GPT tokenization is roughly 4 characters per token on average
  return Math.ceil(text.length / 4);
}

/**
 * Chunks text to stay within token limits
 * @param text Text to chunk
 * @param maxTokens Maximum tokens per chunk
 * @returns Array of chunked text
 */
function chunkText(text: string, maxTokens: number = 8000): string[] {
  const estimatedTokens = estimateTokenCount(text);
  
  // If text is already under token limit, return as is
  if (estimatedTokens <= maxTokens) {
    return [text];
  }
  
  // Split text into chunks
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);
    const currentChunkTokens = estimateTokenCount(currentChunk);
    
    // If adding this paragraph would exceed the limit, start a new chunk
    if (currentChunkTokens + paragraphTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      // Otherwise add to current chunk
      currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Analyzes lessons in chunks to avoid token limits
 * @param lessons Array of lesson contents
 * @param gradeLevel Grade level
 * @param subjectArea Subject area
 * @returns Combined analysis of standards coverage
 */
async function analyzeLessonsInChunks(
  lessons: string[], 
  gradeLevel: string, 
  subjectArea: string, 
  unitOfStudy: string
): Promise<{
  coveredStandards: string[],
  standardsCoverage: Record<string, { 
    description: string, 
    coverage: number, 
    alignment: 'Strong' | 'Moderate' | 'Weak' 
  }>
}> {
  // Initialize result
  const coveredStandards: string[] = [];
  const standardsCoverage: Record<string, { 
    description: string, 
    coverage: number, 
    alignment: 'Strong' | 'Moderate' | 'Weak' 
  }> = {};
  
  // Process lessons in chunks with a maximum token size
  const MAX_LESSONS_PER_CHUNK = 3;
  
  for (let i = 0; i < lessons.length; i += MAX_LESSONS_PER_CHUNK) {
    const lessonChunk = lessons.slice(i, i + MAX_LESSONS_PER_CHUNK);
    const lessonContent = lessonChunk.join("\n\n--- NEXT LESSON ---\n\n");
    
    console.log(`Processing lesson chunk ${i / MAX_LESSONS_PER_CHUNK + 1} of ${Math.ceil(lessons.length / MAX_LESSONS_PER_CHUNK)}`);
    
    // Construct the prompt for this chunk
    const prompt = `
    As an educational expert, analyze these curriculum materials for ${gradeLevel} grade ${subjectArea} 
    on the topic of ${unitOfStudy || 'the given topic'}. Focus only on identifying standards coverage for this subset of lessons.
    
    LESSON CONTENT:
    ${lessonContent}
    
    Identify which California K12 content standards for ${gradeLevel} grade ${subjectArea} are covered in these lessons.
    For each standard, provide:
    1. The standard code
    2. The standard description
    3. A coverage score (0-100) indicating how thoroughly the standard is addressed
    4. An alignment rating (Strong/Moderate/Weak)
    
    Provide your analysis in JSON format with:
    - standards: Array of objects with standardCode, standardDescription, coverage, and alignment
    `;
    
    // Type the messages array
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
    
    try {
      const response = await withExponentialBackoff(async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          response_format: { type: "json_object" }
        });
      }, 3, 2000);
      
      const content = response.choices[0].message.content || "";
      const result = JSON.parse(content);
      
      // Process and merge results
      if (result.standards && Array.isArray(result.standards)) {
        for (const standard of result.standards) {
          // Add to covered standards if not already present
          if (!coveredStandards.includes(standard.standardCode)) {
            coveredStandards.push(standard.standardCode);
          }
          
          // Update standards coverage
          if (!standardsCoverage[standard.standardCode]) {
            standardsCoverage[standard.standardCode] = {
              description: standard.standardDescription,
              coverage: standard.coverage,
              alignment: standard.alignment
            };
          } else {
            // If we've seen this standard before, take the higher coverage score
            standardsCoverage[standard.standardCode].coverage = 
              Math.max(standardsCoverage[standard.standardCode].coverage, standard.coverage);
            
            // Update alignment to the stronger of the two if applicable
            const alignmentStrength = {
              'Strong': 3,
              'Moderate': 2,
              'Weak': 1
            };
            
            if (alignmentStrength[standard.alignment] > alignmentStrength[standardsCoverage[standard.standardCode].alignment]) {
              standardsCoverage[standard.standardCode].alignment = standard.alignment;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing lesson chunk ${i / MAX_LESSONS_PER_CHUNK + 1}:`, error);
      // Continue with other chunks even if one fails
    }
  }
  
  return { coveredStandards, standardsCoverage };
}

export async function analyzeCurriculum(request: CurriculumAnalysisRequest): Promise<CurriculumAnalysisResult> {
  try {
    console.log(`Starting curriculum analysis for ${request.gradeLevel} grade ${request.subjectArea}, with ${request.lessonContents.length} lessons`);
    
    // Step 1: Process lessons in chunks to identify standards coverage
    const { coveredStandards, standardsCoverage } = await analyzeLessonsInChunks(
      request.lessonContents,
      request.gradeLevel,
      request.subjectArea,
      request.unitOfStudy
    );
    
    console.log(`Standards analysis complete. Identified ${coveredStandards.length} standards.`);
    
    // Step 2: Process assessment and student responses
    const assessmentAnalysisPrompt = `
    As an educational expert, analyze these assessment materials and student responses for ${request.gradeLevel} grade ${request.subjectArea} 
    on the topic of ${request.unitOfStudy || 'the given topic'}.
    
    The curriculum covers these standards: ${JSON.stringify(coveredStandards)}
    
    ASSESSMENT:
    ${request.assessmentContent || 'No assessment provided'}
    
    STUDENT RESPONSES:
    ${request.studentResponses || 'No student responses provided'}
    
    Based on these materials:
    1. Identify student performance issues related to specific standards
    2. Provide specific recommendations to improve alignment and instruction
    
    Provide your analysis in JSON format with these sections:
    - studentPerformanceIssues: Array of issues with issue name, relatedStandards, affectedQuestions, and description
    - recommendations: Array of suggestions with recommendation, targetStandards, priority (High/Medium/Low), and description
    - overallSummary: A brief summary of the analysis
    `;
    
    // Step 3: Combine the standards analysis with assessment analysis
    return await withExponentialBackoff(async () => {
      // Create the final analysis messages
      const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [
        { 
          role: "system", 
          content: "You are an expert educational analyst specializing in curriculum alignment and assessment." 
        } as OpenAI.Chat.ChatCompletionSystemMessageParam,
        { 
          role: "user", 
          content: assessmentAnalysisPrompt 
        } as OpenAI.Chat.ChatCompletionUserMessageParam
      ];
      
      console.log("Generating final analysis");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0].message.content || "";
      
      // Parse the response
      try {
        const assessmentResult = JSON.parse(content);
        
        // Create standards gaps from our standards coverage analysis
        const standardsGaps: StandardGap[] = [];
        
        for (const standardCode of coveredStandards) {
          const coverage = standardsCoverage[standardCode];
          
          // If coverage is below 80, consider it a gap
          if (coverage.coverage < 80) {
            standardsGaps.push({
              standardCode,
              standardDescription: coverage.description,
              coverage: coverage.coverage,
              alignment: coverage.alignment,
              gapDetails: `This standard is only covered at ${coverage.coverage}% with ${coverage.alignment.toLowerCase()} alignment.`,
              affectedQuestions: []
            });
          }
        }
        
        // Combine everything into final result
        const analysisResult: CurriculumAnalysisResult = {
          standardsGaps,
          studentPerformanceIssues: assessmentResult.studentPerformanceIssues || [],
          recommendations: assessmentResult.recommendations || [],
          overallSummary: assessmentResult.overallSummary || "Analysis completed successfully."
        };
        
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
