import React from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Auth
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { SearchProvider } from './src/context/SearchContext';

// Common screens
import RoleSelectScreen    from './src/screens/RoleSelectScreen';
import LoginScreen         from './src/screens/LoginScreen';
import RegisterScreen      from './src/screens/RegisterScreen';

// Admin screens
import AdminLoginScreen         from './src/screens/admin/AdminLoginScreen';
import AdminDashboardScreen     from './src/screens/admin/AdminDashboardScreen';
import AdminBatchScreen         from './src/screens/admin/AdminBatchScreen';
import AdminStudentDetailScreen from './src/screens/admin/AdminStudentDetailScreen';
import AdminLeaveScreen         from './src/screens/admin/AdminLeaveScreen';
import AdminMarksScreen         from './src/screens/admin/AdminMarksScreen';
import AdminCoursesScreen       from './src/screens/admin/AdminCoursesScreen';
import StudentsScreen           from './src/screens/StudentsScreen';
import StudentDetailsScreen     from './src/screens/StudentDetailsScreen';

// Student screens
import CoursesScreen        from './src/screens/CoursesScreen';
import CourseDetailsScreen  from './src/screens/CourseDetailsScreen';
import AttendanceScreen     from './src/screens/AttendanceScreen';
import StatisticsScreen     from './src/screens/StatisticsScreen';
import ProfileScreen        from './src/screens/ProfileScreen';
import LeaveRequestScreen   from './src/screens/LeaveRequestScreen';

import { colors } from './src/styles/theme';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ─── AUTH STACK ───────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleSelect"   component={RoleSelectScreen} />
      <Stack.Screen name="AdminLogin"   component={AdminLoginScreen} />
      <Stack.Screen name="StudentLogin" component={LoginScreen} />
      <Stack.Screen name="Register"     component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ─── ADMIN STACK ──────────────────────────────────────────────────────────────
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard"     component={AdminDashboardScreen} />
      <Stack.Screen name="AdminBatch"         component={AdminBatchScreen} />
      <Stack.Screen name="AdminStudentDetail" component={AdminStudentDetailScreen} />
      <Stack.Screen name="AdminLeave"         component={AdminLeaveScreen} />
      <Stack.Screen name="AdminMarks"         component={AdminMarksScreen} />
      <Stack.Screen name="AdminCourses"       component={AdminCoursesScreen} />
      <Stack.Screen name="Students"           component={StudentsScreen} />
      <Stack.Screen name="StudentDetails"     component={StudentDetailsScreen} />
    </Stack.Navigator>
  );
}

// ─── COURSES STACK (includes CourseDetails + LeaveRequest) ───────────────────
function CoursesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CoursesList"    component={CoursesScreen} />
      <Stack.Screen name="CourseDetails"  component={CourseDetailsScreen} />
      <Stack.Screen name="LeaveRequest"   component={LeaveRequestScreen} />
    </Stack.Navigator>
  );
}

// ─── LEAVE STACK (standalone tab) ────────────────────────────────────────────
function LeaveStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LeaveHome" component={LeaveRequestScreen} />
    </Stack.Navigator>
  );
}

// ─── STUDENT TABS ─────────────────────────────────────────────────────────────
function StudentTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Courses:    focused ? 'book'             : 'book-outline',
            Attendance: focused ? 'checkmark-circle' : 'checkmark-circle-outline',
            Statistics: focused ? 'bar-chart'        : 'bar-chart-outline',
            Leave:      focused ? 'calendar'         : 'calendar-outline',
            Profile:    focused ? 'person'           : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#fff', borderTopColor: '#F1F5F9',
          paddingBottom: Math.max(insets.bottom, 5), paddingTop: 5,
          height: 60 + Math.max(insets.bottom, 5),
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Courses"    component={CoursesStack} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Statistics" component={StatisticsScreen} />
      <Tab.Screen name="Leave"      component={LeaveStack} />
      <Tab.Screen name="Profile"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
function Root() {
  const { token, role, loading } = useAuth();

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!token)           return <AuthStack />;
  if (role === 'admin') return <AdminStack />;
  return <StudentTabs />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <SearchProvider>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent={false} />
            <NavigationContainer>
              <Root />
            </NavigationContainer>
          </SearchProvider>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
