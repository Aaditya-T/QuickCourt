import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, CreditCard, X } from "lucide-react";

interface Booking {
  id: string;
  userId: string;
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: string;
  paymentIntentId?: string;
  notes?: string;
  createdAt: string;
  // We might get facility details if the API includes them
  facilityName?: string;
  facilityAddress?: string;
}

export default function Bookings() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");

  // Fetch user's bookings
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user && !!token,
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest(`/api/bookings/${bookingId}/cancel`, "PUT", {});
    },
    onSuccess: () => {
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel booking.",
        variant: "destructive",
      });
    },
  });

  const filteredBookings = bookings.filter(booking => {
    if (statusFilter === "all") return true;
    return booking.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "succeeded":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "not_required":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMMM d, yyyy");
  };

  const formatTime = (timeString: string) => {
    return format(new Date(timeString), "h:mm a");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Bookings</h1>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        {(["all", "confirmed", "pending", "cancelled"] as const).map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className="capitalize"
          >
            {status === "all" ? "All Bookings" : status}
          </Button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">
              {statusFilter === "all" ? "No bookings yet" : `No ${statusFilter} bookings`}
            </p>
            <p className="text-muted-foreground text-center">
              {statusFilter === "all" 
                ? "Start exploring facilities to make your first booking!"
                : `You don't have any ${statusFilter} bookings at the moment.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {booking.facilityName || `Booking ${booking.id.slice(0, 8)}`}
                    </CardTitle>
                    {booking.facilityAddress && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {booking.facilityAddress}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                    <Badge className={getPaymentStatusColor(booking.paymentStatus)}>
                      <CreditCard className="h-3 w-3 mr-1" />
                      {booking.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatDate(booking.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Total Amount: </span>
                      <span className="font-semibold">${booking.totalAmount}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Booked on {format(new Date(booking.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>

                {booking.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {booking.notes}
                    </p>
                  </div>
                )}

                {booking.status === "confirmed" && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelBookingMutation.mutate(booking.id)}
                      disabled={cancelBookingMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      {cancelBookingMutation.isPending ? (
                        "Cancelling..."
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Cancel Booking
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}