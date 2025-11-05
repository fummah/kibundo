# Deployment Checklist for Kibundo

## ✅ Fixed Issues

1. **Hardcoded localhost URLs** - Fixed in `ChatBot.jsx`
   - Replaced `http://localhost:3001` with the centralized `api` instance
   - Now uses relative URLs that work in production

2. **Debug Console Logs** - Optimized in `BillingTab.jsx`
   - Wrapped debug logs in `import.meta.env.DEV` checks
   - Only shows detailed logs in development mode

## 🔧 Required Configuration Before Deployment

### 1. Environment Variables

Create a `.env.production` file in the `frontend/` directory with:

```env
# API Configuration
VITE_API_BASE=/api
# OR if your backend is on a different domain:
# VITE_API_BASE=https://your-backend-domain.com/api

# Backend URL (for Vite proxy in development only)
VITE_BACKEND_URL=https://your-backend-domain.com

# Authentication Mode
VITE_AUTH_MODE=bearer
# OR
# VITE_AUTH_MODE=cookie

# Optional: CSRF Configuration (if using cookie auth)
VITE_CSRF_URL=/sanctum/csrf-cookie
VITE_XSRF_COOKIE_NAME=XSRF-TOKEN
VITE_XSRF_HEADER_NAME=X-XSRF-TOKEN
```

### 2. Backend Configuration

Ensure your backend:
- ✅ Has CORS configured to allow your production domain
- ✅ Has proper security headers
- ✅ Database connection is configured for production
- ✅ Environment variables are set correctly

### 3. Build Process

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Output location:**
   - Built files will be in `frontend/dist/`
   - Deploy this folder to your web server

3. **Server Configuration:**
   - Point your web server to serve `frontend/dist/` as the document root
   - Configure reverse proxy for `/api` to your backend server
   - Ensure all routes (except `/api/*`) serve `index.html` for React Router

### 4. Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/frontend/dist;
    index index.html;
    
    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Proxy uploads
    location /uploads {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 5. Apache Configuration Example

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/frontend/dist
    
    <Directory /path/to/frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Rewrite rules for React Router
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Proxy API requests
    ProxyPass /api http://localhost:8080/api
    ProxyPassReverse /api http://localhost:8080/api
    
    # Proxy uploads
    ProxyPass /uploads http://localhost:8080/uploads
    ProxyPassReverse /uploads http://localhost:8080/uploads
</VirtualHost>
```

## ✅ Pre-Deployment Checklist

- [ ] Environment variables configured in `.env.production`
- [ ] Backend API is accessible and configured
- [ ] Database connection tested in production environment
- [ ] SSL certificate installed (HTTPS recommended)
- [ ] CORS configured on backend for production domain
- [ ] Build completed successfully (`npm run build`)
- [ ] Tested build locally (`npm run preview` or serve `dist/` folder)
- [ ] Reverse proxy configured correctly
- [ ] File uploads/uploads directory accessible
- [ ] Error logging configured
- [ ] Backup strategy in place

## 🚀 Deployment Steps

1. **Build the application:**
   ```bash
   cd frontend
   npm ci  # Install dependencies
   npm run build
   ```

2. **Upload build files:**
   - Upload `frontend/dist/` contents to your web server
   - Ensure proper file permissions

3. **Configure web server:**
   - Set document root to `frontend/dist/`
   - Configure reverse proxy for `/api` and `/uploads`

4. **Test:**
   - Visit your domain
   - Test login functionality
   - Test API calls
   - Test file uploads
   - Test all major features

## 📝 Notes

- The API base URL is configured to use `/api` by default (relative URL)
- In production, this will be handled by your reverse proxy
- All API calls go through the centralized `api` instance in `frontend/src/api/axios.js`
- Make sure your backend is accessible at the configured URL
- The build process minifies and optimizes the code for production

