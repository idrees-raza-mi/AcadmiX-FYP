import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

const ProfileForm = ({ student, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    email: student?.email || '',
    phone: student?.phone || '',
    address: student?.address || '',
    dateOfBirth: student?.dateOfBirth || '',
    bloodGroup: student?.bloodGroup || '',
    gender: student?.gender || 'male',
    parentName: student?.parentName || '',
    parentContact: student?.parentContact || '',
    profileImage: student?.profileImage || null,
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      handleInputChange('profileImage', result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      handleInputChange('profileImage', result.assets[0].uri);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose how you want to add a profile picture',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Show success message
    Alert.alert('Success', 'Profile updated successfully!', [
      { text: 'OK', onPress: () => onSave(formData) }
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Profile</Text>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <TouchableOpacity style={styles.profilePictureContainer} onPress={showImagePicker}>
            {formData.profileImage ? (
              <Image source={{ uri: formData.profileImage }} style={styles.profilePicture} />
            ) : (
              <View style={[styles.profilePicturePlaceholder, { backgroundColor: student?.gender === 'male' ? colors.male : colors.female }]}>
                <Text style={styles.profilePictureText}>
                  {formData.name.split(' ').map(n => n[0]).join('') || 'PP'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profilePictureLabel}>Tap to change photo</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Enter your name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(value) => handleInputChange('address', value)}
            placeholder="Enter address"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            value={formData.dateOfBirth}
            onChangeText={(value) => handleInputChange('dateOfBirth', value)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Blood Group</Text>
          <TextInput
            style={styles.input}
            value={formData.bloodGroup}
            onChangeText={(value) => handleInputChange('bloodGroup', value)}
            placeholder="e.g., A+ve, B+ve"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.gender === 'male' && styles.radioButtonActive
              ]}
              onPress={() => handleInputChange('gender', 'male')}
            >
              <Text style={[
                styles.radioText,
                formData.gender === 'male' && styles.radioTextActive
              ]}>
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.radioButton,
                formData.gender === 'female' && styles.radioButtonActive
              ]}
              onPress={() => handleInputChange('gender', 'female')}
            >
              <Text style={[
                styles.radioText,
                formData.gender === 'female' && styles.radioTextActive
              ]}>
                Female
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Parent/Guardian Name</Text>
          <TextInput
            style={styles.input}
            value={formData.parentName}
            onChangeText={(value) => handleInputChange('parentName', value)}
            placeholder="Enter parent/guardian name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Parent Contact</Text>
          <TextInput
            style={styles.input}
            value={formData.parentContact}
            onChangeText={(value) => handleInputChange('parentContact', value)}
            placeholder="Enter parent contact number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
  header: {
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
    textAlign: 'center',
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureText: {
    fontSize: typography['2xl'],
    fontWeight: typography.bold,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureLabel: {
    fontSize: typography.sm,
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
  radioGroup: {
    flexDirection: 'row',
  },
  radioButton: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: colors.primary,
  },
  radioText: {
    fontSize: typography.base,
  },
  radioTextActive: {
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

export default ProfileForm;
