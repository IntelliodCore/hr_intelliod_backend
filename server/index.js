import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Documentation
app.get('/docs', (req, res) => {
  const apiDocs = {
    title: 'EMS Backend API',
    version: '1.0.0',
    description: 'Employee Management System API Documentation',
    baseUrl: `http://localhost:${PORT}`,
    endpoints: {
      health: {
        method: 'GET',
        path: '/api/health',
        description: 'Health check endpoint'
      },
      auth: {
        login: {
          method: 'POST',
          path: '/api/auth/login',
          description: 'User login',
          body: { email: 'string', password: 'string' }
        },
        firstTimeLogin: {
          method: 'POST',
          path: '/api/auth/first-time-login',
          description: 'First time login with password change',
          body: { email: 'string', tempPassword: 'string', newPassword: 'string' }
        }
      },
      admin: {
        inviteEmployee: {
          method: 'POST',
          path: '/api/admin/invite-employee',
          description: 'Invite new employee (returns temporary password)',
          headers: { Authorization: 'Bearer <token>' },
          body: { email: 'string', role: 'string' },
          response: { tempPassword: 'string' }
        },
        approveEmployee: {
          method: 'POST',
          path: '/api/admin/approve-employee/:id',
          description: 'Approve employee registration',
          headers: { Authorization: 'Bearer <token>' }
        },
        getEmployees: {
          method: 'GET',
          path: '/api/admin/employees',
          description: 'Get all employees',
          headers: { Authorization: 'Bearer <token>' }
        }
      },
      employee: {
        getProfile: {
          method: 'GET',
          path: '/api/employee/profile',
          description: 'Get employee profile',
          headers: { Authorization: 'Bearer <token>' }
        },
        updateProfile: {
          method: 'PUT',
          path: '/api/employee/profile',
          description: 'Update employee profile',
          headers: { Authorization: 'Bearer <token>' }
        },
        uploadDocument: {
          method: 'POST',
          path: '/api/employee/upload-document',
          description: 'Upload employee document',
          headers: { Authorization: 'Bearer <token>' },
          contentType: 'multipart/form-data'
        }
      }
    },
    authentication: {
      type: 'Bearer Token',
      description: 'Include Authorization header: Bearer <your-jwt-token>'
    }
  };

  res.json(apiDocs);
});

// API Documentation HTML view
app.get('/docs/html', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>EMS API Documentation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .endpoint { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .method { display: inline-block; padding: 4px 8px; border-radius: 3px; color: white; font-weight: bold; }
            .get { background-color: #61affe; }
            .post { background-color: #49cc90; }
            .put { background-color: #fca130; }
            .delete { background-color: #f93e3e; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <h1>EMS Backend API Documentation</h1>
        <p>Employee Management System API - Version 1.0.0</p>
        
        <h2>Base URL</h2>
        <code>http://localhost:${PORT}</code>
        
        <h2>Authentication</h2>
        <p>Most endpoints require a Bearer token in the Authorization header:</p>
        <pre>Authorization: Bearer &lt;your-jwt-token&gt;</pre>
        
        <h2>Endpoints</h2>
        
        <div class="endpoint">
            <h3><span class="method get">GET</span> /api/health</h3>
            <p>Health check endpoint - no authentication required</p>
        </div>
        
        <div class="endpoint">
            <h3><span class="method post">POST</span> /api/auth/login</h3>
            <p>User login</p>
            <pre>{ "email": "user@example.com", "password": "password123" }</pre>
        </div>
        
        <div class="endpoint">
            <h3><span class="method post">POST</span> /api/auth/first-time-login</h3>
            <p>First time login with password change</p>
            <pre>{ "email": "user@example.com", "tempPassword": "temp123", "newPassword": "newpass123" }</pre>
        </div>
        
        <div class="endpoint">
            <h3><span class="method get">GET</span> /api/employee/profile</h3>
            <p>Get employee profile (requires authentication)</p>
        </div>
        
        <div class="endpoint">
            <h3><span class="method put">PUT</span> /api/employee/profile</h3>
            <p>Update employee profile (requires authentication)</p>
        </div>
        
        <div class="endpoint">
            <h3><span class="method post">POST</span> /api/admin/invite-employee</h3>
            <p>Invite new employee (requires admin role) - Returns temporary password</p>
            <pre>{ "email": "newuser@example.com", "role": "employee" }</pre>
            <p><strong>Response includes:</strong> tempPassword for the new user</p>
        </div>
        
        <div class="endpoint">
            <h3><span class="method get">GET</span> /api/admin/employees</h3>
            <p>Get all employees (requires admin role)</p>
        </div>
        
        <h2>Testing the API</h2>
        <p>You can test the API using tools like:</p>
        <ul>
            <li>Postman</li>
            <li>curl commands</li>
            <li>Browser for GET requests</li>
        </ul>
        
        <h3>Example curl command:</h3>
        <pre>curl -X POST http://localhost:${PORT}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@intelliod.com","password":"your-password"}'</pre>
    </body>
    </html>
  `;
  
  res.send(html);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;