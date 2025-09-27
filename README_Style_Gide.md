# VelociTerm NB CSS Style Guide

## Architecture Overview

VelociTerm NB uses a **scoped theme architecture** that ensures themes work consistently in both development and production builds. The system is built around theme-specific CSS modules that are imported at build time and applied via CSS class switching.

### Core Architecture Principle

**All themes are completely isolated using CSS class scoping.** This prevents conflicts between themes and ensures proper bundling in production builds.

## Theme System Architecture

### File Structure
```
src/
├── themes/
│   ├── theme-crt-cyber.css     # .theme-cyber
│   ├── theme-crt-amber.css     # .theme-amber  
│   ├── theme-light.css         # .theme-light
│   ├── theme-blue.css          # .theme-blue
│   └── theme-*.css             # Other themes
├── App.jsx                     # Theme imports & switching
└── components/
    └── *.jsx                   # Use CSS variables
```
## Critical Naming Requirement

### File Name ↔ Class Name Mapping

**The CSS filename MUST exactly match the theme class name:**

```
✅ Correct Mapping:
theme-default.css    → .theme-default
theme-light.css      → .theme-light  
theme-crt-amber.css  → .theme-amber
theme-blue.css       → .theme-blue
```

```
❌ Incorrect - Will Not Work:
theme-default.css    → .theme-light     // Mismatch!
theme-autumn.css     → .theme-fall      // Mismatch!
```

### Why This Matters

The dynamic theme loading system uses the filename to determine which CSS class to apply to the DOM. If there's a mismatch:
- Theme styles won't be applied
- Components will render with no styling
- No error messages (silent failure)

### Naming Convention Rules

1. **Filename format:** `theme-[name].css`
2. **Class format:** `.theme-[name]` 
3. **Name must match exactly** (case-sensitive)
4. **Use kebab-case** for multi-word names:
   - `theme-crt-amber.css` → `.theme-crt-amber`
   - `theme-dark-blue.css` → `.theme-dark-blue`

### Example Implementation

```javascript
// In App.jsx - theme switching logic
useEffect(() => {
  // The filename determines the class that gets applied
  document.documentElement.classList.add(`theme-${theme}`);
  // If theme = "default", looks for .theme-default class
  // Must exist in theme-default.css file
}, [theme]);
```

### Theme Loading & Application

#### 1. Import All Themes (App.jsx)
```javascript
// Import all theme CSS files at build time
import './themes/theme-crt-cyber.css';
import './themes/theme-crt-amber.css';
import './themes/theme-light.css';
import './themes/theme-blue.css';
// ... other themes
```

#### 2. Dynamic Theme Switching
```javascript
useEffect(() => {
  // Remove all existing theme classes
  const themeClasses = [
    'theme-cyber', 'theme-amber', 'theme-light', 'theme-blue'
  ];
  
  themeClasses.forEach(className => {
    document.documentElement.classList.remove(className);
  });
  
  // Add the current theme class
  document.documentElement.classList.add(`theme-${theme}`);
}, [theme]);
```

## Scoped Theme Structure

### Theme File Template
Every theme file must follow this exact structure:

```css
/* Theme Name - scoped to .theme-[name] class */
.theme-[name] {
    /* CSS Custom Properties scoped to theme */
    --bg-main: #value !important;
    --bg-sidebar: #value !important;
    --bg-accordion: #value;
    --bg-accordion-header: #value;
    --bg-accordion-content: #value;
    --bg-button: #value;
    --bg-scroll: #value;
    --bg-thumb-active: #value;
    --bg-thumb-hover: #value;
    --bg-button-hover: #value;
    --bg-input: #value;
    --bg-tab: #value;
    --bg-tab-active: #value;
    --text-color: #value;
    --text-accordion: #value;
    --text-button: #value;
    --text-tab: #value;
    --text-tab-inactive: #value;
    --border-color: #value;
    --border-focus: #value;
}

/* All selectors scoped under .theme-[name] */
.theme-[name] body,
.theme-[name] {
    background-color: var(--bg-main);
    color: var(--text-color);
}

.theme-[name] .sidebar {
    background-color: var(--bg-sidebar);
}

/* ... all other component styles ... */
```

