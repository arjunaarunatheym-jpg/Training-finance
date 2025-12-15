#!/usr/bin/env python3
"""
Backend Test Suite for Defensive Driving Training Management System - Participant Session Assignment Testing
Tests the participant session assignment workflow after refactoring:
- Participant Session Retrieval (GET /api/sessions)
- Session Details with Participant Access (GET /api/sessions/{session_id})
- Participant Access Endpoints
- Test Availability for Participants (GET /api/sessions/{session_id}/tests/available)
- Certificate Access (GET /api/certificates/my-certificates)
- Database verification for participant_access records
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://training-hub-sync.preview.emergentagent.com/api"
ADMIN_EMAIL = "arjuna@mddrc.com.my"
ADMIN_PASSWORD = "Dana102229"

class TestRunner:
    def __init__(self):
        self.admin_token = None
        self.participant_token = None
        self.second_participant_token = None
        self.test_program_id = None
        self.created_test_ids = []
        self.session_id = None
        self.participant_id = None
        self.test_result_id = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def login_admin(self):
        """Login as admin and get authentication token"""
        self.log("Attempting admin login...")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data['access_token']
                self.log(f"✅ Admin login successful. User: {data['user']['full_name']} ({data['user']['role']})")
                return True
            else:
                self.log(f"❌ Admin login failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}", "ERROR")
            return False
    
    def create_test_program(self):
        """Create a test program for testing purposes"""
        self.log("Creating test program...")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        program_data = {
            "name": "Test Management Program",
            "description": "Program created for testing test management endpoints",
            "pass_percentage": 75.0
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/programs", json=program_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.test_program_id = data['id']
                self.log(f"✅ Test program created successfully. ID: {self.test_program_id}")
                return True
            else:
                self.log(f"❌ Program creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Program creation error: {str(e)}", "ERROR")
            return False
    
    def test_create_pre_test(self):
        """Test POST /api/tests - Create pre-test"""
        self.log("Testing POST /api/tests - Creating pre-test...")
        
        if not self.admin_token or not self.test_program_id:
            self.log("❌ Missing admin token or program ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        test_data = {
            "program_id": self.test_program_id,
            "test_type": "pre",
            "questions": [
                {
                    "question": "What is the recommended following distance in good weather conditions?",
                    "options": ["1 second", "2 seconds", "3 seconds", "4 seconds"],
                    "correct_answer": 2
                },
                {
                    "question": "When should you check your mirrors while driving?",
                    "options": ["Only when changing lanes", "Every 5-8 seconds", "Only when parking", "Once per trip"],
                    "correct_answer": 1
                },
                {
                    "question": "What does defensive driving primarily focus on?",
                    "options": ["Speed", "Anticipating hazards", "Fuel efficiency", "Vehicle maintenance"],
                    "correct_answer": 1
                }
            ]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/tests", json=test_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                test_id = data['id']
                self.created_test_ids.append(test_id)
                self.log(f"✅ Pre-test created successfully. ID: {test_id}")
                self.log(f"   Program ID: {data['program_id']}")
                self.log(f"   Test Type: {data['test_type']}")
                self.log(f"   Questions: {len(data['questions'])}")
                return True
            else:
                self.log(f"❌ Pre-test creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Pre-test creation error: {str(e)}", "ERROR")
            return False
    
    def test_create_post_test(self):
        """Test POST /api/tests - Create post-test"""
        self.log("Testing POST /api/tests - Creating post-test...")
        
        if not self.admin_token or not self.test_program_id:
            self.log("❌ Missing admin token or program ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        test_data = {
            "program_id": self.test_program_id,
            "test_type": "post",
            "questions": [
                {
                    "question": "What is the recommended following distance in good weather conditions?",
                    "options": ["1 second", "2 seconds", "3 seconds", "4 seconds"],
                    "correct_answer": 2
                },
                {
                    "question": "When should you check your mirrors while driving?",
                    "options": ["Only when changing lanes", "Every 5-8 seconds", "Only when parking", "Once per trip"],
                    "correct_answer": 1
                },
                {
                    "question": "What does defensive driving primarily focus on?",
                    "options": ["Speed", "Anticipating hazards", "Fuel efficiency", "Vehicle maintenance"],
                    "correct_answer": 1
                }
            ]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/tests", json=test_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                test_id = data['id']
                self.created_test_ids.append(test_id)
                self.log(f"✅ Post-test created successfully. ID: {test_id}")
                self.log(f"   Program ID: {data['program_id']}")
                self.log(f"   Test Type: {data['test_type']}")
                self.log(f"   Questions: {len(data['questions'])}")
                return True
            else:
                self.log(f"❌ Post-test creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Post-test creation error: {str(e)}", "ERROR")
            return False
    
    def test_get_tests_by_program(self):
        """Test GET /api/tests/program/{program_id}"""
        self.log("Testing GET /api/tests/program/{program_id}...")
        
        if not self.admin_token or not self.test_program_id:
            self.log("❌ Missing admin token or program ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/tests/program/{self.test_program_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Retrieved tests for program successfully. Count: {len(data)}")
                
                # Verify we have both pre and post tests
                test_types = [test['test_type'] for test in data]
                if 'pre' in test_types and 'post' in test_types:
                    self.log("✅ Both pre-test and post-test found in results")
                else:
                    self.log(f"⚠️  Expected both pre and post tests, found: {test_types}", "WARNING")
                
                # Log details of each test
                for test in data:
                    self.log(f"   Test ID: {test['id']}, Type: {test['test_type']}, Questions: {len(test['questions'])}")
                
                return True
            else:
                self.log(f"❌ Get tests by program failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get tests by program error: {str(e)}", "ERROR")
            return False
    
    def test_delete_test_as_admin(self):
        """Test DELETE /api/tests/{test_id} as admin"""
        self.log("Testing DELETE /api/tests/{test_id} as admin...")
        
        if not self.admin_token or not self.created_test_ids:
            self.log("❌ Missing admin token or test IDs", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        test_id_to_delete = self.created_test_ids[0]  # Delete the first test
        
        try:
            response = self.session.delete(f"{BASE_URL}/tests/{test_id_to_delete}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Test deleted successfully. Message: {data.get('message', 'No message')}")
                self.created_test_ids.remove(test_id_to_delete)  # Remove from our tracking
                return True
            else:
                self.log(f"❌ Test deletion failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test deletion error: {str(e)}", "ERROR")
            return False
    
    def test_verify_test_deleted(self):
        """Verify the test was actually deleted by getting tests again"""
        self.log("Verifying test was deleted by retrieving tests again...")
        
        if not self.admin_token or not self.test_program_id:
            self.log("❌ Missing admin token or program ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/tests/program/{self.test_program_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                current_count = len(data)
                self.log(f"✅ Retrieved tests after deletion. Current count: {current_count}")
                
                # Should have one less test now
                if current_count == 1:
                    self.log("✅ Test count reduced by 1, deletion confirmed")
                    return True
                else:
                    self.log(f"⚠️  Expected 1 test remaining, found {current_count}", "WARNING")
                    return False
                    
            else:
                self.log(f"❌ Get tests verification failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get tests verification error: {str(e)}", "ERROR")
            return False
    
    def test_delete_nonexistent_test(self):
        """Test DELETE /api/tests/{test_id} with non-existent test ID"""
        self.log("Testing DELETE /api/tests/{test_id} with non-existent test...")
        
        if not self.admin_token:
            self.log("❌ Missing admin token", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        fake_test_id = "non-existent-test-id-12345"
        
        try:
            response = self.session.delete(f"{BASE_URL}/tests/{fake_test_id}", headers=headers)
            
            if response.status_code == 404:
                self.log("✅ Non-existent test deletion correctly returned 404")
                return True
            else:
                self.log(f"❌ Expected 404 for non-existent test, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Non-existent test deletion error: {str(e)}", "ERROR")
            return False
    
    def test_create_participant_user(self):
        """Create a participant user for testing non-admin access"""
        self.log("Creating participant user for non-admin testing...")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        participant_data = {
            "email": "maaman@gmail.com",
            "password": "mddrc1",
            "full_name": "Test Participant",
            "id_number": "PART001",
            "role": "participant",
            "location": "Test Location"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json=participant_data, headers=headers)
            
            if response.status_code == 200:
                self.log("✅ Participant user created successfully")
                return True
            elif response.status_code == 400 and "User already exists" in response.text:
                self.log("✅ Participant user already exists (expected from previous runs)")
                return True
            else:
                self.log(f"❌ Participant creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Participant creation error: {str(e)}", "ERROR")
            return False
    
    def login_participant(self):
        """Login as participant to test non-admin access"""
        self.log("Logging in as participant...")
        
        login_data = {
            "email": "maaman@gmail.com",
            "password": "mddrc1"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.participant_token = data['access_token']
                self.log(f"✅ Participant login successful. User: {data['user']['full_name']} ({data['user']['role']})")
                return True
            else:
                self.log(f"❌ Participant login failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Participant login error: {str(e)}", "ERROR")
            return False
    
    def test_delete_test_as_participant(self):
        """Test DELETE /api/tests/{test_id} as participant (should fail with 403)"""
        self.log("Testing DELETE /api/tests/{test_id} as participant (should fail)...")
        
        if not self.participant_token or not self.created_test_ids:
            self.log("❌ Missing participant token or test IDs", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        test_id_to_delete = self.created_test_ids[0] if self.created_test_ids else "dummy-id"
        
        try:
            response = self.session.delete(f"{BASE_URL}/tests/{test_id_to_delete}", headers=headers)
            
            if response.status_code == 403:
                self.log("✅ Participant test deletion correctly returned 403 Forbidden")
                return True
            else:
                self.log(f"❌ Expected 403 for participant deletion, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Participant test deletion error: {str(e)}", "ERROR")
            return False
    
    def test_create_test_without_auth(self):
        """Test POST /api/tests without authentication (should fail)"""
        self.log("Testing POST /api/tests without authentication (should fail)...")
        
        test_data = {
            "program_id": "dummy-program-id",
            "test_type": "pre",
            "questions": [
                {
                    "question": "Test question?",
                    "options": ["A", "B", "C", "D"],
                    "correct_answer": 0
                }
            ]
        }
        
        try:
            # No Authorization header
            response = self.session.post(f"{BASE_URL}/tests", json=test_data)
            
            if response.status_code == 403:
                self.log("✅ Unauthenticated test creation correctly returned 403")
                return True
            else:
                self.log(f"❌ Expected 403 for unauthenticated request, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Unauthenticated test creation error: {str(e)}", "ERROR")
            return False

    # ============ PHASE 1 PARTICIPANT TEST-TAKING ENDPOINTS ============
    
    def create_company_and_session(self):
        """Create a company and session for participant testing"""
        self.log("Creating company and session for participant testing...")
        
        if not self.admin_token or not self.test_program_id:
            self.log("❌ Missing admin token or program ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Create company first
        company_data = {
            "name": "Test Company for Participant Testing"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/companies", json=company_data, headers=headers)
            
            if response.status_code == 200:
                company_id = response.json()['id']
                self.log(f"✅ Company created successfully. ID: {company_id}")
            else:
                self.log(f"❌ Company creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Company creation error: {str(e)}", "ERROR")
            return False
        
        # Use the logged-in participant's ID
        if not self.participant_token:
            self.log("❌ No participant token available", "ERROR")
            return False
            
        # Get current participant info
        participant_headers = {'Authorization': f'Bearer {self.participant_token}'}
        try:
            response = self.session.get(f"{BASE_URL}/auth/me", headers=participant_headers)
            if response.status_code == 200:
                participant_info = response.json()
                self.participant_id = participant_info['id']
                self.log(f"✅ Using logged-in participant ID: {self.participant_id}")
            else:
                self.log(f"❌ Failed to get participant info: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error getting participant info: {str(e)}", "ERROR")
            return False
        
        # Create session with participant
        session_data = {
            "name": "Test Session for Participant Testing",
            "program_id": self.test_program_id,
            "company_id": company_id,
            "location": "Test Location",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "participant_ids": [self.participant_id]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/sessions", json=session_data, headers=headers)
            
            if response.status_code == 200:
                self.session_id = response.json()['id']
                self.log(f"✅ Session created successfully. ID: {self.session_id}")
                return True
            else:
                self.log(f"❌ Session creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Session creation error: {str(e)}", "ERROR")
            return False
    
    def set_participant_access(self):
        """Set participant access to allow pre-test"""
        self.log("Setting participant access to allow pre-test...")
        
        if not self.admin_token or not self.participant_id or not self.session_id:
            self.log("❌ Missing admin token, participant ID, or session ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        access_data = {
            "participant_id": self.participant_id,
            "session_id": self.session_id,
            "can_access_pre_test": True
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/participant-access/update", json=access_data, headers=headers)
            
            if response.status_code == 200:
                self.log("✅ Participant access updated successfully")
                return True
            else:
                self.log(f"❌ Participant access update failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Participant access update error: {str(e)}", "ERROR")
            return False
    
    def create_fresh_pre_test(self):
        """Create a fresh pre-test for participant testing"""
        self.log("Creating fresh pre-test for participant testing...")
        
        if not self.admin_token or not self.test_program_id:
            self.log("❌ Missing admin token or program ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        test_data = {
            "program_id": self.test_program_id,
            "test_type": "pre",
            "questions": [
                {
                    "question": "What is the recommended following distance in good weather conditions?",
                    "options": ["1 second", "2 seconds", "3 seconds", "4 seconds"],
                    "correct_answer": 2
                },
                {
                    "question": "When should you check your mirrors while driving?",
                    "options": ["Only when changing lanes", "Every 5-8 seconds", "Only when parking", "Once per trip"],
                    "correct_answer": 1
                },
                {
                    "question": "What does defensive driving primarily focus on?",
                    "options": ["Speed", "Anticipating hazards", "Fuel efficiency", "Vehicle maintenance"],
                    "correct_answer": 1
                }
            ]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/tests", json=test_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                test_id = data['id']
                self.created_test_ids.append(test_id)
                self.log(f"✅ Fresh pre-test created successfully. ID: {test_id}")
                return True
            else:
                self.log(f"❌ Fresh pre-test creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Fresh pre-test creation error: {str(e)}", "ERROR")
            return False
    
    def test_get_available_tests_as_participant(self):
        """Test GET /api/sessions/{session_id}/tests/available as participant"""
        self.log("Testing GET /api/sessions/{session_id}/tests/available as participant...")
        
        if not self.participant_token or not self.session_id:
            self.log("❌ Missing participant token or session ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/{self.session_id}/tests/available", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Available tests retrieved successfully. Count: {len(data)}")
                
                # Verify tests don't include correct answers
                for test in data:
                    for question in test.get('questions', []):
                        if 'correct_answer' in question:
                            self.log("❌ Available tests include correct answers (security issue)", "ERROR")
                            return False
                
                self.log("✅ Available tests correctly exclude correct answers")
                
                # Should have at least one pre-test available
                pre_tests = [t for t in data if t.get('test_type') == 'pre']
                if pre_tests:
                    self.log(f"✅ Found {len(pre_tests)} pre-test(s) available")
                    return True
                else:
                    self.log("❌ No pre-tests found in available tests", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Get available tests failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get available tests error: {str(e)}", "ERROR")
            return False
    
    def test_get_available_tests_as_non_participant(self):
        """Test GET /api/sessions/{session_id}/tests/available as admin (should fail with 403)"""
        self.log("Testing GET /api/sessions/{session_id}/tests/available as admin (should fail)...")
        
        if not self.admin_token or not self.session_id:
            self.log("❌ Missing admin token or session ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/{self.session_id}/tests/available", headers=headers)
            
            if response.status_code == 403:
                self.log("✅ Non-participant access correctly returned 403 Forbidden")
                return True
            else:
                self.log(f"❌ Expected 403 for non-participant, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Non-participant available tests error: {str(e)}", "ERROR")
            return False
    
    def test_get_test_as_participant(self):
        """Test GET /api/tests/{test_id} as participant (should not include correct answers)"""
        self.log("Testing GET /api/tests/{test_id} as participant...")
        
        if not self.participant_token or not self.created_test_ids:
            self.log("❌ Missing participant token or test IDs", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        test_id = self.created_test_ids[0] if self.created_test_ids else None
        
        if not test_id:
            self.log("❌ No test ID available", "ERROR")
            return False
        
        try:
            response = self.session.get(f"{BASE_URL}/tests/{test_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Test retrieved successfully. ID: {data.get('id')}")
                
                # Verify test doesn't include correct answers
                for question in data.get('questions', []):
                    if 'correct_answer' in question:
                        self.log("❌ Test includes correct answers for participant (security issue)", "ERROR")
                        return False
                
                self.log("✅ Test correctly excludes correct answers for participant")
                return True
                    
            else:
                self.log(f"❌ Get test as participant failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get test as participant error: {str(e)}", "ERROR")
            return False
    
    def test_submit_test(self):
        """Test POST /api/tests/submit as participant"""
        self.log("Testing POST /api/tests/submit as participant...")
        
        if not self.participant_token or not self.created_test_ids or not self.session_id:
            self.log("❌ Missing participant token, test IDs, or session ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        
        # Find the pre-test ID (the fresh one we created)
        pre_test_id = None
        for test_id in self.created_test_ids:
            try:
                response = self.session.get(f"{BASE_URL}/tests/{test_id}", headers=headers)
                if response.status_code == 200:
                    test_data = response.json()
                    if test_data.get('test_type') == 'pre':
                        pre_test_id = test_id
                        break
            except:
                continue
        
        if not pre_test_id:
            self.log("❌ No pre-test ID available", "ERROR")
            return False
        
        # Submit pre-test with some answers
        submission_data = {
            "test_id": pre_test_id,
            "session_id": self.session_id,
            "answers": [2, 1, 1]  # Answers for the 3 questions
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/tests/submit", json=submission_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.test_result_id = data.get('id')
                self.log(f"✅ Pre-test submitted successfully. Result ID: {self.test_result_id}")
                self.log(f"   Score: {data.get('score', 0)}%")
                self.log(f"   Passed: {data.get('passed', False)}")
                self.log(f"   Test Type: {data.get('test_type', 'N/A')}")
                self.log(f"   Correct Answers: {data.get('correct_answers', 0)}/{data.get('total_questions', 0)}")
                return True
            else:
                self.log(f"❌ Pre-test submission failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Pre-test submission error: {str(e)}", "ERROR")
            return False
    
    def test_get_test_result_detail_as_participant(self):
        """Test GET /api/tests/results/{result_id} as participant (own result)"""
        self.log("Testing GET /api/tests/results/{result_id} as participant (own result)...")
        
        if not self.participant_token or not self.test_result_id:
            self.log("❌ Missing participant token or test result ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/tests/results/{self.test_result_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Test result detail retrieved successfully. ID: {data.get('id')}")
                self.log(f"   Score: {data.get('score', 0)}%")
                self.log(f"   Test Type: {data.get('test_type', 'N/A')}")
                
                # Verify result includes test questions with correct answers
                if 'test_questions' in data and data['test_questions']:
                    self.log(f"✅ Test result includes {len(data['test_questions'])} questions with correct answers")
                    
                    # Verify correct answers are included
                    for i, question in enumerate(data['test_questions']):
                        if 'correct_answer' not in question:
                            self.log(f"❌ Question {i+1} missing correct_answer in result", "ERROR")
                            return False
                    
                    self.log("✅ All questions include correct answers in result")
                    return True
                else:
                    self.log("❌ Test result missing test_questions array", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Get test result detail failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get test result detail error: {str(e)}", "ERROR")
            return False
    
    def test_get_test_result_detail_nonexistent(self):
        """Test GET /api/tests/results/{result_id} with non-existent result ID"""
        self.log("Testing GET /api/tests/results/{result_id} with non-existent result...")
        
        if not self.participant_token:
            self.log("❌ Missing participant token", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        fake_result_id = "non-existent-result-id-12345"
        
        try:
            response = self.session.get(f"{BASE_URL}/tests/results/{fake_result_id}", headers=headers)
            
            if response.status_code == 404:
                self.log("✅ Non-existent result correctly returned 404")
                return True
            else:
                self.log(f"❌ Expected 404 for non-existent result, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Non-existent result error: {str(e)}", "ERROR")
            return False
    
    def create_second_participant(self):
        """Create a second participant for testing access restrictions"""
        self.log("Creating second participant for access testing...")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        participant_data = {
            "email": "testparticipant2@example.com",
            "password": "participant123",
            "full_name": "Test Participant 2",
            "id_number": "PART002",
            "role": "participant",
            "location": "Test Location"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json=participant_data, headers=headers)
            
            if response.status_code == 200:
                self.log("✅ Second participant user created successfully")
                return True
            elif response.status_code == 400 and "User already exists" in response.text:
                self.log("✅ Second participant user already exists (expected from previous runs)")
                return True
            else:
                self.log(f"❌ Second participant creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Second participant creation error: {str(e)}", "ERROR")
            return False
    
    def login_second_participant(self):
        """Login as second participant"""
        self.log("Logging in as second participant...")
        
        login_data = {
            "email": "testparticipant2@example.com",
            "password": "participant123"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.second_participant_token = data['access_token']
                self.log(f"✅ Second participant login successful. User: {data['user']['full_name']}")
                return True
            else:
                self.log(f"❌ Second participant login failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Second participant login error: {str(e)}", "ERROR")
            return False
    
    def test_get_other_participant_result(self):
        """Test GET /api/tests/results/{result_id} as different participant (should fail with 403)"""
        self.log("Testing GET /api/tests/results/{result_id} as different participant (should fail)...")
        
        if not hasattr(self, 'second_participant_token') or not self.test_result_id:
            self.log("❌ Missing second participant token or test result ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.second_participant_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/tests/results/{self.test_result_id}", headers=headers)
            
            if response.status_code == 403:
                self.log("✅ Different participant access correctly returned 403 Forbidden")
                return True
            else:
                self.log(f"❌ Expected 403 for different participant, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Different participant result access error: {str(e)}", "ERROR")
            return False
    
    def test_completed_test_not_in_available(self):
        """Test that completed test no longer appears in available tests"""
        self.log("Testing that completed test no longer appears in available tests...")
        
        if not self.participant_token or not self.session_id:
            self.log("❌ Missing participant token or session ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/{self.session_id}/tests/available", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Available tests retrieved after completion. Count: {len(data)}")
                
                # Should have no pre-tests available now (completed)
                pre_tests = [t for t in data if t.get('test_type') == 'pre']
                if len(pre_tests) == 0:
                    self.log("✅ Completed pre-test correctly removed from available tests")
                    return True
                else:
                    self.log(f"❌ Found {len(pre_tests)} pre-test(s) still available after completion", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Get available tests after completion failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get available tests after completion error: {str(e)}", "ERROR")
            return False

    # ============ SESSION DELETE FUNCTIONALITY TESTS ============
    
    def create_session_delete_test_data(self):
        """Create test data for session delete functionality testing"""
        self.log("Creating test data for session delete functionality...")
        
        if not self.admin_token or not self.test_program_id:
            self.log("❌ Missing admin token or program ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Create a company for session delete testing
        company_data = {
            "name": "Session Delete Test Company"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/companies", json=company_data, headers=headers)
            
            if response.status_code == 200:
                self.session_delete_company_id = response.json()['id']
                self.log(f"✅ Session delete test company created. ID: {self.session_delete_company_id}")
            else:
                self.log(f"❌ Session delete company creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Session delete company creation error: {str(e)}", "ERROR")
            return False
        
        # Create a participant for session delete testing
        participant_data = {
            "email": "sessiondeletetest@example.com",
            "password": "participant123",
            "full_name": "Session Delete Test Participant",
            "id_number": "SDTP001",
            "role": "participant",
            "location": "Test Location"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json=participant_data, headers=headers)
            
            if response.status_code == 200:
                self.session_delete_participant_id = response.json()['id']
                self.log(f"✅ Session delete test participant created. ID: {self.session_delete_participant_id}")
                return True
            elif response.status_code == 400 and "User already exists" in response.text:
                # Get existing user ID
                login_data = {
                    "email": "sessiondeletetest@example.com",
                    "password": "participant123"
                }
                response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
                if response.status_code == 200:
                    self.session_delete_participant_id = response.json()['user']['id']
                    self.log(f"✅ Using existing session delete test participant. ID: {self.session_delete_participant_id}")
                    return True
                else:
                    self.log("❌ Failed to get existing participant ID", "ERROR")
                    return False
            else:
                self.log(f"❌ Session delete participant creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Session delete participant creation error: {str(e)}", "ERROR")
            return False
    
    def create_session_for_delete_test(self):
        """Create a session for delete testing"""
        self.log("Creating session for delete testing...")
        
        if not self.admin_token or not hasattr(self, 'session_delete_company_id') or not hasattr(self, 'session_delete_participant_id'):
            self.log("❌ Missing admin token, company ID, or participant ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        session_data = {
            "name": "Session Delete Test Session",
            "program_id": self.test_program_id,
            "company_id": self.session_delete_company_id,
            "location": "Test Location",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "participant_ids": [self.session_delete_participant_id]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/sessions", json=session_data, headers=headers)
            
            if response.status_code == 200:
                self.session_delete_test_id = response.json()['id']
                self.log(f"✅ Session for delete test created successfully. ID: {self.session_delete_test_id}")
                return True
            else:
                self.log(f"❌ Session for delete test creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Session for delete test creation error: {str(e)}", "ERROR")
            return False
    
    def verify_participant_access_created(self):
        """Verify that participant_access record was created when session was created"""
        self.log("Verifying participant_access record was created...")
        
        if not self.admin_token or not hasattr(self, 'session_delete_test_id') or not hasattr(self, 'session_delete_participant_id'):
            self.log("❌ Missing admin token, session ID, or participant ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            # Get session participants to verify participant_access exists
            response = self.session.get(f"{BASE_URL}/sessions/{self.session_delete_test_id}/participants", headers=headers)
            
            if response.status_code == 200:
                participants = response.json()
                self.log(f"✅ Retrieved session participants. Count: {len(participants)}")
                
                # Find our test participant
                test_participant = None
                for participant in participants:
                    if participant['user']['id'] == self.session_delete_participant_id:
                        test_participant = participant
                        break
                
                if test_participant and 'access' in test_participant:
                    self.log("✅ Participant_access record found for test participant")
                    self.log(f"   Access ID: {test_participant['access']['id']}")
                    return True
                else:
                    self.log("❌ Participant_access record not found for test participant", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Get session participants failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify participant_access error: {str(e)}", "ERROR")
            return False
    
    def test_delete_session_as_admin(self):
        """Test DELETE /api/sessions/{session_id} as admin"""
        self.log("Testing DELETE /api/sessions/{session_id} as admin...")
        
        if not self.admin_token or not hasattr(self, 'session_delete_test_id'):
            self.log("❌ Missing admin token or session ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = self.session.delete(f"{BASE_URL}/sessions/{self.session_delete_test_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Session deleted successfully. Message: {data.get('message', 'No message')}")
                return True
            else:
                self.log(f"❌ Session deletion failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Session deletion error: {str(e)}", "ERROR")
            return False
    
    def verify_session_deleted(self):
        """Verify the session was actually deleted"""
        self.log("Verifying session was deleted...")
        
        if not self.admin_token or not hasattr(self, 'session_delete_test_id'):
            self.log("❌ Missing admin token or session ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            # Try to get the deleted session
            response = self.session.get(f"{BASE_URL}/sessions", headers=headers)
            
            if response.status_code == 200:
                sessions = response.json()
                
                # Check if our deleted session is still in the list
                deleted_session = None
                for session in sessions:
                    if session['id'] == self.session_delete_test_id:
                        deleted_session = session
                        break
                
                if deleted_session is None:
                    self.log("✅ Session successfully deleted from database")
                    return True
                else:
                    self.log("❌ Session still exists in database after deletion", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Get sessions verification failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify session deleted error: {str(e)}", "ERROR")
            return False
    
    def verify_participant_access_deleted(self):
        """Verify that participant_access records were cascade deleted"""
        self.log("Verifying participant_access records were cascade deleted...")
        
        if not self.admin_token or not hasattr(self, 'session_delete_test_id') or not hasattr(self, 'session_delete_participant_id'):
            self.log("❌ Missing admin token, session ID, or participant ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            # Try to get participant access for the deleted session (should fail or return empty)
            response = self.session.get(f"{BASE_URL}/sessions/{self.session_delete_test_id}/participants", headers=headers)
            
            if response.status_code == 404:
                self.log("✅ Session participants endpoint returns 404 for deleted session (expected)")
                return True
            elif response.status_code == 200:
                participants = response.json()
                if len(participants) == 0:
                    self.log("✅ No participants found for deleted session (cascade delete worked)")
                    return True
                else:
                    self.log(f"❌ Found {len(participants)} participants for deleted session (cascade delete failed)", "ERROR")
                    return False
            else:
                self.log(f"❌ Unexpected response when checking deleted session participants: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify participant_access deleted error: {str(e)}", "ERROR")
            return False
    
    def test_delete_nonexistent_session(self):
        """Test DELETE /api/sessions/{session_id} with non-existent session ID"""
        self.log("Testing DELETE /api/sessions/{session_id} with non-existent session...")
        
        if not self.admin_token:
            self.log("❌ Missing admin token", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        fake_session_id = "non-existent-session-id-12345"
        
        try:
            response = self.session.delete(f"{BASE_URL}/sessions/{fake_session_id}", headers=headers)
            
            if response.status_code == 404:
                self.log("✅ Non-existent session deletion correctly returned 404")
                return True
            else:
                self.log(f"❌ Expected 404 for non-existent session, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Non-existent session deletion error: {str(e)}", "ERROR")
            return False
    
    def create_second_session_for_non_admin_test(self):
        """Create another session for non-admin delete test"""
        self.log("Creating second session for non-admin delete test...")
        
        if not self.admin_token or not hasattr(self, 'session_delete_company_id') or not hasattr(self, 'session_delete_participant_id'):
            self.log("❌ Missing admin token, company ID, or participant ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        session_data = {
            "name": "Second Session for Non-Admin Delete Test",
            "program_id": self.test_program_id,
            "company_id": self.session_delete_company_id,
            "location": "Test Location",
            "start_date": "2024-02-01",
            "end_date": "2024-02-28",
            "participant_ids": [self.session_delete_participant_id]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/sessions", json=session_data, headers=headers)
            
            if response.status_code == 200:
                self.second_session_delete_test_id = response.json()['id']
                self.log(f"✅ Second session for non-admin delete test created. ID: {self.second_session_delete_test_id}")
                return True
            else:
                self.log(f"❌ Second session creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Second session creation error: {str(e)}", "ERROR")
            return False
    
    def test_delete_session_as_participant(self):
        """Test DELETE /api/sessions/{session_id} as participant (should fail with 403)"""
        self.log("Testing DELETE /api/sessions/{session_id} as participant (should fail)...")
        
        if not self.participant_token or not hasattr(self, 'second_session_delete_test_id'):
            self.log("❌ Missing participant token or second session ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        
        try:
            response = self.session.delete(f"{BASE_URL}/sessions/{self.second_session_delete_test_id}", headers=headers)
            
            if response.status_code == 403:
                self.log("✅ Participant session deletion correctly returned 403 Forbidden")
                return True
            else:
                self.log(f"❌ Expected 403 for participant deletion, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Participant session deletion error: {str(e)}", "ERROR")
            return False

    # ============ CERTIFICATE PREVIEW FUNCTIONALITY TESTS ============
    
    def setup_certificate_test_data(self):
        """Setup test data for certificate preview testing"""
        self.log("Setting up certificate test data...")
        
        if not self.admin_token or not self.participant_token:
            self.log("❌ Missing admin or participant tokens", "ERROR")
            return False
        
        # Use existing test credentials from test_result.md
        admin_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Create a program for certificate testing
        program_data = {
            "name": "Certificate Preview Test Program",
            "description": "Program for testing certificate preview functionality",
            "pass_percentage": 70.0
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/programs", json=program_data, headers=admin_headers)
            if response.status_code == 200:
                self.cert_program_id = response.json()['id']
                self.log(f"✅ Certificate test program created. ID: {self.cert_program_id}")
            else:
                self.log(f"❌ Certificate program creation failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Certificate program creation error: {str(e)}", "ERROR")
            return False
        
        # Create a company for certificate testing
        company_data = {
            "name": "Certificate Test Company"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/companies", json=company_data, headers=admin_headers)
            if response.status_code == 200:
                self.cert_company_id = response.json()['id']
                self.log(f"✅ Certificate test company created. ID: {self.cert_company_id}")
            else:
                self.log(f"❌ Certificate company creation failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Certificate company creation error: {str(e)}", "ERROR")
            return False
        
        # Get participant ID
        participant_headers = {'Authorization': f'Bearer {self.participant_token}'}
        try:
            response = self.session.get(f"{BASE_URL}/auth/me", headers=participant_headers)
            if response.status_code == 200:
                self.cert_participant_id = response.json()['id']
                self.log(f"✅ Using participant ID: {self.cert_participant_id}")
            else:
                self.log(f"❌ Failed to get participant info: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error getting participant info: {str(e)}", "ERROR")
            return False
        
        # Create a session with the participant
        session_data = {
            "name": "Certificate Preview Test Session",
            "program_id": self.cert_program_id,
            "company_id": self.cert_company_id,
            "location": "Test Location",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
            "participant_ids": [self.cert_participant_id]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/sessions", json=session_data, headers=admin_headers)
            if response.status_code == 200:
                self.cert_session_id = response.json()['id']
                self.log(f"✅ Certificate test session created. ID: {self.cert_session_id}")
                return True
            else:
                self.log(f"❌ Certificate session creation failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Certificate session creation error: {str(e)}", "ERROR")
            return False
    
    def generate_test_certificate(self):
        """Generate a certificate for testing preview functionality"""
        self.log("Generating test certificate...")
        
        if not self.admin_token or not hasattr(self, 'cert_session_id') or not hasattr(self, 'cert_participant_id'):
            self.log("❌ Missing admin token, session ID, or participant ID", "ERROR")
            return False
        
        admin_headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # First, enable feedback access for the participant
        access_data = {
            "participant_id": self.cert_participant_id,
            "session_id": self.cert_session_id,
            "can_access_feedback": True
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/participant-access/update", json=access_data, headers=admin_headers)
            if response.status_code != 200:
                self.log(f"❌ Failed to enable feedback access: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Error enabling feedback access: {str(e)}", "ERROR")
            return False
        
        # Submit feedback as participant to enable certificate generation
        participant_headers = {'Authorization': f'Bearer {self.participant_token}'}
        feedback_data = {
            "session_id": self.cert_session_id,
            "program_id": self.cert_program_id,
            "responses": [
                {"question": "Overall Training Experience", "answer": 5},
                {"question": "Training Content Quality", "answer": 4},
                {"question": "Trainer Effectiveness", "answer": 5},
                {"question": "Venue & Facilities", "answer": 4},
                {"question": "Suggestions for Improvement", "answer": "Great course!"},
                {"question": "Additional Comments", "answer": "Very helpful training"}
            ]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/feedback/submit", json=feedback_data, headers=participant_headers)
            if response.status_code == 200:
                self.log("✅ Feedback submitted successfully")
            else:
                self.log(f"❌ Feedback submission failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Feedback submission error: {str(e)}", "ERROR")
            return False
        
        # Generate certificate
        try:
            response = self.session.post(f"{BASE_URL}/certificates/generate/{self.cert_session_id}/{self.cert_participant_id}", headers=admin_headers)
            if response.status_code == 200:
                cert_data = response.json()
                self.test_certificate_id = cert_data['certificate_id']
                self.log(f"✅ Test certificate generated. ID: {self.test_certificate_id}")
                return True
            else:
                self.log(f"❌ Certificate generation failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Certificate generation error: {str(e)}", "ERROR")
            return False
    
    def test_certificate_preview_without_auth(self):
        """Test certificate preview without authentication (should return 401)"""
        self.log("Testing certificate preview without authentication (should fail)...")
        
        if not hasattr(self, 'test_certificate_id'):
            self.log("❌ Missing test certificate ID", "ERROR")
            return False
        
        try:
            # No Authorization header
            response = self.session.get(f"{BASE_URL}/certificates/preview/{self.test_certificate_id}")
            
            if response.status_code == 403:  # FastAPI returns 403 for missing auth
                self.log("✅ Unauthenticated certificate preview correctly returned 403")
                return True
            else:
                self.log(f"❌ Expected 403 for unauthenticated request, got: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Unauthenticated certificate preview error: {str(e)}", "ERROR")
            return False
    
    def test_certificate_preview_as_participant_owner(self):
        """Test certificate preview as the participant who owns the certificate (should return 200)"""
        self.log("Testing certificate preview as participant owner...")
        
        if not self.participant_token or not hasattr(self, 'test_certificate_id'):
            self.log("❌ Missing participant token or certificate ID", "ERROR")
            return False
        
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/certificates/preview/{self.test_certificate_id}", headers=headers)
            
            if response.status_code == 200:
                self.log("✅ Participant owner certificate preview successful")
                
                # Verify response headers
                content_type = response.headers.get('content-type', '')
                content_disposition = response.headers.get('content-disposition', '')
                
                if 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type:
                    self.log("✅ Correct media type returned")
                else:
                    self.log(f"❌ Incorrect media type: {content_type}", "ERROR")
                    return False
                
                if 'inline' in content_disposition:
                    self.log("✅ Content-Disposition header includes 'inline'")
                else:
                    self.log(f"❌ Content-Disposition missing 'inline': {content_disposition}", "ERROR")
                    return False
                
                # Verify file content exists
                if len(response.content) > 0:
                    self.log(f"✅ Certificate file content received ({len(response.content)} bytes)")
                    return True
                else:
                    self.log("❌ Empty certificate file content", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Participant certificate preview failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Participant certificate preview error: {str(e)}", "ERROR")
            return False
    
    def test_certificate_preview_as_admin(self):
        """Test certificate preview as admin (should return 200)"""
        self.log("Testing certificate preview as admin...")
        
        if not self.admin_token or not hasattr(self, 'test_certificate_id'):
            self.log("❌ Missing admin token or certificate ID", "ERROR")
            return False
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/certificates/preview/{self.test_certificate_id}", headers=headers)
            
            if response.status_code == 200:
                self.log("✅ Admin certificate preview successful")
                
                # Verify response headers
                content_type = response.headers.get('content-type', '')
                content_disposition = response.headers.get('content-disposition', '')
                
                if 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type:
                    self.log("✅ Correct media type returned")
                else:
                    self.log(f"❌ Incorrect media type: {content_type}", "ERROR")
                    return False
                
                if 'inline' in content_disposition:
                    self.log("✅ Content-Disposition header includes 'inline'")
                    return True
                else:
                    self.log(f"❌ Content-Disposition missing 'inline': {content_disposition}", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Admin certificate preview failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin certificate preview error: {str(e)}", "ERROR")
            return False
    
    def test_certificate_preview_as_different_participant(self):
        """Test certificate preview as different participant (should return 403)"""
        self.log("Testing certificate preview as different participant (should fail)...")
        
        if not hasattr(self, 'second_participant_token') or not hasattr(self, 'test_certificate_id'):
            self.log("❌ Missing second participant token or certificate ID", "ERROR")
            return False
        
        headers = {'Authorization': f'Bearer {self.second_participant_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/certificates/preview/{self.test_certificate_id}", headers=headers)
            
            if response.status_code == 403:
                self.log("✅ Different participant certificate preview correctly returned 403 Forbidden")
                return True
            else:
                self.log(f"❌ Expected 403 for different participant, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Different participant certificate preview error: {str(e)}", "ERROR")
            return False
    
    def test_certificate_preview_nonexistent_certificate(self):
        """Test certificate preview with non-existent certificate ID (should return 404)"""
        self.log("Testing certificate preview with non-existent certificate...")
        
        if not self.participant_token:
            self.log("❌ Missing participant token", "ERROR")
            return False
        
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        fake_certificate_id = "non-existent-certificate-id-12345"
        
        try:
            response = self.session.get(f"{BASE_URL}/certificates/preview/{fake_certificate_id}", headers=headers)
            
            if response.status_code == 404:
                self.log("✅ Non-existent certificate preview correctly returned 404")
                return True
            else:
                self.log(f"❌ Expected 404 for non-existent certificate, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Non-existent certificate preview error: {str(e)}", "ERROR")
            return False
    
    def test_certificate_preview_invalid_format(self):
        """Test certificate preview with invalid certificate ID format"""
        self.log("Testing certificate preview with invalid certificate ID format...")
        
        if not self.participant_token:
            self.log("❌ Missing participant token", "ERROR")
            return False
        
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        invalid_certificate_id = "invalid-format-123!@#"
        
        try:
            response = self.session.get(f"{BASE_URL}/certificates/preview/{invalid_certificate_id}", headers=headers)
            
            if response.status_code == 404:
                self.log("✅ Invalid certificate ID format correctly returned 404")
                return True
            else:
                self.log(f"❌ Expected 404 for invalid certificate ID, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Invalid certificate ID preview error: {str(e)}", "ERROR")
            return False
    
    def cleanup(self):
        """Clean up created test data"""
        self.log("Cleaning up test data...")
        
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            
            # Delete remaining sessions
            if hasattr(self, 'second_session_delete_test_id'):
                try:
                    response = self.session.delete(f"{BASE_URL}/sessions/{self.second_session_delete_test_id}", headers=headers)
                    if response.status_code == 200:
                        self.log(f"✅ Cleaned up second session: {self.second_session_delete_test_id}")
                    else:
                        self.log(f"⚠️  Failed to cleanup second session: {response.status_code}", "WARNING")
                except Exception as e:
                    self.log(f"⚠️  Error cleaning up second session: {str(e)}", "WARNING")
            
            if hasattr(self, 'session_id'):
                try:
                    response = self.session.delete(f"{BASE_URL}/sessions/{self.session_id}", headers=headers)
                    if response.status_code == 200:
                        self.log(f"✅ Cleaned up session: {self.session_id}")
                    else:
                        self.log(f"⚠️  Failed to cleanup session: {response.status_code}", "WARNING")
                except Exception as e:
                    self.log(f"⚠️  Error cleaning up session: {str(e)}", "WARNING")
            
            # Delete remaining tests
            for test_id in self.created_test_ids:
                try:
                    response = self.session.delete(f"{BASE_URL}/tests/{test_id}", headers=headers)
                    if response.status_code == 200:
                        self.log(f"✅ Cleaned up test: {test_id}")
                    else:
                        self.log(f"⚠️  Failed to cleanup test {test_id}: {response.status_code}", "WARNING")
                except Exception as e:
                    self.log(f"⚠️  Error cleaning up test {test_id}: {str(e)}", "WARNING")
            
            # Delete test program
            if self.test_program_id:
                try:
                    response = self.session.delete(f"{BASE_URL}/programs/{self.test_program_id}", headers=headers)
                    if response.status_code == 200:
                        self.log(f"✅ Cleaned up program: {self.test_program_id}")
                    else:
                        self.log(f"⚠️  Failed to cleanup program: {response.status_code}", "WARNING")
                except Exception as e:
                    self.log(f"⚠️  Error cleaning up program: {str(e)}", "WARNING")
    
    def run_all_tests(self):
        """Run certificate preview endpoint tests"""
        self.log("=" * 80)
        self.log("STARTING CERTIFICATE PREVIEW ENDPOINT TESTING")
        self.log("=" * 80)
        
        test_results = []
        
        # Test sequence for certificate preview functionality
        tests = [
            # Setup and authentication
            ("Admin Login", self.login_admin),
            ("Create Participant User", self.test_create_participant_user),
            ("Participant Login", self.login_participant),
            ("Create Second Participant", self.create_second_participant),
            ("Login Second Participant", self.login_second_participant),
            
            # Certificate preview tests
            ("Setup Certificate Test Data", self.setup_certificate_test_data),
            ("Generate Test Certificate", self.generate_test_certificate),
            ("Certificate Preview Without Auth (403)", self.test_certificate_preview_without_auth),
            ("Certificate Preview as Participant Owner (200)", self.test_certificate_preview_as_participant_owner),
            ("Certificate Preview as Admin (200)", self.test_certificate_preview_as_admin),
            ("Certificate Preview as Different Participant (403)", self.test_certificate_preview_as_different_participant),
            ("Certificate Preview Non-existent Certificate (404)", self.test_certificate_preview_nonexistent_certificate),
            ("Certificate Preview Invalid Format (404)", self.test_certificate_preview_invalid_format),
        ]
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running: {test_name} ---")
            try:
                result = test_func()
                test_results.append((test_name, result))
                if not result:
                    self.log(f"❌ {test_name} FAILED", "ERROR")
                else:
                    self.log(f"✅ {test_name} PASSED")
            except Exception as e:
                self.log(f"❌ {test_name} ERROR: {str(e)}", "ERROR")
                test_results.append((test_name, False))
        
        # Cleanup
        self.log(f"\n--- Cleanup ---")
        self.cleanup()
        
        # Summary
        self.log("\n" + "=" * 80)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 80)
        
        passed = sum(1 for _, result in test_results if result)
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} - {test_name}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED! Test management endpoints are working correctly.")
            return True
        else:
            self.log(f"⚠️  {total - passed} tests failed. Please review the failures above.")
            return False

def main():
    """Main function to run the test suite"""
    runner = TestRunner()
    success = runner.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()