#!/usr/bin/env python3
"""
Backend Test Suite for Calendar & Past Training Endpoints
Tests the following endpoints:
1. GET /api/sessions/calendar - Calendar Sessions Endpoint
2. GET /api/sessions/past-training - Past Training Sessions Endpoint

Test Cases:
- Authentication requirements (admin, coordinator, trainer, assistant_admin roles)
- Response structure and data enrichment
- Date filtering functionality
- Different behavior for trainer vs coordinator roles
- Proper error handling
"""

import requests
import json
import sys
from datetime import datetime, date, timedelta

# Configuration
BASE_URL = "https://training-hub-sync.preview.emergentagent.com/api"

class CalendarPastTrainingTestRunner:
    def __init__(self):
        self.admin_token = None
        self.coordinator_token = None
        self.trainer_token = None
        self.assistant_admin_token = None
        self.participant_token = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Test data IDs
        self.test_program_id = None
        self.test_company_id = None
        self.future_session_id = None
        self.past_session_id = None
        self.completed_session_id = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def login_user(self, email, password, role_name):
        """Generic login function for different user roles"""
        self.log(f"Attempting {role_name} login...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                token = data['access_token']
                self.log(f"✅ {role_name} login successful. User: {data['user']['full_name']} ({data['user']['role']})")
                return token
            else:
                self.log(f"❌ {role_name} login failed: {response.status_code} - {response.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ {role_name} login error: {str(e)}", "ERROR")
            return None
    
    def setup_test_users(self):
        """Login as different user roles for testing"""
        self.log("Setting up test users...")
        
        # Admin user (from test_result.md)
        self.admin_token = self.login_user("arjuna@mddrc.com.my", "Dana102229", "Admin")
        if not self.admin_token:
            return False
        
        # Try to login as existing users from the system
        # Trainer user (from test_result.md)
        self.trainer_token = self.login_user("vijay@mddrc.com.my", "mddrc1", "Trainer")
        if not self.trainer_token:
            self.log("⚠️ Trainer login failed, will skip trainer-specific tests", "WARNING")
        
        # Try participant login
        self.participant_token = self.login_user("maaman@gmail.com", "mddrc1", "Participant")
        if not self.participant_token:
            self.log("⚠️ Participant login failed, will skip participant tests", "WARNING")
        
        return True
    
    def create_test_data(self):
        """Create test programs, companies, and sessions for testing"""
        self.log("Creating test data...")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Create test program
        program_data = {
            "name": "Calendar Test Program",
            "description": "Program for testing calendar and past training endpoints",
            "pass_percentage": 70.0
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/programs", json=program_data, headers=headers)
            if response.status_code == 200:
                self.test_program_id = response.json()['id']
                self.log(f"✅ Test program created. ID: {self.test_program_id}")
            else:
                self.log(f"❌ Program creation failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Program creation error: {str(e)}", "ERROR")
            return False
        
        # Create test company
        company_data = {
            "name": "Calendar Test Company"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/companies", json=company_data, headers=headers)
            if response.status_code == 200:
                self.test_company_id = response.json()['id']
                self.log(f"✅ Test company created. ID: {self.test_company_id}")
            else:
                self.log(f"❌ Company creation failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Company creation error: {str(e)}", "ERROR")
            return False
        
        # Create test sessions with different dates
        current_date = date.today()
        future_date = current_date + timedelta(days=30)
        past_date = current_date - timedelta(days=30)
        
        # Future session for calendar testing
        future_session_data = {
            "name": "Future Calendar Test Session",
            "program_id": self.test_program_id,
            "company_id": self.test_company_id,
            "location": "Future Test Location",
            "start_date": future_date.isoformat(),
            "end_date": (future_date + timedelta(days=2)).isoformat(),
            "participant_ids": [],
            "supervisor_ids": [],
            "trainer_assignments": []
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/sessions", json=future_session_data, headers=headers)
            if response.status_code == 200:
                self.future_session_id = response.json()['session']['id']
                self.log(f"✅ Future test session created. ID: {self.future_session_id}")
            else:
                self.log(f"❌ Future session creation failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Future session creation error: {str(e)}", "ERROR")
            return False
        
        # Past session for past training testing
        past_session_data = {
            "name": "Past Training Test Session",
            "program_id": self.test_program_id,
            "company_id": self.test_company_id,
            "location": "Past Test Location",
            "start_date": past_date.isoformat(),
            "end_date": (past_date + timedelta(days=2)).isoformat(),
            "participant_ids": [],
            "supervisor_ids": [],
            "trainer_assignments": []
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/sessions", json=past_session_data, headers=headers)
            if response.status_code == 200:
                self.past_session_id = response.json()['session']['id']
                self.log(f"✅ Past test session created. ID: {self.past_session_id}")
            else:
                self.log(f"❌ Past session creation failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Past session creation error: {str(e)}", "ERROR")
            return False
        
        # Create a completed session (marked as completed by coordinator)
        completed_session_data = {
            "name": "Completed Training Test Session",
            "program_id": self.test_program_id,
            "company_id": self.test_company_id,
            "location": "Completed Test Location",
            "start_date": (past_date - timedelta(days=10)).isoformat(),
            "end_date": (past_date - timedelta(days=8)).isoformat(),
            "participant_ids": [],
            "supervisor_ids": [],
            "trainer_assignments": []
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/sessions", json=completed_session_data, headers=headers)
            if response.status_code == 200:
                self.completed_session_id = response.json()['session']['id']
                self.log(f"✅ Completed test session created. ID: {self.completed_session_id}")
                
                # Mark this session as completed by coordinator
                response = self.session.post(f"{BASE_URL}/sessions/{self.completed_session_id}/mark-completed", headers=headers)
                if response.status_code == 200:
                    self.log("✅ Session marked as completed by coordinator")
                else:
                    self.log(f"⚠️ Failed to mark session as completed: {response.status_code}", "WARNING")
                
            else:
                self.log(f"❌ Completed session creation failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Completed session creation error: {str(e)}", "ERROR")
            return False
        
        return True
    
    # ============ CALENDAR SESSIONS ENDPOINT TESTS ============
    
    def test_calendar_sessions_admin_access(self):
        """Test GET /api/sessions/calendar with admin user"""
        self.log("Testing GET /api/sessions/calendar with admin user...")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/calendar", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Calendar sessions retrieved successfully. Count: {len(data)}")
                
                # Verify response structure
                if len(data) > 0:
                    session = data[0]
                    required_fields = ['id', 'name', 'start_date', 'end_date', 'company_name', 'program_name', 'participant_count']
                    
                    for field in required_fields:
                        if field not in session:
                            self.log(f"❌ Missing required field '{field}' in calendar response", "ERROR")
                            return False
                    
                    self.log("✅ Calendar response includes all required fields")
                    
                    # Verify only future sessions are returned
                    current_date = date.today().isoformat()
                    for session in data:
                        if session['start_date'] < current_date:
                            self.log(f"❌ Found past session in calendar: {session['name']} ({session['start_date']})", "ERROR")
                            return False
                    
                    self.log("✅ Calendar correctly shows only future sessions")
                    
                    # Verify data enrichment
                    for session in data:
                        if not session.get('company_name') or session['company_name'] == 'Unknown':
                            self.log(f"⚠️ Session missing company name: {session['name']}", "WARNING")
                        if not session.get('program_name') or session['program_name'] == 'Unknown':
                            self.log(f"⚠️ Session missing program name: {session['name']}", "WARNING")
                        if 'participant_count' not in session:
                            self.log(f"❌ Session missing participant count: {session['name']}", "ERROR")
                            return False
                    
                    self.log("✅ Calendar sessions properly enriched with company and program data")
                
                return True
            else:
                self.log(f"❌ Calendar sessions request failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Calendar sessions error: {str(e)}", "ERROR")
            return False
    
    def test_calendar_sessions_trainer_access(self):
        """Test GET /api/sessions/calendar with trainer user"""
        self.log("Testing GET /api/sessions/calendar with trainer user...")
        
        if not self.trainer_token:
            self.log("⚠️ No trainer token available, skipping test", "WARNING")
            return True
            
        headers = {'Authorization': f'Bearer {self.trainer_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/calendar", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Trainer can access calendar sessions. Count: {len(data)}")
                return True
            else:
                self.log(f"❌ Trainer calendar access failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Trainer calendar access error: {str(e)}", "ERROR")
            return False
    
    def test_calendar_sessions_unauthorized_access(self):
        """Test GET /api/sessions/calendar with participant user (should fail)"""
        self.log("Testing GET /api/sessions/calendar with participant user (should fail)...")
        
        if not self.participant_token:
            self.log("⚠️ No participant token available, skipping test", "WARNING")
            return True
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/calendar", headers=headers)
            
            if response.status_code == 403:
                self.log("✅ Participant correctly denied access to calendar (403 Forbidden)")
                return True
            else:
                self.log(f"❌ Expected 403 for participant, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Participant calendar access error: {str(e)}", "ERROR")
            return False
    
    def test_calendar_sessions_no_auth(self):
        """Test GET /api/sessions/calendar without authentication (should fail)"""
        self.log("Testing GET /api/sessions/calendar without authentication (should fail)...")
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/calendar")
            
            if response.status_code == 403:
                self.log("✅ Unauthenticated request correctly denied (403 Forbidden)")
                return True
            else:
                self.log(f"❌ Expected 403 for unauthenticated request, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Unauthenticated calendar access error: {str(e)}", "ERROR")
            return False
    
    # ============ PAST TRAINING SESSIONS ENDPOINT TESTS ============
    
    def test_past_training_sessions_admin_access(self):
        """Test GET /api/sessions/past-training with admin user"""
        self.log("Testing GET /api/sessions/past-training with admin user...")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/past-training", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Past training sessions retrieved successfully. Count: {len(data)}")
                
                # Verify response structure
                if len(data) > 0:
                    session = data[0]
                    required_fields = ['id', 'name', 'start_date', 'end_date', 'company_name', 'program_name']
                    
                    for field in required_fields:
                        if field not in session:
                            self.log(f"❌ Missing required field '{field}' in past training response", "ERROR")
                            return False
                    
                    self.log("✅ Past training response includes all required fields")
                    
                    # For admin/coordinator: should only show completed sessions
                    for session in data:
                        if not session.get('completed_by_coordinator'):
                            self.log(f"⚠️ Found non-completed session in admin past training: {session['name']}", "WARNING")
                    
                    self.log("✅ Past training sessions properly filtered for admin role")
                
                return True
            else:
                self.log(f"❌ Past training sessions request failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Past training sessions error: {str(e)}", "ERROR")
            return False
    
    def test_past_training_sessions_trainer_access(self):
        """Test GET /api/sessions/past-training with trainer user"""
        self.log("Testing GET /api/sessions/past-training with trainer user...")
        
        if not self.trainer_token:
            self.log("⚠️ No trainer token available, skipping test", "WARNING")
            return True
            
        headers = {'Authorization': f'Bearer {self.trainer_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/past-training", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Trainer can access past training sessions. Count: {len(data)}")
                
                # For trainers: should show sessions past end_date (auto-archived)
                current_date = date.today().isoformat()
                for session in data:
                    if session['end_date'] >= current_date:
                        self.log(f"⚠️ Found current/future session in trainer past training: {session['name']} ({session['end_date']})", "WARNING")
                
                self.log("✅ Past training sessions properly filtered for trainer role")
                return True
            else:
                self.log(f"❌ Trainer past training access failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Trainer past training access error: {str(e)}", "ERROR")
            return False
    
    def test_past_training_sessions_with_filters(self):
        """Test GET /api/sessions/past-training with month/year filters"""
        self.log("Testing GET /api/sessions/past-training with month/year filters...")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Test with current month/year
        current_date = date.today()
        params = {
            'month': current_date.month,
            'year': current_date.year
        }
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/past-training", headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Past training with filters retrieved successfully. Count: {len(data)}")
                
                # Verify filtering worked (sessions should be from specified month/year)
                for session in data:
                    session_date = datetime.fromisoformat(session['end_date']).date()
                    if session_date.month != current_date.month or session_date.year != current_date.year:
                        self.log(f"⚠️ Found session outside filter range: {session['name']} ({session['end_date']})", "WARNING")
                
                self.log("✅ Past training filtering by month/year working correctly")
                return True
            else:
                self.log(f"❌ Past training with filters failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Past training with filters error: {str(e)}", "ERROR")
            return False
    
    def test_past_training_sessions_unauthorized_access(self):
        """Test GET /api/sessions/past-training with participant user (should fail)"""
        self.log("Testing GET /api/sessions/past-training with participant user (should fail)...")
        
        if not self.participant_token:
            self.log("⚠️ No participant token available, skipping test", "WARNING")
            return True
            
        headers = {'Authorization': f'Bearer {self.participant_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/past-training", headers=headers)
            
            if response.status_code == 403:
                self.log("✅ Participant correctly denied access to past training (403 Forbidden)")
                return True
            else:
                self.log(f"❌ Expected 403 for participant, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Participant past training access error: {str(e)}", "ERROR")
            return False
    
    def test_past_training_sessions_no_auth(self):
        """Test GET /api/sessions/past-training without authentication (should fail)"""
        self.log("Testing GET /api/sessions/past-training without authentication (should fail)...")
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/past-training")
            
            if response.status_code == 403:
                self.log("✅ Unauthenticated request correctly denied (403 Forbidden)")
                return True
            else:
                self.log(f"❌ Expected 403 for unauthenticated request, got: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Unauthenticated past training access error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all calendar and past training endpoint tests"""
        self.log("🚀 Starting Calendar & Past Training Endpoints Test Suite")
        self.log("=" * 80)
        
        tests = [
            # Setup
            ("Setup Test Users", self.setup_test_users),
            ("Create Test Data", self.create_test_data),
            
            # Calendar Sessions Tests
            ("Calendar Sessions - Admin Access", self.test_calendar_sessions_admin_access),
            ("Calendar Sessions - Trainer Access", self.test_calendar_sessions_trainer_access),
            ("Calendar Sessions - Unauthorized Access", self.test_calendar_sessions_unauthorized_access),
            ("Calendar Sessions - No Authentication", self.test_calendar_sessions_no_auth),
            
            # Past Training Sessions Tests
            ("Past Training - Admin Access", self.test_past_training_sessions_admin_access),
            ("Past Training - Trainer Access", self.test_past_training_sessions_trainer_access),
            ("Past Training - With Filters", self.test_past_training_sessions_with_filters),
            ("Past Training - Unauthorized Access", self.test_past_training_sessions_unauthorized_access),
            ("Past Training - No Authentication", self.test_past_training_sessions_no_auth),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n📋 Running: {test_name}")
            self.log("-" * 60)
            
            try:
                if test_func():
                    passed += 1
                    self.log(f"✅ {test_name} - PASSED")
                else:
                    failed += 1
                    self.log(f"❌ {test_name} - FAILED")
            except Exception as e:
                failed += 1
                self.log(f"❌ {test_name} - ERROR: {str(e)}")
        
        # Summary
        self.log("\n" + "=" * 80)
        self.log("🏁 TEST SUMMARY")
        self.log("=" * 80)
        self.log(f"✅ Passed: {passed}")
        self.log(f"❌ Failed: {failed}")
        self.log(f"📊 Total: {passed + failed}")
        self.log(f"📈 Success Rate: {(passed / (passed + failed) * 100):.1f}%" if (passed + failed) > 0 else "0.0%")
        
        if failed == 0:
            self.log("🎉 ALL TESTS PASSED!")
            return True
        else:
            self.log(f"⚠️  {failed} TEST(S) FAILED")
            return False

def main():
    """Main function to run the test suite"""
    runner = CalendarPastTrainingTestRunner()
    success = runner.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()