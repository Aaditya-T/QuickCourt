import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Form } from "@/components/ui/form";
import ValidatedFormField from "@/components/ui/validated-form-field";
import FormErrorDisplay from "@/components/ui/form-error-display";
import { useFormValidation } from "@/hooks/use-form-validation";
import { loginFormSchema, type LoginFormData } from "@shared/validation";
import SiteLogo from "@/components/ui/site-logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  // Login form with validation
  const loginForm = useFormValidation<LoginFormData>({
    schema: loginFormSchema,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = loginForm.handleSubmit(
    async (data: LoginFormData) => {
      setIsLoading(true);
      try {
        await login(data.email, data.password);
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
    },
    (errors) => {
      toast({
        title: "Form Validation Failed",
        description: "Please fix the errors in the form and try again.",
        variant: "destructive",
      });
    }
  );

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
            <p className="text-xl text-white/90">
              Book your favorite sports facilities and connect with players in your area.
            </p>
          </div>
          <div className="space-y-4 text-white/80">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Book courts instantly</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Join matches with others</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Discover local facilities</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <SiteLogo variant="auth" className="mx-auto" />
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
              <Form {...loginForm}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <ValidatedFormField
                    name="email"
                    label="Email address"
                    type="email"
                    placeholder="Enter your email"
                    required
                  />

                  <ValidatedFormField
                    name="password"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    required
                  />

                  <FormErrorDisplay />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !loginForm.formState.isValid}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </Form>

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
    </div>
  );
}
