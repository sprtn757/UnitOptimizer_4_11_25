import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface StandardGap {
  standardCode: string;
  standardDescription: string;
  coverage: number;
  alignment: 'Strong' | 'Moderate' | 'Weak';
  gapDetails: string;
  affectedQuestions: string[];
}

interface StudentPerformanceIssue {
  issue: string;
  relatedStandards: string[];
  affectedQuestions: string[];
  description: string;
}

interface Recommendation {
  recommendation: string;
  targetStandards: string[];
  priority: 'High' | 'Medium' | 'Low';
  description: string;
}

interface AnalysisResult {
  standardsGaps: StandardGap[];
  studentPerformanceIssues: StudentPerformanceIssue[];
  recommendations: Recommendation[];
  overallSummary: string;
}

interface AnalysisResultsProps {
  result?: AnalysisResult;
  isVisible: boolean;
}

export function AnalysisResults({ result, isVisible }: AnalysisResultsProps) {
  const [activeTab, setActiveTab] = useState('standards');

  if (!isVisible || !result) {
    return null;
  }

  // Helper function to get alignment color
  const getAlignmentColor = (alignment: string) => {
    switch (alignment) {
      case 'Strong':
        return 'bg-accent-light/10 text-accent';
      case 'Moderate':
        return 'bg-secondary-light/10 text-secondary';
      case 'Weak':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 border-red-100';
      case 'Medium':
        return 'bg-amber-50 border-amber-100';
      case 'Low':
        return 'bg-green-50 border-green-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    <div id="analysis-results" className={cn("bg-white rounded-lg shadow-sm p-6 mb-6", isVisible ? 'block' : 'hidden')}>
      <div className="mb-4">
        <h3 className="text-lg font-medium">Analysis Results</h3>
        <p className="text-neutral-600 text-sm">
          Detailed analysis of your curriculum materials against California K12 standards.
        </p>
      </div>
      
      <Tabs defaultValue="standards" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-b border-neutral-200 mb-6 w-full justify-start">
          <TabsTrigger value="standards" className="px-4">Standards Alignment</TabsTrigger>
          <TabsTrigger value="performance" className="px-4">Student Performance</TabsTrigger>
          <TabsTrigger value="suggestions" className="px-4">Improvement Suggestions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="standards" className="space-y-6">
          {/* Standards Overview */}
          <Card>
            <CardHeader className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
              <CardTitle className="text-base font-medium">Standards Coverage Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 py-3 bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Standard
                      </TableHead>
                      <TableHead className="px-4 py-3 bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Description
                      </TableHead>
                      <TableHead className="px-4 py-3 bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Coverage
                      </TableHead>
                      <TableHead className="px-4 py-3 bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Alignment
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-neutral-200">
                    {result.standardsGaps.map((gap, index) => (
                      <TableRow key={index}>
                        <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-800">
                          {gap.standardCode}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-neutral-600">
                          {gap.standardDescription}
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-neutral-200 rounded-full h-2.5">
                              <div 
                                className={cn(
                                  "h-2.5 rounded-full",
                                  gap.coverage > 70 ? "bg-accent" : 
                                  gap.coverage > 40 ? "bg-secondary" : "bg-red-500"
                                )} 
                                style={{ width: `${gap.coverage}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-sm text-neutral-600">{gap.coverage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            "px-2 py-1 text-xs font-medium rounded-full",
                            getAlignmentColor(gap.alignment)
                          )}>
                            {gap.alignment}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {/* Gap Analysis */}
          <Card>
            <CardHeader className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
              <CardTitle className="text-base font-medium">Curriculum Gap Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {result.standardsGaps
                  .filter(gap => gap.alignment !== 'Strong')
                  .map((gap, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "p-4 border rounded-lg",
                        gap.alignment === 'Weak' 
                          ? "bg-red-50 border-red-100" 
                          : "bg-amber-50 border-amber-100"
                      )}
                    >
                      <h5 className={cn(
                        "font-medium mb-2",
                        gap.alignment === 'Weak' ? "text-red-700" : "text-amber-700"
                      )}>
                        {gap.alignment === 'Weak' ? 'Critical Gap: ' : 'Moderate Gap: '} 
                        {gap.standardCode}
                      </h5>
                      <p className="text-sm text-neutral-700 mb-2">
                        {gap.gapDetails}
                      </p>
                      <div className="flex items-center text-sm text-neutral-600">
                        <span className="font-medium mr-2">Affected Standard:</span>
                        <span>{gap.standardCode}</span>
                      </div>
                      <div className="flex items-center text-sm text-neutral-600">
                        <span className="font-medium mr-2">Assessment Impact:</span>
                        <span>{gap.affectedQuestions.join(', ')}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
              <CardTitle className="text-base font-medium">Student Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {result.studentPerformanceIssues.map((issue, index) => (
                  <div key={index} className="p-4 bg-secondary-50 border border-secondary-100 rounded-lg">
                    <h5 className="font-medium text-secondary-700 mb-2">{issue.issue}</h5>
                    <p className="text-sm text-neutral-700 mb-2">
                      {issue.description}
                    </p>
                    <div className="flex items-center text-sm text-neutral-600">
                      <span className="font-medium mr-2">Related Standards:</span>
                      <span>{issue.relatedStandards.join(', ')}</span>
                    </div>
                    <div className="flex items-center text-sm text-neutral-600">
                      <span className="font-medium mr-2">Affected Questions:</span>
                      <span>{issue.affectedQuestions.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="suggestions" className="space-y-6">
          <Card>
            <CardHeader className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
              <CardTitle className="text-base font-medium">Recommendations for Improvement</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {result.recommendations.map((rec, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "p-4 border rounded-lg",
                      getPriorityColor(rec.priority)
                    )}
                  >
                    <h5 className="font-medium text-neutral-800 mb-2">{rec.recommendation}</h5>
                    <p className="text-sm text-neutral-700 mb-2">
                      {rec.description}
                    </p>
                    <div className="flex items-center text-sm text-neutral-600">
                      <span className="font-medium mr-2">Target Standards:</span>
                      <span>{rec.targetStandards.join(', ')}</span>
                    </div>
                    <div className="flex items-center text-sm text-neutral-600">
                      <span className="font-medium mr-2">Priority:</span>
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        rec.priority === 'High' ? "bg-red-100 text-red-600" : 
                        rec.priority === 'Medium' ? "bg-amber-100 text-amber-600" : 
                        "bg-green-100 text-green-600"
                      )}>{rec.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
