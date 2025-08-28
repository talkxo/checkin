# INSYDE App Style Guide

## Table of Contents
1. [Design System Overview](#design-system-overview)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Component Library](#component-library)
5. [Layout Patterns](#layout-patterns)
6. [Page-Specific Components](#page-specific-components)
7. [Animation & Interactions](#animation--interactions)
8. [Responsive Design](#responsive-design)
9. [Dark Mode Support](#dark-mode-support)
10. [Best Practices](#best-practices)

---

## Design System Overview

The INSYDE app follows a **Notion-inspired design system** with a **purple-centric color scheme** and clean, modern UI patterns. The design emphasizes:

- **Clean, minimal aesthetics** with subtle shadows and rounded corners
- **Purple as the primary brand color** (#6A63B6 / purple-600)
- **Consistent spacing and typography** using Tailwind CSS
- **Accessible color contrasts** and interactive states
- **Mobile-first responsive design**

---

## Color Palette

### Primary Colors
```css
/* Purple Theme (Primary) */
--purple-50: #faf5ff
--purple-100: #f3e8ff
--purple-500: #a855f7
--purple-600: #6a63b6    /* Primary brand color */
--purple-700: #5a54a4
--purple-800: #5b21b6
--purple-900: #4c1d95
```

### Semantic Colors
```css
/* Success States */
--green-100: #dcfce7
--green-600: #16a34a
--green-700: #15803d

/* Warning States */
--yellow-100: #fef3c7
--yellow-600: #d97706
--yellow-700: #b45309

/* Error States */
--red-100: #fee2e2
--red-600: #dc2626
--red-700: #b91c1c

/* Neutral Colors */
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-300: #d1d5db
--gray-400: #9ca3af
--gray-500: #6b7280
--gray-600: #4b5563
--gray-700: #374151
--gray-800: #1f2937
--gray-900: #111827
```

### Background Gradients
```css
/* Primary Background */
bg-gradient-to-br from-purple-50 via-white to-purple-50

/* Card Backgrounds */
bg-white dark:bg-gray-800
bg-gray-50 dark:bg-gray-700
```

---

## Typography

### Font Families
```css
/* Primary Font */
font-family: 'Source Sans Pro', system-ui, sans-serif

/* Brand Font (for headings) */
font-family: 'Cal Sans', system-ui, sans-serif
```

### Font Sizes & Weights
```css
/* Headings */
.text-2xl font-bold          /* Page titles */
.text-xl font-semibold       /* Section headers */
.text-lg font-semibold       /* Card titles */
.text-base font-semibold     /* Subsection headers */

/* Body Text */
.text-sm                     /* Small text, captions */
.text-base                   /* Regular body text */
.text-lg                     /* Large body text */

/* Font Weights */
font-light: 300
font-normal: 400
font-medium: 500
font-semibold: 600
font-bold: 700
```

### Text Colors
```css
/* Primary Text */
text-gray-900 dark:text-white

/* Secondary Text */
text-gray-600 dark:text-gray-300

/* Muted Text */
text-gray-500 dark:text-gray-400

/* Brand Text */
text-purple-600 dark:text-purple-400
```

---

## Component Library

### Buttons

#### Primary Button
```tsx
<Button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
  <Plus className="w-5 h-5" />
  <span>Request Leave</span>
</Button>
```

#### Secondary Button
```tsx
<Button variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
  Cancel
</Button>
```

#### Small Button
```tsx
<Button size="sm" variant="outline" className="text-xs">
  <Edit className="w-3 h-3 mr-1" />
  Edit
</Button>
```

#### Icon Button
```tsx
<Button size="icon" variant="ghost" className="text-gray-400 hover:text-purple-600 hover:bg-purple-50">
  <X className="w-4 h-4" />
</Button>
```

### Cards

#### Standard Card
```tsx
<Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
  <CardHeader>
    <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
      Leave Balance Overview
    </CardTitle>
    <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
      Your current leave balance for 2024
    </CardDescription>
  </CardHeader>
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>
```

#### Info Card
```tsx
<Card className="border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 dark:bg-gray-800">
  <CardContent className="p-4">
    <div className="flex items-center space-x-3 mb-3">
      <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
        <Info className="w-3 h-3 text-purple-600 dark:text-purple-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        How Bonus Leaves Work
      </h3>
    </div>
    {/* Content */}
  </CardContent>
</Card>
```

### Badges

#### Status Badges
```tsx
// Pending
<Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700">
  <Clock className="w-3 h-3 mr-1" />
  Pending
</Badge>

// Approved
<Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700">
  <CheckCircle className="w-3 h-3 mr-1" />
  Approved
</Badge>

// Rejected
<Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700">
  <XCircle className="w-3 h-3 mr-1" />
  Rejected
</Badge>
```

#### Info Badges
```tsx
<Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700">
  {totalAvailable} days
</Badge>
```

### Form Elements

#### Input Fields
```tsx
<Input
  className="border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
  placeholder="Enter your name"
/>
```

#### Select Dropdowns
```tsx
<Select>
  <SelectTrigger className="border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white">
    <SelectValue placeholder="Select leave type" />
  </SelectTrigger>
  <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
    <SelectItem value="option" className="dark:text-white dark:hover:bg-gray-600">
      Option
    </SelectItem>
  </SelectContent>
</Select>
```

#### Textarea
```tsx
<Textarea
  className="border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500 min-h-[100px] resize-none dark:bg-gray-700 dark:text-white"
  placeholder="Brief reason for leave..."
/>
```

### Tables

#### Standard Table
```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-gray-50 dark:bg-gray-700">
      <TableHead className="font-semibold text-gray-700 dark:text-gray-200">
        Employee
      </TableHead>
      {/* More headers */}
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <TableCell className="font-medium text-gray-900 dark:text-white">
        John Doe
      </TableCell>
      {/* More cells */}
    </TableRow>
  </TableBody>
</Table>
```

### Dialogs

#### Standard Dialog
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="sm:max-w-[500px] rounded-2xl dark:bg-gray-800 dark:border-gray-700">
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold dark:text-white">
        Request Leave
      </DialogTitle>
      <DialogDescription className="text-gray-600 dark:text-gray-300">
        Submit a new leave request. Make sure you have sufficient balance.
      </DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

---

## Layout Patterns

### Page Container
```tsx
<div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-8">
  <div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto">
    {/* Content */}
  </div>
</div>
```

### Card Grid Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards */}
</div>
```

### Tab Navigation
```tsx
<div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
  <Button
    variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setActiveTab('dashboard')}
    className="flex-1"
  >
    <Eye className="w-4 h-4 mr-2" />
    Dashboard
  </Button>
  {/* More tabs */}
</div>
```

### Header Section
```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-4">
    <h1 className="font-cal-sans text-3xl font-semibold text-purple-600 tracking-tight">
      insyde
    </h1>
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
      <p className="text-gray-600">Attendance analytics and insights</p>
    </div>
  </div>
  <div className="flex gap-2">
    {/* Action buttons */}
  </div>
</div>
```

---

## Page-Specific Components

### Main App Page (`/`)

#### User Profile Header
```tsx
<div className="flex items-center space-x-4">
  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
    {name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
  </div>
  <div>
    <p className="font-semibold text-gray-900">{name}</p>
    <p className="text-sm text-gray-600">
      {hasOpen ? 'Currently checked in' : 'Ready to check in'}
    </p>
  </div>
</div>
```

#### Action Button (Hold to Confirm)
```tsx
<button
  className={`w-full h-16 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl select-none relative overflow-hidden ${
    isHolding ? 'scale-105' : 'hover:scale-102'
  }`}
  style={{
    background: holdProgress > 0 
      ? `linear-gradient(90deg, ${hasOpen ? '#dc2626' : '#16a34a'} ${holdProgress}%, ${hasOpen ? '#b91c1c' : '#15803d'} ${holdProgress}%)`
      : `linear-gradient(135deg, ${hasOpen ? '#dc2626' : '#16a34a'}, ${hasOpen ? '#b91c1c' : '#15803d'})`,
    boxShadow: holdProgress > 0 ? `0 0 20px rgba(${hasOpen ? '220, 38, 38' : '22, 163, 74'}, 0.4)` : '0 10px 25px rgba(0,0,0,0.1)'
  }}
>
  <div className="text-white text-center select-none flex items-center space-x-3">
    <i className={`fas ${hasOpen ? 'fa-sign-out-alt' : 'fa-sign-in-alt'} text-2xl`}></i>
    <span className="font-semibold text-lg">
      {hasOpen ? 'Clock Out' : 'Clock In'}
    </span>
  </div>
</button>
```

#### Status Badges
```tsx
<div className="flex flex-wrap gap-2 justify-center">
  <span className="notion-badge notion-badge-info">
    Started at {formatDisplayTime(me.lastIn)}
  </span>
  <span className="notion-badge notion-badge-success">
    Working: {me.workedMinutes}m
  </span>
</div>
```

### Leave Management Page (`/leave`)

#### Leave Balance Cards
```tsx
<div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md transition-all duration-200">
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
      {balance.leave_type_name}
    </span>
    <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
      <CalendarDays className="w-3 h-3 text-purple-600 dark:text-purple-400" />
    </div>
  </div>
  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
    {balance.available_leaves}
  </div>
  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
    {balance.used_leaves} used • {balance.pending_leaves} pending
  </div>
  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
    <div
      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
      style={{
        width: `${balance.total_entitlement > 0 ? (balance.available_leaves / balance.total_entitlement) * 100 : 0}%`
      }}
    ></div>
  </div>
</div>
```

#### Progress Summary Card
```tsx
<div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
  <div className="flex items-center space-x-3">
    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
      <Calendar className="w-4 h-4 text-white" />
    </div>
    <div>
      <span className="text-base font-semibold text-gray-900 dark:text-white">Total Available</span>
      <p className="text-xs text-gray-600 dark:text-gray-300">All leave types combined</p>
    </div>
  </div>
  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
    {getTotalAvailableLeaves()} days
  </span>
</div>
```

### Admin Dashboard (`/admin`)

#### Stats Cards
```tsx
<Card>
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">Total Employees</p>
        <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
      </div>
      <Users className="w-8 h-8 text-purple-600" />
    </div>
  </CardContent>
</Card>
```

#### Chart Containers
```tsx
<Card>
  <CardHeader>
    <CardTitle>Office vs Remote Days</CardTitle>
  </CardHeader>
  <CardContent>
    <Bar
      data={chartData.officeVsRemote}
      options={{
        responsive: true,
        plugins: {
          legend: {
            position: 'top' as const,
          },
        },
      }}
    />
  </CardContent>
</Card>
```

### AI Assistant Component

#### Chat Messages
```tsx
<div
  className={`max-w-[80%] rounded-lg p-4 ${
    message.role === 'user'
      ? 'bg-purple-600 text-white'
      : 'bg-gray-100 text-gray-900'
  }`}
>
  <div className="flex items-start space-x-2">
    {message.role === 'assistant' && (
      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
        <i className="fas fa-robot text-white text-xs"></i>
      </div>
    )}
    <div className="flex-1">
      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
      <div className={`text-xs mt-2 ${
        message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
      }`}>
        {formatTime(message.timestamp)}
      </div>
    </div>
  </div>
</div>
```

#### Quick Action Buttons
```tsx
<div className="mt-3 flex flex-wrap gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={() => setInputValue('What are the leave policies and benefits?')}
    className="text-xs"
  >
    Leave & Benefits
  </Button>
  <Button
    variant="outline"
    size="sm"
    onClick={() => setInputValue('How do we work and what are our principles?')}
    className="text-xs"
  >
    Work Culture
  </Button>
</div>
```

---

## Animation & Interactions

### Loading States
```tsx
// Spinner
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>

// Loading text
<p className="text-gray-600 dark:text-gray-300">Loading your leave information...</p>
```

### Hover Effects
```tsx
// Card hover
className="hover:shadow-md transition-all duration-200"

// Button hover
className="hover:scale-102 transition-all duration-300"

// Badge hover
className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
```

### Transitions
```tsx
// Standard transitions
className="transition-all duration-200"
className="transition-colors duration-200"
className="transition-shadow duration-200"

// Custom animations
className="fade-in"        // 0.3s ease-in-out
className="slide-up"       // 0.3s ease-out
```

### Progress Animations
```tsx
// Hold progress
const [holdProgress, setHoldProgress] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setHoldProgress(prev => {
      if (prev >= 100) {
        // Complete action
        return 100;
      }
      return prev + 2; // Complete in ~2.5 seconds
    });
  }, 50);

  return () => clearInterval(interval);
}, [isHolding]);
```

---

## Responsive Design

### Breakpoint Strategy
```css
/* Mobile First Approach */
max-w-sm          /* 384px - Mobile */
md:max-w-md       /* 768px - Tablet */
lg:max-w-lg       /* 1024px - Desktop */
xl:max-w-xl       /* 1280px - Large Desktop */
```

### Responsive Grids
```tsx
// Responsive card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Responsive layout
<div className="w-full max-w-sm md:max-w-md lg:max-w-lg mx-auto">

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold">
```

### Mobile-Specific Patterns
```tsx
// Mobile-friendly buttons
<Button className="w-full h-16 rounded-lg flex items-center justify-center">

// Mobile-optimized spacing
<div className="p-4 md:p-6 lg:p-8">

// Mobile navigation
<div className="flex flex-col md:flex-row gap-2">
```

---

## Dark Mode Support

### Dark Mode Classes
```tsx
// Backgrounds
className="bg-white dark:bg-gray-800"
className="bg-gray-50 dark:bg-gray-700"

// Borders
className="border-gray-200 dark:border-gray-700"
className="border-gray-300 dark:border-gray-600"

// Text
className="text-gray-900 dark:text-white"
className="text-gray-600 dark:text-gray-300"
className="text-gray-500 dark:text-gray-400"

// Form elements
className="dark:bg-gray-700 dark:text-white"
className="dark:border-gray-600"
```

### Dark Mode Badges
```tsx
// Status badges with dark mode
className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700"

// Info badges with dark mode
className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700"
```

---

## Best Practices

### Component Structure
1. **Consistent imports** - Group UI components, icons, and utilities
2. **TypeScript interfaces** - Define props and data structures
3. **Error handling** - Always include error states and loading states
4. **Accessibility** - Use semantic HTML and ARIA labels

### Styling Guidelines
1. **Use Tailwind classes** - Avoid custom CSS unless necessary
2. **Consistent spacing** - Use Tailwind's spacing scale (4, 6, 8, 12, 16, etc.)
3. **Color consistency** - Always use the defined color palette
4. **Responsive design** - Mobile-first approach with progressive enhancement

### Performance Considerations
1. **Lazy loading** - Load components and data on demand
2. **Optimized images** - Use appropriate image formats and sizes
3. **Minimal re-renders** - Use React.memo and useMemo where appropriate
4. **Efficient animations** - Use CSS transforms and opacity for smooth animations

### Code Organization
1. **Component composition** - Break down complex components into smaller, reusable pieces
2. **Consistent naming** - Use descriptive, consistent naming conventions
3. **Documentation** - Include JSDoc comments for complex functions
4. **Error boundaries** - Implement error boundaries for better error handling

---

## Custom CSS Classes

### Notion-Inspired Classes
```css
.notion-card {
  @apply bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200;
}

.notion-button-primary {
  @apply inline-flex items-center justify-center gap-x-2 bg-purple-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-purple-700 disabled:opacity-50 disabled:pointer-events-none transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2;
}

.notion-badge {
  @apply inline-flex items-center gap-x-1 py-1 px-2 rounded-md text-xs font-medium;
}

.notion-badge-primary {
  @apply bg-purple-100 text-purple-800;
}

.notion-badge-success {
  @apply bg-green-100 text-green-800;
}

.notion-badge-warning {
  @apply bg-yellow-100 text-yellow-800;
}

.notion-badge-danger {
  @apply bg-red-100 text-red-800;
}

.notion-badge-info {
  @apply bg-gray-100 text-gray-700;
}

.notion-badge-outline {
  @apply bg-white border border-gray-300 text-gray-700;
}
```

### Animation Classes
```css
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(10px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}
```

---

## Implementation Checklist

When implementing new components or pages, ensure:

- [ ] Uses consistent color palette (purple theme)
- [ ] Implements dark mode support
- [ ] Follows responsive design patterns
- [ ] Includes proper loading and error states
- [ ] Uses semantic HTML and accessibility features
- [ ] Implements smooth animations and transitions
- [ ] Follows component composition patterns
- [ ] Includes TypeScript interfaces
- [ ] Uses consistent spacing and typography
- [ ] Implements proper hover and focus states

---

*This style guide should be updated as the design system evolves. For questions or clarifications, refer to the existing components in the codebase.*
