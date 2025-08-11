import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Receipt, Download, Share2, MapPin, Calendar, Clock, CreditCard, QrCode, Trophy } from "lucide-react";
import QRCode from "qrcode";

interface BookingReceiptProps {
  booking: any;
  trigger?: React.ReactNode;
}

export default function BookingReceipt({ booking, trigger }: BookingReceiptProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const generateQRCode = async () => {
    try {
      // Generate QR code that links to the facility page
      const facilityUrl = `${window.location.origin}/facilities/${booking.facilityId}`;
      const qrUrl = await QRCode.toDataURL(facilityUrl, {
        width: 150,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff"
        }
      });
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !qrCodeUrl) {
      generateQRCode();
    }
  };

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;

    try {
      // Create a temporary canvas to render the receipt
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const receiptElement = receiptRef.current;
      const rect = receiptElement.getBoundingClientRect();
      
      canvas.width = rect.width * 2; // Higher resolution
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      // Set white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Create download link
      const link = document.createElement("a");
      link.download = `quickcourt-receipt-${booking.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to download receipt:", error);
    }
  };

  const shareReceipt = async () => {
    try {
      const facilityUrl = `${window.location.origin}/facilities/${booking.facilityId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: "QuickCourt Booking Receipt",
          text: `Check out my booking at ${booking.facility?.name || "this facility"}!`,
          url: facilityUrl,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(facilityUrl);
        alert("Facility link copied to clipboard!");
      }
    } catch (error) {
      console.error("Failed to share receipt:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Receipt className="w-4 h-4 mr-2" />
            Receipt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Booking Receipt
          </DialogTitle>
        </DialogHeader>
        
        <div ref={receiptRef} className="bg-white p-6 space-y-4 border rounded-lg">
          {/* Platform Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold text-blue-600">QuickCourt</h1>
            <p className="text-sm text-gray-500">Sports Facility Booking Platform</p>
          </div>

          {/* Booking Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium text-sm">{booking.facility?.name || "Facility"}</p>
                <p className="text-xs text-gray-500">
                  {booking.facility?.address}, {booking.facility?.city}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium text-sm">{booking.game?.name || "Game"}</p>
                <p className="text-xs text-gray-500">{booking.game?.sportType}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium text-sm">
                  {format(new Date(booking.date), "EEEE, MMM dd, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium text-sm">
                  {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
                </p>
                <p className="text-xs text-gray-500">
                  Duration: {Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60))} hour(s)
                </p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Amount:</span>
              <span className="font-bold text-lg">₹{booking.totalAmount}</span>
            </div>
            
            {booking.paymentIntentId && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Transaction ID:</p>
                  <p className="font-mono text-xs break-all">{booking.paymentIntentId}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge 
                variant={
                  booking.status === "confirmed" ? "default" :
                  booking.status === "cancelled" ? "destructive" :
                  "secondary"
                }
              >
                {booking.status}
              </Badge>
            </div>
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <div className="text-center border-t pt-4">
              <p className="text-xs text-gray-500 mb-2">Scan to view facility:</p>
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
            </div>
          )}

          {/* Booking ID */}
          <div className="text-center text-xs text-gray-400 border-t pt-2">
            Booking ID: {booking.id}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={downloadReceipt} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={shareReceipt} className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}