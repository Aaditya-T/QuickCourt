import React, { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export interface ValidationState {
  isValid: boolean;
  isValidating: boolean;
  error?: string;
  touched: boolean;
}

export interface ValidatedFormFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "tel" | "number" | "textarea" | "select" | "checkbox" | "radio";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  debounceMs?: number;
  validateOnChange?: boolean;
  children?: React.ReactNode;
}

export const ValidatedFormField: React.FC<ValidatedFormFieldProps> = ({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  className,
  description,
  options = [],
  rows = 3,
  debounceMs = 300,
  validateOnChange = true,
  children
}) => {
  const {
    control,
    formState: { errors, touchedFields },
    trigger,
    watch
  } = useFormContext();

  const [isValidating, setIsValidating] = useState(false);
  const fieldValue = watch(name);
  const fieldError = errors[name];
  const isTouched = touchedFields[name];

  // Debounced validation
  useEffect(() => {
    if (!validateOnChange || !isTouched) return;

    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      await trigger(name);
      setIsValidating(false);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [fieldValue, name, trigger, validateOnChange, isTouched, debounceMs]);

  const getValidationState = (): ValidationState => {
    return {
      isValid: isTouched && !fieldError,
      isValidating,
      error: fieldError?.message as string,
      touched: isTouched
    };
  };

  const validationState = getValidationState();

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    if (validationState.touched) {
      if (validationState.isValid) {
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      }
      if (validationState.error) {
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      }
    }
    return null;
  };

  const getFieldClassName = () => {
    const baseClasses = "transition-colors duration-200";
    if (!validationState.touched) return baseClasses;
    
    if (validationState.isValid) {
      return cn(baseClasses, "border-green-500 focus:border-green-500 focus:ring-green-500");
    }
    if (validationState.error) {
      return cn(baseClasses, "border-destructive focus:border-destructive focus:ring-destructive");
    }
    return baseClasses;
  };

  const renderField = (field: any) => {
    const fieldProps = {
      ...field,
      placeholder,
      disabled: disabled || isValidating,
      className: cn(getFieldClassName(), className),
      "aria-invalid": !!validationState.error,
      "aria-describedby": `${name}-description ${name}-error`,
    };

    switch (type) {
      case "textarea":
        return <Textarea {...fieldProps} rows={rows} />;
      
      case "select":
        return (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled || isValidating}
          >
            <SelectTrigger className={cn(getFieldClassName(), className)}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={name}
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled || isValidating}
              className={getFieldClassName()}
            />
            <Label
              htmlFor={name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </Label>
          </div>
        );
      
      case "radio":
        return (
          <RadioGroup
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled || isValidating}
            className="flex flex-col space-y-2"
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                <Label htmlFor={`${name}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      default:
        return <Input {...fieldProps} type={type} />;
    }
  };

  if (type === "checkbox") {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            {renderField(field)}
            {description && (
              <p id={`${name}-description`} className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
            {validationState.error && (
              <p
                id={`${name}-error`}
                className="text-sm font-medium text-destructive flex items-center gap-1"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="h-3 w-3" />
                {validationState.error}
              </p>
            )}
          </div>
        )}
      />
    );
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor={name}
              className={cn(
                "text-sm font-medium leading-none",
                validationState.error && "text-destructive",
                required && "after:content-['*'] after:ml-0.5 after:text-destructive"
              )}
            >
              {label}
            </Label>
            <div className="flex items-center gap-1">
              {getValidationIcon()}
            </div>
          </div>
          
          <div className="relative">
            {renderField(field)}
            {children}
          </div>
          
          {description && (
            <p id={`${name}-description`} className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
          
          {validationState.error && (
            <p
              id={`${name}-error`}
              className="text-sm font-medium text-destructive flex items-center gap-1"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="h-3 w-3" />
              {validationState.error}
            </p>
          )}
        </div>
      )}
    />
  );
};

export default ValidatedFormField;