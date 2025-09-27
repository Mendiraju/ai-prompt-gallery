# AI Prompt Gallery

A complete, production-ready AI Prompt Gallery website with secure admin panel for managing AI image generation prompts.

## Features

### Public Gallery
- **Futuristic Design**: Clean, modern interface matching the provided mockup
- **Category Filtering**: Filter prompts by Men, Women, Couple, Kids, etc.
- **One-Click Copy**: Copy prompts to clipboard with visual feedback
- **Live Updates**: Real-time prompt count and automatic updates
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Fast Loading**: Optimized images and efficient rendering

### Admin Panel
- **Secure Authentication**: JWT-based login system
- **Prompt Management**: Add, edit, delete prompts with image previews
- **Upload Tracking**: View creation dates and times for all prompts
- **Statistics Dashboard**: Track total prompts, categories, and daily additions
- **Real-time Updates**: Changes reflect immediately in public gallery

### Security Features
- **Password Protection**: Bcrypt-hashed admin passwords
- **JWT Authentication**: Secure token-based admin sessions
- **Input Validation**: Server-side validation and sanitization
- **Rate Limiting**: Protection against brute force attacks
- **XSS Protection**: HTML escaping and content security policies
- **CORS Configuration**: Proper cross-origin resource sharing

## Quick Start

### Prerequisites
- Node.js 16+ 
- NPM or Yarn

### Installation

1. **Clone and setup:**
```bash
git clone <repository-url>
cd ai-prompt-gallery
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start development server:**
```bash
npm run dev
```

4. **Access the application:**
- Public Gallery: http://localhost:3000
- Admin Panel: http://localhost:3000/admin
- Default admin credentials: `admin` / `admin123`

## Production Deployment

### VPS Deployment (Ubuntu)

1. **Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

2. **Application Deployment:**
```bash
# Clone repository
git clone <repository-url>
cd ai-prompt-gallery

# Install dependencies
npm install --production

# Set up environment variables
cp .env.example .env
nano .env  # Configure your settings

# Start with PM2
npm run pm2-start

# Setup PM2 startup
pm2 startup
pm2 save
```

3. **Environment Variables (.env):**
```bash
# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password

# Server
PORT=3000
NODE_ENV=production
```

4. **Nginx Configuration (Optional):**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Deployment

1. **Create Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

2. **Deploy with Docker:**
```bash
docker build -t ai-prompt-gallery .
docker run -d -p 3000:3000 --env-file .env ai-prompt-gallery
```

## API Documentation

### Public Endpoints

- `GET /api/prompts` - Get all prompts (optional: ?category=CategoryName)
- `GET /api/prompts/count` - Get total prompt count
- `GET /api/categories` - Get all categories

### Admin Endpoints (Requires Authentication)

- `POST /api/admin/login` - Admin login
- `GET /api/admin/prompts` - Get all prompts with admin details
- `POST /api/admin/prompts` - Create new prompt
- `PUT /api/admin/prompts/:id` - Update prompt
- `DELETE /api/admin/prompts/:id` - Delete prompt

### Authentication
Admin endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

### Prompts Table
```sql
CREATE TABLE prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Admins Table
```sql
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build application (placeholder)
- `npm run pm2-start` - Start with PM2
- `npm run pm2-stop` - Stop PM2 process
- `npm run pm2-restart` - Restart PM2 process

## Security Best Practices

1. **Change Default Credentials**: Update admin username/password in `.env`
2. **Secure JWT Secret**: Use a long, random JWT secret key
3. **HTTPS**: Always use HTTPS in production
4. **Regular Updates**: Keep dependencies updated
5. **Backup Database**: Regular SQLite database backups
6. **Monitor Logs**: Use PM2 logs for monitoring

## Performance Optimization

- **Lazy Loading**: Images load on demand
- **Caching**: Static assets are cached
- **Compression**: Gzip compression enabled
- **Rate Limiting**: API endpoints are rate limited
- **Database Indexing**: Proper database indexes

## Troubleshooting

### Common Issues

1. **Port Already in Use:**
```bash
# Kill process on port 3000
sudo lsof -t -i tcp:3000 | xargs kill -9
```

2. **Permission Denied:**
```bash
# Fix file permissions
chmod +x server.js
```

3. **Database Issues:**
```bash
# Reset database (development only)
rm prompts.db && npm start
```

### Logs

```bash
# PM2 logs
pm2 logs ai-prompt-gallery

# Application logs
tail -f ~/.pm2/logs/ai-prompt-gallery-out.log
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify environment configuration
4. Ensure all dependencies are installed

## License

MIT License - See LICENSE file for details.