# Database Setup Guide

This application uses PostgreSQL with Prisma ORM for database management. Follow these steps to set up your database.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or remote)

## Setup Instructions

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Database Configuration

Create a `.env` file in the root directory:

\`\`\`bash
cp .env.example .env
\`\`\`

Update the `DATABASE_URL` in your `.env` file:

\`\`\`env
DATABASE_URL="postgresql://username:password@localhost:5432/crm_database"
\`\`\`

Replace:
- `username`: Your PostgreSQL username
- `password`: Your PostgreSQL password  
- `localhost:5432`: Your PostgreSQL host and port
- `crm_database`: Your database name

### 3. Generate Prisma Client

\`\`\`bash
npm run db:generate
\`\`\`

### 4. Push Database Schema

For development (creates tables without migrations):
\`\`\`bash
npm run db:push
\`\`\`

For production (with migrations):
\`\`\`bash
npm run db:migrate
\`\`\`

### 5. Seed Database

\`\`\`bash
npm run db:seed
\`\`\`

This creates:
- Admin user: `admin` / `password`
- Staff users: `john_doe` / `password`, `jane_smith` / `password`
- Sample orders and products

## Available Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database (development)
- `npm run db:migrate` - Create and run migrations (production)
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with sample data

## Database Schema

The application uses the following main tables:

- **users** - User accounts and authentication
- **orders** - Customer orders
- **products** - Product catalog
- **order_items** - Order line items
- **user_activities** - Activity logging
- **order_status_history** - Order status changes

## Deployment

### Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database: `createdb crm_database`
3. Update `.env` with local connection string
4. Run setup steps above

### Cloud PostgreSQL (Recommended)

Works with any PostgreSQL provider:
- **Supabase** (free tier available)
- **Railway** (free tier available)
- **Neon** (free tier available)
- **AWS RDS**
- **Google Cloud SQL**
- **Azure Database**

1. Create a PostgreSQL database with your provider
2. Copy the connection string to `.env`
3. Run setup steps above

### Environment Variables

Required environment variables:

\`\`\`env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
NODE_ENV="production"
\`\`\`

## Troubleshooting

### Connection Issues

1. Verify database is running
2. Check connection string format
3. Ensure database exists
4. Verify user permissions

### Migration Issues

\`\`\`bash
# Reset database (development only)
npm run db:push --force-reset

# View migration status
npx prisma migrate status
\`\`\`

### Prisma Client Issues

\`\`\`bash
# Regenerate client
npm run db:generate

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
\`\`\`

## Security Notes

- Change `JWT_SECRET` in production
- Use strong database passwords
- Enable SSL for production databases
- Regularly backup your database
- Use environment variables for all secrets
