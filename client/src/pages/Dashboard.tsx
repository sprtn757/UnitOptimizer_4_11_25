import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { SelectionForm } from "@/components/SelectionForm";
import { FileUploader } from "@/components/FileUploader";
import { ChatInterface } from "@/components/ChatInterface";
import { AnalysisResults } from "@/components/AnalysisResults";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { analyzeCurriculum, type UploadedFile, type AnalysisResult } from "@/lib/fileProcessing";

export default function Dashboard() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [curriculumSelection, setCurriculumSelection] = useState<{
    gradeLevel: string;
    subjectArea: string;
    unitOfStudy: string;
  } | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [analysisId, setAnalysisId] = useState<number | undefined>(undefined);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | undefined>(undefined);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  const isMobile = useIsMobile();
  const { toast } = useToast();

  const analysisMutation = useMutation({
    mutationFn: analyzeCurriculum,
    onSuccess: (data) => {
      setAnalysisId(data.analysisId);
      setAnalysisResult(data.result);
      setIsAnalysisComplete(true);
      toast({
        title: "Analysis Complete",
        description: "Your curriculum has been analyzed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze curriculum",
        variant: "destructive",
      });
    },
  });

  const handleSelectionChange = (selection: {
    gradeLevel: string;
    subjectArea: string;
    unitOfStudy: string;
  }) => {
    setCurriculumSelection(selection);
  };

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(files);
  };

  const handleProcessFiles = () => {
    if (!curriculumSelection) {
      toast({
        title: "Missing Selection",
        description: "Please select grade level, subject area, and unit of study.",
        variant: "destructive",
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: "No Files",
        description: "Please upload at least one file to analyze.",
        variant: "destructive",
      });
      return;
    }

    analysisMutation.mutate({
      ...curriculumSelection,
      fileIds: uploadedFiles.map((file) => file.id),
    });
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Mobile sidebar toggle */}
      {isMobile && (
        <div className="md:hidden fixed bottom-4 right-4 z-40">
          <Button 
            id="mobile-menu-button" 
            className="bg-primary text-white p-3 rounded-full shadow-lg"
            onClick={toggleMobileSidebar}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full">
        {/* Top bar */}
        <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button 
              id="mobile-sidebar-button" 
              className="p-1 rounded-md text-neutral-500 hover:bg-neutral-100 md:hidden"
              onClick={toggleMobileSidebar}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-medium">New Curriculum Analysis</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button className="text-neutral-500 hover:text-neutral-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="h-6 w-px bg-neutral-200"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                ME
              </div>
              <span className="text-sm font-medium hidden sm:inline">User</span>
            </div>
          </div>
        </div>

        {/* Main scrollable content area */}
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-neutral-50 pb-16">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">Select Curriculum Details</h3>
                
                {/* Selection Form */}
                <SelectionForm onSelectionChange={handleSelectionChange} />
                
                {/* File Uploader */}
                <FileUploader onFilesUploaded={handleFilesUploaded} />
                
                <div className="flex justify-end mt-6">
                  <Button
                    id="process-files"
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-md transition-colors duration-200 flex items-center"
                    onClick={handleProcessFiles}
                    disabled={analysisMutation.isPending || !curriculumSelection || uploadedFiles.length === 0}
                  >
                    {analysisMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>Process Files</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Chat Interface */}
            <ChatInterface analysisId={analysisId} isAnalysisComplete={isAnalysisComplete} />
            
            {/* Analysis Results */}
            <AnalysisResults result={analysisResult} isVisible={isAnalysisComplete} />
          </div>
        </main>
      </div>
    </div>
  );
}
