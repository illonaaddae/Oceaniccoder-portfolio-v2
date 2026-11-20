/* global module */
// A made-up CV for tests and previews, shaped like the owner's real one. The
// person, contacts, links and employers are invented (example.com and .test
// addresses); no real data belongs in this repo.

function fixtureCv() {
  return {
    header: {
      name: "Ama Mensah",
      title: "Software Engineer",
      lines: ["Kumasi, Ghana", "+000 000 000 000 / Ghanaian", "ama.mensah@example.com"],
      links: [
        { label: "LinkedIn Profile", url: "https://www.linkedin.example/in/ama-mensah" },
        { label: "GitHub Profile", url: "https://github.example/ama-mensah" },
        { label: "Portfolio Website", url: "https://ama-mensah.example.com/" },
      ],
    },
    education: [
      {
        org: "Northfield Online University",
        location: "Berlin, Germany (Online)",
        subtitle: "BSc. Data Science, 180 ECTS",
        expectedGraduation: "2028",
      },
      {
        org: "Kumasi Technical College",
        location: "Ridge Road, Kumasi",
        subtitle: "BTech. Computer Science",
        expectedGraduation: "September 2027",
        gpa: "4.10",
        gpaScale: "5.00",
      },
      {
        org: "Lakeside Senior High School",
        location: "Lakeside",
        subtitle: "General Science (*WASSCE)",
        period: "September 2015 – June 2018",
      },
    ],
    awards: [
      { title: "Best Student in Computing", issuer: "KTC Student Council", year: "2023" },
      { title: "Hackathon Runner-up", issuer: "Kumasi Dev Week", year: "2022" },
    ],
    experience: [
      {
        org: "Brightpath Software",
        location: "Kumasi",
        title: "Software Engineer",
        period: "November 2025 – Present",
        bullets: [
          "Building features for a scheduling web application used by clinics across several regions, working in a team of five engineers.",
          "Writing unit and end-to-end tests and reviewing pull requests from other engineers on the team.",
          "Pairing with designers to turn prototypes into accessible, responsive React components.",
        ],
      },
      {
        org: "Open Learning Club",
        location: "Remote",
        title: "Founder and Lead",
        period: "December 2024 – Present",
        bullets: [
          "Started a volunteer group that teaches web development to secondary school students.",
          "Runs weekly online sessions and keeps the course material up to date.",
        ],
      },
      {
        org: "Riverbank Media",
        location: "Remote",
        title: "Web Developer Intern",
        period: "May 2025 – November 2025",
        bullets: [
          "Built and maintained client websites, including theme changes, plugin setup and performance fixes for slow pages.",
          "Tracked tasks and reported progress to the project lead each week.",
        ],
      },
      {
        org: "Old Firm Ltd",
        location: "Accra",
        title: "Hidden Role",
        period: "2019",
        bullets: ["This entry is hidden and must not appear."],
        show: false,
      },
    ],
    projects: [
      {
        title: "Clinic Scheduler",
        period: "November 2025 – Present",
        subtitle: "Brightpath Software | Web Platform | Frontend Engineer",
        bullets: [
          "Built the appointment booking flow, from picking a clinic and a time to the confirmation email, across patient and staff views.",
          "Added a calendar view for staff with drag and drop rescheduling and conflict checks.",
          "Wrote tests with Vitest, Testing Library and Playwright for the booking and calendar flows.",
          "Tech stack: React, TypeScript, TanStack Query and Zod.",
        ],
      },
      {
        title: "Recycle Route",
        period: "April 2025 – September 2025",
        subtitle: "Team Member (Final Year Project)",
        bullets: [
          "Worked in a three-person team on a web app that plans waste collection routes.",
          "Led the research write-up and built most of the user interface.",
        ],
      },
      {
        title: "Bakery Website",
        period: "December 2024 – February 2025",
        subtitle: "Client Project | Web App",
        bullets: [
          "Built a small ordering site for a local bakery with a menu, an order form and an admin page.",
          "Deployed it with a custom domain and set up form email notifications.",
        ],
      },
    ],
    certifications: [
      { title: "Frontend Developer Path", issuer: "Example Academy", date: "March 2026" },
      { title: "Cloud Practitioner", issuer: "Example Cloud", date: "December 2025" },
      { title: "Data Analyst Track", issuer: "Example Academy", label: "In progress" },
    ],
    coCurricular: [
      {
        org: "Open Learning Club",
        location: "NGO",
        title: "Founder",
        period: "December 2024",
        bullets: ["Set up the club's structure and its first training roadmap."],
      },
    ],
    skills: [
      { label: "Languages", items: "JavaScript, TypeScript, Python, SQL, HTML, CSS" },
      {
        label: "Frameworks & Libraries",
        items:
          "React, Node.js, TanStack Query, Zustand, React Router, React Hook Form, Zod, Tailwind CSS, Express, Vite",
      },
      { label: "Testing", items: "Vitest, Testing Library, Playwright" },
      { label: "Spoken Languages", items: "English, Twi" },
    ],
    references: { text: "Available upon request" },
    footnotes: ["*WASSCE – West African Senior School Certificate Examination"],
  };
}

module.exports = { fixtureCv };
