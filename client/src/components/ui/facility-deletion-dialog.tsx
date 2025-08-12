import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, EyeOff, Info } from "lucide-react";

interface FacilityDeletionDialogProps {
  open: boolean;
  onClose: () => void;
  facility: any;
  onDelete: () => void;
  onDelist: () => void;
  isDeleting: boolean;
  isDelisting: boolean;
  deletionConstraints?: {
    hasBookings: boolean;
    hasMatches: boolean;
    hasReviews: boolean;
  };
}

export default function FacilityDeletionDialog({
  open,
  onClose,
  facility,
  onDelete,
  onDelist,
  isDeleting,
  isDelisting,
  deletionConstraints
}: FacilityDeletionDialogProps) {
  const [action, setAction] = useState<"delete" | "delist" | null>(null);

  const handleConfirm = () => {
    if (action === "delete") {
      onDelete();
    } else if (action === "delist") {
      onDelist();
    }
  };

  const canDelete = !deletionConstraints || 
    (!deletionConstraints.hasBookings && 
     !deletionConstraints.hasMatches && 
     !deletionConstraints.hasReviews);

  const hasConstraints = deletionConstraints && 
    (deletionConstraints.hasBookings || 
     deletionConstraints.hasMatches || 
     deletionConstraints.hasReviews);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            {action === "delist" ? "Delist Facility" : "Delete Facility"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              {action === "delist" 
                ? `Are you sure you want to delist "${facility?.name}"?`
                : `Are you sure you want to delete "${facility?.name}"?`
              }
            </p>
            
            {action === "delist" ? (
              <p className="text-xs text-gray-500">
                The facility will be hidden from users but all data will be preserved.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                This action cannot be undone and will remove all associated data.
              </p>
            )}
          </div>

          {hasConstraints && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800">
                  <p className="font-medium mb-1">This facility cannot be deleted because it has:</p>
                  <ul className="space-y-1">
                    {deletionConstraints?.hasBookings && <li>• Historical bookings</li>}
                    {deletionConstraints?.hasMatches && <li>• Historical matches</li>}
                    {deletionConstraints?.hasReviews && <li>• User reviews</li>}
                  </ul>
                  <p className="mt-2 font-medium">Please delist the facility instead to preserve this data.</p>
                </div>
              </div>
            </div>
          )}

          {!action && (
            <div className="space-y-3">
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => setAction("delete")}
                  className="w-full justify-start"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => setAction("delist")}
                className="w-full justify-start"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Delist Facility
              </Button>
            </div>
          )}

          {action && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAction(null)}
                disabled={isDeleting || isDelisting}
                className="flex-1"
              >
                Back
              </Button>
              
              <Button
                variant={action === "delete" ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={isDeleting || isDelisting}
                className="flex-1"
              >
                {isDeleting || isDelisting ? "Processing..." : 
                  action === "delete" ? "Delete Facility" : "Delist Facility"
                }
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
