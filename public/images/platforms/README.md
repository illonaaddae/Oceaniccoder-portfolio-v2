# Platform Logos

This folder contains platform logo images for the education/certification section.

## Supported Platforms

- Codecademy (`codecademy.svg`)
- Scrimba (`scrimba.svg`)
- AWS Training (`aws.svg`)
- Frontend Masters (`frontendmasters.svg`)

## Adding New Platform Logos

To add a new platform logo:

1. Add the logo image (preferably SVG) to this folder with a clear filename (e.g., `udemy.svg`)
2. Update `src/utils/platformLogos.js` to include the new platform:

```javascript
"Platform Name": {
  local: "/images/platforms/your-logo.svg",
  cdn: "https://cdn.simpleicons.org/platformname/COLOR",
  fallback: "PN", // Platform initials
  color: "#HEXCOLOR"
}
```

3. The component will automatically:
   - Try to load the local image first
   - Fall back to CDN if local image doesn't exist
   - Show fallback text if both fail

## Logo Requirements

- Format: SVG preferred (scalable, small file size)
- Size: Optimized for display at 16x16px (will scale up/down as needed)
- Style: Should work in both light and dark themes
- Colors: Use platform's brand colors

