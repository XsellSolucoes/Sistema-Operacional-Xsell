import requests
import sys
import json
from datetime import datetime, timedelta

class LicitacoesAPITester:
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
        response_data = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": "test@xsell.com", "password": "Test123!"}
        )
        
        if response_data and 'access_token' in response_data:
            self.token = response_data['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_licitacoes_crud(self):
        """Test complete CRUD operations for Licitações"""
        print("\n📋 Testing Licitações CRUD Operations...")
        
        # Test GET empty list
        licitacoes = self.run_test(
            "Get Licitações (empty)",
            "GET",
            "licitacoes",
            200
        )
        
        if licitacoes is None:
            return False

        # Test CREATE licitação
        test_licitacao = {
            "numero_licitacao": "PE-001/2024-TEST",
            "cidade": "São Paulo",
            "estado": "SP",
            "orgao_publico": "Prefeitura Municipal de São Paulo",
            "numero_empenho": "EMP-2024-001",
            "data_empenho": datetime.now().isoformat(),
            "numero_nota_empenho": "NE-001/2024",
            "numero_nota_fornecimento": "NF-001/2024",
            "produtos": [
                {
                    "descricao": "Produto Teste 1",
                    "quantidade_empenhada": 10,
                    "quantidade_fornecida": 5,
                    "preco_compra": 100.00,
                    "preco_venda": 150.00,
                    "despesas_extras": 10.00
                },
                {
                    "descricao": "Produto Teste 2", 
                    "quantidade_empenhada": 20,
                    "quantidade_fornecida": 0,
                    "preco_compra": 50.00,
                    "preco_venda": 80.00,
                    "despesas_extras": 5.00
                }
            ],
            "previsao_fornecimento": (datetime.now() + timedelta(days=30)).isoformat(),
            "fornecimento_efetivo": None,
            "previsao_pagamento": (datetime.now() + timedelta(days=60)).isoformat(),
            "frete": 100.00,
            "impostos": 200.00,
            "outras_despesas": 50.00,
            "descricao_outras_despesas": "Taxas administrativas"
        }

        created_licitacao = self.run_test(
            "Create Licitação",
            "POST",
            "licitacoes",
            200,
            data=test_licitacao
        )

        if not created_licitacao:
            return False

        licitacao_id = created_licitacao.get('id')
        print(f"   Created licitação ID: {licitacao_id}")

        # Verify automatic calculations
        expected_valor_venda = (10 * 150.00) + (20 * 80.00)  # 1500 + 1600 = 3100
        expected_valor_compra = (10 * 100.00) + (20 * 50.00)  # 1000 + 1000 = 2000
        expected_despesas_totais = (10 * 10.00) + (20 * 5.00) + 100.00 + 200.00 + 50.00  # 100 + 100 + 350 = 550
        expected_lucro = expected_valor_venda - expected_valor_compra - expected_despesas_totais  # 3100 - 2000 - 550 = 550

        calculations_correct = (
            abs(created_licitacao.get('valor_total_venda', 0) - expected_valor_venda) < 0.01 and
            abs(created_licitacao.get('valor_total_compra', 0) - expected_valor_compra) < 0.01 and
            abs(created_licitacao.get('despesas_totais', 0) - expected_despesas_totais) < 0.01 and
            abs(created_licitacao.get('lucro_total', 0) - expected_lucro) < 0.01
        )

        self.log_test(
            "Automatic Calculations",
            calculations_correct,
            f"Venda: {created_licitacao.get('valor_total_venda')}, Compra: {created_licitacao.get('valor_total_compra')}, Despesas: {created_licitacao.get('despesas_totais')}, Lucro: {created_licitacao.get('lucro_total')}"
        )

        # Test GET specific licitação
        retrieved_licitacao = self.run_test(
            "Get Specific Licitação",
            "GET",
            f"licitacoes/{licitacao_id}",
            200
        )

        # Test UPDATE licitação
        updated_data = test_licitacao.copy()
        updated_data["cidade"] = "Rio de Janeiro"
        updated_data["estado"] = "RJ"
        updated_data["produtos"][0]["quantidade_fornecida"] = 8  # Update supplied quantity

        updated_licitacao = self.run_test(
            "Update Licitação",
            "PUT",
            f"licitacoes/{licitacao_id}",
            200,
            data=updated_data
        )

        # Test status updates
        status_updated = self.run_test(
            "Update Status to Programado",
            "PUT",
            f"licitacoes/{licitacao_id}/status",
            200,
            params={"status": "programado"}
        )

        # Test cash integration when marking as paid
        # First get current cash balance
        caixa_before = self.run_test(
            "Get Cash Balance Before Payment",
            "GET",
            "financeiro/caixa",
            200
        )

        if caixa_before:
            saldo_antes = caixa_before.get('saldo', 0)
            
            # Mark as paid
            paid_status = self.run_test(
                "Update Status to Pago",
                "PUT",
                f"licitacoes/{licitacao_id}/status",
                200,
                params={"status": "pago"}
            )

            # Check cash balance after payment
            caixa_after = self.run_test(
                "Get Cash Balance After Payment",
                "GET",
                "financeiro/caixa",
                200
            )

            if caixa_after:
                saldo_depois = caixa_after.get('saldo', 0)
                # Calculate expected credit based on supplied quantities
                expected_credit = (8 * 150.00) + (0 * 80.00)  # Only supplied quantities count
                expected_saldo = saldo_antes + expected_credit
                
                cash_integration_correct = abs(saldo_depois - expected_saldo) < 0.01
                self.log_test(
                    "Cash Integration on Payment",
                    cash_integration_correct,
                    f"Before: {saldo_antes}, After: {saldo_depois}, Expected: {expected_saldo}"
                )

        # Test GET all licitações (should have our created one)
        all_licitacoes = self.run_test(
            "Get All Licitações",
            "GET",
            "licitacoes",
            200
        )

        if all_licitacoes:
            found_our_licitacao = any(lic.get('id') == licitacao_id for lic in all_licitacoes)
            self.log_test(
                "Find Created Licitação in List",
                found_our_licitacao,
                f"Found {len(all_licitacoes)} licitações total"
            )

        # Test DELETE licitação
        deleted = self.run_test(
            "Delete Licitação",
            "DELETE",
            f"licitacoes/{licitacao_id}",
            200
        )

        # Verify deletion
        deleted_check = self.run_test(
            "Verify Deletion (should fail)",
            "GET",
            f"licitacoes/{licitacao_id}",
            404
        )

        return True

    def test_validation_errors(self):
        """Test validation and error handling"""
        print("\n⚠️  Testing Validation and Error Handling...")

        # Test creating licitação without required fields
        invalid_licitacao = {
            "numero_licitacao": "",  # Empty required field
            "produtos": []  # Empty products
        }

        self.run_test(
            "Create Invalid Licitação (empty fields)",
            "POST",
            "licitacoes",
            422,  # Validation error
            data=invalid_licitacao
        )

        # Test accessing non-existent licitação
        self.run_test(
            "Get Non-existent Licitação",
            "GET",
            "licitacoes/non-existent-id",
            404
        )

        # Test updating non-existent licitação
        self.run_test(
            "Update Non-existent Licitação",
            "PUT",
            "licitacoes/non-existent-id",
            404,
            data={"numero_licitacao": "TEST"}
        )

        # Test deleting non-existent licitação
        self.run_test(
            "Delete Non-existent Licitação",
            "DELETE",
            "licitacoes/non-existent-id",
            404
        )

    def test_edge_cases(self):
        """Test edge cases and boundary conditions"""
        print("\n🔍 Testing Edge Cases...")

        # Test licitação with zero values
        zero_licitacao = {
            "numero_licitacao": "ZERO-TEST",
            "cidade": "Test City",
            "estado": "SP",
            "orgao_publico": "Test Organ",
            "numero_empenho": "ZERO-001",
            "data_empenho": datetime.now().isoformat(),
            "numero_nota_empenho": "ZERO-NE",
            "produtos": [
                {
                    "descricao": "Zero Value Product",
                    "quantidade_empenhada": 0,
                    "quantidade_fornecida": 0,
                    "preco_compra": 0.00,
                    "preco_venda": 0.00,
                    "despesas_extras": 0.00
                }
            ],
            "frete": 0.00,
            "impostos": 0.00,
            "outras_despesas": 0.00
        }

        zero_result = self.run_test(
            "Create Licitação with Zero Values",
            "POST",
            "licitacoes",
            200,
            data=zero_licitacao
        )

        if zero_result:
            # Verify calculations with zero values
            zero_calculations_correct = (
                zero_result.get('valor_total_venda', -1) == 0 and
                zero_result.get('valor_total_compra', -1) == 0 and
                zero_result.get('despesas_totais', -1) == 0 and
                zero_result.get('lucro_total', -1) == 0
            )
            
            self.log_test(
                "Zero Values Calculations",
                zero_calculations_correct,
                f"All totals should be 0: Venda={zero_result.get('valor_total_venda')}, Compra={zero_result.get('valor_total_compra')}, Despesas={zero_result.get('despesas_totais')}, Lucro={zero_result.get('lucro_total')}"
            )

            # Clean up
            self.run_test(
                "Delete Zero Values Licitação",
                "DELETE",
                f"licitacoes/{zero_result.get('id')}",
                200
            )

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Licitações API Tests...")
        print(f"   Base URL: {self.base_url}")
        print(f"   API URL: {self.api_url}")

        # Test authentication first
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False

        # Run all test suites
        self.test_licitacoes_crud()
        self.test_validation_errors()
        self.test_edge_cases()

        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        return self.tests_passed == self.tests_run

def main():
    tester = LicitacoesAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'failed_tests': tester.tests_run - tester.tests_passed,
            'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
            'test_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())