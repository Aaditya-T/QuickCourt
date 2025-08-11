import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Shield, ArrowLeft } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [otpStep, setOtpStep] = useState<'form' | 'verify'>('form');
  const [otpCode, setOtpCode] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  // OTP mutations
  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("/api/auth/login/send-otp", "POST", { email });
    },
    onSuccess: () => {
      setOtpStep('verify');
      toast({
        title: "Login Code Sent",
        description: "Please check your email for the login code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send login code",
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { email: string; code: string }) => {
      return await apiRequest("/api/auth/login/verify-otp", "POST", data);
    },
    onSuccess: (response: any) => {
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid login code",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (useOtp) {
      if (!email) {
        toast({
          title: "Email Required",
          description: "Please enter your email address.",
          variant: "destructive",
        });
        return;
      }
      sendOtpMutation.mutate(email);
    } else {
      setIsLoading(true);
      try {
        await login(email, password);
        toast({
          title: "Login successful",
          description: "Welcome back to QuickCourt!",
        });
        setLocation("/dashboard");
      } catch (error: any) {
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtpMutation.mutate({ email, code: otpCode });
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
            <p className="mt-2 text-gray-600">Enter login code</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Check Your Email</CardTitle>
              <CardDescription>
                We've sent a 6-digit login code to {email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="otp">Login Code</Label>
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
                  {verifyOtpMutation.isPending ? "Verifying..." : "Login"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setOtpStep('form')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
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
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              {!useOtp && (
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required={!useOtp}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-md">
                <Mail className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <Label htmlFor="use-otp-login" className="text-sm font-medium">
                    Email Code Login
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Login with a secure code sent to your email
                  </p>
                </div>
                <Switch
                  id="use-otp-login"
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
                {useOtp ? "Send Login Code" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link href="/signup">
                <a className="font-medium text-primary hover:text-primary/80">
                  Sign up
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
