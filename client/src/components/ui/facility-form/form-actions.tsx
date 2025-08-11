import { Button } from "@/components/ui/button";

interface FormActionsProps {
  onCancel: () => void;
  submitText: string;
  isSubmitting: boolean;
  submitDisabled?: boolean;
}

export default function FormActions({ 
  onCancel, 
  submitText, 
  isSubmitting, 
  submitDisabled = false 
}: FormActionsProps) {
  return (
    <div className="flex justify-end space-x-2 pt-4 border-t">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isSubmitting || submitDisabled}
      >
        {isSubmitting ? "Saving..." : submitText}
      </Button>
    </div>
  );
}
