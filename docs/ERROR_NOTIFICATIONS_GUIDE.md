# Error Notifications Implementation Guide

This document provides a comprehensive guide to all error notification patterns, validation methods, and toast notification implementations used in the Product Catalogue application.

---

## Table of Contents
1. [Toast Notification System (Sonner)](#toast-notification-system-sonner)
2. [Side Sheet Validation Errors](#side-sheet-validation-errors)
3. [Form Validation Errors](#form-validation-errors)
4. [API Error Handling](#api-error-handling)
5. [Inline Alert Components](#inline-alert-components)
6. [Dialog Confirmation Patterns](#dialog-confirmation-patterns)
7. [Implementation Examples](#implementation-examples)

---

## 1. Toast Notification System (Sonner)

### Installation & Setup

**Package:**
```json
"sonner": "2.0.3"
```

**Import:**
```tsx
import { toast } from 'sonner';
// OR for specific version
import { toast } from 'sonner@2.0.3';
```

### Toaster Component Setup

**File:** `/components/ui/sonner.tsx`

```tsx
import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
```

**Add to App.tsx:**
```tsx
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <div>
      {/* Your app content */}
      <Toaster />
    </div>
  );
}
```

### Toast Methods

#### 1. Success Toast (Green)
```tsx
toast.success('Product created successfully', {
  position: 'top-right',
});
```

#### 2. Error Toast (Red)
```tsx
toast.error('Failed to create product', {
  position: 'top-right',
});
```

#### 3. Toast with Description
```tsx
toast.success('SAML configuration imported successfully!', {
  description: 'SSO URL, SLO URL, Certificate, and other settings have been populated.',
  position: 'top-right',
});
```

#### 4. Simple Toast (No Position Override)
```tsx
toast.success('Product saved successfully');
// Uses default position from Toaster component (top-right)
```

### Toast Position Options
- `'top-left'`
- `'top-center'`
- `'top-right'` (default in this app)
- `'bottom-left'`
- `'bottom-center'`
- `'bottom-right'`

---

## 2. Side Sheet Validation Errors

Side sheets use toast notifications for validation errors before submission.

### Pattern 1: Empty Field Validation

**Use Case:** All fields must be filled

```tsx
const handleSubmit = () => {
  // Check if all rows have both fields filled
  const hasEmptyFields = documentRows.some(row => !row.name.trim() || !row.url.trim());
  
  if (hasEmptyFields) {
    toast.error('Please fill in all document fields', {
      position: 'top-right',
    });
    return;
  }
  
  // Continue with submission...
};
```

**Error Message:** `"Please fill in all document fields"`

**Where Used:**
- Product Details - Documents Tab
- Product Family Details - Documents Sheet
- Product Group Details - Documents Sheet

---

### Pattern 2: At Least One Entry Validation

**Use Case:** At least one complete entry required

```tsx
const handleSubmit = () => {
  // Filter out empty documents
  const validDocuments = documentRows.filter(
    row => row.name.trim() !== '' && row.url.trim() !== ''
  );
  
  if (validDocuments.length === 0) {
    toast.error('Please enter at least one document with both name and URL', {
      position: 'top-right',
    });
    return;
  }
  
  // Continue with submission...
};
```

**Error Message:** `"Please enter at least one document with both name and URL"`

**Where Used:**
- Product Family Details - Documents Sheet
- Product Group Details - Documents Sheet

---

### Pattern 3: URL Format Validation

**Use Case:** Validate hyperlink format

```tsx
const handleSubmit = () => {
  // Get valid documents (non-empty)
  const validDocuments = documentRows.filter(
    row => row.name.trim() !== '' && row.url.trim() !== ''
  );
  
  // Validate URL format
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(\/.*)?\$/i;
  const invalidLinks = validDocuments.filter(row => !urlPattern.test(row.url.trim()));
  
  if (invalidLinks.length > 0) {
    toast.error('Please enter valid hyperlink format (e.g., https://example.com)', {
      position: 'top-right',
    });
    return;
  }
  
  // Continue with submission...
};
```

**URL Regex Pattern:**
```regex
/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(\/.*)?\$/i
```

**Error Message:** `"Please enter valid hyperlink format (e.g., https://example.com)"`

**Where Used:**
- Product Details - Documents Tab
- Product Family Details - Documents Sheet
- Product Group Details - Documents Sheet
- Product Families - Add Product Family Sheet (with documents)

---

### Pattern 4: Mandatory Field Validation (Disabled Submit)

**Use Case:** Disable submit button until all mandatory fields filled

```tsx
// Form validation state
const isFormValid = 
  formData.groupName.trim() !== '' && 
  formData.isHeroGroup !== '' && 
  formData.familyId !== '';

// Submit button
<Button 
  className="flex-1 bg-[#1b3e65] hover:bg-[#0a273d]"
  onClick={handleSubmit}
  disabled={!isFormValid || isPending}
>
  {isPending ? 'Submitting...' : 'Submit'}
</Button>
```

**Visual Indicator:** Disabled button (grayed out)

**Where Used:**
- Product Groups - Add Product Group Sheet
- Product Families - Add Product Family Sheet
- Features - Add Feature Sheet

---

### Pattern 5: Partial Document Validation

**Use Case:** Allow partial entries but validate complete ones

```tsx
const handleSubmit = () => {
  // Check if there are partial documents (one field filled, other empty)
  const hasPartialDocuments = documentRows.some(
    row => (row.name.trim() !== '' && row.url.trim() === '') || 
           (row.name.trim() === '' && row.url.trim() !== '')
  );
  
  if (hasPartialDocuments) {
    toast.error('Please fill in all document fields', {
      position: 'top-right',
    });
    return;
  }
  
  // Filter valid documents (both fields filled)
  const validDocuments = documentRows.filter(
    row => row.name.trim() !== '' && row.url.trim() !== ''
  );
  
  // Continue with valid documents...
};
```

**Error Message:** `"Please fill in all document fields"`

**Where Used:**
- Product Families - Add Product Family Sheet
- Product Family Details - Documents Sheet
- Product Group Details - Documents Sheet

---

## 3. Form Validation Errors

### Pattern 1: Mandatory Fields Check (Main Forms)

**Use Case:** Submit/Save blocked until mandatory fields filled

```tsx
const handleSaveDraft = () => {
  if (!isBasicInfoMandatoryFieldsFilled) {
    toast.error('Please fill in all mandatory fields');
    return;
  }
  
  // Continue with save...
};
```

**Error Message:** `"Please fill in all mandatory fields"`

**Where Used:**
- Product Details - Save Draft & Submit for Approval

---

### Pattern 2: No Changes Detection

**Use Case:** Prevent submission when no changes made in edit mode

```tsx
const handleSubmit = () => {
  // Check if any changes were made
  if (!hasChanges) {
    toast.error('No changes made', {
      position: 'top-right',
    });
    return;
  }
  
  // Continue with update...
};
```

**Change Detection Logic:**
```tsx
const hasChanges = 
  formData.field1 !== originalData.field1 ||
  formData.field2 !== originalData.field2 ||
  // ... check all fields
  formData.fieldN !== originalData.fieldN;
```

**Error Message:** `"No changes made"`

**Where Used:**
- Feature Details - Edit mode
- Product Family Details - Edit mode
- Product Group Details - Edit mode
- Product Details - Save Draft & Submit for Approval

---

### Pattern 3: Missing Required ID Validation

**Use Case:** Ensure critical IDs are present before API call

```tsx
const handleSubmit = () => {
  if (!formData.productGroupId) {
    toast.error('Product Group ID is required');
    console.error('Missing productGroupId in form data:', formData);
    return;
  }
  
  // Continue with submission...
};
```

**Error Messages:**
- `"Product Group ID is required"`
- `"Product family ID is missing. Cannot update."`
- `"Product Group ID is missing"`
- `"Feature code is missing. Cannot update."`

**Where Used:**
- Product Details - Save Draft & Submit
- Product Family Details - Edit mode
- Product Group Details - Edit mode
- Feature Details - Edit mode

---

### Pattern 4: Dropdown Selection Validation

**Use Case:** Ensure dropdown has a selected value

```tsx
const handleSubmit = () => {
  if (!formData.familyId) {
    toast.error('Please select a product family', {
      position: 'top-right',
    });
    return;
  }
  
  // Continue with submission...
};
```

**Error Message:** `"Please select a product family"`

**Where Used:**
- Product Group Details - Edit mode

---

### Pattern 5: Comment Validation (Approval Flow)

**Use Case:** Require comments before submission

```tsx
const handleConfirmSubmission = () => {
  if (!submissionComment.trim()) {
    toast.error('Please enter comments to Approver', { 
      position: 'top-right' 
    });
    return;
  }
  
  // Continue with submission...
};
```

**Error Message:** `"Please enter comments to Approver"`

**Where Used:**
- Product Details - Submit for Approval

---

## 4. API Error Handling

### Pattern 1: React Query Error Handling

**Use Case:** Handle API errors with React Query mutations

```tsx
const createFeatureMutation = useMutation({
  mutationFn: createFeature,
  onSuccess: () => {
    toast.success('Feature created successfully', {
      position: 'top-right',
    });
    
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['features'] });
    
    // Close sheet and reset
    setIsSheetOpen(false);
    resetForm();
  },
  onError: (error: any) => {
    // Extract error message from API response
    const errorMessage = error?.message || 'Failed to create feature';
    
    toast.error(errorMessage, {
      position: 'top-right',
    });
  },
});
```

**Error Message Pattern:**
```tsx
const errorMessage = error?.message || 'Failed to [action]';
```

**Common Fallback Messages:**
- `'Failed to create feature'`
- `'Failed to update feature'`
- `'Failed to create product'`
- `'Failed to update product'`
- `'Failed to create product family'`
- `'Failed to update product family'`
- `'Failed to create product group'`
- `'Failed to update product group'`
- `'Failed to delete draft'`

---

### Pattern 2: API Error Response Extraction

**Use Case:** Extract error message from different API response formats

```tsx
onError: (error: any) => {
  // Handle multiple error response formats
  const errorMessage = 
    error?.response?.message ||  // Nested response object
    error?.message ||            // Direct message property
    'Failed to perform action';  // Fallback message
  
  toast.error(errorMessage, {
    position: 'top-right',
  });
}
```

**API Error Structure Handled:**
1. Plain text error responses
2. JSON error responses with `message` field
3. Nested responses with `response.message`
4. Custom APIError class with extracted message

---

### Pattern 3: Success Notification After Mutation

**Use Case:** Show success after successful API call

```tsx
const updateMutation = useMutation({
  mutationFn: updateData,
  onSuccess: (data) => {
    toast.success('Data updated successfully', {
      position: 'top-right',
    });
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['data-list'] });
    
    // Navigate or reset UI
    navigate('/list');
  },
});
```

**Success Messages:**
- `'Feature created successfully'`
- `'Feature updated successfully'`
- `'Product saved successfully'`
- `'Product updated successfully'`
- `'Product family created successfully'`
- `'Product family updated successfully'`
- `'Product group created successfully'`
- `'Product group updated successfully'`
- `'Documents added successfully'`
- `'Document deleted successfully'`
- `'Draft deleted successfully'`
- `'SAML configuration saved successfully'`
- `'SAML configuration imported successfully!'`

---

## 5. Inline Alert Components

### Pattern 1: Login Error Alert

**Use Case:** Display authentication errors inline

**Component:** `Alert` from shadcn/ui

```tsx
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

// In component
const [error, setError] = useState("");

// In render
{error && (
  <Alert variant="destructive">
    <AlertCircle className="size-4" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

**Error Messages:**
- `"Please enter both username and password"`
- `"Invalid username or password"`

**Styling:**
- Red background (`variant="destructive"`)
- Alert icon (AlertCircle from lucide-react)
- Inline display in form

**Where Used:**
- Login page

---

### Pattern 2: Session Expiry Notification

**Use Case:** Notify user when session expires

```tsx
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

useEffect(() => {
  const sessionExpired = searchParams.get('session_expired');
  if (sessionExpired === 'true' && !sessionExpiredShown.current) {
    sessionExpiredShown.current = true;
    toast.error('Your session has expired. Please log in again.');
  }
}, [searchParams]);
```

**Error Message:** `"Your session has expired. Please log in again."`

**Where Used:**
- Login page (on redirect from expired session)

---

### Pattern 3: Non-Editable Product Alert

**Use Case:** Notify when product cannot be edited

```tsx
useEffect(() => {
  if (currentProductData.isEditable === false) {
    console.log('Product is not editable. Redirecting to view mode.');
    toast.error('This product cannot be edited at this time.', {
      position: 'top-right',
    });
    navigate(`/products/commercial-products/${id}?mode=view`, {
      replace: true,
      state: location.state,
    });
  }
}, [currentProductData]);
```

**Error Message:** `"This product cannot be edited at this time."`

**Where Used:**
- Product Details - Edit mode guard

---

### Pattern 4: SAML Configuration Alerts

**Use Case:** Display configuration status and info messages

```tsx
// Status Banner (Blue background)
<Card className="p-4 bg-blue-50 border-blue-200">
  <div className="flex items-start gap-3">
    {config.ssoEnabled ? (
      <>
        <CheckCircle2 className="size-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-blue-900">SSO is currently enabled</p>
          <p className="text-blue-700 mt-1">
            Users will be redirected to Microsoft Entra ID for authentication via SAML 2.0.
          </p>
        </div>
      </>
    ) : (
      <>
        <AlertCircle className="size-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-yellow-900">SSO is currently disabled</p>
          <p className="text-yellow-700 mt-1">
            Users are using local authentication only.
          </p>
        </div>
      </>
    )}
  </div>
</Card>

// Info Alert (Informational)
<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <div className="flex gap-3">
    <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
    <div>
      <h3 className="font-medium text-blue-900 mb-1">Quick Setup with SAML XML</h3>
      <p className="text-[14px] text-blue-800">
        Upload the SAML metadata XML file to automatically populate settings.
      </p>
    </div>
  </div>
</div>
```

**Where Used:**
- Identity Provider Configuration page

---

## 6. Dialog Confirmation Patterns

### Pattern 1: Delete Confirmation Dialog

**Use Case:** Confirm before deleting items

**Component:** `AlertDialog` from shadcn/ui

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

// State
const [open, setOpen] = useState(false);
const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

// Open dialog
const handleDeleteClick = (productCode: string) => {
  setDraftToDelete(productCode);
  setOpen(true);
};

// Dialog component
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete the product.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmDelete}>
        Continue
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Dialog Messages:**
- Title: `"Are you absolutely sure?"`
- Description: `"This action cannot be undone. This will permanently delete the product."`

**Where Used:**
- My Drafts - Delete draft product

---

### Pattern 2: Submission Comments Dialog

**Use Case:** Require comments before submission

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';

// State
const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);
const [submissionComment, setSubmissionComment] = useState('');

// Dialog component
<Dialog open={isSubmissionDialogOpen} onOpenChange={setIsSubmissionDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Submit for Approval</DialogTitle>
      <DialogDescription>
        Please provide comments for the approver regarding this submission.
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      <Label>Comments to Approver *</Label>
      <Textarea
        value={submissionComment}
        onChange={(e) => setSubmissionComment(e.target.value)}
        placeholder="Enter your comments here..."
        rows={4}
        className="mt-2"
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsSubmissionDialogOpen(false)}>
        Cancel
      </Button>
      <Button
        onClick={handleConfirmSubmission}
        className="bg-[#1b3e65] hover:bg-[#0a273d]"
        disabled={!submissionComment.trim()}
      >
        Submit
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Dialog Messages:**
- Title: `"Submit for Approval"`
- Description: `"Please provide comments for the approver regarding this submission."`
- Placeholder: `"Enter your comments here..."`

**Where Used:**
- Product Details - Submit for Approval flow

---

## 7. Implementation Examples

### Complete Side Sheet with All Validations

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';

export function AddDocumentSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [documentRows, setDocumentRows] = useState([
    { id: '1', name: '', url: '' }
  ]);

  const handleSubmit = () => {
    // 1. Check for partial documents
    const hasPartialDocuments = documentRows.some(
      row => (row.name.trim() !== '' && row.url.trim() === '') || 
             (row.name.trim() === '' && row.url.trim() !== '')
    );
    
    if (hasPartialDocuments) {
      toast.error('Please fill in all document fields', {
        position: 'top-right',
      });
      return;
    }
    
    // 2. Get valid documents
    const validDocuments = documentRows.filter(
      row => row.name.trim() !== '' && row.url.trim() !== ''
    );
    
    // 3. Check if at least one document
    if (validDocuments.length === 0) {
      toast.error('Please enter at least one document with both name and URL', {
        position: 'top-right',
      });
      return;
    }
    
    // 4. Validate URL format
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(\/.*)?\$/i;
    const invalidLinks = validDocuments.filter(row => !urlPattern.test(row.url.trim()));
    
    if (invalidLinks.length > 0) {
      toast.error('Please enter valid hyperlink format (e.g., https://example.com)', {
        position: 'top-right',
      });
      return;
    }
    
    // 5. Success - Process documents
    // ... your submission logic
    
    toast.success('Documents added successfully', {
      position: 'top-right',
    });
    
    setIsOpen(false);
    setDocumentRows([{ id: '1', name: '', url: '' }]);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Documents</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4">
          {documentRows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-2 gap-4">
              <div>
                <Label>Document Name</Label>
                <Input
                  value={row.name}
                  onChange={(e) => {
                    const newRows = [...documentRows];
                    newRows[index].name = e.target.value;
                    setDocumentRows(newRows);
                  }}
                  placeholder="Enter document name"
                />
              </div>
              <div>
                <Label>Document URL</Label>
                <Input
                  value={row.url}
                  onChange={(e) => {
                    const newRows = [...documentRows];
                    newRows[index].url = e.target.value;
                    setDocumentRows(newRows);
                  }}
                  placeholder="Enter URL"
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            className="bg-[#1b3e65] hover:bg-[#0a273d]"
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

### Complete Form with Change Detection & API Error Handling

```tsx
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateFeature } from '../api/features';

export function EditFeatureForm({ featureData, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    featureName: '',
    hasConfig: false,
  });
  const [originalData, setOriginalData] = useState(formData);

  // Load data
  useEffect(() => {
    if (featureData) {
      const data = {
        featureName: featureData.featureName,
        hasConfig: featureData.hasConfiguration,
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [featureData]);

  // Detect changes
  const hasChanges = 
    formData.featureName !== originalData.featureName ||
    formData.hasConfig !== originalData.hasConfig;

  // Mandatory fields filled
  const isFormValid = formData.featureName.trim() !== '';

  // API mutation
  const updateMutation = useMutation({
    mutationFn: updateFeature,
    onSuccess: () => {
      toast.success('Feature updated successfully', {
        position: 'top-right',
      });
      
      queryClient.invalidateQueries({ queryKey: ['features'] });
      onSuccess();
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Failed to update feature';
      toast.error(errorMessage, {
        position: 'top-right',
      });
    },
  });

  const handleSubmit = () => {
    // Validate changes
    if (!hasChanges) {
      toast.error('No changes made', {
        position: 'top-right',
      });
      return;
    }

    // Validate ID exists
    if (!featureData?.featureCode) {
      toast.error('Feature code is missing. Cannot update.', {
        position: 'top-right',
      });
      return;
    }

    // Submit
    updateMutation.mutate({
      featureId: featureData.featureId,
      featureCode: featureData.featureCode,
      featureName: formData.featureName.trim(),
      hasConfiguration: formData.hasConfig,
    });
  };

  return (
    <div>
      {/* Form fields */}
      
      <Button
        onClick={handleSubmit}
        disabled={!isFormValid || !hasChanges || updateMutation.isPending}
        className="bg-[#1b3e65] hover:bg-[#0a273d]"
      >
        {updateMutation.isPending ? 'Submitting...' : 'Submit'}
      </Button>
    </div>
  );
}
```

---

## Error Message Reference Table

| Category | Error Message | Trigger Condition |
|----------|--------------|-------------------|
| **Side Sheets** | | |
| Empty Fields | `"Please fill in all document fields"` | One or more fields empty in a row |
| Minimum Entry | `"Please enter at least one document with both name and URL"` | No complete documents entered |
| URL Format | `"Please enter valid hyperlink format (e.g., https://example.com)"` | Invalid URL format detected |
| **Main Forms** | | |
| Mandatory Fields | `"Please fill in all mandatory fields"` | Required fields not filled |
| No Changes | `"No changes made"` | No fields modified in edit mode |
| Missing ID | `"Product Group ID is required"` | Critical ID missing before API call |
| Dropdown Selection | `"Please select a product family"` | Required dropdown not selected |
| Comments | `"Please enter comments to Approver"` | Approval comments empty |
| **API Errors** | | |
| Create Failed | `"Failed to create [entity]"` | API create operation failed |
| Update Failed | `"Failed to update [entity]"` | API update operation failed |
| Delete Failed | `"Failed to delete [entity]"` | API delete operation failed |
| ID Missing | `"[Entity] ID is missing. Cannot update."` | ID required for update missing |
| **Session/Auth** | | |
| Session Expired | `"Your session has expired. Please log in again."` | Session timeout redirect |
| Invalid Credentials | `"Invalid username or password"` | Login authentication failed |
| Empty Credentials | `"Please enter both username and password"` | Login fields empty |
| **Product Specific** | | |
| Non-Editable | `"This product cannot be edited at this time."` | Product isEditable = false |

---

## Success Message Reference Table

| Action | Success Message |
|--------|----------------|
| Feature Created | `"Feature created successfully"` |
| Feature Updated | `"Feature updated successfully"` |
| Product Saved | `"Product saved successfully"` |
| Product Updated | `"Product updated successfully"` |
| Product Family Created | `"Product family created successfully"` |
| Product Family Updated | `"Product family updated successfully"` |
| Product Group Created | `"Product group created successfully"` |
| Product Group Updated | `"Product group updated successfully"` |
| Documents Added | `"Documents added successfully"` |
| Document Deleted | `"Document deleted successfully"` |
| Draft Deleted | `"Draft deleted successfully"` |
| SAML Config Saved | `"SAML configuration saved successfully"` |
| SAML Config Imported | `"SAML configuration imported successfully!"` |
| Product Approved | `"Approved: [Product Name]"` |
| Product Rejected | `"Rejected: [Product Name]"` |

---

## Dependencies Required

```json
{
  "dependencies": {
    "sonner": "2.0.3",
    "@tanstack/react-query": "^5.x.x",
    "lucide-react": "^0.x.x"
  }
}
```

**shadcn/ui Components:**
- Alert
- AlertDialog
- Dialog
- Sheet
- Button
- Input
- Textarea
- Label

---

## Best Practices

### 1. Error Toast Position
- **Always use** `position: 'top-right'` for consistency
- Success and error toasts appear in the same location

### 2. Error Message Style
- Keep messages concise and actionable
- Provide specific guidance (e.g., "https://example.com" in URL errors)
- Use consistent terminology across the app

### 3. Validation Order
1. Check mandatory fields first
2. Check for changes (edit mode)
3. Validate format/pattern
4. Check dependencies (IDs, dropdowns)
5. Finally, submit to API

### 4. API Error Handling
- Always provide fallback error messages
- Extract error from multiple possible locations
- Log errors to console for debugging
- Show user-friendly messages in UI

### 5. Success Feedback
- Always show success toast after mutations
- Invalidate relevant queries to refresh data
- Close sheets/dialogs after success
- Reset forms to initial state

### 6. Button States
- Disable submit during API calls (show "Submitting...")
- Disable when validation fails (mandatory fields, no changes)
- Re-enable after API response (success or error)

---

*Last Updated: January 28, 2026*
