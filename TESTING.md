# Quick Start Testing Guide

## Prerequisites Check

First, verify you have Node.js installed:
```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/

## Installation

1. **Install dependencies:**
```bash
cd ai-prompt-gallery
npm install
```

2. **Start the server:**
```bash
npm start
```

3. **Access the application:**
- Public Gallery: http://localhost:3000
- Admin Panel: http://localhost:3000/admin

## Default Admin Credentials

- Username: `admin`
- Password: `admin123`

## Testing Features

### Public Gallery Tests:
- [ ] Gallery loads with sample prompts
- [ ] Category filters work (All, Men, Women, etc.)
- [ ] Copy button copies prompt to clipboard
- [ ] Responsive design on mobile
- [ ] Live prompt count updates

### Admin Panel Tests:
- [ ] Admin login works
- [ ] Dashboard shows statistics
- [ ] Add new prompt functionality
- [ ] Edit existing prompts
- [ ] Delete prompts
- [ ] Prompt table shows upload dates
- [ ] Real-time updates in public gallery

## Sample Test Data

The application will auto-populate with sample prompts on first run.

## Performance Tests

- [ ] Page loads in under 2 seconds
- [ ] Images load with lazy loading
- [ ] Copy functionality works offline
- [ ] No console errors

## Security Tests

- [ ] Admin panel requires authentication
- [ ] Invalid credentials are rejected
- [ ] JWT tokens expire properly
- [ ] Input validation prevents XSS

If you encounter any issues, check the troubleshooting section in README.md