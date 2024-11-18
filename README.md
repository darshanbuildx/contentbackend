# Content Approval Platform

A modern content approval system built with React, TypeScript, and Google Sheets integration.

## Features

- Content management across multiple platforms (Twitter, LinkedIn, Instagram, Reddit, Skool)
- Drag-and-drop Kanban board
- Real-time content preview
- Advanced filtering and search
- Export to Excel and PDF
- Dark mode support
- Real-time sheet sync status
- Persistent authentication
- Toast notifications with custom styling

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS, Vite
- Backend: Node.js, Express
- Storage: Google Sheets API
- Deployment: Docker, EasyPanel

## Prerequisites

- Node.js 20 or later
- Docker and Docker Compose
- Google Cloud Platform account with Sheets API enabled
- EasyPanel instance (for production deployment)

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/content-approval-platform.git
   cd content-approval-platform
   ```

2. Install dependencies:
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install
   ```

3. Set up environment variables:
   ```bash
   # Copy example env files
   cp .env.example .env
   cd backend && cp .env.example .env
   ```

4. Configure Google Sheets:
   - Create a Google Cloud Project
   - Enable Google Sheets API
   - Create a Service Account
   - Download credentials
   - Update .env files with your credentials

5. Start development servers:
   ```bash
   # Start frontend (from root directory)
   npm run dev

   # Start backend (from backend directory)
   npm run dev
   ```

## Docker Deployment

1. Build and run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

2. Monitor container health:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## EasyPanel Deployment

1. Install EasyPanel on your server following their documentation.

2. Create a new project in EasyPanel and configure the environment variables.

3. Deploy using the easypanel.yml configuration:
   ```bash
   easypanel deploy
   ```

4. Monitor the deployment in EasyPanel dashboard.

## Project Structure

```
.
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── backend/             # Backend source code
│   ├── services/        # Backend services
│   └── utils/           # Backend utilities
├── docker/              # Docker configuration
└── easypanel.yml        # EasyPanel configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
