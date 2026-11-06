# Visual Portfolio - Frontend

React-based frontend application built with TypeScript, Vite, and Tailwind CSS.

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **State Management:** TanStack Query
- **Routing:** Wouter
- **Forms:** React Hook Form

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

The application will be available at http://localhost:3000

### Building
```bash
npm run build
```

Build files will be generated in this project's `dist/` directory.

### Environment Variables

Create a `.env` file in this directory:

```env
VITE_API_BASE_URL=
VITE_APP_ENV=development
API_PROXY_TARGET=http://localhost:5000
```

## Project Structure

```
src/
├── components/         # Reusable UI components
├── pages/             # Page components
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
├── utils/             # Helper functions
└── styles/            # CSS files
```

## API Integration

The frontend communicates with the backend via REST API. API requests use
`src/utils/api.ts` to apply `VITE_API_BASE_URL`. Leave it empty during local
development to use the Vite `/api` proxy; set it to the backend origin or API
base URL when deploying the frontend separately.

## Deployment

### Static Hosting (Recommended)
- Build the project: `npm run build`
- Deploy the `dist/` folder to:
  - Netlify
  - Vercel
  - AWS S3 + CloudFront
  - GitHub Pages

### Environment Variables for Production
- `VITE_API_BASE_URL`: Your production API URL
