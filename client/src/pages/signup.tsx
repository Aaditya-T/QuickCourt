import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Shield, ArrowLeft } from "lucide-react";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "user",
    skillLevel: "beginner",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [otpStep, setOtpStep] = useState<'form' | 'verify'>('form');
  const [otpCode, setOtpCode] = useState("");
  const { register } = useAuth();
  const { toast } = useToast();

  // Get role from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");
    if (role && ["user", "facility_owner", "admin"].includes(role)) {
      setFormData(prev => ({ ...prev, role }));
    }
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // OTP mutations
  const sendOtpMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { confirmPassword, ...userData } = data;
      return await apiRequest("/api/auth/signup/send-otp", "POST", userData);
    },
    onSuccess: () => {
      setOtpStep('verify');
      toast({
        title: "Verification Code Sent",
        description: "Please check your email for the verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { code: string; [key: string]: any }) => {
      return await apiRequest("/api/auth/signup/verify-otp", "POST", data);
    },
    onSuccess: (response: any) => {
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      toast({
        title: "Account Created",
        description: "Your account has been successfully created!",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (useOtp) {
      sendOtpMutation.mutate(formData);
    } else {
      setIsLoading(true);

      try {
        const { confirmPassword, ...registerData } = formData;
        // Ensure role is properly typed
        const typedRegisterData = {
          ...registerData,
          role: registerData.role as "user" | "facility_owner" | "admin"
        };
        await register(typedRegisterData);
        
        toast({
          title: "Account created successfully",
          description: "Welcome to QuickCourt!",
        });

        // Redirect based on role
        switch (formData.role) {
          case "facility_owner":
            setLocation("/facility-owner");
            break;
          case "admin":
            setLocation("/admin");
            break;
          default:
            setLocation("/dashboard");
        }
      } catch (error: any) {
        toast({
          title: "Registration failed",
          description: error.message || "Failed to create account. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { confirmPassword, ...userData } = formData;
    verifyOtpMutation.mutate({
      code: otpCode,
      ...userData,
    });
  };

  // If we're in OTP verification step, show OTP form
  if (useOtp && otpStep === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link href="/">
              <a className="text-3xl font-bold text-primary">QuickCourt</a>
            </Link>
            <p className="mt-2 text-gray-600">Verify your email</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Check Your Email</CardTitle>
              <CardDescription>
                We've sent a 6-digit verification code to {formData.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyOtpMutation.isPending || otpCode.length !== 6}
                >
                  {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Create Account"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setOtpStep('form')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Form
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/">
            <a className="text-3xl font-bold text-primary">QuickCourt</a>
          </Link>
          <p className="mt-2 text-gray-600">Create your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Join QuickCourt and start booking sports facilities today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    required
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  required
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="johndoe"
                />
              </div>

              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="role">Account Type</Label>
                <Select value={formData.role} onValueChange={(value) => handleChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Player</SelectItem>
                    <SelectItem value="facility_owner">Facility Owner</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "user" && (
                <div>
                  <Label htmlFor="skillLevel">Skill Level</Label>
                  <Select value={formData.skillLevel} onValueChange={(value) => handleChange("skillLevel", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  placeholder="Confirm your password"
                />
              </div>

              <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-md">
                <Mail className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <Label htmlFor="use-otp" className="text-sm font-medium">
                    Email Verification
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Enable to verify your email with a secure code
                  </p>
                </div>
                <Switch
                  id="use-otp"
                  checked={useOtp}
                  onCheckedChange={setUseOtp}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || sendOtpMutation.isPending}
              >
                {(isLoading || sendOtpMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {useOtp ? "Send Verification Code" : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/login">
                <a className="font-medium text-primary hover:text-primary/80">
                  Sign in
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
