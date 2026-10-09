# CFSS UI Anti-Patterns

This document records prohibited patterns that must not be used in the CFSS repository.

## Visual Styling
*   **Prohibited**: Purple-to-blue gradients, gradient hero text.
*   **Prohibited**: Emojis used as interface icons, status indicators, or navigation elements.
*   **Prohibited**: Arbitrary web fonts (like Inter, Space Grotesk) instead of standard system fonts.
*   **Prohibited**: Generic colored left-border cards.
*   **Prohibited**: Glassmorphism or translucent panels.
*   **Prohibited**: Unnecessary gradients, glows, neon effects, and decorative shadows.
*   **Prohibited**: Three icon boxes in a row as a repeated default layout.
*   **Prohibited**: A badge above every headline.
*   **Prohibited**: Decorative icons that add no meaning.
*   **Prohibited**: Grain textures, noise overlays, pointer-tracking animations.

## Layout
*   **Prohibited**: Repeated card grids that ignore the purpose of the page.
*   **Prohibited**: Nested cards adding visual complexity.
*   **Prohibited**: Excessive rounded containers, borders, and shadows.
*   **Prohibited**: Duplicated page titles or navigation.
*   **Prohibited**: Fixed-height containers that clip content.
*   **Prohibited**: Desktop-only assumptions.

## Interaction
*   **Prohibited**: Decorative animations without user benefit.
*   **Prohibited**: Hover-only interactions (inaccessible on touch).
*   **Prohibited**: Buttons that look interactive but do nothing.
*   **Prohibited**: Modals when a dedicated page is more appropriate.
*   **Prohibited**: Toasts that communicate critical info too briefly.
