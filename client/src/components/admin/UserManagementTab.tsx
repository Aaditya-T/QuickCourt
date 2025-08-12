import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AuthUser } from "@/types";
import { 
  Users, 
  Search, 
  MoreVertical, 
  Shield, 
  UserX, 
  Eye, 
  Edit,
  Calendar,
  Mail,
  Phone,
  Camera,
  Save,
  X,
  CheckCircle
} from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: string;
  phone?: string;
  profileImage?: string;
  skillLevel?: string;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserManagementTabProps {
  users: User[];
  isLoading: boolean;
  token: string | null;
  currentUser: AuthUser | null;
  onUpdateUserRole: (userId: string, role: string) => void;
}

interface EditUserForm {
  firstName: string;
  lastName: string;
  phone: string;
  skillLevel: string;
  role: string;
}

export default function UserManagementTab({ users, isLoading, token, currentUser, onUpdateUserRole }: UserManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    firstName: "",
    lastName: "",
    phone: "",
    skillLevel: "beginner",
    role: "user"
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update user details mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User details updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditModalOpen(false);
      setEditingUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user details",
        variant: "destructive",
      });
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to ban user');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User banned successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      });
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!token) throw new Error('No authentication token');
      
      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to unban user');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User unbanned successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unban user",
        variant: "destructive",
      });
    },
  });

  // Upload profile image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      if (!token) throw new Error('No authentication token');
      
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const response = await fetch(`/api/admin/users/${userId}/profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload image');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile image updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsUploadingImage(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload profile image",
        variant: "destructive",
      });
      setIsUploadingImage(false);
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      onUpdateUserRole(userId, newRole);
      setOpenDropdown(null);
    }
  };

  const handleBanUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to ban ${userName}? This will prevent them from accessing the platform.`)) {
      banUserMutation.mutate(userId);
      setOpenDropdown(null);
    }
  };

  const handleUnbanUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to unban ${userName}? This will restore their access to the platform.`)) {
      unbanUserMutation.mutate(userId);
      setOpenDropdown(null);
    }
  };

  // Check if current user can edit the target user
  const canEditUser = (targetUser: User): boolean => {
    if (!currentUser) return false;
    
    // Admins cannot edit other admin accounts
    if (targetUser.role === "admin" && targetUser.id !== currentUser.id) {
      return false;
    }
    
    return true;
  };

  const handleEditUser = (user: User) => {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "No authentication token available. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    // Check if current user can edit this user
    if (!canEditUser(user)) {
      toast({
        title: "Access Denied",
        description: "You cannot edit other admin accounts.",
        variant: "destructive",
      });
      return;
    }
    
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || "",
      skillLevel: user.skillLevel || "beginner",
      role: user.role
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "No authentication token available. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    
    const updates: Partial<User> = {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      phone: editForm.phone || undefined,
      skillLevel: editForm.skillLevel as any,
      role: editForm.role as any
    };

    updateUserMutation.mutate({ userId: editingUser.id, updates });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingUser) return;
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "No authentication token available. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
    uploadImageMutation.mutate({ userId: editingUser.id, file });
  };

  const toggleDropdown = (userId: string) => {
    setOpenDropdown(openDropdown === userId ? null : userId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading users...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="w-6 h-6 mr-3 text-blue-600" />
              User Management
            </CardTitle>
            <div className="flex items-center space-x-2">
              {!token && (
                <Badge variant="destructive" className="text-xs">
                  No Auth Token
                </Badge>
              )}
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {users.length} total users
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
                placeholder="Search users by name, email, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.profileImage} alt={`${user.firstName} ${user.lastName}`} />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </h4>
                          <div className="text-xs text-gray-400">@{user.username}</div>
                          {user.skillLevel && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {user.skillLevel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={user.role === "admin" ? "destructive" : 
                                  user.role === "facility_owner" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {user.role === "facility_owner" ? "Facility Owner" : user.role}
                        </Badge>
                        {user.role === "admin" && user.id !== currentUser?.id && (
                          <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                            <Shield className="w-3 h-3 mr-1" />
                            Protected
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {user.isBanned ? (
                          <Badge variant="destructive" className="text-xs">
                            <UserX className="w-3 h-3 mr-1" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <DropdownMenu 
                        open={openDropdown === user.id} 
                        onOpenChange={(open) => setOpenDropdown(open ? user.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleDropdown(user.id)}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleEditUser(user)}
                            disabled={!token || !canEditUser(user)}
                            className={!canEditUser(user) ? "opacity-50 cursor-not-allowed" : ""}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {!canEditUser(user) ? "Cannot Edit Admin" : "Edit Details"}
                          </DropdownMenuItem>
                          {!user.isBanned ? (
                            <DropdownMenuItem 
                              onClick={() => handleBanUser(user.id, `${user.firstName} ${user.lastName}`)}
                              disabled={!token || user.role === "admin" || user.id === currentUser?.id}
                              className={user.role === "admin" || user.id === currentUser?.id ? "opacity-50 cursor-not-allowed" : ""}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Ban User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleUnbanUser(user.id, `${user.firstName} ${user.lastName}`)}
                              disabled={!token}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Unban User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? "No users found matching your search." : "No users found."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              Edit User Details
            </DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4">
              {/* Profile Image Section */}
              <div className="flex flex-col items-center space-y-3">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={editingUser.profileImage} alt={`${editingUser.firstName} ${editingUser.lastName}`} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                    {editingUser.firstName.charAt(0)}{editingUser.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    id="profile-image"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                  <label htmlFor="profile-image">
                    <Button variant="outline" size="sm" disabled={isUploadingImage || !token} asChild>
                      <span>
                        <Camera className="w-4 h-4 mr-2" />
                        {isUploadingImage ? "Uploading..." : "Change Photo"}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Phone Number"
                />
              </div>

              <div>
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select value={editForm.skillLevel} onValueChange={(value) => setEditForm({ ...editForm, skillLevel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="facility_owner">Facility Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveUser}
                  disabled={updateUserMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
