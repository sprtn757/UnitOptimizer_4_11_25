import { useState, useEffect, memo, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileSelectField } from "@/components/MobileSelectField";

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
  const isMobile = useIsMobile();

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

  const handleGradeLevelChange = useCallback((value: string) => {
    setGradeLevel(value);
  }, []);

  const handleSubjectAreaChange = useCallback((value: string) => {
    setSubjectArea(value);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <div>
        {isMobile ? (
          <MobileSelectField
            id="grade-level"
            label="Grade Level"
            options={GRADE_LEVELS}
            value={gradeLevel}
            onChange={handleGradeLevelChange}
          />
        ) : (
          <div className="space-y-2">
            <label htmlFor="grade-level" className="block text-sm font-medium text-neutral-700">
              Grade Level
            </label>
            <select 
              id="grade-level"
              value={gradeLevel}
              onChange={(e) => handleGradeLevelChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>Select grade</option>
              {GRADE_LEVELS.map((grade) => (
                <option key={grade.value} value={grade.value}>
                  {grade.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        {isMobile ? (
          <MobileSelectField
            id="subject-area"
            label="Subject Area"
            options={SUBJECT_AREAS}
            value={subjectArea}
            onChange={handleSubjectAreaChange}
          />
        ) : (
          <div className="space-y-2">
            <label htmlFor="subject-area" className="block text-sm font-medium text-neutral-700">
              Subject Area
            </label>
            <select 
              id="subject-area"
              value={subjectArea}
              onChange={(e) => handleSubjectAreaChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>Select subject</option>
              {SUBJECT_AREAS.map((subject) => (
                <option key={subject.value} value={subject.value}>
                  {subject.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
