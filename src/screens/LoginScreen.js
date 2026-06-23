import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function StudentLoginScreen({ navigation }) {
  const { setAuth } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.email || !form.password) { Alert.alert('Error', 'Email and password required'); return; }
    setLoading(true);
    try {
      const data = await api.post('/auth/student/login', { email: form.email, password: form.password });
      await setAuth(data.token, data.user, 'student');
    } catch (e) {
      Alert.alert('Login Failed', e.message);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={['#047857', '#059669', '#10b981']} style={styles.top}>
            <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.topContent}>
              <View style={styles.logo}><Text style={styles.logoText}>AX</Text></View>
              <Text style={styles.title}>Student Login</Text>
              <Text style={styles.sub}>Access your courses and attendance</Text>
            </View>
          </LinearGradient>

          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input} value={form.email}
              onChangeText={v => setForm(p => ({ ...p, email: v }))}
              placeholder="student@email.com" keyboardType="email-address" autoCapitalize="none"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0, paddingRight: 48 }]}
                value={form.password} onChangeText={v => setForm(p => ({ ...p, password: v }))}
                placeholder="Enter password" secureTextEntry={!show}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShow(s => !s)}>
                <Ionicons name={show ? 'eye-off' : 'eye'} size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Sign In</Text>
              }
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.regTxt}>New student? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.regLink}>Register with batch code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  top: { paddingTop: 16, paddingBottom: 28, paddingHorizontal: 24 },
  back: { marginBottom: 16 },
  topContent: { alignItems: 'center' },
  logo: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  sub:   { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  body:  { flex: 1 },
  form:  { padding: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#0F172A',
  },
  pwWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
  },
  eyeBtn: { position: 'absolute', right: 14 },
  btn: {
    backgroundColor: '#047857', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 24,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  regTxt:  { fontSize: 13, color: '#64748B' },
  regLink: { fontSize: 13, color: '#047857', fontWeight: '600' },
});
