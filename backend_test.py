import requests
import sys
import json
from datetime import datetime, timezone

class XSELLAPITester:
    def __init__(self, base_url="https://enterprisehub-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No error details')}"
                except:
                    details += f" - Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health"""
        return self.run_test("API Health Check", "GET", "", 200)

    def test_register_user(self):
        """Test user registration"""
        user_data = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User"
        }
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, user_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_login_existing_user(self):
        """Test login with existing credentials"""
        login_data = {
            "email": "admin@xsell.com",
            "password": "admin123"
        }
        success, response = self.run_test("Login Existing User", "POST", "auth/login", 200, login_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_get_current_user(self):
        """Test get current user info"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_clientes_crud(self):
        """Test clients CRUD operations"""
        # Create client
        client_data = {
            "codigo": f"CLI{datetime.now().strftime('%H%M%S')}",
            "cnpj": "12.345.678/0001-90",
            "nome": "Test Client",
            "razao_social": "Test Client LTDA",
            "nome_fantasia": "Test Client",
            "endereco": "Rua Test, 123",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567"
        }
        
        success, response = self.run_test("Create Client", "POST", "clientes", 200, client_data)
        if not success:
            return False
        
        client_id = response.get('id')
        if not client_id:
            self.log_test("Create Client - Get ID", False, "No client ID returned")
            return False
        
        # Get clients
        success, _ = self.run_test("Get Clients", "GET", "clientes", 200)
        if not success:
            return False
        
        # Update client
        client_data['nome'] = "Updated Test Client"
        success, _ = self.run_test("Update Client", "PUT", f"clientes/{client_id}", 200, client_data)
        if not success:
            return False
        
        # Delete client
        success, _ = self.run_test("Delete Client", "DELETE", f"clientes/{client_id}", 200)
        return success

    def test_produtos_crud(self):
        """Test products CRUD operations"""
        # Create product
        product_data = {
            "codigo": f"PROD{datetime.now().strftime('%H%M%S')}",
            "descricao": "Test Product",
            "preco_compra": 100.00,
            "margem": 40.0
        }
        
        success, response = self.run_test("Create Product", "POST", "produtos", 200, product_data)
        if not success:
            return False
        
        product_id = response.get('id')
        if not product_id:
            self.log_test("Create Product - Get ID", False, "No product ID returned")
            return False
        
        # Verify automatic price calculation
        expected_price = 100.00 * 1.40  # 40% margin
        actual_price = response.get('preco_venda', 0)
        if abs(actual_price - expected_price) > 0.01:
            self.log_test("Product Price Calculation", False, f"Expected: {expected_price}, Got: {actual_price}")
        else:
            self.log_test("Product Price Calculation", True, f"Correct price: {actual_price}")
        
        # Get products
        success, _ = self.run_test("Get Products", "GET", "produtos", 200)
        if not success:
            return False
        
        # Update product
        product_data['descricao'] = "Updated Test Product"
        success, _ = self.run_test("Update Product", "PUT", f"produtos/{product_id}", 200, product_data)
        if not success:
            return False
        
        # Delete product
        success, _ = self.run_test("Delete Product", "DELETE", f"produtos/{product_id}", 200)
        return success

    def test_pedidos_operations(self):
        """Test orders operations"""
        # Get orders (should work even if empty)
        return self.run_test("Get Orders", "GET", "pedidos", 200)

    def test_financeiro_operations(self):
        """Test financial operations"""
        # Get cash balance
        success, _ = self.run_test("Get Cash Balance", "GET", "financeiro/caixa", 200)
        if not success:
            return False
        
        # Get expenses
        success, _ = self.run_test("Get Expenses", "GET", "despesas", 200)
        return success

    def test_licitacoes_operations(self):
        """Test tenders operations"""
        return self.run_test("Get Tenders", "GET", "licitacoes", 200)

    def test_orcamentos_operations(self):
        """Test budgets operations"""
        return self.run_test("Get Budgets", "GET", "orcamentos", 200)

    def test_relatorios_operations(self):
        """Test reports operations"""
        return self.run_test("Get General Report", "GET", "relatorios/geral", 200)

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting XSELL API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 50)
        
        # Test API health
        if not self.test_health_check()[0]:
            print("❌ API is not responding. Stopping tests.")
            return False
        
        # Test authentication
        print("\n🔐 Testing Authentication...")
        if not self.test_login_existing_user():
            print("❌ Login failed. Trying registration...")
            if not self.test_register_user():
                print("❌ Both login and registration failed. Stopping tests.")
                return False
        
        # Test user info
        self.test_get_current_user()
        
        # Test CRUD operations
        print("\n👥 Testing Clients CRUD...")
        self.test_clientes_crud()
        
        print("\n📦 Testing Products CRUD...")
        self.test_produtos_crud()
        
        # Test other operations
        print("\n🛒 Testing Orders...")
        self.test_pedidos_operations()
        
        print("\n💰 Testing Financial...")
        self.test_financeiro_operations()
        
        print("\n🏛️ Testing Tenders...")
        self.test_licitacoes_operations()
        
        print("\n📋 Testing Budgets...")
        self.test_orcamentos_operations()
        
        print("\n📊 Testing Reports...")
        self.test_relatorios_operations()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = XSELLAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())