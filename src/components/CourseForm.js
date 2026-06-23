import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

const CourseForm = ({ course, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: course?.name || '',
    code: course?.code || '',
    instructor: course?.instructor || '',
    credits: course?.credits?.toString() || '',
    description: course?.description || '',
    grade: course?.grade || 'A',
    percentage: course?.percentage?.toString() || '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter course name');
      return;
    }
    if (!formData.code.trim()) {
      Alert.alert('Error', 'Please enter course code');
      return;
    }
    if (!formData.instructor.trim()) {
      Alert.alert('Error', 'Please enter instructor name');
      return;
    }
    if (!formData.credits.trim()) {
      Alert.alert('Error', 'Please enter credits');
      return;
    }

    const courseData = {
      ...formData,
      credits: parseInt(formData.credits),
      percentage: parseInt(formData.percentage) || 0,
      attendance: course?.attendance || {
        total: 40,
        present: 35,
        percentage: 87.5
      },
      assignments: course?.assignments || []
    };

    onSave(courseData);
  };

  const gradeOptions = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {course ? 'Edit Course' : 'Add New Course'}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Course Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Enter course name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Course Code *</Text>
          <TextInput
            style={styles.input}
            value={formData.code}
            onChangeText={(value) => handleInputChange('code', value)}
            placeholder="e.g., MATH101"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instructor *</Text>
          <TextInput
            style={styles.input}
            value={formData.instructor}
            onChangeText={(value) => handleInputChange('instructor', value)}
            placeholder="Enter instructor name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Credits *</Text>
          <TextInput
            style={styles.input}
            value={formData.credits}
            onChangeText={(value) => handleInputChange('credits', value)}
            placeholder="Enter number of credits"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            placeholder="Enter course description"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Grade</Text>
          <View style={styles.gradeContainer}>
            {gradeOptions.map((grade) => (
              <TouchableOpacity
                key={grade}
                style={[
                  styles.gradeButton,
                  formData.grade === grade && styles.gradeButtonActive
                ]}
                onPress={() => handleInputChange('grade', grade)}
              >
                <Text style={[
                  styles.gradeText,
                  formData.grade === grade && styles.gradeTextActive
                ]}>
                  {grade}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Percentage</Text>
          <TextInput
            style={styles.input}
            value={formData.percentage}
            onChangeText={(value) => handleInputChange('percentage', value)}
            placeholder="Enter percentage (0-100)"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: spacing.md,
  },
  title: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.base,
    fontWeight: typography.medium,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.base,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  gradeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gradeButton: {
    width: '18%',
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  gradeButtonActive: {
    borderColor: colors.primary,
  },
  gradeText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  gradeTextActive: {
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.base,
    fontWeight: typography.medium,
  },
  saveButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.base,
    fontWeight: typography.medium,
  },
});

export default CourseForm;
