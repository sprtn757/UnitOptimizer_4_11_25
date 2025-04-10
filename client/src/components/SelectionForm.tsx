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

// Units by subject
const UNITS_BY_SUBJECT: Record<string, Array<{ value: string; label: string }>> = {
  math: [
    { value: "numbers-operations", label: "Numbers & Operations" },
    { value: "algebraic-thinking", label: "Algebraic Thinking" },
    { value: "geometry", label: "Geometry" },
    { value: "measurement-data", label: "Measurement & Data" },
    { value: "statistics-probability", label: "Statistics & Probability" },
  ],
  english: [
    { value: "reading-comprehension", label: "Reading Comprehension" },
    { value: "writing-process", label: "Writing Process" },
    { value: "grammar-usage", label: "Grammar & Usage" },
    { value: "vocabulary-development", label: "Vocabulary Development" },
    { value: "literature-analysis", label: "Literature Analysis" },
  ],
  science: [
    { value: "earth-space-sciences", label: "Earth & Space Sciences" },
    { value: "life-sciences", label: "Life Sciences" },
    { value: "physical-sciences", label: "Physical Sciences" },
    { value: "engineering-technology", label: "Engineering & Technology" },
    { value: "scientific-method", label: "Scientific Method" },
  ],
  "social-studies": [
    { value: "history", label: "History" },
    { value: "geography", label: "Geography" },
    { value: "civics", label: "Civics & Government" },
    { value: "economics", label: "Economics" },
    { value: "culture", label: "Culture & Society" },
  ],
  art: [
    { value: "visual-arts", label: "Visual Arts Fundamentals" },
    { value: "drawing", label: "Drawing & Sketching" },
    { value: "painting", label: "Painting & Color Theory" },
    { value: "sculpture", label: "Sculpture & 3D Design" },
    { value: "art-history", label: "Art History & Appreciation" },
  ],
  music: [
    { value: "music-theory", label: "Music Theory" },
    { value: "instrumental", label: "Instrumental Music" },
    { value: "vocal", label: "Vocal Music" },
    { value: "music-history", label: "Music History" },
    { value: "composition", label: "Composition & Arrangement" },
  ],
  pe: [
    { value: "team-sports", label: "Team Sports" },
    { value: "individual-sports", label: "Individual Sports" },
    { value: "fitness", label: "Fitness & Conditioning" },
    { value: "movement", label: "Movement & Rhythm" },
    { value: "health", label: "Health & Wellness" },
  ],
  cs: [
    { value: "programming", label: "Programming Fundamentals" },
    { value: "web-design", label: "Web Design" },
    { value: "data-science", label: "Data Science" },
    { value: "robotics", label: "Robotics" },
    { value: "digital-citizenship", label: "Digital Citizenship" },
  ],
};

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
  const [unitOfStudy, setUnitOfStudy] = useState<string>("");
  const [unitOptions, setUnitOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Update unit options when subject area changes
  useEffect(() => {
    if (subjectArea) {
      // Make sure we have units for this subject area
      const units = UNITS_BY_SUBJECT[subjectArea];
      if (units && units.length > 0) {
        setUnitOptions(units);
      } else {
        console.warn(`No units found for subject area: ${subjectArea}`);
        setUnitOptions([]);
      }
      
      // Reset unit selection
      setUnitOfStudy("");
    } else {
      setUnitOptions([]);
      setUnitOfStudy("");
    }
  }, [subjectArea]);

  // Notify parent component when selections change
  useEffect(() => {
    if (gradeLevel && subjectArea && unitOfStudy) {
      onSelectionChange({
        gradeLevel,
        subjectArea,
        unitOfStudy,
      });
    }
  }, [gradeLevel, subjectArea, unitOfStudy, onSelectionChange]);

  const handleGradeLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGradeLevel(e.target.value);
  };

  const handleSubjectAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubjectArea(e.target.value);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUnitOfStudy(e.target.value);
    
    // Reset document body overflow to ensure scrolling works after selection
    setTimeout(() => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      
      // Also reset all parent containers that might affect scrolling
      const mainContent = document.querySelector('.app-main-content');
      if (mainContent) {
        (mainContent as HTMLElement).style.overflow = 'auto';
        (mainContent as HTMLElement).style.overflowY = 'auto';
      }
    }, 0);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      <div>
        <Label htmlFor="grade-level" className="block text-sm font-medium text-neutral-700 mb-1">
          Grade Level
        </Label>
        <select 
          id="grade-level" 
          value={gradeLevel} 
          onChange={handleGradeLevelChange}
          style={{WebkitAppearance: 'menulist', appearance: 'menulist'}}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="" disabled>Select subject</option>
          {SUBJECT_AREAS.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="unit-study" className="block text-sm font-medium text-neutral-700 mb-1">
          Unit of Study
        </Label>
        <select 
          id="unit-study" 
          value={unitOfStudy} 
          onChange={handleUnitChange}
          disabled={!subjectArea || unitOptions.length === 0}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            {!subjectArea 
              ? "Please select subject area first" 
              : unitOptions.length === 0 
              ? "No units available for this subject" 
              : "Select unit"
            }
          </option>
          {unitOptions.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
