import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Camera, Edit, Save, X, User, Mail, Phone, Trophy, Calendar } from "lucide-react";
import Navbar from "@/components/ui/navbar";
import { useLocation } from "wouter";

export default function Profile() {
  const { user, token, setUser, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Debug logging
  console.log("Profile component - user:", user);
  console.log("Profile component - setUser function:", setUser);
  console.log("Profile component - token:", token);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    username: user?.username || "",
    phone: user?.phone || "",
    skillLevel: user?.skillLevel || "beginner",
  });

  // Fetch fresh user data to keep profile in sync
  const { data: freshUserData } = useQuery({
    queryKey: ["user", "profile"],
    queryFn: async () => {
      const response = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user data");
      return response.json();
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use fresh user data if available, fallback to auth context user
  const currentUser = freshUserData || user;

  // Update form data when user changes
  useEffect(() => {
    if (currentUser) {
      console.log("Updating form data with current user:", currentUser);
      setFormData({
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        username: currentUser.username || "",
        phone: currentUser.phone || "",
        skillLevel: currentUser.skillLevel || "beginner",
      });
    }
  }, [currentUser]);

  // Redirect if not authenticated
  if (!currentUser || !token) {
    setLocation("/login");
    return null;
  }

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      console.log("Updating profile with data:", updates);
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Profile update failed:", error);
        throw new Error(error.message || "Failed to update profile");
      }
      
      const data = await response.json();
      console.log("Profile update response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("Profile update successful:", data);
      console.log("Data structure:", {
        hasUser: !!data.user,
        userKeys: data.user ? Object.keys(data.user) : null,
        userData: data.user
      });
      
      console.log("Step 1: Updating auth context...");
      console.log("setUser function available:", typeof setUser);
      console.log("Current user before update:", user);
      
      // Update both auth context and query cache
      setUser(data.user);
      console.log("Step 2: Auth context updated");
      console.log("New user data set:", data.user);
      
      localStorage.setItem("quickcourt_user", JSON.stringify(data.user));
      console.log("Step 3: LocalStorage updated");
      
      queryClient.setQueryData(["user", "profile"], data.user);
      console.log("Step 4: Query cache updated");
      
      // Update form data to reflect the changes immediately
      setFormData({
        firstName: data.user.firstName || "",
        lastName: data.user.lastName || "",
        username: data.user.username || "",
        phone: data.user.phone || "",
        skillLevel: data.user.skillLevel || "beginner",
      });
      console.log("Step 5: Form data updated");
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      console.log("Step 6: Toast shown");
      
      setIsEditing(false);
      console.log("Step 7: Edit mode disabled");
      
      console.log("All steps completed successfully!");
    },
    onError: (error: Error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload profile image mutation
  const uploadProfileImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profileImage", file);
      
      const response = await fetch("/api/users/me/profile-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload image");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update both auth context and query cache with new user data
      const updatedUser = { ...currentUser, profileImage: data.profileImage };
      setUser(updatedUser);
      localStorage.setItem("quickcourt_user", JSON.stringify(updatedUser));
      queryClient.setQueryData(["user", "profile"], updatedUser);
      
      toast({
        title: "Profile Image Updated",
        description: "Your profile image has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      console.log("Attempting to save profile with data:", formData);
      await updateProfileMutation.mutateAsync(formData);
    } catch (error) {
      console.error("Error in handleSave:", error);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: currentUser?.firstName || "",
      lastName: currentUser?.lastName || "",
      username: currentUser?.username || "",
      phone: currentUser?.phone || "",
      skillLevel: currentUser?.skillLevel || "beginner",
    });
    setIsEditing(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadProfileImageMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      user: "Player",
      facility_owner: "Facility Owner",
      admin: "Administrator",
    };
    return roleLabels[role] || role;
  };

  const getSkillLevelLabel = (level: string) => {
    const skillLabels: Record<string, string> = {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    };
    return skillLabels[level] || level;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
          
          {/* Debug test button */}
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log("Current user data:", currentUser);
                console.log("Form data:", formData);
                console.log("setUser function available:", !!setUser);
                toast({
                  title: "Debug Info",
                  description: "Check console for debug information",
                });
              }}
            >
              Debug Info
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Profile Picture</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="relative inline-block">
                  <Avatar className="w-32 h-32 mx-auto">
                    <AvatarImage src={currentUser.profileImage} alt={currentUser.username} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getInitials(currentUser.firstName, currentUser.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-sm">
                    {getRoleLabel(currentUser.role)}
                  </Badge>
                  {currentUser.skillLevel && getRoleLabel(currentUser.role) === "Player" && (
                    <Badge variant="outline" className="text-sm">
                      {getSkillLevelLabel(currentUser.skillLevel)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Profile Information</CardTitle>
                <div className="space-x-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" variant="outline" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    {isEditing ? (
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="Enter first name"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{currentUser.firstName}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    {isEditing ? (
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Enter last name"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{currentUser.lastName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    {isEditing ? (
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => handleInputChange("username", e.target.value)}
                        placeholder="Enter username"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{currentUser.username}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <div className="flex items-center space-x2 p-3 bg-gray-50 rounded-md">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{currentUser.phone || "Not provided"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{currentUser.email}</span>
                    <Badge variant="secondary" className="text-xs">Cannot be changed</Badge>
                  </div>
                </div>

                {/* Skill Level */}
                {currentUser.role === "user" && (
                  <div className="space-y-2">
                    <Label htmlFor="skillLevel">Skill Level</Label>
                    {isEditing ? (
                      <Select
                        value={formData.skillLevel}
                        onValueChange={(value) => handleInputChange("skillLevel", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select skill level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                        <Trophy className="w-4 h-4 text-gray-500" />
                        <span>{getSkillLevelLabel(currentUser.skillLevel || "beginner")}</span>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Account Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Account Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Member Since</Label>
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{new Date(currentUser.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Account Status</Label>
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                        <div className={`w-2 h-2 rounded-full ${currentUser.isEmailVerified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span>{currentUser.isEmailVerified ? 'Verified' : 'Pending Verification'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

