# Main App Style Guide

This style guide documents the design system used in the main check-in app (`app/page.tsx`). Use this guide to maintain consistency when redesigning the admin and admin-chat pages.

## Table of Contents
1. [Color System](#color-system)
2. [Typography](#typography)
3. [Spacing & Layout](#spacing--layout)
4. [Components](#components)
5. [Elevation & Shadows](#elevation--shadows)
6. [Animations](#animations)
7. [Interactive Elements](#interactive-elements)
8. [Status & Badges](#status--badges)
9. [Icons](#icons)
10. [Loading States](#loading-states)
11. [Modals & Dialogs](#modals--dialogs)

---

## Color System

### Light Mode Colors
```css
--background: 0 0% 100% (white)
--foreground: 222.2 84% 4.9% (near black)
--card: 0 0% 100% (white)
--card-foreground: 222.2 84% 4.9% (near black)
--primary: 222.2 47.4% 11.2% (dark blue-gray)
--primary-foreground: 210 40% 98% (off-white)
--muted: 210 40% 96.1% (light gray)
--muted-foreground: 215.4 16.3% 46.9% (medium gray)
--border: 214.3 31.8% 91.4% (light gray border)
--input: 214.3 31.8% 91.4% (light gray)
```

### Dark Mode Colors
```css
--background: 222.2 15% 8% (very dark blue-gray)
--foreground: 210 40% 98% (off-white)
--card: 222.2 15% 12% (dark card)
--card-foreground: 210 40% 98% (off-white)
--primary: 25 95% 53% (orange)
--primary-foreground: 210 40% 98% (off-white)
--muted: 217.2 32.6% 17.5% (dark muted)
--muted-foreground: 215 20.2% 65.1% (light gray)
--border: 217.2 32.6% 20% (dark border)
--input: 217.2 32.6% 20% (dark input)
```

### Action Colors
- **Check In (Success)**: `#90EE90` to `#7ED957` (light green gradient)
- **Check Out (Danger)**: `#dc2626` to `#b91c1c` (red gradient)
- **Status Colors**:
  - On-time: `orange-500`
  - Early: `blue-500`
  - Slightly Late: `yellow-500`
  - Late: `red-500`
  - Absent/Leave: `gray-500`
  - N/A: `gray-400` (light) / `gray-600` (dark)

### Usage
- Always use CSS variables: `bg-background`, `text-foreground`, `border-border`
- Support both light and dark modes with `dark:` variants
- Use `muted` colors for secondary text and backgrounds

---

## Typography

### Font Families
1. **Primary**: `'Source Sans Pro', system-ui, sans-serif`
   - Used for: Body text, UI elements, buttons
   - Weights: 200, 300, 400, 600, 700, 900

2. **Display**: `'Cal Sans', system-ui, sans-serif`
   - Used for: Brand name, large headings
   - Weights: 400, 500, 600, 700

3. **Serif (Special)**: `var(--font-playfair-display), serif`
   - Used for: Greeting messages, special headings
   - Example: "What's up, {firstName}!"

### Font Sizes
- **Heading 1**: `text-3xl font-bold` (greeting)
- **Heading 2**: `text-2xl font-bold` (section titles)
- **Heading 3**: `text-lg font-semibold` (subsection titles)
- **Body**: `text-sm` (default) or `text-base`
- **Small**: `text-xs` or `text-[10px]` (labels, badges)
- **Large**: `text-lg` (important text)

### Font Weights
- **Bold**: `font-bold` (headings, important text)
- **Semibold**: `font-semibold` (subheadings, labels)
- **Medium**: `font-medium` (buttons, emphasis)
- **Normal**: `font-normal` (body text)

### Line Heights
- Default: `leading-none` (tight) or `leading-tight` (compact)
- Body: `leading-relaxed` (readable text)

---

## Spacing & Layout

### Container
- **Main Container**: `max-w-md mx-auto px-4 py-6 sm:px-6 w-full`
  - Mobile-first design
  - Centered with max-width constraint
  - Responsive padding

### Spacing Scale
- **xs**: `gap-1` or `space-y-1` (4px)
- **sm**: `gap-2` or `space-y-2` (8px)
- **md**: `gap-3` or `space-y-3` (12px)
- **base**: `gap-4` or `space-y-4` (16px)
- **lg**: `gap-6` or `space-y-6` (24px)
- **xl**: `gap-8` or `space-y-8` (32px)

### Common Patterns
- **Section Spacing**: `space-y-6` (between major sections)
- **Card Padding**: `p-3` (small cards) or `p-4` (standard cards) or `p-6` (large cards)
- **Button Padding**: `px-4 py-2.5` (tabs) or `h-14` (large buttons)
- **Grid Gaps**: `gap-3` (tight) or `gap-4` (standard)

---

## Components

### Cards
```tsx
// Standard Card
className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-4 elevation-md"

// Overview Card (small)
className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-3 elevation-md"

// Card with hover
className="... card-hover" // Adds scale(1.02) on hover
```

**Characteristics**:
- Border radius: `rounded-xl` (12px)
- Border: `border-border/50` (50% opacity for subtlety)
- Padding: `p-3` to `p-6` depending on content
- Background: Uses `bg-card` with dark mode support

### Buttons

#### Primary Action Button (Hold-to-Activate)
```tsx
// Check In Button
className="flex-1 h-16 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 select-none relative overflow-hidden button-press elevation-lg"
style={{
  background: `linear-gradient(135deg, #90EE90, #7ED957)`,
  boxShadow: '0 10px 25px rgba(144, 238, 144, 0.3)'
}}

// Check Out Button
style={{
  background: `linear-gradient(135deg, #dc2626, #b91c1c)`,
  boxShadow: '0 10px 25px rgba(220, 38, 38, 0.3)'
}}
```

#### Standard Button
```tsx
className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
```

#### Ghost Button
```tsx
className="text-muted-foreground dark:text-muted-foreground hover:text-foreground"
```

**Button Sizes**:
- **Large**: `h-14` or `h-16` (56px/64px)
- **Default**: `h-9` (36px)
- **Small**: `h-8` (32px)

### Tabs
```tsx
className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
  activeTab === 'control'
    ? 'border-primary text-foreground dark:text-foreground'
    : 'border-transparent text-muted-foreground dark:text-muted-foreground hover:text-foreground'
}`}
```

**Characteristics**:
- Bottom border indicator (2px)
- Active: `border-primary` with full opacity text
- Inactive: Transparent border with muted text
- Hover: Text color transitions to foreground

### Inputs
```tsx
className="w-full px-4 py-6 text-center text-lg border-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-border dark:border-border bg-background dark:bg-background text-foreground dark:text-foreground"
```

**Characteristics**:
- Border: `border-2` (thicker for emphasis)
- Focus: Ring with offset
- Padding: `px-4 py-6` (generous for mobile)
- Border radius: `rounded-lg` (8px)

### Overview Cards (Grid)
```tsx
// 3-column grid
className="grid grid-cols-3 gap-3"

// Card content
<div className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-3 elevation-md card-hover flex flex-col h-full">
  {/* Icon */}
  <div className="mb-2">
    <div className="text-foreground dark:text-foreground flex-shrink-0 opacity-80">
      {icon}
    </div>
  </div>
  
  {/* Value */}
  <div className="mb-2 min-h-[1.75rem]">
    <span className="text-lg font-bold text-foreground dark:text-foreground leading-none">{time}</span>
  </div>
  
  {/* Label */}
  <p className="text-[10px] text-muted-foreground dark:text-muted-foreground leading-tight mt-auto">{message}</p>
</div>
```

---

## Elevation & Shadows

### Elevation Classes
```css
.elevation-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.elevation-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.elevation-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.elevation-xl {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

### Dark Mode Elevation
- Dark mode uses stronger shadows (0.3-0.4 opacity instead of 0.05-0.1)

### Colored Shadows
```css
.shadow-primary {
  box-shadow: 0 4px 14px 0 rgba(251, 146, 60, 0.3);
}
```

### Usage
- **Cards**: `elevation-md` (standard) or `elevation-lg` (prominent)
- **Buttons**: `elevation-lg` (primary actions)
- **Modals**: `elevation-xl` (highest)

---

## Animations

### Framer Motion Patterns
```tsx
// Tab transition
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2 }}
>

// Card entrance
<motion.div
  initial={{ opacity: 0, y: 20, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
  whileHover={{ scale: 1.02, y: -2 }}
>

// Staggered cards
transition={{ delay: 0.1 }} // 0.1, 0.15, 0.2, etc.
```

### CSS Animations
```css
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}

.card-entrance {
  animation: cardEntrance 0.4s ease-out;
}
```

### Button Press
```css
.button-press {
  transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
}

.button-press:active {
  transform: scale(0.98);
}
```

### Transitions
- **Standard**: `transition-colors duration-200`
- **Smooth**: `transition-all duration-300`
- **Fast**: `transition-all duration-100`

---

## Interactive Elements

### Hover States
- **Cards**: `hover:bg-muted dark:hover:bg-muted` or `card-hover` class
- **Buttons**: `hover:bg-primary/90` or `hover:scale-[1.01]`
- **Links**: `hover:text-foreground`

### Focus States
```tsx
className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
```

### Active States
- Buttons: `scale(0.98)` on press
- Tabs: Border and color change

### Disabled States
```tsx
className="disabled:opacity-50 disabled:cursor-not-allowed"
```

---

## Status & Badges

### Status Badge Component
```tsx
<span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm bg-{color} text-white">
  {text}
</span>
```

### Status Colors
- **On-time**: `bg-orange-500`
- **Early**: `bg-blue-500`
- **Slightly Late**: `bg-yellow-500`
- **Late**: `bg-red-500`
- **Absent/Leave**: `bg-gray-500`
- **N/A**: `bg-gray-400` (light) / `bg-gray-600` (dark)

### Badge Styles
- **Rounded**: `rounded-full` (pill shape)
- **Size**: `text-[10px]` with `px-2 py-0.5`
- **Font**: `font-semibold`

### Notion-Style Badges
```tsx
// Success
className="notion-badge notion-badge-success text-xs"

// Outline
className="notion-badge notion-badge-outline text-xs"

// Info
className="notion-badge notion-badge-info text-xs"

// Danger
className="notion-badge notion-badge-danger text-xs"
```

---

## Icons

### Icon Library
- **Lucide React**: Primary icon library
- **Font Awesome**: Used for some UI elements (`fas fa-sign-in-alt`, etc.)

### Icon Sizes
- **Small**: `w-3 h-3` (12px) - inline with text
- **Default**: `w-4 h-4` (16px) - buttons, labels
- **Medium**: `w-5 h-5` (20px) - cards, sections
- **Large**: `w-8 h-8` (32px) - headers, prominent

### Icon Colors
- **Default**: `text-foreground` or `text-muted-foreground`
- **Primary**: `text-primary`
- **Accent**: Match surrounding text color
- **Opacity**: `opacity-80` for subtle icons

### Icon Usage
- Always include `flex-shrink-0` to prevent icon distortion
- Use `mt-0.5` for vertical alignment with text

---

## Loading States

### Spinner
```tsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
```

### Loading Text
```tsx
<p className="text-foreground dark:text-foreground">Loading...</p>
```

### Button Loading
```tsx
<span className="flex items-center justify-center">
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
  Loading...
</span>
```

### Skeleton States
- Use `bg-muted` with rounded corners
- Match the final content dimensions

---

## Modals & Dialogs

### Modal Overlay
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-lg p-6 max-w-sm w-full">
    {/* Content */}
  </div>
</div>
```

### Modal Characteristics
- **Overlay**: `bg-black bg-opacity-50`
- **Container**: `bg-white` (light) or `bg-card` (dark)
- **Border Radius**: `rounded-lg` or `rounded-xl`
- **Padding**: `p-6`
- **Max Width**: `max-w-sm` (small) or `max-w-md` (medium)
- **Z-index**: `z-50`

### Dialog Actions
```tsx
<div className="flex gap-3">
  <button className="flex-1 py-2 px-4 border border-input rounded-md text-foreground hover:bg-muted">
    Cancel
  </button>
  <button className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
    Confirm
  </button>
</div>
```

---

## Special Patterns

### Greeting Section
```tsx
<h1 className="text-3xl font-bold text-foreground dark:text-foreground" style={{ fontFamily: 'var(--font-playfair-display), serif' }}>
  What's up, {firstName}!
</h1>
```

### Divider
```tsx
<div className="my-8 h-px bg-border" />
```

### Section Header
```tsx
<div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50 dark:border-border">
  <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Overview</h3>
  <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
    <Calendar className="w-4 h-4" />
    <span>{dateString}</span>
  </div>
</div>
```

### Notification/AI Output Display
```tsx
<div className="text-sm bg-card dark:bg-card border border-border/50 dark:border-border rounded-xl p-4 min-h-[60px] relative elevation-md">
  <div className="font-medium mb-1 text-foreground dark:text-foreground flex justify-between items-center">
    <span>✨</span>
    <button className="text-muted-foreground hover:text-foreground text-xs">✕</button>
  </div>
  <div className="text-foreground dark:text-foreground">{content}</div>
</div>
```

### Empty State
```tsx
<div className="text-center py-8">
  <p className="text-muted-foreground dark:text-muted-foreground">No data available</p>
</div>
```

---

## Responsive Design

### Breakpoints
- **Mobile**: Default (no prefix)
- **Small**: `sm:` (640px+)
- **Medium**: `md:` (768px+)
- **Large**: `lg:` (1024px+)

### Mobile-First Approach
- Start with mobile styles
- Add larger screen enhancements with breakpoint prefixes
- Use `max-w-md` for main content containers

### Touch Targets
- Minimum: `h-9` (36px) for buttons
- Preferred: `h-14` (56px) for primary actions
- Spacing: `gap-3` or `gap-4` between interactive elements

---

## Dark Mode Support

### Always Include Dark Variants
- Every color class should have a `dark:` variant
- Test both light and dark modes
- Use CSS variables for theme colors

### Common Pattern
```tsx
className="bg-background dark:bg-background text-foreground dark:text-foreground border-border dark:border-border"
```

### Dark Mode Toggle
- Located in footer or header
- Uses `DarkModeToggle` component

---

## Best Practices

1. **Consistency**: Use the same spacing, colors, and component patterns throughout
2. **Accessibility**: Include focus states, proper contrast, and semantic HTML
3. **Performance**: Use CSS transitions over JavaScript animations when possible
4. **Mobile-First**: Design for mobile, enhance for desktop
5. **Dark Mode**: Always support both themes
6. **Typography**: Use the defined font families and sizes consistently
7. **Spacing**: Follow the spacing scale for rhythm
8. **Elevation**: Use elevation to show hierarchy
9. **Animations**: Keep animations subtle and purposeful
10. **Loading**: Always show loading states for async operations

---

## Implementation Checklist

When redesigning admin/admin-chat pages:

- [ ] Replace purple gradient backgrounds with `bg-background`
- [ ] Update all colors to use CSS variables
- [ ] Replace `font-cal-sans` with appropriate typography
- [ ] Update card styles to match `rounded-xl border border-border/50`
- [ ] Replace button styles with primary/ghost variants
- [ ] Add dark mode support to all components
- [ ] Update spacing to match scale (gap-3, gap-4, gap-6)
- [ ] Add elevation classes (elevation-md, elevation-lg)
- [ ] Update tab navigation to match main app style
- [ ] Replace status badges with StatusBadge component
- [ ] Add framer-motion animations for transitions
- [ ] Update modal/dialog styles
- [ ] Ensure mobile-first responsive design
- [ ] Test in both light and dark modes

---

## Example: Redesigned Card

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="bg-card dark:bg-card rounded-xl border border-border/50 dark:border-border p-4 elevation-md card-hover"
>
  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50 dark:border-border">
    <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
      Section Title
    </h3>
  </div>
  <div className="space-y-4">
    {/* Content */}
  </div>
</motion.div>
```

---

*Last Updated: Based on main app design as of current implementation*

