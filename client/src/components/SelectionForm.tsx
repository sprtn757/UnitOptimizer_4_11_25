import { useState, useEffect } from "react";
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
  const [gradeLevel, setGradeLevel] = useState<string>("");
  const [subjectArea, setSubjectArea] = useState<string>("");

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

  // Generic function to handle scrolling issues after dropdown interaction
  const fixScrollAfterSelect = () => {
    try {
      // Instead of manipulating scrolling properties directly,
      // Just ensure the document is at a stable state
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      document.body.style.height = 'auto';
      document.documentElement.style.height = 'auto';
      
      // Reset overscroll behavior
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      
      // For mobile Safari specifically
      document.body.style.position = 'static';
      document.documentElement.style.position = 'static';
    } catch (e) {
      console.error("Error fixing scroll after select:", e);
    }
  };

  // Handle focus, blur and change events for better mobile experience
  const handleFocus = () => {
    // We don't set no-scroll here to allow scrolling the dropdown
  };
  
  const handleBlur = () => {
    // When focus leaves the select, restore scrolling
    fixScrollAfterSelect();
  };

  const handleGradeLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGradeLevel(e.target.value);
    // Use requestAnimationFrame to wait for browser to complete its work
    requestAnimationFrame(() => {
      fixScrollAfterSelect();
    });
  };

  const handleSubjectAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubjectArea(e.target.value);
    // Use requestAnimationFrame to wait for browser to complete its work
    requestAnimationFrame(() => {
      fixScrollAfterSelect();
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <div>
        <Label htmlFor="grade-level" className="block text-sm font-medium text-neutral-700 mb-1">
          Grade Level
        </Label>
        <select 
          id="grade-level" 
          value={gradeLevel} 
          onChange={handleGradeLevelChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
          value={subjectArea} 
          onChange={handleSubjectAreaChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
