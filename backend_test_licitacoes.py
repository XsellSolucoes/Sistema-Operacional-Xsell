import requests
import sys
import json
from datetime import datetime, timedelta

class LicitacoesAPITester:
    def __init__(self, base_url="https://contrato-manager.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_licitacao_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_login(self):
        """Test login and get token"""
        print("\n🔐 Testing Authentication...")
        
        # Try to register first in case user doesn't exist
        register_data = {
            "email": "test@licitacoes.com",
            "password": "Test123!",
            "name": "Test User Licitacoes"
        }
        
        register_response = self.run_test(
            "User Registration (if needed)",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        # Now login
        response_data = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": "test@licitacoes.com", "password": "Test123!"}
        )
        
        if response_data and 'access_token' in response_data:
            self.token = response_data['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_create_licitacao_with_contract(self):
        """Test POST /api/licitacoes - criar licitação com estrutura de contrato e produtos"""
        print("\n📋 Testing Licitação Creation with Contract Structure...")
        
        # Prepare test data with contract structure
        licitacao_data = {
            # Contract data (central element)
            "numero_contrato": "CT-2025/001-TEST",
            "data_inicio_contrato": (datetime.now() + timedelta(days=1)).isoformat(),
            "data_fim_contrato": (datetime.now() + timedelta(days=365)).isoformat(),
            
            # General data
            "numero_licitacao": "PE-001/2025-TEST",
            "cidade": "São Paulo",
            "estado": "SP",
            "orgao_publico": "Prefeitura de São Paulo",
            "numero_empenho": "EMP-2025-001",
            "data_empenho": datetime.now().isoformat(),
            "numero_nota_empenho": "NE-001/2025",
            
            # Products with contract quantities
            "produtos": [
                {
                    "descricao": "Produto A - Teste",
                    "quantidade_contratada": 100,
                    "preco_compra": 10.50,
                    "preco_venda": 15.75,
                    "despesas_extras": 1.25
                },
                {
                    "descricao": "Produto B - Teste",
                    "quantidade_contratada": 50,
                    "preco_compra": 25.00,
                    "preco_venda": 35.00,
                    "despesas_extras": 2.50
                }
            ],
            
            # Dates
            "previsao_fornecimento": (datetime.now() + timedelta(days=30)).isoformat(),
            "previsao_pagamento": (datetime.now() + timedelta(days=60)).isoformat(),
            
            # Financial
            "frete": 150.00,
            "impostos": 200.00,
            "outras_despesas": 75.00,
            "descricao_outras_despesas": "Taxas administrativas"
        }
        
        response_data = self.run_test(
            "Create Licitação with Contract",
            "POST",
            "licitacoes",
            200,
            data=licitacao_data
        )
        
        if response_data:
            self.created_licitacao_id = response_data.get('id')
            
            # Validate contract structure
            contrato = response_data.get('contrato', {})
            if contrato.get('numero_contrato') == licitacao_data['numero_contrato']:
                self.log_test("Contract structure validation", True, "Contract data properly stored")
            else:
                self.log_test("Contract structure validation", False, "Contract data missing or incorrect")
            
            # Validate products with contract quantities
            produtos = response_data.get('produtos', [])
            if len(produtos) == 2:
                produto_a = produtos[0]
                if (produto_a.get('quantidade_contratada') == 100 and 
                    produto_a.get('quantidade_fornecida') == 0 and
                    produto_a.get('quantidade_restante') == 100):
                    self.log_test("Product contract quantities", True, "Quantities properly calculated")
                else:
                    self.log_test("Product contract quantities", False, "Quantity calculations incorrect")
            else:
                self.log_test("Product contract quantities", False, f"Expected 2 products, got {len(produtos)}")
            
            # Validate calculated totals
            expected_total_venda = (100 * 15.75) + (50 * 35.00)  # 1575 + 1750 = 3325
            if abs(response_data.get('valor_total_venda', 0) - expected_total_venda) < 0.01:
                self.log_test("Contract value calculation", True, f"Total value: R$ {expected_total_venda}")
            else:
                self.log_test("Contract value calculation", False, f"Expected {expected_total_venda}, got {response_data.get('valor_total_venda')}")
            
            return response_data
        
        return None

    def test_get_licitacoes_with_calculations(self):
        """Test GET /api/licitacoes - listar licitações com cálculos de quantidades e alertas"""
        print("\n📊 Testing Licitações List with Calculations...")
        
        response_data = self.run_test(
            "Get Licitações List",
            "GET",
            "licitacoes",
            200
        )
        
        if response_data and isinstance(response_data, list):
            if len(response_data) > 0:
                licitacao = response_data[0]
                
                # Check calculated fields
                required_fields = [
                    'quantidade_total_contratada',
                    'quantidade_total_fornecida', 
                    'quantidade_total_restante',
                    'percentual_executado',
                    'alertas'
                ]
                
                missing_fields = [field for field in required_fields if field not in licitacao]
                if not missing_fields:
                    self.log_test("Calculated fields present", True, "All calculation fields available")
                else:
                    self.log_test("Calculated fields present", False, f"Missing fields: {missing_fields}")
                
                # Check contract alerts
                alertas = licitacao.get('alertas', [])
                if isinstance(alertas, list):
                    self.log_test("Contract alerts structure", True, f"Alerts: {len(alertas)} items")
                else:
                    self.log_test("Contract alerts structure", False, "Alerts field not a list")
                
                return licitacao
            else:
                self.log_test("Licitações list", False, "No licitações found")
        else:
            self.log_test("Licitações list", False, "Invalid response format")
        
        return None

    def test_register_fornecimento(self):
        """Test POST /api/licitacoes/{id}/fornecimentos - registrar fornecimento parcial"""
        print("\n🚚 Testing Fornecimento Registration...")
        
        if not self.created_licitacao_id:
            self.log_test("Fornecimento test setup", False, "No licitação ID available")
            return None
        
        # First get the licitação to find a product ID
        licitacao_data = self.run_test(
            "Get Licitação for Fornecimento",
            "GET",
            f"licitacoes/{self.created_licitacao_id}",
            200
        )
        
        if not licitacao_data or not licitacao_data.get('produtos'):
            self.log_test("Fornecimento test setup", False, "No products found in licitação")
            return None
        
        produto = licitacao_data['produtos'][0]
        produto_id = produto.get('id')
        
        if not produto_id:
            self.log_test("Fornecimento test setup", False, "Product ID not found")
            return None
        
        # Register partial supply (30 out of 100)
        fornecimento_data = {
            "produto_contrato_id": produto_id,
            "quantidade": 30,
            "data_fornecimento": datetime.now().isoformat(),
            "numero_nota_fornecimento": "NF-001/2025",
            "observacao": "Fornecimento parcial de teste"
        }
        
        response_data = self.run_test(
            "Register Partial Supply",
            "POST",
            f"licitacoes/{self.created_licitacao_id}/fornecimentos",
            200,
            data=fornecimento_data
        )
        
        if response_data:
            # Validate response
            if response_data.get('quantidade_fornecida') == 30:
                self.log_test("Supply quantity update", True, "Quantity correctly updated")
            else:
                self.log_test("Supply quantity update", False, f"Expected 30, got {response_data.get('quantidade_fornecida')}")
            
            if response_data.get('quantidade_restante') == 70:
                self.log_test("Remaining quantity calculation", True, "Remaining quantity correct")
            else:
                self.log_test("Remaining quantity calculation", False, f"Expected 70, got {response_data.get('quantidade_restante')}")
            
            # Check percentage calculation
            expected_percentage = 30 / 150 * 100  # 30 out of total 150 (100+50)
            actual_percentage = response_data.get('percentual_executado', 0)
            if abs(actual_percentage - expected_percentage) < 0.1:
                self.log_test("Execution percentage calculation", True, f"Percentage: {actual_percentage:.1f}%")
            else:
                self.log_test("Execution percentage calculation", False, f"Expected {expected_percentage:.1f}%, got {actual_percentage:.1f}%")
            
            return response_data
        
        return None

    def test_supply_validation(self):
        """Test validation that supply doesn't exceed contracted quantity"""
        print("\n⚠️ Testing Supply Quantity Validation...")
        
        if not self.created_licitacao_id:
            self.log_test("Supply validation test setup", False, "No licitação ID available")
            return
        
        # Get licitação to find product
        licitacao_data = self.run_test(
            "Get Licitação for Validation Test",
            "GET",
            f"licitacoes/{self.created_licitacao_id}",
            200
        )
        
        if not licitacao_data or not licitacao_data.get('produtos'):
            self.log_test("Supply validation test setup", False, "No products found")
            return
        
        produto = licitacao_data['produtos'][0]
        produto_id = produto.get('id')
        qtd_restante = produto.get('quantidade_restante', 0)
        
        # Try to supply more than remaining (should fail)
        invalid_fornecimento = {
            "produto_contrato_id": produto_id,
            "quantidade": qtd_restante + 10,  # Exceed remaining quantity
            "data_fornecimento": datetime.now().isoformat(),
            "numero_nota_fornecimento": "NF-INVALID",
            "observacao": "Teste de validação"
        }
        
        # This should return 400 (Bad Request)
        response_data = self.run_test(
            "Validate Supply Quantity Limit",
            "POST",
            f"licitacoes/{self.created_licitacao_id}/fornecimentos",
            400,  # Expecting error
            data=invalid_fornecimento
        )
        
        # If we got here with success, the validation is working

    def test_contract_alerts(self):
        """Test contract alerts (expiration and 90% execution)"""
        print("\n🚨 Testing Contract Alerts...")
        
        # Create a contract that's almost expired
        near_expiry_data = {
            "numero_contrato": "CT-EXPIRY-TEST",
            "data_inicio_contrato": (datetime.now() - timedelta(days=300)).isoformat(),
            "data_fim_contrato": (datetime.now() + timedelta(days=15)).isoformat(),  # Expires in 15 days
            
            "numero_licitacao": "PE-EXPIRY-TEST",
            "cidade": "Rio de Janeiro",
            "estado": "RJ",
            "orgao_publico": "Prefeitura do Rio",
            "numero_empenho": "EMP-EXPIRY",
            "data_empenho": datetime.now().isoformat(),
            "numero_nota_empenho": "NE-EXPIRY",
            
            "produtos": [
                {
                    "descricao": "Produto Teste Alerta",
                    "quantidade_contratada": 10,
                    "preco_compra": 100.00,
                    "preco_venda": 150.00,
                    "despesas_extras": 10.00
                }
            ],
            
            "frete": 0,
            "impostos": 0,
            "outras_despesas": 0
        }
        
        expiry_response = self.run_test(
            "Create Near-Expiry Contract",
            "POST",
            "licitacoes",
            200,
            data=near_expiry_data
        )
        
        if expiry_response:
            expiry_id = expiry_response.get('id')
            
            # Supply 9 out of 10 (90% execution)
            produto_id = expiry_response['produtos'][0]['id']
            fornecimento_90 = {
                "produto_contrato_id": produto_id,
                "quantidade": 9,
                "data_fornecimento": datetime.now().isoformat(),
                "numero_nota_fornecimento": "NF-90PERCENT",
                "observacao": "90% execution test"
            }
            
            self.run_test(
                "Supply 90% of Contract",
                "POST",
                f"licitacoes/{expiry_id}/fornecimentos",
                200,
                data=fornecimento_90
            )
            
            # Now check alerts
            updated_licitacao = self.run_test(
                "Get Updated Licitação with Alerts",
                "GET",
                f"licitacoes/{expiry_id}",
                200
            )
            
            if updated_licitacao:
                alertas = updated_licitacao.get('alertas', [])
                
                # Check for expiry alert
                expiry_alert_found = any('vence em' in alert or 'VENCIDO' in alert for alert in alertas)
                if expiry_alert_found:
                    self.log_test("Contract expiry alert", True, "Expiry alert generated")
                else:
                    self.log_test("Contract expiry alert", False, f"No expiry alert found. Alerts: {alertas}")
                
                # Check for 90% execution alert
                execution_alert_found = any('90%' in alert or '90.0%' in alert for alert in alertas)
                if execution_alert_found:
                    self.log_test("90% execution alert", True, "Execution alert generated")
                else:
                    self.log_test("90% execution alert", False, f"No 90% alert found. Alerts: {alertas}")

    def test_percentual_executado_calculation(self):
        """Test percentual_executado calculation after supplies"""
        print("\n📈 Testing Execution Percentage Calculation...")
        
        if not self.created_licitacao_id:
            self.log_test("Percentage calculation test", False, "No licitação ID available")
            return
        
        # Get current state
        current_state = self.run_test(
            "Get Current Licitação State",
            "GET",
            f"licitacoes/{self.created_licitacao_id}",
            200
        )
        
        if current_state:
            total_contratada = current_state.get('quantidade_total_contratada', 0)
            total_fornecida = current_state.get('quantidade_total_fornecida', 0)
            percentual = current_state.get('percentual_executado', 0)
            
            # Calculate expected percentage
            expected_percentual = (total_fornecida / total_contratada * 100) if total_contratada > 0 else 0
            
            if abs(percentual - expected_percentual) < 0.1:
                self.log_test("Execution percentage accuracy", True, f"Calculated: {percentual:.1f}%, Expected: {expected_percentual:.1f}%")
            else:
                self.log_test("Execution percentage accuracy", False, f"Calculated: {percentual:.1f}%, Expected: {expected_percentual:.1f}%")

    def save_results(self):
        """Save test results to file"""
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%",
            "test_details": self.test_results
        }
        
        with open('/app/test_reports/licitacoes_backend_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📊 Test results saved to /app/test_reports/licitacoes_backend_results.json")

    def run_all_tests(self):
        """Run all licitações tests"""
        print("🚀 Starting Licitações Backend API Tests...")
        print(f"   Base URL: {self.base_url}")
        
        # Authentication
        if not self.test_login():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Core licitações functionality
        self.test_create_licitacao_with_contract()
        self.test_get_licitacoes_with_calculations()
        self.test_register_fornecimento()
        self.test_supply_validation()
        self.test_percentual_executado_calculation()
        self.test_contract_alerts()
        
        # Save results
        self.save_results()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = LicitacoesAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())