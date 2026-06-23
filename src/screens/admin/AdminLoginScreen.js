import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export default function AdminLoginScreen({ navigation }) {
  const { setAuth } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', confirm: '' });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const rf = (k, v) => setRegForm(p => ({ ...p, [k]: v }));

  const handleLogin = async () => {
    if (!form.email || !form.password) { Alert.alert('Error', 'Email and password required'); return; }
    setLoading(true);
    try {
      const data = await api.post('/auth/admin/login', { email: form.email, password: form.password });
      await setAuth(data.token, data.user, 'admin');
    } catch (e) {
      Alert.alert('Login Failed', e.message);
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!regForm.name || !regForm.email || !regForm.password) {
      Alert.alert('Error', 'All fields required'); return;
    }
    if (regForm.password !== regForm.confirm) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (regForm.password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const data = await api.post('/auth/admin/register', {
        name: regForm.name, email: regForm.email, password: regForm.password
      });
      await setAuth(data.token, data.user, 'admin');
    } catch (e) {
      Alert.alert('Registration Failed', e.message);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#047857', '#059669']} style={styles.top}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topContent}>
          <View style={styles.logo}><Text style={styles.logoText}>AX</Text></View>
          <Text style={styles.title}>Administrator Portal</Text>
          <Text style={styles.sub}>Manage your department & students</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {/* Tab switcher */}
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tabBtn, tab === 'login' && styles.tabActive]} onPress={() => setTab('login')}>
            <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === 'register' && styles.tabActive]} onPress={() => setTab('register')}>
            <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        {tab === 'login' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.input} value={form.email} onChangeText={v => f('email', v)}
              placeholder="admin@academicx.com" keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.label}>Password</Text>
            <View style={styles.pwWrap}>
              <TextInput style={[styles.input, { flex: 1, borderWidth: 0, paddingRight: 40 }]}
                value={form.password} onChangeText={v => f('password', v)}
                placeholder="Enter password" secureTextEntry={!show} />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShow(s => !s)}>
                <Ionicons name={show ? 'eye-off' : 'eye'} size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={regForm.name} onChangeText={v => rf('name', v)} placeholder="Dr. Ahmed Khan" />

            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.input} value={regForm.email} onChangeText={v => rf('email', v)}
              placeholder="admin@academicx.com" keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.label}>Password</Text>
            <View style={styles.pwWrap}>
              <TextInput style={[styles.input, { flex: 1, borderWidth: 0, paddingRight: 40 }]}
                value={regForm.password} onChangeText={v => rf('password', v)}
                placeholder="At least 6 characters" secureTextEntry={!show} />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShow(s => !s)}>
                <Ionicons name={show ? 'eye-off' : 'eye'} size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput style={styles.input} value={regForm.confirm} onChangeText={v => rf('confirm', v)}
              placeholder="Re-enter password" secureTextEntry={!show} />

            <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
            </TouchableOpacity>
            <Text style={styles.hint}>After registering, you'll set up your department</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  top:    { paddingTop: 16, paddingBottom: 28, paddingHorizontal: 24 },
  back:   { marginBottom: 16 },
  topContent: { alignItems: 'center' },
  logo: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  title:  { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  sub:    { color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  body: { flex: 1 },
  tabs: {
    flexDirection: 'row', margin: 20,
    backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#047857' },

  form: { paddingHorizontal: 20, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A',
  },
  pwWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
  },
  eyeBtn: { position: 'absolute', right: 12 },
  btn: {
    backgroundColor: '#047857', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 22,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  hint: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 12 },
});
