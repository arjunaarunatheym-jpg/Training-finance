import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "../App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronRight, CheckCircle, XCircle } from "lucide-react";

const ResultsSummary = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [expandedParticipant, setExpandedParticipant] = useState(null);
  const [detailedResult, setDetailedResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [sessionId]);

  const loadSummary = async () => {
    try {
      const response = await axiosInstance.get(`/sessions/${sessionId}/results-summary`);
      setSummary(response.data);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load results summary");
      navigate(-1);
    }
  };

  const loadDetailedResult = async (resultId) => {
    try {
      const response = await axiosInstance.get(`/tests/results/${resultId}`);
      setDetailedResult(response.data);
    } catch (error) {
      toast.error("Failed to load detailed result");
    }
  };

  const handleToggleExpand = (participant) => {
    if (expandedParticipant === participant.participant.id) {
      setExpandedParticipant(null);
      setDetailedResult(null);
    } else {
      setExpandedParticipant(participant.participant.id);
      // Load detailed results if available
      if (participant.pre_test.result_id) {
        loadDetailedResult(participant.pre_test.result_id);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            data-testid="back-button"
            className="mb-3 sm:mb-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-3 sm:mt-4">{summary.session_name}</h1>
          <p className="text-sm sm:text-base text-gray-600">Results Summary - {summary.participants.length} Participants</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Pre-Test Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {summary.participants.filter(p => p.pre_test && p.pre_test.completed).length} / {summary.participants.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Post-Test Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {summary.participants.filter(p => p.post_test && p.post_test.completed).length} / {summary.participants.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Feedback Submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {summary.participants.filter(p => p.feedback_submitted).length} / {summary.participants.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle>Participant Results</CardTitle>
            <CardDescription>Click on a participant to view detailed answers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.participants.map((participant) => (
                <div key={participant.participant.id}>
                  {/* Main Row */}
                  <div
                    className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleToggleExpand(participant)}
                    data-testid={`participant-${participant.participant.id}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {expandedParticipant === participant.participant.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{participant.participant.name}</h3>
                          <p className="text-sm text-gray-500 truncate">{participant.participant.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 sm:gap-6 text-sm ml-8 sm:ml-0">
                        {/* Pre-Test */}
                        <div className="text-center flex-1 sm:flex-none">
                          <p className="text-xs text-gray-500 mb-1">Pre-Test</p>
                          {participant.pre_test && participant.pre_test.completed ? (
                            <div className="flex items-center gap-1 justify-center">
                              <span className="font-semibold text-xs sm:text-sm">
                                {participant.pre_test.correct}/{participant.pre_test.total}
                              </span>
                              {participant.pre_test.passed ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not done</span>
                          )}
                        </div>
                        {/* Post-Test */}
                        <div className="text-center flex-1 sm:flex-none">
                          <p className="text-xs text-gray-500 mb-1">Post-Test</p>
                          {participant.post_test && participant.post_test.completed ? (
                            <div className="flex items-center gap-1 justify-center">
                              <span className="font-semibold text-xs sm:text-sm">
                                {participant.post_test.correct}/{participant.post_test.total}
                              </span>
                              {participant.post_test.passed ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not done</span>
                          )}
                        </div>
                        {/* Feedback */}
                        <div className="text-center flex-1 sm:flex-none">
                          <p className="text-xs text-gray-500 mb-1">Feedback</p>
                          {participant.feedback_submitted ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedParticipant === participant.participant.id && detailedResult && (
                    <div className="ml-8 mt-2 p-4 bg-white border-l-4 border-blue-500 rounded-r-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Detailed Answers - Pre-Test</h4>
                      <div className="space-y-3">
                        {detailedResult.test_questions?.map((question, qIndex) => {
                          const userAnswer = detailedResult.answers[qIndex];
                          const correctAnswer = question.correct_answer;
                          const isCorrect = userAnswer === correctAnswer;

                          return (
                            <div key={qIndex} className="p-3 bg-gray-50 rounded">
                              <p className="font-medium text-sm mb-2">Q{qIndex + 1}. {question.question}</p>
                              <div className="space-y-1 text-sm">
                                {question.options.map((option, optIndex) => {
                                  const isUserAnswer = userAnswer === optIndex;
                                  const isCorrectOption = correctAnswer === optIndex;
                                  
                                  return (
                                    <div
                                      key={optIndex}
                                      className={`px-2 py-1 rounded ${
                                        isCorrectOption
                                          ? 'bg-green-100 text-green-900 font-medium'
                                          : isUserAnswer && !isCorrect
                                          ? 'bg-red-100 text-red-900'
                                          : ''
                                      }`}
                                    >
                                      {String.fromCharCode(65 + optIndex)}. {option}
                                      {isCorrectOption && ' ✓'}
                                      {isUserAnswer && !isCorrect && ' ✗'}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsSummary;
