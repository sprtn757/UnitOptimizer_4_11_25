import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";

const GRADE_LEVELS = [
  { value: "1", label: "Grade 1" },
  { value: "2", label: "Grade 2" },
  { value: "3", label: "Grade 3" },
  { value: "4", label: "Grade 4" },
  { value: "5", label: "Grade 5" },
  { value: "6", label: "Grade 6" },
  { value: "7", label: "Grade 7" },
  { value: "8", label: "Grade 8" },
  { value: "9", label: "Grade 9" },
  { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" },
  { value: "12", label: "Grade 12" },
];

const SUBJECT_AREAS = [
  { value: "math", label: "Mathematics" },
  { value: "english", label: "Language Arts" },
  { value: "science", label: "Science" },
  { value: "social-studies", label: "Social Studies" },
  { value: "art", label: "Visual Arts" },
  { value: "music", label: "Music" },
  { value: "pe", label: "Physical Education" },
  { value: "cs", label: "Computer Science" },
];

interface SelectionFormProps {
  onSelectionChange: (selection: {
    gradeLevel: string;
    subjectArea: string;
    unitOfStudy: string;
  }) => void;
}

export function SelectionForm({ onSelectionChange }: SelectionFormProps) {
  // Use refs instead of state to prevent re-renders on selection
  const [gradeLevel, setGradeLevel] = useState<string>("");
  const [subjectArea, setSubjectArea] = useState<string>("");
  const formRef = useRef<HTMLDivElement>(null);
  const gradeLevelRef = useRef<HTMLSelectElement>(null);
  const subjectAreaRef = useRef<HTMLSelectElement>(null);

  // More reliable event handling with refs
  useEffect(() => {
    // Handle the selection changes on blur instead of change
    // This avoids the state update during dropdown interaction
    const handleSelectionUpdates = () => {
      const grade = gradeLevelRef.current?.value || "";
      const subject = subjectAreaRef.current?.value || "";
      
      if (grade && subject) {
        if (grade !== gradeLevel) {
          setGradeLevel(grade);
        }
        
        if (subject !== subjectArea) {
          setSubjectArea(subject);
        }
        
        if (grade && subject) {
          onSelectionChange({
            gradeLevel: grade,
            subjectArea: subject,
            unitOfStudy: "general", // Default value since we removed the dropdown
          });
        }
      }
    };
    
    // Add blur event listeners
    const gradeSelect = gradeLevelRef.current;
    const subjectSelect = subjectAreaRef.current;
    
    if (gradeSelect && subjectSelect) {
      gradeSelect.addEventListener('blur', handleSelectionUpdates);
      subjectSelect.addEventListener('blur', handleSelectionUpdates);
    }
    
    return () => {
      if (gradeSelect && subjectSelect) {
        gradeSelect.removeEventListener('blur', handleSelectionUpdates);
        subjectSelect.removeEventListener('blur', handleSelectionUpdates);
      }
    };
  }, [gradeLevel, subjectArea, onSelectionChange]);

  // Notify parent component when selections change
  useEffect(() => {
    if (gradeLevel && subjectArea) {
      onSelectionChange({
        gradeLevel,
        subjectArea,
        unitOfStudy: "general", // Default value since we removed the dropdown
      });
    }
  }, [gradeLevel, subjectArea, onSelectionChange]);
  
  // Most basic scroll fixing function possible
  const fixScroll = () => {
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.body.style.height = 'auto';
  };

  // Direct change handler that uses the DOM instead of state updates
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Don't update state here - wait until blur
    
    // Just ensure the scrolling is working
    setTimeout(fixScroll, 300);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4" ref={formRef}>
      <div>
        <Label htmlFor="grade-level" className="block text-sm font-medium text-neutral-700 mb-1">
          Grade Level
        </Label>
        <select 
          id="grade-level" 
          ref={gradeLevelRef}
          defaultValue=""
          onChange={handleChange}
          className="native-select w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="" disabled>Select grade</option>
          {GRADE_LEVELS.map((grade) => (
            <option key={grade.value} value={grade.value}>
              {grade.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="subject-area" className="block text-sm font-medium text-neutral-700 mb-1">
          Subject Area
        </Label>
        <select 
          id="subject-area" 
          ref={subjectAreaRef}
          defaultValue=""
          onChange={handleChange}
          className="native-select w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="" disabled>Select subject</option>
          {SUBJECT_AREAS.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
