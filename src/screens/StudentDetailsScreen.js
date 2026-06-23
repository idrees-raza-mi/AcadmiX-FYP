import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useData } from '../context/DataContext';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

const { width } = Dimensions.get('window');

const StudentDetailsScreen = ({ route, navigation }) => {
  const { student } = route.params;
  const { calculateAttendanceStats } = useData();
  const [showMenu, setShowMenu] = useState(false);

  const attendanceStats = calculateAttendanceStats(student.id);

  const handleMenuPress = useCallback(() => {
    setShowMenu(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleEditStudent = useCallback(() => {
    setShowMenu(false);
    Alert.alert('Edit Student', 'Feature coming soon!');
  }, []);

  const handleDeleteStudent = useCallback(() => {
    setShowMenu(false);
    Alert.alert('Delete Student', 'Feature coming soon!');
  }, []);

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Student Details</Text>
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={handleMenuPress}
        activeOpacity={0.7}
      >
        <Ionicons name="ellipsis-vertical" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  ), [navigation, handleMenuPress]);

  const renderProfileSection = useCallback(() => (
    <View style={styles.profileSection}>
      <View style={styles.avatarContainer}>
        {student.profileImage ? (
          <Image source={{ uri: student.profileImage }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={student.gender === 'male' ? [colors.primary, colors.primaryLight] : [colors.secondary, colors.secondaryLight]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {student.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </LinearGradient>
        )}
      </View>
      <Text style={styles.studentName}>{student.name}</Text>
      <Text style={styles.studentEmail}>{student.email}</Text>
      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
        <Text style={styles.statusText}>Active</Text>
      </View>
    </View>
  ), [student]);

  const renderStatsCard = useCallback(() => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Attendance Overview</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{attendanceStats.percentage?.toFixed(0) || '0'}%</Text>
          <Text style={styles.statLabel}>Overall</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{attendanceStats.present || 0}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{attendanceStats.absent || 0}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{attendanceStats.leave || 0}</Text>
          <Text style={styles.statLabel}>Leave</Text>
        </View>
      </View>
    </View>
  ), [attendanceStats]);

  const renderInfoCard = useCallback(() => (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>Personal Information</Text>
      
      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={20} color={colors.gray} style={styles.infoIcon} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Full Name</Text>
          <Text style={styles.infoValue}>{student.name}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="mail-outline" size={20} color={colors.gray} style={styles.infoIcon} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{student.email}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="call-outline" size={20} color={colors.gray} style={styles.infoIcon} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{student.phone}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="card-outline" size={20} color={colors.gray} style={styles.infoIcon} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Student ID</Text>
          <Text style={styles.infoValue}>{student.id}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="medical-outline" size={20} color={colors.gray} style={styles.infoIcon} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Blood Group</Text>
          <Text style={styles.infoValue}>{student.bloodGroup}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name={student.gender === 'male' ? 'male-outline' : 'female-outline'} size={20} color={colors.gray} style={styles.infoIcon} />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Gender</Text>
          <Text style={styles.infoValue}>{student.gender.charAt(0).toUpperCase() + student.gender.slice(1)}</Text>
        </View>
      </View>

      {student.dateOfBirth && (
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={20} color={colors.gray} style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>{student.dateOfBirth}</Text>
          </View>
        </View>
      )}

      {student.address && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color={colors.gray} style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{student.address}</Text>
          </View>
        </View>
      )}

      {student.parentName && (
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={20} color={colors.gray} style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Parent/Guardian</Text>
            <Text style={styles.infoValue}>{student.parentName}</Text>
          </View>
        </View>
      )}

      {student.parentContact && (
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={20} color={colors.gray} style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Parent Contact</Text>
            <Text style={styles.infoValue}>{student.parentContact}</Text>
          </View>
        </View>
      )}
    </View>
  ), [student]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {renderHeader()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderProfileSection()}
        {renderStatsCard()}
        {renderInfoCard()}
      </ScrollView>

      {/* Menu Modal */}
      {showMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackdrop} onPress={handleMenuClose} />
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Student Actions</Text>
              <TouchableOpacity onPress={handleMenuClose} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuItem} onPress={handleEditStudent}>
                <View style={styles.menuItemIcon}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Edit Student</Text>
                  <Text style={styles.menuItemSubtitle}>Update student information</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity style={styles.menuItem} onPress={handleDeleteStudent}>
                <View style={[styles.menuItemIcon, { backgroundColor: colors.error + '20' }]}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemTitle, { color: colors.error }]}>Delete Student</Text>
                  <Text style={styles.menuItemSubtitle}>Remove student permanently</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  menuButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    resizeMode: 'cover',
  },
  avatarText: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.white,
  },
  studentName: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  studentEmail: {
    fontSize: typography.base,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.success,
  },
  statsCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  statsTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  infoCardTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  infoIcon: {
    marginRight: spacing.md,
    width: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  infoValue: {
    fontSize: typography.base,
    fontWeight: typography.medium,
    color: colors.textPrimary,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    maxWidth: 320,
    width: '100%',
    ...shadows.lg,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  menuTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  menuItems: {
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: typography.base,
    fontWeight: typography.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  menuItemSubtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
});

export default StudentDetailsScreen;