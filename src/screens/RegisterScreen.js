import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius } from '../styles/theme';
import { API_BASE_URL } from '../config';
import { isValidEmail, MESSAGES } from '../utils/validation';

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1 = serial, 2 = credentials
  const [serialCode, setSerialCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Enter your email'); return; }
    if (!isValidEmail(email)) { Alert.alert('Error', MESSAGES.email); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    if (password !== confirmPass) { Alert.alert('Error', 'Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/student/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, secretCode: serialCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!data.success) {
        Alert.alert('Registration Failed', data.message);
        return;
      }
      Alert.alert(
        'Registration Successful! 🎉',
        'Your account has been created. Please wait for admin approval before logging in.',
        [{ text: 'Go to Login', onPress: () => navigation.navigate('StudentLogin') }]
      );
    } catch {
      Alert.alert('Error', 'Cannot connect to server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#047857', '#059669', '#10b981']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>AX</Text>
          </View>
          <Text style={styles.appName}>AcademicX</Text>
          <Text style={styles.tagline}>Student Registration</Text>

          {/* Step indicator */}
          <View style={styles.steps}>
            <View style={[styles.step, step >= 1 && styles.stepActive]}>
              <Text style={[styles.stepNum, step >= 1 && styles.stepNumActive]}>1</Text>
            </View>
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.step, step >= 2 && styles.stepActive]}>
              <Text style={[styles.stepNum, step >= 2 && styles.stepNumActive]}>2</Text>
            </View>
          </View>
        </View>

          <View style={styles.card}>
            {/* Step 1 — Serial Code */}
            {step === 1 && (
              <>
                <Text style={styles.cardTitle}>Enter Batch Secret Code</Text>
                <Text style={styles.cardSub}>
                  Enter the secret code for your batch/class provided by your institution's admin.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Batch Secret Code</Text>
                  <TextInput
                    style={[styles.input, styles.serialInput]}
                    placeholder="CS-BSCS-XXXX"
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="characters"
                    value={serialCode}
                    onChangeText={setSerialCode}
                  />
                  <Text style={styles.hint}>This code is given to you by your admin or HOD for your specific batch/class</Text>
                </View>

                <TouchableOpacity
                  style={[styles.btn, !serialCode.trim() && styles.btnDisabled]}
                  disabled={!serialCode.trim()}
                  onPress={() => setStep(2)}
                >
                  <Text style={styles.btnText}>Continue →</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 2 — Credentials */}
            {step === 2 && (
              <>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                  <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.cardTitle}>Create Account</Text>
                <Text style={styles.cardSub}>Set your email and password. After registration, wait for admin approval.</Text>

                <View style={styles.serialBadge}>
                  <Text style={styles.serialBadgeLabel}>Serial Code</Text>
                  <Text style={styles.serialBadgeCode}>{serialCode.toUpperCase()}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View>
                    <TextInput
                      style={styles.input}
                      placeholder="Min. 6 characters"
                      placeholderTextColor={colors.textLight}
                      secureTextEntry={!showPass}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(s => !s)}>
                      <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={[styles.input, confirmPass && password !== confirmPass && styles.inputError]}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.textLight}
                    secureTextEntry={!showPass}
                    value={confirmPass}
                    onChangeText={setConfirmPass}
                  />
                  {confirmPass && password !== confirmPass && (
                    <Text style={styles.errorText}>Passwords do not match</Text>
                  )}
                </View>

                <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register</Text>}
                </TouchableOpacity>

                <View style={styles.approvalNote}>
                  <Text style={styles.approvalIcon}>⏳</Text>
                  <Text style={styles.approvalText}>After registration your account will need admin approval before you can login.</Text>
                </View>
              </>
            )}

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('StudentLogin')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 20 },
  logo: {
    width: 54, height: 54,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  appName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 3, marginBottom: 18 },

  steps: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepActive: { backgroundColor: '#fff' },
  stepNum: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  stepNumActive: { color: colors.primary },
  stepLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 1 },
  stepLineActive: { backgroundColor: '#fff' },

  scrollContent: { flexGrow: 1, justifyContent: 'flex-start' }, // header+card scroll together; keyboard-safe
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 26,
    paddingBottom: 38,
  },
  cardTitle: { fontSize: 21, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  cardSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 22, lineHeight: 19 },

  backBtn: { marginBottom: 12 },
  backText: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#fff',
  },
  serialInput: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    color: colors.primary,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontSize: 12, color: colors.error, marginTop: 4 },
  hint: { fontSize: 12, color: colors.textLight, marginTop: 6 },

  eyeBtn: { position: 'absolute', right: 12, top: 12 },
  eyeIcon: { fontSize: 18 },

  btn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  serialBadge: {
    backgroundColor: '#ecfdf5',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  serialBadgeLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  serialBadgeCode: { fontSize: 18, fontWeight: '800', color: colors.primary, letterSpacing: 2 },

  approvalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    padding: 12,
    marginTop: 14,
  },
  approvalIcon: { fontSize: 16 },
  approvalText: { flex: 1, fontSize: 12, color: '#B45309', lineHeight: 18 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, alignItems: 'center' },
  loginText: { fontSize: 14, color: colors.textSecondary },
  loginLink: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
