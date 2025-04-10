import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
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
  
  // No need for any scroll handling here - AppContainer handles it all

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

  const handleSelectionChange = useCallback((selection: {
    gradeLevel: string;
    subjectArea: string;
    unitOfStudy: string;
  }) => {
    setCurriculumSelection(selection);
  }, []);

  const handleFilesUploaded = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(files);
  }, []);

  const handleProcessFiles = useCallback(() => {
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
  }, [curriculumSelection, uploadedFiles, toast, analysisMutation]);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev);
  }, []);
  
  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return (
    <>
      {/* Sidebar */}
      <aside className={`app-sidebar scrollbar-thin ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="app-sidebar-header">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.666 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            <h1 className="text-lg font-semibold text-primary">Unit Optimizer</h1>
          </div>
        </div>
        <div className="app-sidebar-content scrollbar-thin">
          <div>
            <p className="text-xs uppercase font-semibold text-neutral-500 mb-2">Menu</p>
            <nav className="space-y-1">
              <a href="/" className="flex items-center space-x-2 p-2 rounded-lg bg-primary-light/10 text-primary font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span>Dashboard</span>
              </a>
              <a href="/analyses" className="flex items-center space-x-2 p-2 rounded-lg text-neutral-600 hover:bg-neutral-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>My Analyses</span>
              </a>
              <a href="/standards" className="flex items-center space-x-2 p-2 rounded-lg text-neutral-600 hover:bg-neutral-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
                <span>Standards Library</span>
              </a>
            </nav>

            <hr className="my-4 border-neutral-200" />

            <p className="text-xs uppercase font-semibold text-neutral-500 mt-6 mb-2">Recent Projects</p>
            <nav className="space-y-1">
              <a href="/project/1" className="flex items-center space-x-2 p-2 rounded-lg text-neutral-600 hover:bg-neutral-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-sm truncate">Grade 5 Math Unit: Fractions</span>
              </a>
              <a href="/project/2" className="flex items-center space-x-2 p-2 rounded-lg text-neutral-600 hover:bg-neutral-100">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                <span className="text-sm truncate">Grade 8 Science: Earth Systems</span>
              </a>
              <a href="/project/3" className="flex items-center space-x-2 p-2 rounded-lg text-neutral-600 hover:bg-neutral-100">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-sm truncate">Grade 3 ELA: Reading Comprehension</span>
              </a>
            </nav>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 z-20 bg-black bg-opacity-50" 
          onClick={closeMobileSidebar}
        />
      )}

      {/* Main Content */}
      <main className="app-main">
        {/* Header */}
        <header className="app-main-header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <button 
                id="mobile-sidebar-button" 
                className="p-1 rounded-md text-neutral-500 hover:bg-neutral-100 md:hidden"
                onClick={toggleMobileSidebar}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-lg font-medium">New Curriculum Analysis</h2>
            </div>
            <div className="flex items-center space-x-3">
              <button className="text-neutral-500 hover:text-neutral-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
        </header>

        {/* Content */}
        <div className="app-main-content scrollbar-thin">
          <div className="layout-contained">
            {/* Curriculum Selection Card */}
            <Card className="mb-6 shadow-sm border-neutral-200">
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
        </div>
      </main>

      {/* Mobile floating menu button */}
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
    </>
  );
}
