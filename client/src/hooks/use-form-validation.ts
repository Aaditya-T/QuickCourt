import { useCallback, useEffect, useState } from "react";
import { useForm, UseFormProps, UseFormReturn, FieldValues, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodSchema, ZodError } from "zod";

export interface UseFormValidationOptions<T extends FieldValues> extends UseFormProps<T> {
  schema: ZodSchema<any>;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
  validateOnMount?: boolean;
  debounceMs?: number;
}

export interface FormValidationState {
  isValid: boolean;
  hasErrors: boolean;
  errorCount: number;
  touchedCount: number;
  totalFields: number;
  validationProgress: number; // 0-100
}

export function useFormValidation<T extends FieldValues>({
  schema,
  onValidationChange,
  validateOnMount = false,
  debounceMs = 300,
  ...formOptions
}: UseFormValidationOptions<T>): UseFormReturn<T> & {
  validationState: FormValidationState;
  isValidating: boolean;
  validateField: (fieldName: Path<T>) => Promise<void>;
  validateFields: (fieldNames: Path<T>[]) => Promise<void>;
  validateForm: () => Promise<boolean>;
  getFieldValidation: (fieldName: Path<T>) => any;
  clearFieldError: (fieldName: Path<T>) => void;
  clearAllErrors: () => void;
  setFieldError: (fieldName: Path<T>, message: string) => void;
  validateData: (data: T) => { isValid: boolean; errors: Record<string, string> };
} {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    ...formOptions,
  });

  const [validationState, setValidationState] = useState<FormValidationState>({
    isValid: false,
    hasErrors: false,
    errorCount: 0,
    touchedCount: 0,
    totalFields: 0,
    validationProgress: 0,
  });

  const [isValidating, setIsValidating] = useState(false);

  // Calculate validation state
  const updateValidationState = useCallback(() => {
    const { errors, touchedFields } = form.formState;
    const allFields = Object.keys(form.getValues());
    const touchedFieldsArray = Object.keys(touchedFields as any);
    const errorFieldsArray = Object.keys(errors);
    
    const totalFields = allFields.length;
    const touchedCount = touchedFieldsArray.length;
    const errorCount = errorFieldsArray.length;
    const isValid = touchedCount > 0 && errorCount === 0;
    const validationProgress = totalFields > 0 ? (touchedCount / totalFields) * 100 : 0;

    const newState: FormValidationState = {
      isValid,
      hasErrors: errorCount > 0,
      errorCount,
      touchedCount,
      totalFields,
      validationProgress,
    };

    setValidationState(newState);

    // Call validation change callback
    if (onValidationChange) {
      const errorMessages: Record<string, string> = {};
      Object.entries(errors).forEach(([key, error]) => {
        errorMessages[key] = (error as any)?.message || 'Invalid value';
      });
      onValidationChange(isValid, errorMessages);
    }
  }, [form, onValidationChange]);

  // Update validation state when form state changes
  useEffect(() => {
    updateValidationState();
  }, [form.formState, updateValidationState]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      form.trigger();
    }
  }, [validateOnMount, form]);

  // Debounced field validation
  const validateField = useCallback(
    async (fieldName: Path<T>) => {
      setIsValidating(true);
      try {
        await form.trigger(fieldName);
      } finally {
        setIsValidating(false);
      }
    },
    [form]
  );

  // Validate specific fields with debouncing
  const validateFields = useCallback(
    async (fieldNames: Path<T>[]) => {
      setIsValidating(true);
      try {
        await form.trigger(fieldNames);
      } finally {
        setIsValidating(false);
      }
    },
    [form]
  );

  // Validate entire form
  const validateForm = useCallback(async () => {
    setIsValidating(true);
    try {
      const isValid = await form.trigger();
      return isValid;
    } finally {
      setIsValidating(false);
    }
  }, [form]);

  // Get field validation status
  const getFieldValidation = useCallback(
    (fieldName: Path<T>) => {
      const { errors, touchedFields } = form.formState;
      const error = errors[fieldName];
      const isTouched = (touchedFields as any)[fieldName];
      
      return {
        isValid: isTouched && !error,
        hasError: !!error,
        isTouched: !!isTouched,
        error: error?.message as string | undefined,
      };
    },
    [form.formState]
  );

  // Clear specific field error
  const clearFieldError = useCallback(
    (fieldName: Path<T>) => {
      form.clearErrors(fieldName);
    },
    [form]
  );

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    form.clearErrors();
  }, [form]);

  // Set custom field error
  const setFieldError = useCallback(
    (fieldName: Path<T>, message: string) => {
      form.setError(fieldName, { message });
    },
    [form]
  );

  // Validate data against schema without form
  const validateData = useCallback(
    (data: T) => {
      try {
        schema.parse(data);
        return { isValid: true, errors: {} };
      } catch (error) {
        if (error instanceof ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            const path = err.path.join('.');
            errors[path] = err.message;
          });
          return { isValid: false, errors };
        }
        return { isValid: false, errors: { root: 'Validation failed' } };
      }
    },
    [schema]
  );

  // Enhanced submit handler with validation
  const handleSubmit = useCallback(
    (onValid: (data: T) => void | Promise<void>, onInvalid?: (errors: any) => void) => {
      return form.handleSubmit(onValid, onInvalid);
    },
    [form]
  );

  return {
    ...form,
    validationState,
    isValidating,
    validateField,
    validateFields,
    validateForm,
    getFieldValidation,
    clearFieldError,
    clearAllErrors,
    setFieldError,
    validateData,
    handleSubmit,
  } as UseFormReturn<T> & {
    validationState: FormValidationState;
    isValidating: boolean;
    validateField: (fieldName: Path<T>) => Promise<void>;
    validateFields: (fieldNames: Path<T>[]) => Promise<void>;
    validateForm: () => Promise<boolean>;
    getFieldValidation: (fieldName: Path<T>) => any;
    clearFieldError: (fieldName: Path<T>) => void;
    clearAllErrors: () => void;
    setFieldError: (fieldName: Path<T>, message: string) => void;
    validateData: (data: T) => { isValid: boolean; errors: Record<string, string> };
  };
}

export type FormValidationReturn<T extends FieldValues> = ReturnType<typeof useFormValidation<T>>;

export default useFormValidation;