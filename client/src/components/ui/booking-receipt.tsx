import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Receipt, Download, Copy, MapPin, Calendar, Clock, CreditCard, QrCode, Trophy } from "lucide-react";
import QRCode from "qrcode";

interface BookingReceiptProps {
  booking: any;
  trigger?: React.ReactNode;
}

interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface Game {
  id: string;
  name: string;
  sportType: string;
}

export default function BookingReceipt({ booking, trigger }: BookingReceiptProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Fetch facility and game data when modal opens
  useEffect(() => {
    if (isOpen && booking.facilityId && !facility) {
      fetchFacilityData();
    }
    if (isOpen && booking.gameId && !game) {
      fetchGameData();
    }
  }, [isOpen, booking.facilityId, booking.gameId, facility, game]);

  const fetchFacilityData = async () => {
    try {
      const response = await fetch(`/api/facilities/${booking.facilityId}`);
      if (response.ok) {
        const facilityData = await response.json();
        setFacility(facilityData);
      }
    } catch (error) {
      console.error("Failed to fetch facility data:", error);
    }
  };

  const fetchGameData = async () => {
    try {
      const response = await fetch(`/api/games/${booking.gameId}`);
      if (response.ok) {
        const gameData = await response.json();
        setGame(gameData);
      }
    } catch (error) {
      console.error("Failed to fetch game data:", error);
    }
  };

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
      // Import html2canvas dynamically to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      
      // Render the receipt element to canvas
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        width: receiptRef.current.scrollWidth,
        height: receiptRef.current.scrollHeight
      });
      
      // Convert canvas to blob and download
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `quickcourt-receipt-${booking.id}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error("Failed to download receipt:", error);
      // Fallback to text download if html2canvas fails
      const receiptText = generateReceiptText();
      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `quickcourt-receipt-${booking.id}.txt`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const generateReceiptText = () => {
    const duration = Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60));
    
    return `QUICKCOURT - BOOKING RECEIPT
=====================================

Facility: ${facility?.name || "Loading..."}
Address: ${facility ? `${facility.address}, ${facility.city}` : "Loading..."}

Game: ${game?.name || "Loading..."}
Sport Type: ${game?.sportType || "Loading..."}

Date: ${format(new Date(booking.date), "EEEE, MMM dd, yyyy")}
Time: ${format(new Date(booking.startTime), "h:mm a")} - ${format(new Date(booking.endTime), "h:mm a")}
Duration: ${duration} hour(s)

Total Amount: ₹${booking.totalAmount}
Status: ${booking.status}

${booking.paymentIntentId ? `Transaction ID: ${booking.paymentIntentId}` : ''}

Booking ID: ${booking.id}

=====================================
Thank you for using QuickCourt!`;
  };

  const copyReceiptText = async () => {
    try {
      const receiptText = generateReceiptText();
      await navigator.clipboard.writeText(receiptText);
      // You could add a toast notification here
      alert("Receipt details copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy receipt:", error);
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
                <p className="font-medium text-sm">{facility?.name || "Loading..."}</p>
                <p className="text-xs text-gray-500">
                  {facility ? `${facility.address}, ${facility.city}` : "Loading..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-400" />
              <div>
                <p className="font-medium text-sm">{"Game"}</p>
                <p className="text-xs text-gray-500">{game?.sportType || "Loading..."}</p>
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
          <Button variant="outline" size="sm" onClick={copyReceiptText} className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}