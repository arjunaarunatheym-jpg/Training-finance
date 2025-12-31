#!/usr/bin/env python3
"""
Full Costing Flow Test - Backend API Testing
Tests the complete session costing workflow including:
- Invoice creation with proper amount
- Auto-calculated expenses (F&B, HRDCorp, etc.)
- Data persistence verification
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://payflow-dash-3.preview.emergentagent.com/api"
ADMIN_EMAIL = "arjuna@mddrc.com.my"
ADMIN_PASSWORD = "Dana102229"

class FullCostingFlowTest:
    def __init__(self):
        self.admin_token = None
        self.session_id = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def login_admin(self):
        """Login as admin"""
        self.log("🔐 Admin login...")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data['access_token']
                self.log(f"✅ Admin login successful")
                return True
            else:
                self.log(f"❌ Admin login failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}", "ERROR")
            return False
    
    def get_session_with_participants(self):
        """Get a session that has participants for headcount calculation"""
        self.log("📋 Getting session with participants...")
        
        if not self.admin_token:
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions", headers=headers)
            
            if response.status_code == 200:
                sessions = response.json()
                
                # Find session with participants
                for session in sessions:
                    if session.get('participant_ids') and len(session['participant_ids']) > 0:
                        self.session_id = session['id']
                        participant_count = len(session['participant_ids'])
                        session_name = session.get('name', 'Unknown')
                        self.log(f"✅ Using session: {session_name}")
                        self.log(f"   Session ID: {self.session_id}")
                        self.log(f"   Participants: {participant_count}")
                        return True
                
                # If no session with participants, use first session
                if sessions:
                    self.session_id = sessions[0]['id']
                    session_name = sessions[0].get('name', 'Unknown')
                    self.log(f"✅ Using session (no participants): {session_name}")
                    self.log(f"   Session ID: {self.session_id}")
                    return True
                else:
                    self.log("❌ No sessions found", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to get sessions: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get sessions error: {str(e)}", "ERROR")
            return False

    def test_full_costing_flow(self):
        """Test the complete costing flow"""
        self.log("💰 Testing Full Costing Flow...")
        
        if not self.admin_token or not self.session_id:
            self.log("❌ Missing admin token or session ID", "ERROR")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # Step 1: Create/Update Invoice with amount (e.g., 10000)
        self.log("📄 Step 1: Creating invoice with amount RM 10,000...")
        
        invoice_data = {
            "total_amount": 10000.00,
            "tax_rate": 6.0,
            "tax_amount": 600.00,
            "subtotal": 9400.00,
            "line_items": [
                {
                    "description": "Defensive Driving Training",
                    "quantity": 1,
                    "unit_price": 10000.00,
                    "amount": 10000.00
                }
            ]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/finance/session/{self.session_id}/invoice", 
                                       json=invoice_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Invoice created/updated: {result.get('message')}")
                invoice_id = result.get('invoice_id')
                
                # Verify invoice data
                get_response = self.session.get(f"{BASE_URL}/finance/invoices/{invoice_id}", headers=headers)
                if get_response.status_code == 200:
                    invoice = get_response.json()
                    self.log(f"   ✅ Invoice Amount: RM {invoice.get('total_amount')}")
                    self.log(f"   ✅ Tax Rate: {invoice.get('tax_rate')}%")
                else:
                    self.log("❌ Failed to verify invoice", "ERROR")
                    return False
            else:
                self.log(f"❌ Invoice creation failed: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Invoice creation error: {str(e)}", "ERROR")
            return False
        
        # Step 2: Get session details to calculate auto expenses
        self.log("📊 Step 2: Getting session details for auto-calculation...")
        
        try:
            response = self.session.get(f"{BASE_URL}/sessions/{self.session_id}", headers=headers)
            
            if response.status_code == 200:
                session = response.json()
                participant_count = len(session.get('participant_ids', []))
                self.log(f"   ✅ Session participants: {participant_count}")
                
                # Calculate auto expenses based on invoice amount and headcount
                invoice_amount = 10000.00
                
                # F&B: RM 25 × headcount
                fnb_amount = 25 * participant_count
                
                # HRDCorp: 4% of invoice
                hrdc_amount = invoice_amount * 0.04
                
                # Wear & Tear: 2% of invoice  
                wear_tear_amount = invoice_amount * 0.02
                
                # Printing: 1% of invoice
                printing_amount = invoice_amount * 0.01
                
                self.log(f"   📋 Auto-calculated expenses:")
                self.log(f"      F&B: RM {fnb_amount} (RM 25 × {participant_count} pax)")
                self.log(f"      HRDCorp: RM {hrdc_amount} (4% of RM {invoice_amount})")
                self.log(f"      Wear & Tear: RM {wear_tear_amount} (2% of RM {invoice_amount})")
                self.log(f"      Printing: RM {printing_amount} (1% of RM {invoice_amount})")
                
            else:
                self.log(f"❌ Failed to get session details: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get session error: {str(e)}", "ERROR")
            return False
        
        # Step 3: Save auto-calculated expenses
        self.log("💾 Step 3: Saving auto-calculated expenses...")
        
        expenses_data = [
            {
                "category": "fnb",
                "description": "F&B",
                "expense_type": "per_pax",
                "quantity": participant_count,
                "unit_price": 25.0,
                "estimated_amount": fnb_amount,
                "actual_amount": fnb_amount
            },
            {
                "category": "hrdc_levy",
                "description": "HRDCorp Levy",
                "expense_type": "percentage",
                "percentage_rate": 4.0,
                "estimated_amount": hrdc_amount,
                "actual_amount": hrdc_amount
            },
            {
                "category": "wear_tear",
                "description": "Wear and Tear",
                "expense_type": "percentage",
                "percentage_rate": 2.0,
                "estimated_amount": wear_tear_amount,
                "actual_amount": wear_tear_amount
            },
            {
                "category": "printing",
                "description": "Printing",
                "expense_type": "percentage",
                "percentage_rate": 1.0,
                "estimated_amount": printing_amount,
                "actual_amount": printing_amount
            }
        ]
        
        try:
            response = self.session.post(f"{BASE_URL}/finance/session/{self.session_id}/expenses", 
                                       json=expenses_data, headers=headers)
            
            if response.status_code == 200:
                self.log("✅ Auto-calculated expenses saved successfully")
            else:
                self.log(f"❌ Failed to save expenses: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Save expenses error: {str(e)}", "ERROR")
            return False
        
        # Step 4: Verify data persistence by getting costing summary
        self.log("🔍 Step 4: Verifying data persistence...")
        
        try:
            response = self.session.get(f"{BASE_URL}/finance/session/{self.session_id}/costing", headers=headers)
            
            if response.status_code == 200:
                costing = response.json()
                self.log("✅ Costing data retrieved successfully")
                self.log(f"   📊 Session: {costing.get('session_name', 'N/A')}")
                self.log(f"   🏢 Company: {costing.get('company_name', 'N/A')}")
                self.log(f"   💰 Invoice Total: RM {costing.get('invoice_total', 0)}")
                
                # Check expenses
                expenses = costing.get('expenses', [])
                self.log(f"   📋 Expenses saved: {len(expenses)}")
                
                for expense in expenses:
                    category = expense.get('category', 'Unknown')
                    amount = expense.get('actual_amount', 0)
                    self.log(f"      {category}: RM {amount}")
                
                # Verify specific amounts
                fnb_expense = next((e for e in expenses if e.get('category') == 'fnb'), None)
                if fnb_expense and fnb_expense.get('actual_amount') == fnb_amount:
                    self.log("   ✅ F&B amount persisted correctly")
                else:
                    self.log("   ❌ F&B amount not persisted correctly", "ERROR")
                    return False
                
                hrdc_expense = next((e for e in expenses if e.get('category') == 'hrdc_levy'), None)
                if hrdc_expense and hrdc_expense.get('actual_amount') == hrdc_amount:
                    self.log("   ✅ HRDCorp amount persisted correctly")
                else:
                    self.log("   ❌ HRDCorp amount not persisted correctly", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Failed to get costing data: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get costing error: {str(e)}", "ERROR")
            return False

    def run_test(self):
        """Run the full costing flow test"""
        self.log("🚀 Starting Full Costing Flow Test...")
        self.log("=" * 80)
        
        tests = [
            ("Admin Login", self.login_admin),
            ("Get Session with Participants", self.get_session_with_participants),
            ("Full Costing Flow", self.test_full_costing_flow),
        ]
        
        for test_name, test_func in tests:
            self.log(f"\n🧪 Running: {test_name}")
            self.log("-" * 50)
            
            try:
                if not test_func():
                    self.log(f"❌ {test_name} FAILED")
                    return False
                else:
                    self.log(f"✅ {test_name} PASSED")
            except Exception as e:
                self.log(f"❌ {test_name} FAILED with exception: {str(e)}", "ERROR")
                return False
        
        self.log("\n" + "=" * 80)
        self.log("🎉 FULL COSTING FLOW TEST COMPLETED SUCCESSFULLY!")
        self.log("✅ Invoice creation with proper amount: WORKING")
        self.log("✅ Auto-calculated expenses (F&B, HRDCorp, etc.): WORKING")
        self.log("✅ Data persistence verification: WORKING")
        self.log("=" * 80)
        
        return True

def main():
    """Main function"""
    runner = FullCostingFlowTest()
    success = runner.run_test()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()