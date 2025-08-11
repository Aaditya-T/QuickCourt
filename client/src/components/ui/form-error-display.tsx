import React from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

export interface FormErrorDisplayProps {
  className?: string;
  showSuccessMessage?: boolean;
  successMessage?: string;
  maxErrors?: number;
}

export const FormErrorDisplay: React.FC<FormErrorDisplayProps> = ({
  className,
  showSuccessMessage = false,
  successMessage = "All fields are valid",
  maxErrors = 5
}) => {
  const { formState: { errors, isValid, isSubmitted } } = useFormContext();

  const errorEntries = Object.entries(errors);
  const hasErrors = errorEntries.length > 0;
  const displayedErrors = errorEntries.slice(0, maxErrors);
  const hiddenErrorCount = Math.max(0, errorEntries.length - maxErrors);

  // Don't show anything if form hasn't been submitted and there are no errors
  if (!isSubmitted && !hasErrors) {
    return null;
  }

  // Show success message if form is valid and submitted
  if (isValid && isSubmitted && showSuccessMessage) {
    return (
      <Alert className={cn("border-green-200 bg-green-50", className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          {successMessage}
        </AlertDescription>
      </Alert>
    );
  }

  // Show errors if there are any
  if (hasErrors) {
    return (
      <Alert variant="destructive" className={cn(className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-medium">Please fix the following errors:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {displayedErrors.map(([fieldName, error]) => (
                <li key={fieldName}>
                  <span className="font-medium capitalize">
                    {fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </span>{' '}
                  {(error as any)?.message || 'Invalid value'}
                </li>
              ))}
              {hiddenErrorCount > 0 && (
                <li className="text-muted-foreground">
                  ... and {hiddenErrorCount} more error{hiddenErrorCount > 1 ? 's' : ''}
                </li>
              )}
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export interface FormSummaryProps {
  className?: string;
  showFieldCount?: boolean;
  showValidationStatus?: boolean;
}

export const FormSummary: React.FC<FormSummaryProps> = ({
  className,
  showFieldCount = true,
  showValidationStatus = true
}) => {
  const { 
    formState: { errors, touchedFields, isValid, isSubmitted },
    getValues
  } = useFormContext();

  const allFields = Object.keys(getValues());
  const touchedFieldsArray = Object.keys(touchedFields);
  const errorFieldsArray = Object.keys(errors);
  
  const totalFields = allFields.length;
  const touchedCount = touchedFieldsArray.length;
  const errorCount = errorFieldsArray.length;
  const validCount = touchedCount - errorCount;

  if (!showFieldCount && !showValidationStatus) {
    return null;
  }

  return (
    <div className={cn("text-sm text-muted-foreground space-y-1", className)}>
      {showFieldCount && (
        <div className="flex items-center gap-4">
          <span>Fields: {touchedCount}/{totalFields} completed</span>
          {touchedCount > 0 && (
            <>
              <span className="text-green-600">✓ {validCount} valid</span>
              {errorCount > 0 && (
                <span className="text-destructive">✗ {errorCount} errors</span>
              )}
            </>
          )}
        </div>
      )}
      
      {showValidationStatus && isSubmitted && (
        <div className="flex items-center gap-1">
          {isValid ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-green-600">Form is valid and ready to submit</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 text-destructive" />
              <span className="text-destructive">Form has validation errors</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export interface FieldValidationIndicatorProps {
  fieldName: string;
  className?: string;
  showLabel?: boolean;
}

export const FieldValidationIndicator: React.FC<FieldValidationIndicatorProps> = ({
  fieldName,
  className,
  showLabel = false
}) => {
  const { formState: { errors, touchedFields } } = useFormContext();
  
  const hasError = !!errors[fieldName];
  const isTouched = !!touchedFields[fieldName];
  const isValid = isTouched && !hasError;

  if (!isTouched) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1 text-xs", className)}>
      {isValid ? (
        <>
          <CheckCircle className="h-3 w-3 text-green-600" />
          {showLabel && <span className="text-green-600">Valid</span>}
        </>
      ) : hasError ? (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          {showLabel && <span className="text-destructive">Error</span>}
        </>
      ) : null}
    </div>
  );
};

export default FormErrorDisplay;