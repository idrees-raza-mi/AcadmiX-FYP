import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const DataContext = createContext({});

export function DataProvider({ children }) {
  const [students, setStudents] = useState([]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data || []);
    } catch (e) {
      // Not admin or not authenticated yet — ignore
    }
  }, []);

  const addStudent = async (data) => {
    const res = await api.post('/admin/students', data);
    setStudents(prev => [...prev, res.data]);
    return res.data;
  };

  const updateStudent = async (id, data) => {
    const res = await api.put(`/admin/students/${id}`, data);
    setStudents(prev => prev.map(s => (s._id === id ? res.data : s)));
    return res.data;
  };

  const deleteStudent = async (id) => {
    await api.delete(`/admin/students/${id}`);
    setStudents(prev => prev.filter(s => s._id !== id));
  };

  const calculateAttendanceStats = (records = []) => {
    const total   = records.length;
    const present = records.filter(r => ['present', 'late', 'excused'].includes(r.status)).length;
    return { total, present, percentage: total ? Math.round((present / total) * 100) : 0 };
  };

  return (
    <DataContext.Provider value={{ students, fetchStudents, addStudent, updateStudent, deleteStudent, calculateAttendanceStats }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
