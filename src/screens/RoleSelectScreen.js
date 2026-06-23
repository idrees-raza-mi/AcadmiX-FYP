import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';

export default function RoleSelectScreen({ navigation }) {
  return (
    <LinearGradient colors={['#047857', '#059669', '#10b981']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>AX</Text>
          </View>
          <Text style={styles.brand}>AcademicX</Text>
          <Text style={styles.tagline}>Academic Management Platform</Text>
        </View>

        <View style={styles.cards}>
          <Text style={styles.question}>Continue as</Text>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('AdminLogin')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="shield-checkmark" size={28} color="#047857" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Administrator</Text>
              <Text style={styles.cardDesc}>Manage department, batches, courses & students</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('StudentLogin')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="school" size={28} color="#047857" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Student</Text>
              <Text style={styles.cardDesc}>View courses, attendance and academic profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>AcademicX v1.0</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe:      { flex: 1, justifyContent: 'space-between', padding: 28 },
  header:    { alignItems: 'center', paddingTop: 40 },
  logo: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  brand:    { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  tagline:  { color: 'rgba(255,255,255,0.75)', fontSize: 14 },

  cards: { gap: 14 },
  question: {
    color: '#fff', fontSize: 18, fontWeight: '700',
    marginBottom: 8, textAlign: 'center',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle:{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  cardDesc: { fontSize: 12, color: '#64748B', lineHeight: 18 },

  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