### Required CSS Custom Properties

Every theme MUST define these properties:

#### Backgrounds
- `--bg-main` - Primary app background
- `--bg-sidebar` - Sidebar background  
- `--bg-accordion` - Secondary backgrounds
- `--bg-accordion-header` - Header backgrounds
- `--bg-accordion-content` - Content area backgrounds
- `--bg-button` - Button background
- `--bg-button-hover` - Button hover state
- `--bg-input` - Form input backgrounds
- `--bg-tab` - Tab backgrounds
- `--bg-tab-active` - Active tab background
- `--bg-scroll` - Scrollbar track
- `--bg-thumb-active` - Scrollbar thumb
- `--bg-thumb-hover` - Scrollbar thumb hover

#### Typography  
- `--text-color` - Primary text
- `--text-accordion` - Secondary text
- `--text-button` - Button text
- `--text-tab` - Active tab text
- `--text-tab-inactive` - Inactive/muted text

#### Borders & Focus
- `--border-color` - Standard borders
- `--border-focus` - Focus states (brand color)

### Component Scoping Rules

**Every CSS rule must be scoped under the theme class:**

```css
/* ✅ Correct - Scoped */
.theme-amber .button {
    background-color: var(--bg-button);
    color: var(--text-button);
}

.theme-amber .sidebar {
    background-color: var(--bg-sidebar);
}

/* ❌ Incorrect - Global selectors */
.button {
    background-color: var(--bg-button);
}

:root {
    --bg-main: #000000;
}
```

## Component Development Guidelines

### Using Theme Variables in Components

Components use CSS custom properties via inline styles:

```jsx
// ✅ Correct - Uses theme variables
<div style={{
  backgroundColor: 'var(--bg-sidebar)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)'
}}>
  Content
</div>

// ❌ Incorrect - Hardcoded colors
<div style={{
  backgroundColor: '#ffffff',
  color: '#000000'
}}>
  Content
</div>
```

### Interactive States Pattern

```jsx
const Component = () => {
  return (
    <button
      style={{
        backgroundColor: 'var(--bg-button)',
        color: 'var(--text-button)',
        borderColor: 'var(--border-color)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = 'var(--bg-button-hover)';
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = 'var(--bg-button)';
      }}
    >
      Button
    </button>
  );
};
```

### Focus States

```jsx
// Focus handling with theme colors
<input
  style={{
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-color)',
    borderColor: 'var(--border-color)'
  }}
  onFocus={(e) => {
    e.target.style.outline = '2px solid var(--border-focus)';
  }}
  onBlur={(e) => {
    e.target.style.outline = 'none';
  }}
/>
```

## Creating New Themes

### Step 1: Create Theme File
Create `src/themes/theme-[name].css`:

```css
/* [Theme Name] theme - scoped to .theme-[name] class */
.theme-[name] {
    /* Define all required CSS custom properties */
    --bg-main: #value !important;
    --bg-sidebar: #value !important;
    /* ... rest of properties ... */
}

/* Copy and modify all component selectors from existing theme */
.theme-[name] .sidebar { /* ... */ }
.theme-[name] .button { /* ... */ }
/* ... etc ... */
```

### Step 2: Import in App.jsx
```javascript
import './themes/theme-[name].css';
```

### Step 3: Add to Theme Switcher
```javascript
// In App.jsx theme switching logic
const themeClasses = [
  'theme-cyber', 'theme-amber', 'theme-light', 'theme-blue',
  'theme-[name]' // Add your new theme
];
```

### Step 4: Test All States
- Light/dark variations
- Interactive states (hover, focus, active)
- All component types (buttons, inputs, modals, etc.)
- Production build compatibility

