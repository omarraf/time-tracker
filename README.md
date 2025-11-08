# DayChart - Visual Time Tracker

A beautiful, interactive web application for tracking and visualizing how you spend your day. DayChart presents your daily schedule as an intuitive pie chart, making it easy to plan, track, and analyze your time allocation across different activities.

## Features

### Core Functionality
- **Interactive Pie Chart**: Visual 24-hour clock representation with drag-to-select interface
- **Flexible Time Increments**: Track time in 15-minute, 30-minute, or 1-hour blocks
- **Color-Coded Activities**: Choose from 10 vibrant colors to categorize different activities
- **Custom Labels**: Name your activities (Work, Gym, Sleep, Study, etc.)
- **Click-to-Edit**: Easily modify existing time blocks by clicking on them
- **Time Range Display**: See start time, end time, and duration for each activity


### User Management
- **Firebase Authentication**: Secure sign-in with email/password or Google OAuth
- **User Accounts**: Save and sync your data across sessions

## Tech Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Chart.js** - Interactive chart rendering
- **React-ChartJS-2** - React wrapper for Chart.js
- **Tailwind CSS** - Utility-first styling
- **React Modal** - Accessible modal dialogs

### Backend & Services
- **Firebase** - Authentication and backend services
- **Vercel Analytics** - Usage analytics

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting rules
- **Autoprefixer** - CSS vendor prefixing
- **PostCSS** - CSS transformations

## Usage Guide

### Creating Time Blocks
1. Select a color from the color picker at the bottom
2. Click and drag on the pie chart to select a time range
3. Enter a label for the activity (e.g., "Work", "Sleep", "Exercise")
4. Press Enter or click Save

### Editing Time Blocks
1. Click on any labeled time block
2. Modify the label or delete the block
3. Click Update to save changes

### Keyboard Shortcuts
- **Ctrl/Cmd + Z**: Undo last change
- **Ctrl/Cmd + Shift + Z**: Redo
- **Ctrl/Cmd + Y**: Redo (alternative)
- **Enter**: Save label in modal
- **Escape**: Close modal

### Changing Time Granularity
Use the dropdown menu to switch between:
- **1 hour**: 24 time blocks
- **30 minutes**: 48 time blocks
- **15 minutes**: 96 time blocks

**Note**: Changing the increment will reset your current schedule.

## Project Structure

```
time-tracker/
├── src/
│   ├── components/
│   │   ├── AuthButtons.tsx        # Authentication UI component
│   │   └── AuthModal.module.css   # Auth modal styles
│   ├── App.tsx                    # Main application component
│   ├── DayChart.tsx               # Core chart component with interaction logic
│   ├── firebase.ts                # Firebase configuration
│   ├── auth.ts                    # Authentication functions
│   ├── main.tsx                   # Application entry point
│   ├── App.css                    # Main application styles
│   └── index.css                  # Global styles
├── public/                        # Static assets
├── dist/                          # Production build output
├── index.html                     # HTML entry point
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── eslint.config.js               # ESLint configuration
├── tailwind.config.js             # Tailwind CSS configuration (if present)
└── package.json                   # Project dependencies and scripts
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
