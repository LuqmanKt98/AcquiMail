# AcquiMail AI - Deployment Guide

## 🔒 Security Checklist

Before deploying, ensure you have:

- [x] Environment variables configured (see `.env.example`)
- [x] Firebase Security Rules deployed
- [x] API keys stored securely (not in code)
- [ ] Firebase Authentication enabled (recommended for production)
- [ ] Rate limiting configured (recommended for production)

## 📋 Prerequisites

1. **Firebase Project**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Firestore Database
   - Enable Firebase Storage
   - Deploy security rules (see below)

2. **OpenAI API Key**
   - Get your API key from https://platform.openai.com/api-keys

3. **Email Account (Gmail)**
   - Enable 2-factor authentication
   - Generate an App Password: https://myaccount.google.com/apppasswords

4. **Vercel Account**
   - Sign up at https://vercel.com

## 🚀 Deployment Steps

### 1. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

### 2. Deploy Firebase Security Rules

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy security rules
firebase deploy --only firestore:rules,storage:rules
```

### 3. Test Locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000 to test the application.

### 4. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

#### Option B: Using GitHub + Vercel Dashboard

1. Push your code to GitHub (see Git Setup below)
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Configure environment variables in Vercel dashboard
5. Deploy!

### 5. Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

- `VITE_OPENAI_API_KEY` - Your OpenAI API key
- `SMTP_HOST` - smtp.gmail.com
- `SMTP_PORT` - 465
- `SMTP_USER` - Your Gmail address
- `SMTP_PASSWORD` - Your Gmail App Password
- `SMTP_SECURE` - true
- `VITE_SMTP_USER` - Your Gmail address
- `VITE_FIREBASE_API_KEY` - From Firebase console
- `VITE_FIREBASE_AUTH_DOMAIN` - From Firebase console
- `VITE_FIREBASE_PROJECT_ID` - From Firebase console
- `VITE_FIREBASE_STORAGE_BUCKET` - From Firebase console
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - From Firebase console
- `VITE_FIREBASE_APP_ID` - From Firebase console
- `VITE_FIREBASE_MEASUREMENT_ID` - From Firebase console

## 🔐 Security Recommendations

### Current Security Status

⚠️ **WARNING**: This application currently has NO authentication. Anyone with the URL can access and modify your data.

### Recommended Improvements

1. **Add Firebase Authentication**
   - Implement user login/signup
   - Update security rules to require authentication
   - Restrict data access to authenticated users only

2. **Add Rate Limiting**
   - Implement rate limiting on API endpoints
   - Use Vercel Edge Config or Upstash Redis

3. **Environment-Specific Configurations**
   - Use different Firebase projects for dev/staging/production
   - Implement proper CORS policies

4. **Data Validation**
   - Add input validation on all forms
   - Sanitize user inputs
   - Implement file upload restrictions

## 🐛 Troubleshooting

### Build Fails
- Check that all environment variables are set
- Ensure Node.js version is compatible (v18+)

### Emails Not Sending
- Verify SMTP credentials
- Check Gmail App Password is correct
- Ensure 2FA is enabled on Gmail account

### Firebase Errors
- Verify Firebase configuration
- Check security rules are deployed
- Ensure Firebase project is active

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev/)

