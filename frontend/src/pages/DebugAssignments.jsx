import React, { useEffect, useState } from 'react';
import { authApi } from '../services/authApi';
import { assignmentApi } from '../services/assignmentApi';

export default function DebugAssignments() {
  const [debug, setDebug] = useState({});

  useEffect(() => {
    const test = async () => {
      try {
        // 1. Check current user
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('Current user:', user);

        // 2. Check classes
        const classData = await authApi.getMyClassManagement();
        console.log('Class data:', classData);

        // 3. Try to get assignments for each class
        if (classData.classes?.length > 0) {
          for (const cls of classData.classes) {
            try {
              const assignments = await assignmentApi.getAssignmentsForStudent(cls.id);
              console.log(`Assignments for class ${cls.id} (${cls.name}):`, assignments);
            } catch (err) {
              console.error(`Error getting assignments for class ${cls.id}:`, err.response?.data || err.message);
            }
          }
        }

        setDebug({
          user,
          classData,
          token: localStorage.getItem('authToken')?.substring(0, 20) + '...'
        });
      } catch (error) {
        console.error('Debug error:', error);
        setDebug({ error: error.message });
      }
    };
    test();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>Debug Assignments</h1>
      <pre>{JSON.stringify(debug, null, 2)}</pre>
      <p>Check browser console for detailed logs</p>
    </div>
  );
}
