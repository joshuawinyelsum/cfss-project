# CFSS Design System

## Core Principles
1. **Functional First**: Every element must have a clear purpose. No decorative effects (glows, glassmorphism, gradients) that do not aid usability.
2. **Clear Typography**: System fonts (Arial, Helvetica, sans-serif) are used for maximum legibility. No decorative font pairings.
3. **Contrast and Hierarchy**: Use strong borders, clear backgrounds, and distinct text colors to establish hierarchy.
4. **Accessible**: All interactive elements must be keyboard accessible with visible focus states. High contrast text.

## Color Palette
*   **Page Background**: `#f9fafb` (gray-50)
*   **Surface**: `#ffffff` (white)
*   **Brand Primary (CFSS Green)**: `#093C22`
*   **Brand Hover**: `#0c512e`
*   **Text Primary**: `#111827` (gray-900)
*   **Text Secondary**: `#4b5563` (gray-600)
*   **Text Muted**: `#9ca3af` (gray-400)
*   **Border**: `#e5e7eb` (gray-200)

## Typography
*   **Headings**: Bold, Primary text color, avoiding all-caps where unnecessary.
*   **Body**: Regular weight, Primary or Secondary text color.
*   **Labels**: Small (text-sm), Medium weight, Secondary text color.

## Layout and Spacing
*   **Containers**: Use `max-w-7xl` for main pages, `max-w-md` for auth forms.
*   **Spacing**: Use consistent multiples of 4 (e.g., `p-4`, `p-6`, `gap-4`).
*   **Cards**: Simple white background, subtle border (`border-gray-200`), small radius (`rounded-md`), subtle or no shadow (`shadow-sm`). Do not use thick colored left borders.

## Interaction
*   **Buttons**: Solid brand color for primary actions. Distinct hover state (slightly darker). Disabled state with reduced opacity and `cursor-not-allowed`.
*   **Focus States**: Use `focus:ring-2 focus:ring-offset-2 focus:ring-cfss-green` for keyboard navigation visibility.
*   **Forms**: Inputs must have visible borders, clear labels, and accessible error states.
