import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Animated,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useData } from '../context/DataContext';
import { useSearch } from '../context/SearchContext';
import StudentForm from '../components/StudentForm';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

const StudentsScreen = React.memo(({ navigation }) => {
  const { students, addStudent, updateStudent, deleteStudent, calculateAttendanceStats } = useData();
  const { resetSearch } = useSearch();
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Reset search when tab is pressed
  useEffect(() => {
    setSearchQuery('');
    setIsSearchVisible(false);
  }, [resetSearch]);

  const handleAddStudent = useCallback(() => {
    setEditingStudent(null);
    setShowForm(true);
  }, []);

  const handleEditStudent = useCallback((student) => {
    setEditingStudent(student);
    setShowForm(true);
  }, []);

  const handleDeleteStudent = useCallback((studentId) => {
    Alert.alert(
      'Delete Student',
      'Are you sure you want to delete this student?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteStudent(studentId) }
      ]
    );
  }, [deleteStudent]);

  const handleSaveStudent = useCallback((studentData) => {
    if (editingStudent) {
      updateStudent({ ...studentData, id: editingStudent.id });
    } else {
      addStudent(studentData);
    }
    setShowForm(false);
    setEditingStudent(null);
  }, [editingStudent, updateStudent, addStudent]);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingStudent(null);
  }, []);

  const handleMenuPress = useCallback((student) => {
    setSelectedStudent(student);
    setShowMenu(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setShowMenu(false);
    setSelectedStudent(null);
  }, []);

  const handleEditFromMenu = useCallback(() => {
    setShowMenu(false);
    handleEditStudent(selectedStudent);
  }, [selectedStudent, handleEditStudent]);

  const handleDeleteFromMenu = useCallback(() => {
    setShowMenu(false);
    handleDeleteStudent(selectedStudent.id);
  }, [selectedStudent, handleDeleteStudent]);

  const handleSearchToggle = useCallback(() => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible) {
      setSearchQuery('');
    }
  }, [isSearchVisible]);

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
  }, []);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) {
      return students;
    }
    
    const query = searchQuery.toLowerCase();
    return students.filter(student => 
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.id.toLowerCase().includes(query) ||
      student.bloodGroup.toLowerCase().includes(query) ||
      student.gender.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  // Separate component for student item to properly use hooks
  const StudentItem = React.memo(({ item, index, navigation, calculateAttendanceStats, handleMenuPress }) => {
    const attendanceStats = calculateAttendanceStats(item.id);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, [fadeAnim, scaleAnim, index]);
    
    return (
      <Animated.View
        style={[
          styles.studentCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => navigation.navigate('StudentDetails', { student: item })}
          activeOpacity={0.7}
        >
        <View style={styles.cardHeader}>
          <View style={styles.studentMainInfo}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={item.gender === 'male' ? [colors.male, colors.secondary] : [colors.female, '#F472B6']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {item.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </LinearGradient>
              <View style={[styles.statusIndicator, { 
                backgroundColor: attendanceStats.percentage >= 80 ? colors.success : 
                                attendanceStats.percentage >= 60 ? colors.warning : colors.error 
              }]} />
            </View>
            
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentId}>ID: {item.id}</Text>
              <View style={styles.studentMeta}>
                <View style={[styles.bloodGroupContainer, { 
                  backgroundColor: item.gender === 'male' ? colors.male : colors.female 
                }]}>
                  <Text style={styles.bloodGroup}>{item.bloodGroup}</Text>
                </View>
                <View style={styles.genderContainer}>
                  <Ionicons 
                    name={item.gender === 'male' ? 'male' : 'female'} 
                    size={16} 
                    color={item.gender === 'male' ? colors.male : colors.female} 
                  />
                  <Text style={[styles.genderText, { 
                    color: item.gender === 'male' ? colors.male : colors.female 
                  }]}>
                    {item.gender.charAt(0).toUpperCase() + item.gender.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => handleMenuPress(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.attendanceSection}>
          <View style={styles.attendanceMain}>
            <Text style={styles.attendancePercentage}>
              {attendanceStats.percentage.toFixed(1)}%
            </Text>
            <Text style={styles.attendanceLabel}>Overall Attendance</Text>
          </View>
          
          <View style={styles.attendanceProgress}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${attendanceStats.percentage}%`,
                    backgroundColor: attendanceStats.percentage >= 80 ? colors.success : 
                                    attendanceStats.percentage >= 60 ? colors.warning : colors.error
                  }
                ]} 
              />
            </View>
          </View>
        </View>
        
        <View style={styles.studentStats}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            </View>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {attendanceStats.present}
            </Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="close-circle" size={16} color={colors.error} />
            </View>
            <Text style={[styles.statNumber, { color: colors.error }]}>
              {attendanceStats.absent}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="calendar" size={16} color={colors.warning} />
            </View>
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {attendanceStats.leave}
            </Text>
            <Text style={styles.statLabel}>Leave</Text>
          </View>
        </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  const renderStudentItem = useCallback(({ item, index }) => (
    <TouchableOpacity 
      style={styles.studentListItem}
      onPress={() => navigation.navigate('StudentDetails', { student: item })}
      activeOpacity={0.7}
    >
      <View style={styles.studentAvatar}>
        {item.profileImage ? (
          <Image 
            source={typeof item.profileImage === 'string' 
              ? { uri: item.profileImage } 
              : item.profileImage
            } 
            style={styles.avatarImage} 
          />
        ) : (
          <LinearGradient
            colors={item.gender === 'male' ? [colors.primary, colors.primaryLight] : [colors.secondary, colors.secondaryLight]}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>
              {item.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </LinearGradient>
        )}
      </View>
      
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
        <View style={styles.studentMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="person" size={12} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.gender}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="medical" size={12} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.bloodGroup}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.studentStats}>
        <View style={styles.attendanceStat}>
          <Text style={styles.statValue}>
            {calculateAttendanceStats(item.id).percentage?.toFixed(0) || '0'}%
          </Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => handleMenuPress(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [navigation, calculateAttendanceStats, handleMenuPress]);

  const classStats = useMemo(() => ({
    total: filteredStudents.length,
    male: filteredStudents.filter(s => s.gender === 'male').length,
    female: filteredStudents.filter(s => s.gender === 'female').length
  }), [filteredStudents]);

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Students</Text>
            <Text style={styles.headerSubtitle}>BS Computer Science</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearchToggle} activeOpacity={0.7}>
              <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={handleAddStudent}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        
        {isSearchVisible && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.success }]}>
                {classStats.total}
              </Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.male }]}>
                {classStats.male}
              </Text>
              <Text style={styles.summaryLabel}>Boys</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: colors.female }]}>
                {classStats.female}
              </Text>
              <Text style={styles.summaryLabel}>Girls</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  ), [classStats, handleAddStudent, handleSearchToggle, isSearchVisible, searchQuery, handleSearchChange]);

  if (showForm) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StudentForm
          student={editingStudent}
          onSave={handleSaveStudent}
          onCancel={handleCancelForm}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {renderHeader()}
      
      <View style={styles.content}>
        <FlatList
          data={filteredStudents}
          renderItem={({ item, index }) => renderStudentItem({ item, index })}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          style={{ flex: 1 }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={8}
          getItemLayout={(data, index) => ({
            length: 200,
            offset: 200 * index,
            index,
          })}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={true}
          bouncesZoom={false}
          alwaysBounceVertical={false}
        />
      </View>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={handleMenuClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleMenuClose}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleEditFromMenu}
            >
              <Ionicons name="pencil" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleDeleteFromMenu}
            >
              <Ionicons name="trash" size={20} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  headerContent: {
    paddingHorizontal: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: typography.bold,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  addButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  summaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
  },
  summaryLabel: {
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  listContainer: {
    paddingVertical: spacing.sm,
  },
  studentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  studentAvatar: {
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.white,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  studentEmail: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  studentMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  studentStats: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  attendanceStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  menuButton: {
    padding: spacing.sm,
  },
  studentMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: spacing.md,
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  avatarText: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  studentId: {
    fontSize: typography.sm,
    color: colors.primary,
    fontWeight: typography.medium,
    marginBottom: spacing.sm,
  },
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bloodGroupContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  bloodGroup: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  genderText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },
  menuButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  attendanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  attendanceMain: {
    alignItems: 'center',
  },
  attendancePercentage: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  attendanceLabel: {
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },
  attendanceProgress: {
    flex: 1,
    marginLeft: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  studentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statNumber: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    minWidth: 150,
    ...shadows.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  menuItemText: {
    fontSize: typography.base,
    marginLeft: spacing.sm,
    fontWeight: typography.medium,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
  },
});

StudentsScreen.displayName = 'StudentsScreen';

export default StudentsScreen;
