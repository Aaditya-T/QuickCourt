import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Flag, 
  Search, 
  MoreVertical, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  MessageSquare,
  Calendar,
  User
} from "lucide-react";

const mockReports = [
  {
    id: 1,
    type: "inappropriate_content",
    reportedBy: "Alice Johnson",
    reportedUser: "Bob Smith", 
    facility: "Elite Sports Complex",
    reason: "Inappropriate language in facility review",
    description: "User posted offensive language in their review of the facility.",
    status: "pending",
    priority: "medium",
    submittedAt: "2024-01-20 14:30",
    category: "Content Violation"
  },
  {
    id: 2,
    type: "fake_booking",
    reportedBy: "John Doe",
    reportedUser: "Jane Wilson",
    facility: "City Tennis Academy",
    reason: "Suspicious booking patterns",
    description: "User has been making multiple bookings and not showing up, affecting other users.",
    status: "under_review",
    priority: "high",
    submittedAt: "2024-01-19 10:15",
    category: "Booking Abuse"
  },
  {
    id: 3,
    type: "facility_issue",
    reportedBy: "Mike Chen",
    reportedUser: null,
    facility: "Downtown Basketball Court",
    reason: "Safety concerns at facility",
    description: "Poor lighting and maintenance issues that could lead to injuries.",
    status: "resolved",
    priority: "high",
    submittedAt: "2024-01-18 16:45",
    category: "Safety"
  }
];

export default function ReportsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const filteredReports = mockReports.filter(report =>
    report.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.facility.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setIsReportModalOpen(true);
    setOpenDropdown(null);
  };

  const handleResolveReport = (reportId: number) => {
    if (confirm('Are you sure you want to mark this report as resolved?')) {
      alert(`Report ${reportId} has been marked as resolved.`);
      setOpenDropdown(null);
    }
  };

  const handleDismissReport = (reportId: number) => {
    if (confirm('Are you sure you want to dismiss this report?')) {
      alert(`Report ${reportId} has been dismissed.`);
      setOpenDropdown(null);
    }
  };

  const toggleDropdown = (reportId: number) => {
    setOpenDropdown(openDropdown === reportId ? null : reportId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "under_review": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "dismissed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Flag className="w-6 h-6 mr-3 text-red-600" />
              Reports & Moderation
            </CardTitle>
            <div className="flex space-x-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {mockReports.filter(r => r.status === 'pending').length} pending
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {mockReports.filter(r => r.status === 'under_review').length} under review
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search reports by user, facility, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
                className="pl-10"
              />
            </div>
          </div>

          {/* Reports List */}
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div 
                key={report.id} 
                className={`border rounded-lg p-6 ${
                  report.priority === 'high' ? 'border-l-4 border-l-red-500 bg-red-50' :
                  report.priority === 'medium' ? 'border-l-4 border-l-yellow-500 bg-yellow-50' :
                  'border-l-4 border-l-green-500 bg-green-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <Flag className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{report.category}</h4>
                        <Badge 
                          variant="outline" 
                          className={getPriorityColor(report.priority)}
                        >
                          {report.priority} priority
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(report.status)}
                        >
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-3">{report.reason}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Reported by:</span>
                          <div className="flex items-center mt-1">
                            <User className="w-3 h-3 mr-1" />
                            {report.reportedBy}
                          </div>
                        </div>
                        {report.reportedUser && (
                          <div>
                            <span className="font-medium">Reported user:</span>
                            <div className="flex items-center mt-1">
                              <User className="w-3 h-3 mr-1" />
                              {report.reportedUser}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Facility:</span>
                          <div className="mt-1">{report.facility}</div>
                        </div>
                        <div>
                          <span className="font-medium">Submitted:</span>
                          <div className="flex items-center mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            {report.submittedAt}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu 
                    open={openDropdown === report.id} 
                    onOpenChange={(open) => setOpenDropdown(open ? report.id : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleDropdown(report.id)}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewReport(report)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {report.status !== 'resolved' && (
                        <DropdownMenuItem 
                          onClick={() => handleResolveReport(report.id)}
                          className="text-green-600"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Resolved
                        </DropdownMenuItem>
                      )}
                      {report.status !== 'dismissed' && (
                        <DropdownMenuItem 
                          onClick={() => handleDismissReport(report.id)}
                          className="text-gray-600"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Dismiss Report
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div className="text-center py-12">
                <Flag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? "No reports found matching your search." : "No reports found."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Details Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Flag className="w-5 h-5 mr-2 text-red-600" />
              Report Details - {selectedReport?.category}
            </DialogTitle>
            <DialogDescription>
              Review the full details of this report and take appropriate action.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <Badge 
                    variant="outline" 
                    className={`mt-1 ${getPriorityColor(selectedReport.priority)}`}
                  >
                    {selectedReport.priority} priority
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Badge 
                    variant="outline" 
                    className={`mt-1 ${getStatusColor(selectedReport.status)}`}
                  >
                    {selectedReport.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {selectedReport.description}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Reported by</label>
                  <p className="mt-1 text-gray-900">{selectedReport.reportedBy}</p>
                </div>
                {selectedReport.reportedUser && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Reported user</label>
                    <p className="mt-1 text-gray-900">{selectedReport.reportedUser}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Facility</label>
                  <p className="mt-1 text-gray-900">{selectedReport.facility}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Submitted</label>
                  <p className="mt-1 text-gray-900">{selectedReport.submittedAt}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Action Notes</label>
                <Textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Add notes about the action taken on this report..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>
              Close
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                alert('Report dismissed with notes: ' + actionNote);
                setIsReportModalOpen(false);
                setActionNote('');
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
            <Button 
              onClick={() => {
                alert('Report resolved with notes: ' + actionNote);
                setIsReportModalOpen(false);
                setActionNote('');
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
