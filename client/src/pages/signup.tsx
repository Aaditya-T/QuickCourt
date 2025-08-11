import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Shield, ArrowLeft } from "lucide-react";
import { Form } from "@/components/ui/form";
import ValidatedFormField from "@/components/ui/validated-form-field";
import FormErrorDisplay from "@/components/ui/form-error-display";
import { useFormValidation } from "@/hooks/use-form-validation";
import { signupFormSchema, otpVerificationSchema, type SignupFormData, type OtpVerificationData } from "@shared/validation";

export default function Signup() {
  const [, setLocation] = useLocation();
  const [otpStep, setOtpStep] = useState<'form' | 'verify'>('form');
  const { register } = useAuth();
  const { toast } = useToast();

  // Main signup form
  const signupForm = useFormValidation<SignupFormData>({
    schema: signupFormSchema,
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "user",
      skillLevel: "beginner",
    },
  });

  // OTP verification form
  const otpForm = useFormValidation<OtpVerificationData>({
    schema: otpVerificationSchema,
    defaultValues: {
      code: "",
    },
  });

  // Get role from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");
    if (role && ["user", "facility_owner"].includes(role)) {
      signupForm.setValue("role", role as "user" | "facility_owner");
    }
  }, [signupForm]);

  // OTP mutations
  const sendOtpMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
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
      toast({
        title: "Account Created Successfully!",
        description: "Please login with your credentials to access your account.",
      });
      
      // Redirect to login page after successful signup
      setLocation("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = signupForm.handleSubmit(
    async (data: SignupFormData) => {
      // Send OTP for signup
      sendOtpMutation.mutate(data);
    },
    (errors) => {
      toast({
        title: "Form Validation Failed",
        description: "Please fix the errors in the form and try again.",
        variant: "destructive",
      });
    }
  );

  const handleOtpSubmit = otpForm.handleSubmit(
    async (otpData: OtpVerificationData) => {
      const signupData = signupForm.getValues();
      const { confirmPassword, ...userData } = signupData;
      verifyOtpMutation.mutate({
        code: otpData.code,
        ...userData,
      });
    },
    (errors) => {
      toast({
        title: "OTP Validation Failed",
        description: "Please enter a valid 6-digit code.",
        variant: "destructive",
      });
    }
  );

  // If we're in OTP verification step, show OTP form
  if (otpStep === 'verify') {
    return (
      <div className="min-h-screen flex">
        {/* Left side - Image (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-0">
          <img
            src="https://playo.gumlet.io/NOTOUTBOXCRICKET20241014080826692939/NotOutBoxCricket1729064460099.jpg"
            alt="Sports facility"
            className="absolute inset-0 w-full h-full object-cover blur-sm"
          />
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative z-10 max-w-md text-white text-center p-12">
            <div className="mb-8">
              <div className="w-32 h-32 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold mb-4">Almost There!</h1>
              <p className="text-xl text-white/90">
                Just one more step to verify your email address and join QuickCourt.
              </p>
            </div>
            <div className="space-y-4 text-white/80">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Secure account verification</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Email confirmation</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Protected platform access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
                  We've sent a 6-digit verification code to {signupForm.getValues("email")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...otpForm}>
                  <form onSubmit={handleOtpSubmit} className="space-y-4">
                    <ValidatedFormField
                      name="code"
                      label="Verification Code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      className="text-center text-lg tracking-widest"
                      required
                      description="Enter the 6-digit code sent to your email"
                    />
                    
                    <FormErrorDisplay />
                    
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={verifyOtpMutation.isPending || !otpForm.formState.isValid}
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
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-0">
        <img
          src="https://playo.gumlet.io/NOTOUTBOXCRICKET20241014080826692939/NotOutBoxCricket1729064460099.jpg"
          alt="Sports facility"
          className="absolute inset-0 w-full h-full object-cover blur-sm"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 max-w-md text-white text-center p-12">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4">Join QuickCourt!</h1>
            <p className="text-xl text-white/90">
              Start your journey with us and discover amazing sports facilities near you.
            </p>
          </div>
          <div className="space-y-4 text-white/80">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Easy facility booking</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Connect with players</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Manage your sports life</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
            <Form {...signupForm}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ValidatedFormField
                    name="firstName"
                    label="First Name"
                    placeholder="John"
                    required
                  />
                  <ValidatedFormField
                    name="lastName"
                    label="Last Name"
                    placeholder="Doe"
                    required
                  />
                </div>

                <ValidatedFormField
                  name="username"
                  label="Username"
                  placeholder="johndoe"
                  required
                  description="Username can only contain letters, numbers, underscores, and hyphens"
                />

                <ValidatedFormField
                  name="email"
                  label="Email address"
                  type="email"
                  placeholder="john@example.com"
                  required
                />

                <ValidatedFormField
                  name="phone"
                  label="Phone Number (Optional)"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  description="Include country code for international numbers"
                />

                <ValidatedFormField
                  name="role"
                  label="Account Type"
                  type="select"
                  required
                  options={[
                    { value: "user", label: "Player" },
                    { value: "facility_owner", label: "Facility Owner" }
                  ]}
                />

                {signupForm.watch("role") === "user" && (
                  <ValidatedFormField
                    name="skillLevel"
                    label="Skill Level"
                    type="select"
                    required
                    options={[
                      { value: "beginner", label: "Beginner" },
                      { value: "intermediate", label: "Intermediate" },
                      { value: "advanced", label: "Advanced" }
                    ]}
                  />
                )}

                <ValidatedFormField
                  name="password"
                  label="Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  required
                  description="Must contain uppercase, lowercase, and number"
                />

                <ValidatedFormField
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  placeholder="Confirm your password"
                  required
                />

                <FormErrorDisplay />

                <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-md">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <Label className="text-sm font-medium">
                      Email Verification Required
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      We'll send a verification code to verify your email address
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendOtpMutation.isPending || !signupForm.formState.isValid}
                >
                  {sendOtpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Verification Code
                </Button>
              </form>
            </Form>

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
    </div>
  );
}
