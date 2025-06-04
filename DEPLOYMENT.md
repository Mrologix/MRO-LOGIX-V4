# Deployment Guide

## Deploying to Vercel

### 1. Environment Variables

Before deploying, make sure to set up the following environment variables in your Vercel project dashboard:

**Required:**
- `DATABASE_URL` - Your PostgreSQL database connection string
- `OPENAI_API_KEY` - Your OpenAI API key for the AI chat functionality
- `JWT_SECRET` - Secret key for JWT authentication
- `NEXTAUTH_SECRET` - Secret for NextAuth (if using authentication)
- `NEXTAUTH_URL` - Your deployed application URL

**Optional (if using AWS S3):**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY` 
- `AWS_REGION`
- `AWS_S3_BUCKET_NAME`

### 2. Database Setup

1. Make sure your PostgreSQL database is accessible from Vercel
2. Run database migrations: `npx prisma migrate deploy`
3. Generate Prisma client: `npx prisma generate`

### 3. Build Configuration

The project includes:
- `postinstall` script in `package.json` to automatically run `prisma generate`
- `vercel.json` configuration for optimal build settings
- Improved database connection handling for production

### 4. Deployment Steps

1. Push your code to GitHub
2. Import the project to Vercel
3. Set up environment variables in Vercel dashboard
4. Deploy

### 5. Troubleshooting

**Prisma Client Issues:**
- The `postinstall` script should automatically generate the Prisma client
- If issues persist, manually run `npx prisma generate` in your CI/CD pipeline

**API Route Errors:**
- Ensure all environment variables are properly set
- Check that the database is accessible from Vercel's deployment environment
- Verify that the OpenAI API key is valid and has sufficient credits

**Build Failures:**
- Check the build logs for specific error messages
- Ensure all dependencies are properly listed in `package.json`
- Verify that the database schema is up to date 