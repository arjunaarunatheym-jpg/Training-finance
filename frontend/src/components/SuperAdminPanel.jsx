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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, Edit, Car, ClipboardList, MessageSquare, FileText, User, Upload, X } from "lucide-react";

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
  const [vehicleForm, setVehicleForm] = useState({ vehicle_model: "", registration_number: "", roadtax_expiry: "" });
  const [testForm, setTestForm] = useState({ score: "" });
  const [checklistForm, setChecklistForm] = useState({ interval: "pre", items: [], images: {} });
  const [checklistTemplate, setChecklistTemplate] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ responses: [] });
  const [feedbackTemplate, setFeedbackTemplate] = useState(null);

  useEffect(() => {
    loadActiveSessions();
  }, []);

  const loadActiveSessions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/sessions");
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
      setExpandedSessions(prev => ({ ...prev, [sessionId]: null }));
    } else {
      try {
        const response = await axiosInstance.get(`/sessions/${sessionId}/participants`);
        
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
      toggleSessionExpand(sessionId);
    } catch (error) {
      toast.error("Failed to update attendance");
      console.error(error);
    }
  };

  // Handle Vehicle Details
  const handleVehicleSubmit = async () => {
    try {
      const { participant, sessionId } = vehicleDialog;
      
      if (!vehicleForm.vehicle_model || !vehicleForm.registration_number || !vehicleForm.roadtax_expiry) {
        toast.error("Please fill in all vehicle details");
        return;
      }
      
      await axiosInstance.post("/super-admin/vehicle-details", {
        session_id: sessionId,
        participant_id: participant.id,
        vehicle_model: vehicleForm.vehicle_model,
        registration_number: vehicleForm.registration_number,
        roadtax_expiry: vehicleForm.roadtax_expiry
      });
      
      toast.success("Vehicle details saved");
      setVehicleDialog({ open: false, participant: null, sessionId: null });
      toggleSessionExpand(sessionId);
    } catch (error) {
      toast.error("Failed to save vehicle details");
      console.error(error);
    }
  };

  // Handle Test Submission
  const handleTestSubmit = async () => {
    try {
      const { participant, sessionId, testType } = testDialog;
      const score = parseFloat(testForm.score);
      
      if (isNaN(score) || score < 0 || score > 100) {
        toast.error("Please enter a valid score between 0-100");
        return;
      }
      
      const sessionRes = await axiosInstance.get(`/sessions/${sessionId}`);
      const program = sessionRes.data;
      
      const testsRes = await axiosInstance.get(`/tests/program/${program.program_id}`);
      const test = testsRes.data.find(t => t.test_type === testType);
      
      if (!test) {
        toast.error(`No ${testType}-test found for this program`);
        return;
      }
      
      const totalQuestions = test.questions.length;
      const correctAnswersNeeded = Math.round((score / 100) * totalQuestions);
      
      const answers = test.questions.map((q, index) => {
        if (index < correctAnswersNeeded) {
          return q.correct_answer;
        } else {
          const wrongOptions = [0, 1, 2, 3].filter(opt => opt !== q.correct_answer);
          return wrongOptions[0];
        }
      });
      
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

  // Load Checklist Template
  const loadChecklistTemplate = async (sessionId) => {
    try {
      const sessionRes = await axiosInstance.get(`/sessions/${sessionId}`);
      const templatesRes = await axiosInstance.get("/checklist-templates");
      const template = templatesRes.data.find(t => t.program_id === sessionRes.data.program_id);
      
      if (!template) {
        toast.error("No checklist template found");
        return null;
      }
      
      return template;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  // Handle Checklist Dialog Open
  const openChecklistDialog = async (participant, sessionId) => {
    const template = await loadChecklistTemplate(sessionId);
    if (template) {
      setChecklistTemplate(template);
      setChecklistForm({
        interval: "pre",
        items: template.items.map(item => ({ item, checked: false, image: null })),
        images: {}
      });
      setChecklistDialog({ open: true, participant, sessionId });
    }
  };

  // Handle Checklist Item Toggle
  const toggleChecklistItem = (index) => {
    setChecklistForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  // Handle Checklist Image Upload
  const handleChecklistImageUpload = (index, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChecklistForm(prev => ({
          ...prev,
          items: prev.items.map((item, i) => 
            i === index ? { ...item, image: reader.result } : item
          )
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Checklist Submission
  const handleChecklistSubmit = async () => {
    try {
      const { participant, sessionId } = checklistDialog;
      
      await axiosInstance.post("/super-admin/checklist/submit", {
        session_id: sessionId,
        participant_id: participant.id,
        interval: checklistForm.interval,
        checklist_items: checklistForm.items.map(item => ({
          item: item.item,
          checked: item.checked,
          image_url: item.image || ""
        }))
      });
      
      toast.success("Checklist submitted successfully");
      setChecklistDialog({ open: false, participant: null, sessionId: null });
      toggleSessionExpand(sessionId);
    } catch (error) {
      toast.error("Failed to submit checklist");
      console.error(error);
    }
  };

  // Load Feedback Template
  const loadFeedbackTemplate = async (sessionId) => {
    try {
      const sessionRes = await axiosInstance.get(`/sessions/${sessionId}`);
      const templatesRes = await axiosInstance.get(`/feedback-templates/program/${sessionRes.data.program_id}`);
      
      if (!templatesRes.data || !templatesRes.data.questions) {
        toast.error("No feedback template found");
        return null;
      }
      
      return templatesRes.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  // Handle Feedback Dialog Open
  const openFeedbackDialog = async (participant, sessionId) => {
    const template = await loadFeedbackTemplate(sessionId);
    if (template) {
      setFeedbackTemplate(template);
      setFeedbackForm({
        responses: template.questions.map(q => ({ question: q.question, response: "" }))
      });
      setFeedbackDialog({ open: true, participant, sessionId });
    }
  };

  // Handle Feedback Response Change
  const handleFeedbackResponseChange = (index, value) => {
    setFeedbackForm(prev => ({
      responses: prev.responses.map((r, i) => 
        i === index ? { ...r, response: value } : r
      )
    }));
  };

  // Handle Feedback Submission
  const handleFeedbackSubmit = async () => {
    try {
      const { participant, sessionId } = feedbackDialog;
      
      await axiosInstance.post("/super-admin/feedback/submit", {
        session_id: sessionId,
        participant_id: participant.id,
        responses: feedbackForm.responses
      });
      
      toast.success("Feedback submitted successfully");
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
            Fill in participant data exactly as they would in their portal. All data syncs across all portals.
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

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVehicleDialog({ open: true, participant, sessionId: session.id });
                                setVehicleForm({ vehicle_model: "", registration_number: "", roadtax_expiry: "" });
                              }}
                              className="flex items-center gap-2"
                            >
                              <Car className="w-4 h-4" />
                              Vehicle
                            </Button>

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

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openChecklistDialog(participant, session.id)}
                              className="flex items-center gap-2"
                            >
                              <ClipboardList className="w-4 h-4" />
                              Checklist
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openFeedbackDialog(participant, session.id)}
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
      <Dialog open={clockInOutDialog.open} onOpenChange={(open) => setClockInOutDialog({ ...clockInOutDialog, open }))}>
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

      {/* Vehicle Dialog - Same as Participant Portal */}
      <Dialog open={vehicleDialog.open} onOpenChange={(open) => setVehicleDialog({ ...vehicleDialog, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vehicle Details - {vehicleDialog.participant?.full_name}</DialogTitle>
            <DialogDescription>Enter vehicle information (same form as participant portal)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle Model</Label>
              <Input
                value={vehicleForm.vehicle_model}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_model: e.target.value })}
                placeholder="Toyota Vios"
              />
            </div>
            <div>
              <Label>Registration Number (Plate Number)</Label>
              <Input
                value={vehicleForm.registration_number}
                onChange={(e) => setVehicleForm({ ...vehicleForm, registration_number: e.target.value })}
                placeholder="ABC1234"
              />
            </div>
            <div>
              <Label>Road Tax Expiry Date</Label>
              <Input
                type="date"
                value={vehicleForm.roadtax_expiry}
                onChange={(e) => setVehicleForm({ ...vehicleForm, roadtax_expiry: e.target.value })}
              />
            </div>
            <Button onClick={handleVehicleSubmit} className="w-full">
              Save Vehicle Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialog.open} onOpenChange={(open) => setTestDialog({ ...testDialog, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {testDialog.testType === 'pre' ? 'Pre' : 'Post'}-Test - {testDialog.participant?.full_name}
            </DialogTitle>
            <DialogDescription>
              Enter the score (0-100). System will auto-generate answers to match this score.
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

      {/* Checklist Dialog - Same as Trainer Portal */}
      <Dialog open={checklistDialog.open} onOpenChange={(open) => setChecklistDialog({ ...checklistDialog, open })} className="max-w-2xl">
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist - {checklistDialog.participant?.full_name}</DialogTitle>
            <DialogDescription>Check items and upload pictures (same as trainer portal)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Interval</Label>
              <Select value={checklistForm.interval} onValueChange={(val) => setChecklistForm({ ...checklistForm, interval: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre">Pre-Training</SelectItem>
                  <SelectItem value="post">Post-Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              {checklistForm.items.map((item, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklistItem(index)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label className="text-sm font-normal">{item.item}</Label>
                      <div className="mt-2">
                        {item.image ? (
                          <div className="relative inline-block">
                            <img src={item.image} alt="Checklist" className="w-32 h-32 object-cover rounded" />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => {
                                setChecklistForm(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => 
                                    i === index ? { ...it, image: null } : it
                                  )
                                }));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <div className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                              <Upload className="w-4 h-4" />
                              Upload Picture
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleChecklistImageUpload(index, e)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Button onClick={handleChecklistSubmit} className="w-full">
              Submit Checklist
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog - Same as Participant Portal */}
      <Dialog open={feedbackDialog.open} onOpenChange={(open) => setFeedbackDialog({ ...feedbackDialog, open })} className="max-w-2xl">
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback - {feedbackDialog.participant?.full_name}</DialogTitle>
            <DialogDescription>Fill in feedback form (same as participant portal)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {feedbackTemplate?.questions.map((question, index) => (
              <div key={index}>
                <Label>{question.question}</Label>
                {question.type === 'rating' ? (
                  <Select 
                    value={feedbackForm.responses[index]?.response} 
                    onValueChange={(val) => handleFeedbackResponseChange(index, val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">⭐ 1 Star</SelectItem>
                      <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
                      <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
                      <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
                      <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Textarea
                    value={feedbackForm.responses[index]?.response}
                    onChange={(e) => handleFeedbackResponseChange(index, e.target.value)}
                    placeholder="Enter your response..."
                    rows={3}
                  />
                )}
              </div>
            ))}
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