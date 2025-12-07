# Data Module Documentation

This directory contains all static data used throughout the portfolio application. Data is organized into separate modules for better maintainability and code organization.

## File Structure

```
src/utils/data/
├── index.js              # Central export point for all data modules
├── education.js          # Education history and academic achievements
├── journey.js            # Career journey and work experience
├── certifications.js     # Professional certifications and credentials
├── gallery.js            # Photo gallery with captions
├── projects.js           # Portfolio projects
├── blogs.js              # Blog posts and articles
└── skills.jsx            # Technical skills and competencies
```

## Module Details

### education.js

Contains education history including degrees, institutions, and achievements.

**Data Structure:**

- institution: University/College name
- degree: Degree title
- period: Study duration
- achievement: Academic honors (e.g., "First Class Honours")
- description: Program specialization
- icon: React icon component
- universityLogo: Logo image path
- gpa: Grade point average (optional)

### journey.js

Career timeline with roles, companies, and key achievements.

**Data Structure:**

- role: Job title
- company: Company/Organization name
- period: Employment duration
- location: Work location
- description: Role summary
- achievements: Array of key accomplishments
- color: Tailwind gradient class for timeline dot

### certifications.js

Professional certifications and completed courses.

**Data Structure:**

- title: Certification name
- issuer: Issuing organization
- date: Completion year
- credential: Certificate type
- skills: Array of skills learned
- platform: Learning platform name
- downloadLink: Certificate download URL
- verifyLink: Verification URL
- platformColor: Tailwind text color class

### gallery.js

Personal and professional photo gallery.

**Data Structure:**

- src: Image file path
- alt: Accessibility description
- caption: Image caption text

## Usage

### Import Individual Modules

```javascript
import education from "../utils/data/education";
import journey from "../utils/data/journey";
```

### Import Multiple Modules (Recommended)

```javascript
import {
  education,
  journey,
  certifications,
  galleryImages,
} from "../utils/data";
```

## Best Practices

1. **Keep data separate from components** - This improves code organization and makes data updates easier
2. **Use descriptive variable names** - Make it clear what each data structure represents
3. **Include all required fields** - Ensure data consistency across entries
4. **Update documentation** - Keep this README current when adding new data modules
5. **Use TypeScript types** - Consider adding TypeScript definitions for better type safety

## Contributing

When adding new data:

1. Create a new file in this directory
2. Export the data as default export
3. Add the export to `index.js`
4. Update this README with the new module details
5. Use consistent data structures

## Notes

- All icon components should be imported from `react-icons/fa`
- Image paths should be relative to the `public` directory
- Tailwind classes should use the project's color scheme
- Keep data organized and well-formatted for easy maintenance
