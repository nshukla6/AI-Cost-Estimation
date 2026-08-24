# Button Colors Reference

This document lists all button color combinations used in the ISMS application.

---

## Primary Action Buttons

### 1. Primary Blue Button
**Usage:** Main action buttons (Save, Submit, Add, etc.)

- **Normal State:** `bg-[#1b3e65]`
  - Color: Dark Blue (#1b3e65)
  
- **Hover State:** `hover:bg-[#0a273d]`
  - Color: Darker Blue (#0a273d)

**Full Class:**
```tsx
className="bg-[#1b3e65] hover:bg-[#0a273d]"
```

**Used In:**
- Add buttons (Add User, Add Product, Add Feature, etc.)
- Submit buttons (Submit, Submit for Approval, etc.)
- Save buttons (Save Configuration, Save Draft)
- Edit Product button (in view mode)
- Pagination active page button

---

## Outline/Secondary Buttons

### 2. SSO Button (Outline with Blue)
**Usage:** SSO Sign In button

- **Normal State:** `border-[#1b3e65] text-[#1b3e65]`
  - Border & Text: Dark Blue (#1b3e65)
  - Background: Transparent (outline variant)
  
- **Hover State:** `hover:bg-[#1b3e65] hover:text-white`
  - Background: Dark Blue (#1b3e65)
  - Text: White

**Full Class:**
```tsx
className="w-full h-11 border-[#1b3e65] text-[#1b3e65] hover:bg-[#1b3e65] hover:text-white"
variant="outline"
```

**Used In:**
- Login page SSO button

---

### 3. View Mode Button (Outline)
**Usage:** Switch to View Mode button in edit mode

- **Normal State:** Standard outline variant
  - Border: Default border color
  - Background: Transparent
  
- **Hover State:** Default outline hover behavior

**Class:**
```tsx
variant="outline"
```

**Used In:**
- View Mode button (when in edit mode)

---

### 4. Cancel Button (Outline)
**Usage:** Cancel action in forms and sheets

- **Normal State:** Standard outline variant
  - Border: Default border color
  - Background: Transparent
  
- **Hover State:** Default outline hover behavior

**Class:**
```tsx
variant="outline"
```

**Used In:**
- Cancel buttons in side sheets
- Cancel action buttons

---

## Tab Buttons

### 5. Active Tab (Product Details)
**Usage:** Active tab state in product details tabs

- **Active State:** `data-[state=active]:bg-[#6ebbee]`
  - Background: Light Blue (#6ebbee)
  - Text: White
  
- **Active Hover State:** `data-[state=active]:hover:bg-[#6ebbee]`
  - Background: Light Blue (#6ebbee) - maintains same color

**Inactive State:**
- **Normal:** `data-[state=inactive]:bg-transparent`
  - Background: Transparent
  - Text: Gray (text-gray-700)
  
- **Inactive Hover:** `hover:bg-[#def2ff]`
  - Background: Very Light Blue (#def2ff)

**Full Class:**
```tsx
className="data-[state=active]:bg-[#6ebbee] data-[state=active]:text-white data-[state=inactive]:bg-transparent border-r border-gray-100 last:border-r-0 rounded-none first:rounded-l-lg last:rounded-r-lg py-3 px-4 text-gray-700 hover:bg-[#def2ff] data-[state=active]:hover:bg-[#6ebbee] transition-colors"
```

**Used In:**
- Product Details page tabs (Basic Information, Systems, Availability, Relationships, Features, Documents, Audit Trail)
- Approval Review page tabs

---

## Status/Badge Buttons (Not Interactive)

### 6. Pending Approvals Badge
**Usage:** Count badge on Approvals page

- **Background:** `bg-[#ef5858]`
  - Color: Red (#ef5858)
  - Text: White

**Class:**
```tsx
className="bg-[#ef5858] text-white text-[14px] px-4 py-2 rounded-full"
```

**Used In:**
- Approvals count badge

---

### 7. Sinch Logo Container
**Usage:** Background for Sinch logo on login page

- **Background:** `bg-[#059688]`
  - Color: Teal/Turquoise (#059688)

**Class:**
```tsx
className="bg-[#059688] rounded-2xl size-16 flex items-center justify-center"
```

**Used In:**
- Login page logo container

---

## Checkbox States

### 8. Selected Checkbox (Charge Types & Feature Configs)
**Usage:** Selected checkboxes in forms

- **Selected State:** `bg-[#1b3e65] border-[#1b3e65]`
  - Background: Dark Blue (#1b3e65)
  - Border: Dark Blue (#1b3e65)
  
- **Unselected State:** `border-gray-300`
  - Border: Gray (#d1d5db / gray-300)
  - Background: Transparent

**Class:**
```tsx
className={isSelected ? 'bg-[#1b3e65] border-[#1b3e65]' : 'border-gray-300'}
```

**Used In:**
- Charge Type checkboxes in Basic Information tab
- Required/Default Included checkboxes in Features tab

## Summary Table

| Button Type | Normal State | Hover State | Text Color |
|------------|--------------|-------------|------------|
| **Primary Action** | `#1b3e65` (Dark Blue) | `#0a273d` (Darker Blue) | White |
| **SSO Outline** | Transparent | `#1b3e65` (Dark Blue) | `#1b3e65` → White |
| **Standard Outline** | Transparent | Default | Default |
| **Active Tab** | `#6ebbee` (Light Blue) | `#6ebbee` (Light Blue) | White |
| **Inactive Tab** | Transparent | `#def2ff` (Very Light Blue) | Gray-700 |
| **Selected Checkbox** | `#1b3e65` (Dark Blue) | N/A | N/A |
| **Unselected Checkbox** | Transparent | N/A | N/A |

---

## Color Hex Reference

| Color Name | Hex Code | Usage |
|-----------|----------|-------|
| Primary Dark Blue | `#1b3e65` | Primary buttons, selected checkboxes, SSO button |
| Darker Blue | `#0a273d` | Primary button hover state |
| Active Tab Blue | `#6ebbee` | Active tabs |
| Light Blue Hover | `#def2ff` | Inactive tab hover, capability card backgrounds |
| Teal/Turquoise | `#059688` | Logo container, badge text |
| Alert Red | `#ef5858` | Pending approvals badge |
| Light Green | `#dcede1` | Engage capability card |
| Teal Green | `#63b9a4` | Engage icon background |
| Light Orange | `#fceccb` | Connect capability card |
| Brown Orange | `#c7774c` | Connect icon/text |
| Blue | `#3aa7ea` | Build icon/text |

---

## Usage Guidelines

### Primary Actions (Use Dark Blue #1b3e65)
- Submit buttons
- Save buttons
- Add/Create buttons
- Edit buttons (in view mode)
- Primary confirmation buttons

### Secondary Actions (Use Outline Variant)
- Cancel buttons
- View Mode buttons
- Alternative actions

### Tab Navigation (Use Light Blue #6ebbee for active)
- Product details tabs
- Approval review tabs
- Any multi-tab interface

### Special Cases
- SSO button: Outline with blue border, fills on hover
- Checkboxes: Dark blue when selected
- Status badges: Custom colors per status type

---

*Last Updated: January 28, 2026*
