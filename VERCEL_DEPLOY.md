# Vercel Deployment Guide

## Deploying from GitHub

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Choose "Import Git Repository"
4. Select your GitHub repository "repo1"
5. Configure your project:
   - Framework Preset: Vite
   - Build Command: `pnpm run build`
   - Output Directory: `dist`
   - Install Command: `pnpm install`

## Environment Variables

Make sure to add these environment variables in your Vercel project settings:

```bash
VITE_SUPABASE_URL=https://xiokgvyelqdghuyddoit.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpb2tndnllbHFkZ2h1eWRkb2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODcwMDYsImV4cCI6MjA3MTc2MzAwNn0.9BcM8Fl5_9bmq_43R2k8GCt_hCMLjKDzXbe2aM-U8eU
VITE_ML_API_ENDPOINT=https://recycling-hub-model-backend-1.onrender.com
```

## Deployment Steps

1. **Initial Setup**
   - Connect your GitHub account to Vercel
   - Import your repository
   - Configure build settings
   - Add environment variables

2. **Automatic Deployments**
   - Every push to the `main` branch will trigger a deployment
   - Preview deployments are created for pull requests

3. **Post-Deployment**
   - Set up a custom domain (optional)
   - Configure environment variables
   - Enable automatic HTTPS

## Monitoring

- View deployment logs in the Vercel dashboard
- Monitor build times and performance
- Check deployment status and history

## Troubleshooting

If you encounter any issues:
1. Check the build logs in Vercel dashboard
2. Verify environment variables are set correctly
3. Ensure all dependencies are listed in package.json
4. Check that build command executes successfully locally

## Commands for Local Testing

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

## Additional Notes

- The application uses Vite as the build tool
- Static assets are served from the `dist` directory
- API routes are handled through Vercel serverless functions
- Environment variables are automatically injected during build