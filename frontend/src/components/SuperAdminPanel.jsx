import { useState, useEffect } from "react";
import { axiosInstance } from "../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Edit, Car, ClipboardList, MessageSquare, FileText, User } from "lucide-react";

const SuperAdminPanel = () => {
  const [sessions, setSessions] = useState([]);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [expandedParticipants, setExpandedParticipants] = useState({});
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [clockInOutDialog, setClockInOutDialog] = useState({ open: false, participant: null, sessionId: null });
  const [vehicleDialog, setVehicleDialog] = useState({ open: false, participant: null, sessionId: null });
  const [testDialog, setTestDialog] = useState({ open: false, participant: null, sessionId: null, testType: null });
  const [checklistDialog, setChecklistDialog] = useState({ open: false, participant: null, sessionId: null });
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, participant: null, sessionId: null });

  // Form states
  const [clockForm, setClockForm] = useState({ clockIn: "", clockOut: "" });
  const [vehicleForm, setVehicleForm] = useState({ plateNumber: "", type: "" });
  const [testForm, setTestForm] = useState({ score: "" });
  const [checklistForm, setChecklistForm] = useState({ items: [] });
  const [feedbackForm, setFeedbackForm] = useState({ responses: [] });

  useEffect(() => {
    loadActiveSessions();
  }, []);

  const loadActiveSessions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/sessions");
      // Filter only active/upcoming sessions
      const today = new Date();
      const activeSessions = response.data.filter(s => {
        const endDate = new Date(s.end_date);
        return endDate >= today || s.status === "active";
      });
      setSessions(activeSessions);
    } catch (error) {
      toast.error("Failed to load sessions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSessionExpand = async (sessionId) => {
    if (expandedSessions[sessionId]) {
      // Collapse
      setExpandedSessions(prev => ({ ...prev, [sessionId]: null }));
    } else {
      // Expand and load participants
      try {
        const response = await axiosInstance.get(`/sessions/${sessionId}/participants`);
        
        // Enrich with status
        const enriched = await Promise.all(response.data.map(async (p) => {
          const participantUser = p.user || p;
          
          try {
            const [testsRes, checklistRes, attendanceRes] = await Promise.all([
              axiosInstance.get(`/tests/results/participant/${participantUser.id}`).catch(() => ({ data: [] })),
              axiosInstance.get(`/vehicle-checklists/${sessionId}/${participantUser.id}`).catch(() => ({ data: [] })),
              axiosInstance.get(`/attendance/session/${sessionId}/participant/${participantUser.id}`).catch(() => ({ data: [] }))
            ]);
            
            const sessionTests = testsRes.data.filter(t => t.session_id === sessionId);
            const preTest = sessionTests.find(t => t.test_type === "pre");
            const postTest = sessionTests.find(t => t.test_type === "post");
            
            return {
              ...participantUser,
              sessionId,
              attendance: attendanceRes.data || [],
              preTest: preTest ? { ...preTest, completed: true } : { completed: false },
              postTest: postTest ? { ...postTest, completed: true } : { completed: false },
              checklist: checklistRes.data?.length > 0 ? { completed: true, data: checklistRes.data } : { completed: false }
            };
          } catch (error) {
            return {
              ...participantUser,
              sessionId,
              attendance: [],
              preTest: { completed: false },
              postTest: { completed: false },
              checklist: { completed: false }
            };
          }
        }));
        
        setExpandedSessions(prev => ({ ...prev, [sessionId]: enriched }));
      } catch (error) {
        toast.error("Failed to load participants");
        console.error(error);
      }
    }
  };

  const toggleParticipantExpand = (participantId) => {
    setExpandedParticipants(prev => ({
      ...prev,
      [participantId]: !prev[participantId]
    }));
  };

  // Handle Clock In/Out
  const handleClockInOut = async () => {
    try {
      const { participant, sessionId } = clockInOutDialog;
      
      if (clockForm.clockIn) {
        await axiosInstance.post("/super-admin/attendance/clock-in", null, {
          params: {
            session_id: sessionId,
            participant_id: participant.id,
            clock_in: new Date(clockForm.clockIn).toISOString()
          }
        });
      }
      
      if (clockForm.clockOut) {
        await axiosInstance.post("/super-admin/attendance/clock-out", null, {
          params: {
            session_id: sessionId,
            participant_id: participant.id,
            clock_out: new Date(clockForm.clockOut).toISOString()
          }
        });
      }
      
      toast.success("Attendance updated successfully");
      setClockInOutDialog({ open: false, participant: null, sessionId: null });
      toggleSessionExpand(sessionId); // Refresh
    } catch (error) {
      toast.error("Failed to update attendance");
      console.error(error);
    }
  };

  // Handle Vehicle Details
  const handleVehicleSubmit = async () => {
    try {
      const { participant, sessionId } = vehicleDialog;
      
      await axiosInstance.post("/super-admin/vehicle-details", null, {
        params: {
          session_id: sessionId,
          participant_id: participant.id,
          vehicle_plate_number: vehicleForm.plateNumber,
          vehicle_type: vehicleForm.type
        }
      });
      
      toast.success("Vehicle details saved");
      setVehicleDialog({ open: false, participant: null, sessionId: null });
      toggleSessionExpand(sessionId);
    } catch (error) {
      toast.error("Failed to save vehicle details");
      console.error(error);
    }
  };

  // Handle Test Submission with auto-generated answers
  const handleTestSubmit = async () => {
    try {
      const { participant, sessionId, testType } = testDialog;
      const score = parseFloat(testForm.score);
      
      if (isNaN(score) || score < 0 || score > 100) {
        toast.error("Please enter a valid score between 0-100");
        return;
      }
      
      // Get program and test details
      const sessionRes = await axiosInstance.get(`/sessions/${sessionId}`);
      const program = sessionRes.data;
      
      const testsRes = await axiosInstance.get(`/tests/program/${program.program_id}`);
      const test = testsRes.data.find(t => t.test_type === testType);
      
      if (!test) {
        toast.error(`No ${testType}-test found for this program`);
        return;
      }
      
      // Auto-generate answers based on score
      const totalQuestions = test.questions.length;
      const correctAnswersNeeded = Math.round((score / 100) * totalQuestions);
      
      // Create answers array: first N correct, rest wrong
      const answers = test.questions.map((q, index) => {
        if (index < correctAnswersNeeded) {
          return q.correct_answer; // Correct
        } else {
          // Wrong answer (pick any option that's not correct)
          const wrongOptions = [0, 1, 2, 3].filter(opt => opt !== q.correct_answer);
          return wrongOptions[0];
        }
      });
      
      const passed = score >= (program.pass_percentage || 70);
      
      await axiosInstance.post("/tests/super-admin-submit", {
        test_id: test.id,
        session_id: sessionId,
        participant_id: participant.id,
        answers: answers
      });
      
      toast.success(`${testType === 'pre' ? 'Pre' : 'Post'}-test submitted with ${score}% (${correctAnswersNeeded}/${totalQuestions} correct)`);
      setTestDialog({ open: false, participant: null, sessionId: null, testType: null });
      toggleSessionExpand(sessionId);
    } catch (error) {
      toast.error("Failed to submit test");
      console.error(error);
    }
  };

  // Handle Checklist Submission
  const handleChecklistSubmit = async () => {
    try {
      const { participant, sessionId } = checklistDialog;
      
      await axiosInstance.post("/super-admin/checklist/submit", null, {
        params: {
          session_id: sessionId,
          participant_id: participant.id
        }
      });
      
      toast.success("Checklist submitted (all items checked)");
      setChecklistDialog({ open: false, participant: null, sessionId: null });
      toggleSessionExpand(sessionId);
    } catch (error) {
      toast.error("Failed to submit checklist");
      console.error(error);
    }
  };

  // Handle Feedback Submission
  const handleFeedbackSubmit = async () => {
    try {
      const { participant, sessionId } = feedbackDialog;
      
      await axiosInstance.post("/super-admin/feedback/submit", null, {
        params: {
          session_id: sessionId,
          participant_id: participant.id
        }
      });
      
      toast.success("Feedback submitted (default responses)");
      setFeedbackDialog({ open: false, participant: null, sessionId: null });
      toggleSessionExpand(sessionId);
    } catch (error) {
      toast.error("Failed to submit feedback");
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    if (status.completed) {
      return status.passed !== undefined ? (
        status.passed ? (
          <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Passed ({status.score}%)</Badge>
        ) : (
          <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Failed ({status.score}%)</Badge>
        )
      ) : (
        <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>
      );
    }
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <CardTitle className="flex items-center">
            🔐 Super Admin - Quick Testing Panel
          </CardTitle>
          <CardDescription className="text-purple-100">
            Quickly fill in participant data for testing without logging into multiple portals. Shows only active sessions.
          </CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading active sessions...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg">No active sessions found</p>
            <p className="text-sm mt-2">Create a session in the Sessions tab to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSessionExpand(session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedSessions[session.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <div>
                      <CardTitle className="text-lg">{session.company_name} - {session.program_name}</CardTitle>
                      <CardDescription>
                        {session.start_date} to {session.end_date} • {session.location} • {session.participant_ids?.length || 0} participants
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={expandedSessions[session.id] ? "default" : "outline"}>
                    {expandedSessions[session.id] ? "Expanded" : "Click to expand"}
                  </Badge>
                </div>
              </CardHeader>

              {expandedSessions[session.id] && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {expandedSessions[session.id].map((participant) => (
                      <Card key={participant.id} className="bg-gray-50">
                        <CardHeader 
                          className="cursor-pointer hover:bg-gray-100 transition-colors py-3"
                          onClick={() => toggleParticipantExpand(participant.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {expandedParticipants[participant.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <User className="w-4 h-4" />
                              <div>
                                <p className="font-semibold">{participant.full_name}</p>
                                <p className="text-sm text-gray-600">IC: {participant.id_number}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {getStatusBadge(participant.preTest)}
                              {getStatusBadge(participant.postTest)}
                              {getStatusBadge(participant.checklist)}
                            </div>
                          </div>
                        </CardHeader>

                        {expandedParticipants[participant.id] && (
                          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-0">
                            {/* Clock In/Out */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setClockInOutDialog({ open: true, participant, sessionId: session.id });
                                setClockForm({ clockIn: "", clockOut: "" });
                              }}
                              className="flex items-center gap-2"
                            >
                              <Clock className="w-4 h-4" />
                              Clock In/Out
                            </Button>

                            {/* Vehicle Details */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVehicleDialog({ open: true, participant, sessionId: session.id });
                                setVehicleForm({ plateNumber: "", type: "" });
                              }}
                              className="flex items-center gap-2"
                            >
                              <Car className="w-4 h-4" />
                              Vehicle
                            </Button>

                            {/* Pre-Test */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTestDialog({ open: true, participant, sessionId: session.id, testType: "pre" });
                                setTestForm({ score: "" });
                              }}
                              className="flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Pre-Test
                            </Button>

                            {/* Post-Test */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTestDialog({ open: true, participant, sessionId: session.id, testType: "post" });
                                setTestForm({ score: "" });
                              }}
                              className="flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Post-Test
                            </Button>

                            {/* Checklist */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setChecklistDialog({ open: true, participant, sessionId: session.id });
                                setChecklistForm({ items: [] });
                              }}
                              className="flex items-center gap-2"
                            >
                              <ClipboardList className="w-4 h-4" />
                              Checklist
                            </Button>

                            {/* Feedback */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFeedbackDialog({ open: true, participant, sessionId: session.id });
                                setFeedbackForm({ responses: [] });
                              }}
                              className="flex items-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Feedback
                            </Button>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Clock In/Out Dialog */}
      <Dialog open={clockInOutDialog.open} onOpenChange={(open) => setClockInOutDialog({ ...clockInOutDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock In/Out - {clockInOutDialog.participant?.full_name}</DialogTitle>
            <DialogDescription>Set attendance times for this participant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clock In Time</Label>
              <Input
                type="datetime-local"
                value={clockForm.clockIn}
                onChange={(e) => setClockForm({ ...clockForm, clockIn: e.target.value })}
              />
            </div>
            <div>
              <Label>Clock Out Time</Label>
              <Input
                type="datetime-local"
                value={clockForm.clockOut}
                onChange={(e) => setClockForm({ ...clockForm, clockOut: e.target.value })}
              />
            </div>
            <Button onClick={handleClockInOut} className="w-full">
              Save Attendance
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog open={vehicleDialog.open} onOpenChange={(open) => setVehicleDialog({ ...vehicleDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vehicle Details - {vehicleDialog.participant?.full_name}</DialogTitle>
            <DialogDescription>Enter vehicle information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle Plate Number</Label>
              <Input
                value={vehicleForm.plateNumber}
                onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                placeholder="ABC1234"
              />
            </div>
            <div>
              <Label>Vehicle Type</Label>
              <Select value={vehicleForm.type} onValueChange={(val) => setVehicleForm({ ...vehicleForm, type: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleVehicleSubmit} className="w-full">
              Save Vehicle Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialog.open} onOpenChange={(open) => setTestDialog({ ...testDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {testDialog.testType === 'pre' ? 'Pre' : 'Post'}-Test - {testDialog.participant?.full_name}
            </DialogTitle>
            <DialogDescription>
              Just enter the score (0-100). System will auto-generate correct/wrong answers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Score (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={testForm.score}
                onChange={(e) => setTestForm({ score: e.target.value })}
                placeholder="85"
              />
              <p className="text-xs text-gray-500 mt-1">
                System will automatically mark questions as correct/wrong to match this score
              </p>
            </div>
            <Button onClick={handleTestSubmit} className="w-full">
              Submit Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checklist Dialog */}
      <Dialog open={checklistDialog.open} onOpenChange={(open) => setChecklistDialog({ ...checklistDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checklist - {checklistDialog.participant?.full_name}</DialogTitle>
            <DialogDescription>Mark checklist items (all items will be checked by default)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">System will fetch the program's checklist template and mark all items as checked.</p>
            <Button onClick={handleChecklistSubmit} className="w-full">
              Submit Checklist (All Checked)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog.open} onOpenChange={(open) => setFeedbackDialog({ ...feedbackDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback - {feedbackDialog.participant?.full_name}</DialogTitle>
            <DialogDescription>Submit feedback (system will use default responses)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">System will fetch the feedback template and submit with default values.</p>
            <Button onClick={handleFeedbackSubmit} className="w-full">
              Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminPanel;
