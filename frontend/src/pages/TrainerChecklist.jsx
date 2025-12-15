import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "../App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { ArrowLeft, Upload, Camera } from "lucide-react";

const TrainerChecklist = ({ user }) => {
  const { sessionId, participantId } = useParams();
  const navigate = useNavigate();
  
  const [participant, setParticipant] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [template, setTemplate] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingChecklist, setExistingChecklist] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load participant details
      console.log('Loading participant:', participantId);
      const participantRes = await axiosInstance.get(`/users/${participantId}`);
      console.log('Participant loaded:', participantRes.data);
      setParticipant(participantRes.data);
      
      // Load vehicle details
      console.log('Loading vehicle details for session:', sessionId, 'participant:', participantId);
      try {
        const vehicleRes = await axiosInstance.get(`/vehicle-details/${sessionId}/${participantId}`);
        console.log('Vehicle loaded:', vehicleRes.data);
        setVehicle(vehicleRes.data);
      } catch (vehicleError) {
        console.error('Vehicle details not found:', vehicleError);
        toast.error("Participant hasn't entered vehicle details yet");
        setVehicle({ 
          registration_number: 'Not provided', 
          vehicle_model: 'Not provided', 
          roadtax_expiry: 'Not provided' 
        });
      }
      
      // Load session to get program_id
      console.log('Loading session:', sessionId);
      const sessionRes = await axiosInstance.get(`/sessions/${sessionId}`);
      const programId = sessionRes.data.program_id;
      console.log('Program ID:', programId);
      
      // Load checklist template
      console.log('Loading checklist template for program:', programId);
      const templateRes = await axiosInstance.get(`/checklists/templates/program/${programId}`);
      console.log('Template loaded:', templateRes.data);
      
      // API returns array of templates, get first one
      const templates = templateRes.data;
      if (!templates || templates.length === 0) {
        toast.error("No checklist template found for this program");
        setLoading(false);
        return;
      }
      
      const template = templates[0];
      setTemplate(template);
      
      // Check for existing checklist
      console.log('Checking for existing checklist...');
      try {
        const existingRes = await axiosInstance.get(`/vehicle-checklists/${sessionId}/${participantId}`);
        console.log('Existing checklist found:', existingRes.data);
        setExistingChecklist(existingRes.data);
        setIsCompleted(existingRes.data.verification_status === 'completed');
        
        // Load existing items
        if (existingRes.data.checklist_items) {
          setChecklistItems(existingRes.data.checklist_items);
        }
      } catch (existingError) {
        console.log('No existing checklist found, creating new one');
        
        // Initialize checklist items from template
        if (template.items && template.items.length > 0) {
          const items = template.items.map(item => ({
            item: item,
            status: "good",
            comments: "",
            photo_url: null
          }));
          console.log('Initialized checklist items:', items);
          setChecklistItems(items);
        } else {
          toast.error("No checklist items in template");
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Load error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.detail || "Failed to load checklist data");
      setLoading(false);
    }
  };

  const handleStatusChange = (index, status) => {
    if (isCompleted) {
      toast.error("Cannot modify a completed checklist");
      return;
    }
    const updated = [...checklistItems];
    updated[index].status = status;
    setChecklistItems(updated);
  };

  const handleCommentsChange = (index, comments) => {
    if (isCompleted) {
      toast.error("Cannot modify a completed checklist");
      return;
    }
    const updated = [...checklistItems];
    updated[index].comments = comments;
    setChecklistItems(updated);
  };

  const handlePhotoUpload = async (index, file) => {
    if (!file) return;
    
    // If already completed, don't allow photo upload
    if (isCompleted) {
      toast.error("Cannot modify a completed checklist");
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axiosInstance.post('/checklist-photos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const updated = [...checklistItems];
      updated[index].photo_url = response.data.photo_url;
      setChecklistItems(updated);
      
      toast.success("Photo uploaded successfully");
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error("Failed to upload photo: " + (error.response?.data?.detail || error.message));
    }
  };

  const handleSubmit = async () => {
    // Prevent resubmission if already completed
    if (isCompleted) {
      toast.error("This checklist has already been submitted and cannot be resubmitted");
      return;
    }
    
    try {
      // Validate all items are filled
      for (let i = 0; i < checklistItems.length; i++) {
        if (checklistItems[i].status === "needs_repair" && !checklistItems[i].comments.trim()) {
          toast.error(`Please add repair details for: ${checklistItems[i].item}`);
          return;
        }
      }
      
      setSubmitting(true);
      
      const response = await axiosInstance.post('/trainer-checklist/submit', {
        participant_id: participantId,
        session_id: sessionId,
        items: checklistItems.map(item => ({
          item: item.item,
          status: item.status,
          comments: item.comments || "",
          photo_url: item.photo_url
        }))
      });
      
      // Mark as completed
      setIsCompleted(true);
      toast.success("✓ Checklist submitted successfully! Returning to dashboard...", {
        duration: 2000,
        style: {
          background: '#10B981',
          color: '#fff',
        }
      });
      
      // Navigate back to trainer dashboard after short delay
      setTimeout(() => {
        navigate('/trainer');
      }, 2000);
      
      setSubmitting(false);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error.response?.data?.detail || "Failed to submit checklist");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-cyan-50 p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-600">Loading checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-cyan-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/trainer-dashboard')} 
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          {isCompleted && (
            <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="text-white w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-lg">✓ Checklist Submitted Successfully</p>
                  <p className="text-sm text-green-700">
                    This checklist has been completed and saved. You may now proceed to the next participant.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Inspection Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Participant</p>
                  <p className="font-semibold">{participant?.full_name || 'Loading...'}</p>
                  <p className="text-xs text-gray-500">{participant?.email || ''}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vehicle Registration</p>
                  <p className="font-semibold">{vehicle?.registration_number || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vehicle Model</p>
                  <p className="font-semibold">{vehicle?.vehicle_model || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Roadtax Expiry</p>
                  <p className="font-semibold">{vehicle?.roadtax_expiry || 'Not provided'}</p>
                </div>
              </div>
              
              {(!vehicle?.registration_number || vehicle?.registration_number === 'Not provided') && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Participant has not entered vehicle details yet. You can still complete the checklist.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Checklist Items */}
        <div className="space-y-4">
          {checklistItems.map((item, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">{item.item}</Label>
                  </div>
                  
                  <div>
                    <Label>Status</Label>
                    <RadioGroup 
                      value={item.status} 
                      onValueChange={(value) => handleStatusChange(index, value)}
                      className="flex gap-4 mt-2"
                      disabled={isCompleted}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="good" id={`good-${index}`} disabled={isCompleted} />
                        <Label htmlFor={`good-${index}`} className={isCompleted ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>Good</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="satisfactory" id={`satisfactory-${index}`} disabled={isCompleted} />
                        <Label htmlFor={`satisfactory-${index}`} className={isCompleted ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>Satisfactory</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="needs_repair" id={`repair-${index}`} disabled={isCompleted} />
                        <Label htmlFor={`repair-${index}`} className={isCompleted ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>Needs Repair</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {item.status === "needs_repair" && (
                    <div>
                      <Label>Repair Details (Required)</Label>
                      <Textarea
                        value={item.comments}
                        onChange={(e) => handleCommentsChange(index, e.target.value)}
                        placeholder="Describe what needs to be repaired..."
                        className="mt-2"
                        rows={3}
                        disabled={isCompleted}
                      />
                    </div>
                  )}
                  
                  {item.status === "needs_repair" && (
                    <div>
                      <Label>Attach Photo (Optional)</Label>
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center gap-4">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handlePhotoUpload(index, e.target.files[0])}
                            className="hidden"
                            id={`photo-${index}`}
                            disabled={isCompleted}
                          />
                          <label htmlFor={`photo-${index}`}>
                            <Button 
                              type="button" 
                              variant="outline" 
                              asChild
                              disabled={isCompleted}
                            >
                              <span>
                                <Camera className="w-4 h-4 mr-2" />
                                {item.photo_url ? 'Change Photo' : 'Take Photo'}
                              </span>
                            </Button>
                          </label>
                          {item.photo_url && (
                            <span className="text-sm text-green-600 font-medium">✓ Photo attached</span>
                          )}
                        </div>
                        
                        {/* Photo Preview */}
                        {item.photo_url && (
                          <div className="mt-3 border-2 border-green-200 rounded-lg p-3 bg-green-50">
                            <p className="text-sm font-medium text-gray-700 mb-2">Photo Preview:</p>
                            <img 
                              src={item.photo_url} 
                              alt={`${item.item} inspection`}
                              className="w-48 h-48 object-cover rounded-lg border-2 border-gray-300"
                              onError={(e) => {
                                console.error('Image load error:', item.photo_url);
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          Camera will open on mobile devices
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button or Completed Message */}
        <div className="mt-6">
          {isCompleted ? (
            <Card className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-bold text-green-800 text-lg">Checklist Successfully Submitted</p>
                    <p className="text-sm text-green-700">You may now proceed to the next participant or return to dashboard.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-r from-green-50 to-teal-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Ready to submit?</p>
                    <p className="text-sm text-gray-600">Your name will be automatically signed upon submission</p>
                  </div>
                  <Button 
                    onClick={handleSubmit}
                    disabled={submitting || checklistItems.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? "Submitting..." : "Submit Checklist"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {isCompleted && (
          <div className="mt-6">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">This checklist has been completed</p>
                    <p className="text-sm text-blue-700">Verified by: {existingChecklist?.verified_by || 'System'}</p>
                  </div>
                  <Button 
                    onClick={() => navigate('/trainer-dashboard')}
                    variant="outline"
                    className="border-blue-500 text-blue-700 hover:bg-blue-50"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerChecklist;
