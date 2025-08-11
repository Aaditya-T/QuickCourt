import React from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Circle } from "lucide-react";

export interface FormProgressProps {
  className?: string;
  showPercentage?: boolean;
  showFieldStatus?: boolean;
  fieldLabels?: Record<string, string>;
  requiredFields?: string[];
}

export const FormProgress: React.FC<FormProgressProps> = ({
  className,
  showPercentage = true,
  showFieldStatus = false,
  fieldLabels = {},
  requiredFields = []
}) => {
  const { 
    formState: { errors, touchedFields },
    getValues
  } = useFormContext();

  const allFields = Object.keys(getValues());
  const fieldsToCheck = requiredFields.length > 0 ? requiredFields : allFields;
  
  const touchedFieldsArray = Object.keys(touchedFields);
  const errorFieldsArray = Object.keys(errors);
  
  const totalFields = fieldsToCheck.length;
  const touchedCount = fieldsToCheck.filter(field => touchedFieldsArray.includes(field)).length;
  const errorCount = fieldsToCheck.filter(field => errorFieldsArray.includes(field)).length;
  const validCount = fieldsToCheck.filter(field => 
    touchedFieldsArray.includes(field) && !errorFieldsArray.includes(field)
  ).length;
  
  const progress = totalFields > 0 ? (touchedCount / totalFields) * 100 : 0;
  const validProgress = totalFields > 0 ? (validCount / totalFields) * 100 : 0;

  const getFieldStatus = (fieldName: string) => {
    const isTouched = touchedFieldsArray.includes(fieldName);
    const hasError = errorFieldsArray.includes(fieldName);
    
    if (!isTouched) return 'untouched';
    if (hasError) return 'error';
    return 'valid';
  };

  const getFieldIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getFieldLabel = (fieldName: string) => {
    return fieldLabels[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').toLowerCase();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Form Progress</span>
          {showPercentage && (
            <span className="text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          )}
        </div>
        
        <div className="relative">
          <Progress value={progress} className="h-2" />
          {validProgress > 0 && (
            <Progress 
              value={validProgress} 
              className="absolute top-0 h-2 bg-transparent"
            />
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{touchedCount}/{totalFields} fields completed</span>
          <div className="flex items-center gap-3">
            {validCount > 0 && (
              <span className="text-green-600">✓ {validCount} valid</span>
            )}
            {errorCount > 0 && (
              <span className="text-destructive">✗ {errorCount} errors</span>
            )}
          </div>
        </div>
      </div>

      {/* Field Status List */}
      {showFieldStatus && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Field Status</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fieldsToCheck.map((fieldName) => {
              const status = getFieldStatus(fieldName);
              const label = getFieldLabel(fieldName);
              
              return (
                <div
                  key={fieldName}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm",
                    status === 'valid' && "bg-green-50 text-green-800",
                    status === 'error' && "bg-red-50 text-red-800",
                    status === 'untouched' && "bg-gray-50 text-gray-600"
                  )}
                >
                  {getFieldIcon(status)}
                  <span className="capitalize">{label}</span>
                  {status === 'error' && errors[fieldName] && (
                    <span className="text-xs text-destructive ml-auto">
                      {(errors[fieldName] as any)?.message}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export interface FormStepsProps {
  steps: Array<{
    id: string;
    label: string;
    fields: string[];
    optional?: boolean;
  }>;
  currentStep?: string;
  className?: string;
}

export const FormSteps: React.FC<FormStepsProps> = ({
  steps,
  currentStep,
  className
}) => {
  const { 
    formState: { errors, touchedFields }
  } = useFormContext();

  const getStepStatus = (step: typeof steps[0]) => {
    const stepFields = step.fields;
    const touchedStepFields = stepFields.filter(field => touchedFields[field]);
    const errorStepFields = stepFields.filter(field => errors[field]);
    
    if (errorStepFields.length > 0) return 'error';
    if (touchedStepFields.length === stepFields.length) return 'complete';
    if (touchedStepFields.length > 0) return 'in-progress';
    return 'pending';
  };

  const getStepIcon = (step: typeof steps[0], index: number) => {
    const status = getStepStatus(step);
    const isActive = currentStep === step.id;
    
    switch (status) {
      case 'complete':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full">
            <CheckCircle className="h-4 w-4" />
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-destructive text-white rounded-full">
            <AlertCircle className="h-4 w-4" />
          </div>
        );
      case 'in-progress':
        return (
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border-2",
            isActive ? "bg-primary text-primary-foreground border-primary" : "bg-blue-100 text-blue-600 border-blue-300"
          )}>
            {index + 1}
          </div>
        );
      default:
        return (
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border-2",
            isActive ? "bg-primary text-primary-foreground border-primary" : "bg-gray-100 text-gray-400 border-gray-300"
          )}>
            {index + 1}
          </div>
        );
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const isActive = currentStep === step.id;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center space-y-2">
                {getStepIcon(step, index)}
                <div className="text-center">
                  <p className={cn(
                    "text-sm font-medium",
                    isActive && "text-primary",
                    status === 'complete' && "text-green-600",
                    status === 'error' && "text-destructive",
                    status === 'pending' && "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  {step.optional && (
                    <p className="text-xs text-muted-foreground">Optional</p>
                  )}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-4",
                  status === 'complete' ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default FormProgress;