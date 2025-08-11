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
import { Building, Clock, MapPin, Check, X, Eye } from "lucide-react";

const mockFacilities = [
  {
    id: '1',
    name: 'Elite Sports Complex',
    owner: 'John Doe',
    city: 'Mumbai',
    sportType: 'Badminton',
    pricePerHour: 800,
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=100',
    description: 'Premium badminton courts with professional lighting and modern facilities.',
    amenities: ['Parking', 'Changing Room', 'Water'],
    submittedDate: 'Jan 15, 2024',
    status: 'pending'
  },
  {
    id: '2',
    name: 'City Tennis Academy',
    owner: 'Jane Smith',
    city: 'Delhi',
    sportType: 'Tennis',
    pricePerHour: 1200,
    image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=100',
    description: 'Professional tennis courts with coaching available and equipment rental services.',
    amenities: ['Parking', 'Coaching', 'Equipment Rental'],
    submittedDate: 'Jan 14, 2024',
    status: 'pending'
  }
];

export default function FacilityApprovalTab() {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [currentFacilityId, setCurrentFacilityId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (facilityId: string) => {
    if (confirm('Are you sure you want to approve this facility?')) {
      alert('Facility approved successfully!');
      // Here you would make an API call to approve the facility
    }
  };

  const handleReject = (facilityId: string) => {
    setCurrentFacilityId(facilityId);
    setIsRejectModalOpen(true);
  };

  const confirmReject = () => {
    if (rejectReason.trim() === '') {
      alert('Please provide a reason for rejection.');
      return;
    }
    
    alert('Facility rejected with reason: ' + rejectReason);
    setIsRejectModalOpen(false);
    setRejectReason('');
    setCurrentFacilityId(null);
    // Here you would make an API call to reject the facility
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl leading-6 font-semibold text-gray-900 flex items-center">
              <Building className="w-6 h-6 mr-3 text-green-600" />
              Pending Facility Approvals
            </h3>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <Clock className="w-4 h-4 mr-2" />
              2 pending
            </Badge>
          </div>

          {mockFacilities.map((facility) => (
            <div key={facility.id} className="border-l-4 border-amber-400 bg-amber-50 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start space-x-6">
                  <img 
                    src={facility.image} 
                    alt="Facility" 
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{facility.name}</h4>
                    <p className="text-gray-600 mb-2">Owner: {facility.owner}</p>
                    <div className="flex items-center space-x-6 text-sm text-gray-500 mt-3">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {facility.city}
                      </span>
                      <span className="flex items-center">
                        <span className="w-4 h-4 mr-2 rounded-full bg-blue-500"></span>
                        {facility.sportType}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        ₹{facility.pricePerHour}/hour
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Submitted: {facility.submittedDate}</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Under Review
                </Badge>
              </div>
              
              <p className="text-gray-700 mb-4">{facility.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {facility.amenities.map((amenity) => (
                  <Badge key={amenity} variant="outline" className="bg-blue-50 text-blue-700">
                    {amenity}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => handleApprove(facility.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleReject(facility.id)}
                    variant="destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Facility</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this facility registration.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this facility is being rejected..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Reject Facility
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
