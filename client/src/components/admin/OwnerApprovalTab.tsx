import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserCheck, Clock, MapPin, Phone, Calendar, Check, X, FileText, MessageCircle, User, XCircle } from "lucide-react";

const mockOwners = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@example.com',
    phone: '+91 98765 43210',
    location: 'Mumbai, Maharashtra',
    appliedDate: 'Jan 18, 2024',
    businessDetails: 'Owns 3 premium badminton courts in Mumbai with 5+ years experience in sports facility management. Looking to expand digital presence.',
    experience: '5+ years',
    facilities: '3 courts',
    businessLicense: 'verified',
    taxRegistration: 'verified'
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91 87654 32109',
    location: 'Delhi, NCR',
    appliedDate: 'Jan 16, 2024',
    businessDetails: 'Tennis academy owner with professional coaching certification. Manages 2 tennis courts and provides coaching services.',
    experience: '8+ years',
    facilities: '2 courts',
    businessLicense: 'verified',
    coachingLicense: 'verified'
  }
];

export default function OwnerApprovalTab() {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [currentOwnerId, setCurrentOwnerId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (ownerId: string) => {
    if (confirm('Are you sure you want to approve this facility owner application?')) {
      alert('Owner application approved successfully! Welcome email sent.');
      // Here you would make an API call to approve the owner
    }
  };

  const handleReject = (ownerId: string) => {
    setCurrentOwnerId(ownerId);
    setIsRejectModalOpen(true);
  };

  const confirmReject = () => {
    if (rejectReason.trim() === '') {
      alert('Please provide a reason for rejection.');
      return;
    }
    
    alert('Owner application rejected. Notification email sent with reason: ' + rejectReason);
    setIsRejectModalOpen(false);
    setRejectReason('');
    setCurrentOwnerId(null);
    // Here you would make an API call to reject the owner
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl leading-6 font-semibold text-gray-900 flex items-center">
              <UserCheck className="w-6 h-6 mr-3 text-green-600" />
              Pending Facility Owner Applications
            </h3>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Clock className="w-4 h-4 mr-2" />
              2 pending
            </Badge>
          </div>

          {mockOwners.map((owner) => (
            <div key={owner.id} className="border-l-4 border-amber-400 bg-amber-50 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start space-x-6">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{owner.name}</h4>
                    <p className="text-gray-600 mb-2">{owner.email}</p>
                    <div className="flex items-center space-x-6 text-sm text-gray-500 mt-3">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {owner.location}
                      </span>
                      <span className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {owner.phone}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Applied: {owner.appliedDate}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Under Review
                </Badge>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h5 className="font-medium text-gray-900 mb-2">Business Details</h5>
                <p className="text-gray-700 text-sm mb-3">{owner.businessDetails}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Business License:</span>
                    <span className="text-green-600 ml-2 font-medium">✓ Verified</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tax Registration:</span>
                    <span className="text-green-600 ml-2 font-medium">✓ Verified</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Experience:</span>
                    <span className="text-gray-900 ml-2 font-medium">{owner.experience}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Facilities:</span>
                    <span className="text-gray-900 ml-2 font-medium">{owner.facilities}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => handleApprove(owner.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve Owner
                  </Button>
                  <Button 
                    onClick={() => handleReject(owner.id)}
                    variant="destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    View Documents
                  </Button>
                  <Button variant="outline">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <XCircle className="w-5 h-5 mr-2 text-red-600" />
              Reject Owner Application
            </DialogTitle>
            <DialogDescription>
              Please provide a detailed reason for rejecting this facility owner application.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain the reason for rejection..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
