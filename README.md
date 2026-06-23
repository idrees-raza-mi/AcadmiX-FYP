# Student Dashboard App

A comprehensive React Native application built with Expo CLI that provides a student dashboard interface with navigation, student management, course tracking, and attendance monitoring.

## 🚀 Quick Overview

This app provides a complete student management system with:
- **Student Management**: View, search, and manage student profiles
- **Course Tracking**: Monitor courses, grades, and academic progress  
- **Attendance System**: Track attendance with visual progress indicators
- **Statistics Dashboard**: Comprehensive analytics and reporting
- **Profile Management**: Personal student profiles with photo upload

## 📱 Screenshots

<div align="center">

### Main App Screens
<img src="assets/screen%20shots%20app/student%20screen1.png" width="200" alt="Students Screen">
<img src="assets/screen%20shots%20app/course%20screen2.png" width="200" alt="Courses Screen">
<img src="assets/screen%20shots%20app/Attendence%20screen3.png" width="200" alt="Attendance Screen">

*Students List | Course Management | Attendance Tracking*

### Additional Features
<img src="assets/screen%20shots%20app/Stats%20screen4.png" width="200" alt="Statistics Screen">
<img src="assets/screen%20shots%20app/profile%20screen5.png" width="200" alt="Profile Screen">

*Statistics Dashboard | Profile Management*

</div>

## Features

### 🎯 Core Functionality
- **React Navigation**: Stack and Bottom Tab navigation
- **Student Management**: Complete student list with detailed profiles
- **Search Functionality**: Real-time search across student names, emails, and IDs
- **Course Tracking**: Course details with grades and progress
- **Attendance Monitoring**: Visual progress bars and attendance history
- **Profile Management**: Comprehensive student profile with photo upload

### 📱 Screens
1. **Students Tab**
   - Student list with FlatList implementation
   - Tap navigation to detailed student profiles
   - Attendance summary for each student
   - Gender-based color coding

2. **Courses Tab**
   - Course list with grades and progress
   - Detailed course information
   - Assignment tracking
   - Attendance per course

3. **Attendance Tab**
   - Progress bar visualization
   - Time slot selection (Morning, Afternoon, Evening)
   - Attendance history
   - Statistics and summaries

4. **Profile Tab**
   - Student profile information
   - Academic statistics
   - Settings and options
   - Emergency contact details

### 🎨 Design Features
- **Consistent Theme**: Purple and blue gradient design matching the provided mockup
- **Clean UI**: Card-based layout with proper spacing and shadows
- **Mobile Optimized**: Responsive design for mobile devices
- **Status Indicators**: Color-coded status for attendance, grades, and gender
- **Progress Visualization**: Progress bars for attendance tracking



## Technology Stack

- **React Native** with Expo CLI
- **React Navigation** (Stack + Bottom Tabs)
- **Expo Linear Gradient** for gradient backgrounds
- **Expo Vector Icons** for consistent iconography
- **Custom Theme System** for consistent styling

## Installation & Setup

1. **Prerequisites**
   ```bash
   npm install -g expo-cli
   ```

2. **Install Dependencies**
   ```bash
   cd StudentDashboard
   npm install
   ```

3. **Run the Application**
   ```bash
   # For iOS (requires macOS)
   npm run ios
   
   # For Android
   npm run android
   
   # For Web
   npm run web
   
   # Start Expo development server
   npx expo start
   ```

## Project Structure

```
StudentDashboard/
├── App.js                 # Main app component with navigation setup
├── src/
│   ├── screens/          # All screen components
│   │   ├── StudentsScreen.js
│   │   ├── StudentDetailsScreen.js
│   │   ├── CoursesScreen.js
│   │   ├── CourseDetailsScreen.js
│   │   ├── AttendanceScreen.js
│   │   └── ProfileScreen.js
│   ├── styles/
│   │   └── theme.js      # Centralized theme configuration
│   └── data/
│       └── mockData.js   # Sample data for development
└── README.md
```

## Key Components

### Navigation Structure
- **MainTabs**: Bottom tab navigator with 4 tabs
- **StudentsStack**: Stack navigator for student-related screens
- **CoursesStack**: Stack navigator for course-related screens

### Theme System
- Centralized color palette matching the design
- Typography scale and spacing system
- Shadow and border radius configurations
- Consistent styling across all components

### Data Management
- Mock data structure for students, courses, and attendance
- Realistic sample data for testing and development
- Extensible data models for future enhancements

## Features Implemented

✅ **React Navigation** with Stack and Bottom Tabs  
✅ **Student List** with FlatList and tap navigation  
✅ **Search Functionality** with real-time filtering  
✅ **Student Details** screen with comprehensive information  
✅ **Course Details** with grades and progress tracking  
✅ **Attendance** with progress bar visualization  
✅ **Profile Management** with photo upload capability  
✅ **Clean, consistent CSS styling** and mobile layout  
✅ **Purple/blue theme** matching the provided design  

## Customization

### Adding New Students
Edit `src/data/mockData.js` to add new student entries with the following structure:
```javascript
{
  id: 'unique_id',
  name: 'Student Name',
  email: 'email@domain.com',
  // ... other properties
}
```

### Modifying Theme
Update `src/styles/theme.js` to customize colors, typography, and spacing.

### Adding New Screens
1. Create new screen component in `src/screens/`
2. Add to appropriate stack navigator in `App.js`
3. Update navigation types if using TypeScript

## Development Notes

- The app uses mock data for demonstration purposes
- All screens are fully functional with realistic data
- The design closely matches the provided screenshot
- Navigation is properly configured with stack and tab navigators
- Progress bars are implemented for attendance visualization
- Color coding is used throughout for status indicators

## Future Enhancements

- Real API integration
- User authentication
- Push notifications
- Offline data storage
- Advanced filtering and search
- Export functionality for reports
- Dark mode support

## License

This project is created for educational purposes as part of a React Native assignment.
