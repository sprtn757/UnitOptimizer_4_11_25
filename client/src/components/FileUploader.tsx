import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface UploadedFile {
  id: number;
  name: string;
  type: string;
  size: number;
}

const humanFileSize = (size: number): string => {
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
};

const getFileIcon = (type: string) => {
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
    return (
      <div className="p-2 bg-accent-light/10 rounded text-accent">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
        </svg>
      </div>
    );
  } else if (type.includes('pdf')) {
    return (
      <div className="p-2 bg-secondary-light/10 rounded text-secondary">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      </div>
    );
  } else if (type.includes('presentation') || type.includes('powerpoint')) {
    return (
      <div className="p-2 bg-primary-light/10 rounded text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      </div>
    );
  } else if (type.includes('document') || type.includes('word')) {
    return (
      <div className="p-2 bg-blue-100 rounded text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      </div>
    );
  } else {
    return (
      <div className="p-2 bg-gray-100 rounded text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
};

const getFileTypeLabel = (type: string): string => {
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
    return 'Excel';
  } else if (type.includes('pdf')) {
    return 'PDF';
  } else if (type.includes('presentation') || type.includes('powerpoint')) {
    return 'PowerPoint';
  } else if (type.includes('document') || type.includes('word')) {
    return 'Word';
  } else if (type.includes('text/plain')) {
    return 'Text';
  } else {
    return type.split('/')[1]?.toUpperCase() || 'File';
  }
};

interface FileUploaderProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
}

export function FileUploader({ onFilesUploaded }: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentUploadInfo, setCurrentUploadInfo] = useState<string>('');
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation<{files: UploadedFile[]}, Error, File[]>({
    mutationFn: async (filesToUpload: File[]) => {
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append("files", file);
      });
      
      setIsUploading(true);
      setUploadProgress(0);
      
      const totalSize = filesToUpload.reduce((sum, file) => sum + file.size, 0);
      let uploadedSize = 0;
      
      const xhr = new XMLHttpRequest();
      
      // Setup progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
          
          // Calculate which file is currently being uploaded based on bytes uploaded
          uploadedSize = event.loaded;
          let accumulatedSize = 0;
          let currentFileIndex = 0;
          
          for (let i = 0; i < filesToUpload.length; i++) {
            accumulatedSize += filesToUpload[i].size;
            if (uploadedSize <= accumulatedSize) {
              currentFileIndex = i;
              break;
            }
          }
          
          const currentFile = filesToUpload[currentFileIndex];
          const fileProgress = Math.min(
            100, 
            Math.round(((uploadedSize - (accumulatedSize - currentFile.size)) / currentFile.size) * 100)
          );
          
          setCurrentUploadInfo(
            `Uploading ${currentFileIndex + 1}/${filesToUpload.length}: ${currentFile.name} (${fileProgress}%)`
          );
        }
      });
      
      return new Promise<{files: UploadedFile[]}>((resolve, reject) => {
        xhr.open('POST', '/api/upload');
        xhr.setRequestHeader('Accept', 'application/json');
        
        xhr.onload = () => {
          setIsUploading(false);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText) as { files: UploadedFile[] };
              resolve(data);
            } catch (error) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(xhr.statusText || 'Upload failed'));
          }
        };
        
        xhr.onerror = () => {
          setIsUploading(false);
          reject(new Error('Network error occurred'));
        };
        
        xhr.send(formData);
      });
    },
    onSuccess: (data) => {
      setIsUploading(false);
      setUploadProgress(100);
      setCurrentUploadInfo('');
      
      toast({
        title: "Files Uploaded Successfully",
        description: `${data.files.length} files have been uploaded.`,
      });
      setFiles(prev => [...prev, ...data.files]);
      onFilesUploaded([...files, ...data.files]);
    },
    onError: (error) => {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentUploadInfo('');
      
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    // Validate file types
    const validTypes = [
      'text/plain', 
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ];
    
    const invalidFiles = acceptedFiles.filter(file => !validTypes.some(type => file.type.includes(type)));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid File Types",
        description: `Only txt, xlsx, pptx, pdf, doc, and docx files are supported.`,
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (50MB max)
    const oversizedFiles = acceptedFiles.filter(file => file.size > 50 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files Too Large",
        description: `Files must be smaller than 50MB.`,
        variant: "destructive"
      });
      return;
    }
    
    // Upload files
    uploadMutation.mutate(acceptedFiles);
  }, [uploadMutation, toast, files, onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 30,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = (id: number) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  return (
    <div id="file-upload-section" className="mt-8">
      <h3 className="text-lg font-medium mb-2">Upload Curriculum Files</h3>
      <p className="text-neutral-600 text-sm mb-4">
        Upload lesson slide decks, summative assessment, and student response files for analysis.
        Supported formats: .txt, .xlsx, .pptx, .pdf, .doc, .docx
      </p>
      
      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed border-neutral-300 rounded-lg p-4 md:p-8 text-center hover:bg-neutral-50 transition-colors duration-200 mb-4",
          isDragActive && "border-primary bg-primary-light/5",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} ref={fileInputRef} disabled={isUploading} />
        <div className="flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 text-neutral-400 mb-2 md:mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-neutral-600 font-medium mb-1 text-sm md:text-base">Drag & drop files here or</p>
          <Button
            variant="default"
            className="bg-primary-light hover:bg-primary text-sm md:text-base"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            disabled={isUploading}
          >
            Browse Files
          </Button>
          <p className="text-neutral-500 text-xs md:text-sm mt-2 md:mt-3">
            Maximum 30 files, 50MB each
          </p>
        </div>
      </div>
      
      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium text-primary">Uploading Files...</div>
            <div className="text-neutral-600">{uploadProgress}%</div>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-neutral-500 mt-1">{currentUploadInfo}</p>
        </div>
      )}
      
      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div id="file-list" className="space-y-2 mt-4">
          {files.map((file) => (
            <div key={file.id} className="bg-neutral-50 border border-neutral-200 rounded-md p-2 md:p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-neutral-500">{humanFileSize(file.size)} • {getFileTypeLabel(file.type)}</p>
                </div>
              </div>
              <button 
                className="text-neutral-400 hover:text-neutral-600 flex-shrink-0 ml-2"
                onClick={() => handleRemoveFile(file.id)}
                aria-label="Remove file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
