#!/usr/bin/env node

// Script để debug và fix vấn đề Class Management
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

// Test data
const testUser = {
  username: 'admin',
  password: 'admin123'
};

const testClass = {
  className: 'Test Class Debug',
  classCode: 'TEST_DEBUG_001',
  maxStudents: 30
};

async function main() {
  try {
    console.log('🔍 Debugging Class Management Issues...\n');
    
    // 1. Test login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser);
    const token = loginResponse.data.accessToken;
    console.log('✅ Login successful');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Test get class management data
    console.log('\n2. Testing get class management data...');
    try {
      const classDataResponse = await axios.get(`${API_BASE}/class-management/my`, { headers });
      console.log('✅ Class management data:', JSON.stringify(classDataResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Error getting class data:', error.response?.data || error.message);
    }
    
    // 3. Test create class via admin endpoint
    console.log('\n3. Testing create class via admin endpoint...');
    try {
      const createResponse = await axios.post(`${API_BASE}/admin/users/create-class`, testClass, { headers });
      console.log('✅ Create class successful:', JSON.stringify(createResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Error creating class:', error.response?.data || error.message);
    }
    
    // 4. Test get class data again
    console.log('\n4. Testing get class data after creation...');
    try {
      const classDataResponse2 = await axios.get(`${API_BASE}/class-management/my`, { headers });
      console.log('✅ Updated class management data:', JSON.stringify(classDataResponse2.data, null, 2));
    } catch (error) {
      console.log('❌ Error getting updated class data:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Main error:', error.response?.data || error.message);
  }
}

main();