## CSS Architecture Rules

### 1. No Global Theme Variables
```css
/* ❌ Never do this - breaks scoping */
:root {
    --bg-main: #ffffff;
}

/* ✅ Always scope to theme class */
.theme-light {
    --bg-main: #ffffff !important;
}
```

### 2. Complete Component Coverage
Every component selector must exist in every theme:

```css
/* Required in EVERY theme file */
.theme-[name] .sidebar { /* ... */ }
.theme-[name] .button { /* ... */ }  
.theme-[name] .form-input { /* ... */ }
.theme-[name] .tab-button { /* ... */ }
.theme-[name] .search-input { /* ... */ }
/* ... etc ... */
```

### 3. Consistent Property Names
All themes must use identical CSS custom property names:

```css
/* ✅ Consistent across all themes */
.theme-light { --bg-main: #ffffff; }
.theme-dark { --bg-main: #000000; }

/* ❌ Different property names break components */
.theme-light { --background-main: #ffffff; }
.theme-dark { --bg-primary: #000000; }
```

## Production Build Considerations

### CSS Module Bundling
- All theme CSS files are bundled at build time
- Dynamic imports are NOT used (would break production)
- Theme switching uses only CSS class manipulation
- No runtime CSS loading

### Performance Optimization
```css
/* Use !important sparingly - only for core theme properties */
.theme-[name] {
    --bg-main: #value !important; /* Override any conflicts */
    --bg-sidebar: #value !important;
    /* Secondary properties don't need !important */
    --bg-accordion: #value;
}
```

## Debugging Theme Issues

### Common Problems

1. **Theme not applying**
   - Check if CSS file is imported in App.jsx
   - Verify theme class is applied to document.documentElement
   - Ensure CSS custom properties are scoped correctly

2. **Colors not showing**
   - Check CSS custom property names match exactly
   - Verify component uses `var(--property-name)` syntax
   - Ensure theme class exists on parent element

3. **Production vs Development differences**
   - All themes must be imported as modules, not loaded dynamically
   - Verify CSS bundling includes all theme files
   - Test production build locally

### Debug Tools

```javascript
// Check applied theme class
console.log(document.documentElement.className);

// Check CSS custom property value
getComputedStyle(document.documentElement)
  .getPropertyValue('--bg-main');

// List all theme classes
console.log(Array.from(document.documentElement.classList));
```

## Migration from Old Architecture

### Converting Existing Themes

1. **Wrap all CSS in theme class:**
   ```css
   /* Before */
   :root { --bg-main: #fff; }
   .button { background: var(--bg-main); }
   
   /* After */
   .theme-light { --bg-main: #fff; }
   .theme-light .button { background: var(--bg-main); }
   ```

2. **Add missing properties:**
   Compare with working theme (amber/cyber) and add any missing CSS custom properties

3. **Update imports:**
   Ensure theme is imported in App.jsx

4. **Test thoroughly:**
   Verify all components render correctly in new theme

## Best Practices

### ✅ Do This
- Import all themes in App.jsx at build time
- Scope every CSS rule under theme class
- Use consistent CSS custom property names
- Test themes in production builds
- Use semantic color names (--bg-sidebar, not --color-blue)

### ❌ Don't Do This  
- Use `:root` for theme variables
- Load themes dynamically at runtime
- Mix scoped and global CSS rules
- Hardcode colors in components
- Skip testing in production builds

## File Checklist

When creating or modifying theme files:

- [ ] CSS file follows `.theme-[name]` scoping pattern
- [ ] All required CSS custom properties are defined
- [ ] All component selectors are scoped under theme class
- [ ] File is imported in App.jsx
- [ ] Theme name matches import and class name exactly
- [ ] No `:root` or global selectors exist
- [ ] Tested in both development and production builds

---

*This architecture ensures themes work consistently across development and production environments while maintaining complete theme isolation.*