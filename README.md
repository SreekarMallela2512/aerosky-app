# AeroSky - Competitive Exam Practice App

A full-stack web application for competitive exam practice and testing.

## Features

- User authentication (registration/login)
- Practice mode with unlimited questions
- Timed tests with scoring
- Performance analytics and statistics
- Subject-wise tracking (Math, Science, English)
- Responsive design for all devices

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: Custom CSS with responsive design

## Local Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with your MongoDB URI and JWT secret
4. Run the development server: `npm run dev`
5. Open `http://localhost:3000` in your browser

## Deployment on Render

1. Push your code to GitHub
2. Connect your GitHub repository to Render
3. Set the following environment variables in Render:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string for JWT signing
   - `NODE_ENV`: production

4. Deploy and your app will be live!

## Environment Variables

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `PORT`: Port number (automatically set by hosting platforms)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile and stats
- `GET /api/questions/:subject` - Get questions for a subject
- `POST /api/submit-test` - Submit test results
- `POST /api/practice` - Update practice session
- `GET /api/analytics` - Get user analytics

## Project Structure

```
aerosky-app/
├── server.js              # Main server file
├── package.json          # Dependencies and scripts
├── public/               # Static frontend files
│   ├── login.html       # Login/Register page
│   ├── dashboard.html   # Main dashboard
│   ├── styles.css       # CSS styles
│   ├── auth.js          # Authentication JavaScript
│   └── dashboard.js     # Dashboard JavaScript
├── .env                 # Environment variables (create this)
├── .gitignore          # Git ignore file
└── README.md           # Project documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.