import requests
import sys
import json
from datetime import datetime, timedelta

class PedidosCalculationTester:
    def __init__(self, base_url="https://compro-dash.preview.emergentagent.com"):
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
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        if not data is None:
            headers['Content-Type'] = 'application/json'

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
                    return response
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_login(self):
        """Test login and get token"""
        print("\n🔐 Testing Authentication...")
        
        # Try with the test credentials from the review request
        response_data = self.run_test(
            "User Login (testfinanceiro@test.com)",
            "POST",
            "auth/login",
            200,
            data={"email": "testfinanceiro@test.com", "password": "test123"}
        )
        
        if response_data and 'access_token' in response_data:
            self.token = response_data['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        
        return False

    def setup_test_data(self):
        """Setup test cliente and produto for pedidos"""
        print("\n📋 Setting up test data...")
        
        # Create test cliente
        test_cliente = {
            "tipo_pessoa": "juridica",
            "cpf_cnpj": "12.345.678/0001-90",
            "nome": "Cliente Teste Cálculos",
            "razao_social": "Cliente Teste Cálculos LTDA",
            "nome_fantasia": "Cliente Teste",
            "rua": "Rua Teste, 123",
            "numero": "123",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567",
            "email": "cliente@teste.com",
            "telefone": "(11) 99999-9999"
        }
        
        created_cliente = self.run_test(
            "Setup: Create Test Cliente",
            "POST",
            "clientes",
            200,
            data=test_cliente
        )
        
        if not created_cliente:
            return None, None
        
        cliente_id = created_cliente.get('id')
        
        # Create test produto
        test_produto = {
            "codigo": "PROD-CALC-001",
            "descricao": "Produto Teste Cálculos",
            "preco_compra": 50.00,
            "preco_venda": 100.00,
            "margem": 100.0,
            "fornecedor": "Fornecedor Teste"
        }
        
        created_produto = self.run_test(
            "Setup: Create Test Produto",
            "POST",
            "produtos",
            200,
            data=test_produto
        )
        
        if not created_produto:
            return cliente_id, None
        
        produto_id = created_produto.get('id')
        
        return cliente_id, produto_id

    def test_pedido_calculations(self):
        """Test the specific calculation logic mentioned in the review request"""
        print("\n💰 Testing Pedido Calculation Logic...")
        
        # Setup test data
        cliente_id, produto_id = self.setup_test_data()
        if not cliente_id or not produto_id:
            print("❌ Failed to setup test data")
            return False
        
        # Test case from review request:
        # 1 item: quantidade=10, preco_venda=100, preco_compra=50
        # Frete: R$ 20,00 (repassar=true)
        # Despesa 1: R$ 30,00 (repassar=true)
        # Despesa 2: R$ 10,00 (repassar=false - interno)
        
        test_pedido = {
            "cliente_id": cliente_id,
            "itens": [
                {
                    "produto_id": produto_id,
                    "produto_codigo": "PROD-CALC-001",
                    "produto_descricao": "Produto Teste Cálculos",
                    "quantidade": 10,
                    "preco_compra": 50.00,
                    "preco_venda": 100.00,
                    "despesas": 0.0,
                    "lucro_item": 0.0,
                    "subtotal": 1000.00,
                    "personalizado": False,
                    "tipo_personalizacao": "",
                    "valor_personalizacao": 0.0,
                    "repassar_personalizacao": False
                }
            ],
            "frete": 20.00,
            "repassar_frete": True,
            "outras_despesas": 0.0,
            "despesas_detalhadas": [
                {
                    "descricao": "Despesa Repassada",
                    "valor": 30.00,
                    "repassar": True
                },
                {
                    "descricao": "Despesa Interna",
                    "valor": 10.00,
                    "repassar": False
                }
            ],
            "prazo_entrega": "10 dias úteis",
            "forma_pagamento": "À Vista",
            "dados_pagamento_id": None,
            "tipo_venda": "consumidor_final",
            "vendedor": "Vendedor Teste"
        }
        
        # Create the pedido
        created_pedido = self.run_test(
            "Create Pedido with Calculation Test Case",
            "POST",
            "pedidos",
            200,
            data=test_pedido
        )
        
        if not created_pedido:
            print("❌ Failed to create test pedido")
            return False
        
        pedido_id = created_pedido.get('id')
        print(f"   Created pedido ID: {pedido_id}")
        
        # Expected calculations from review request:
        # valor_total_venda = 1000 + 20 + 30 = R$ 1.050,00 (Total Cliente)
        # custo_total = 500 (10 * 50)
        # lucro_total = 1050 - 500 - 10 = R$ 540,00
        
        expected_valor_venda = 1000.00  # Valor dos produtos
        expected_total_cliente = 1050.00  # Produtos + frete repassado + despesas repassadas
        expected_custo_total = 500.00  # 10 * 50
        expected_lucro_total = 540.00  # Total Cliente - Custo - Despesas Internas
        
        # Verify calculations
        actual_valor_venda = created_pedido.get('valor_total_venda', 0)
        actual_custo_total = created_pedido.get('custo_total', 0)
        actual_lucro_total = created_pedido.get('lucro_total', 0)
        
        print(f"\n📊 Calculation Results:")
        print(f"   Valor Total Venda (Total Cliente): R$ {actual_valor_venda:.2f} (Expected: R$ {expected_total_cliente:.2f})")
        print(f"   Custo Total: R$ {actual_custo_total:.2f} (Expected: R$ {expected_custo_total:.2f})")
        print(f"   Lucro Total: R$ {actual_lucro_total:.2f} (Expected: R$ {expected_lucro_total:.2f})")
        
        # Test 1: Total Cliente calculation
        total_cliente_correct = abs(actual_valor_venda - expected_total_cliente) < 0.01
        self.log_test(
            "Total Cliente Calculation (Valor de Venda + Frete Repassado + Despesas Repassadas)",
            total_cliente_correct,
            f"Actual: R$ {actual_valor_venda:.2f}, Expected: R$ {expected_total_cliente:.2f}"
        )
        
        # Test 2: Custo Total calculation
        custo_total_correct = abs(actual_custo_total - expected_custo_total) < 0.01
        self.log_test(
            "Custo Total Calculation (Quantidade × Preço Compra)",
            custo_total_correct,
            f"Actual: R$ {actual_custo_total:.2f}, Expected: R$ {expected_custo_total:.2f}"
        )
        
        # Test 3: Lucro Total calculation
        lucro_total_correct = abs(actual_lucro_total - expected_lucro_total) < 0.01
        self.log_test(
            "Lucro Total Calculation (Total Cliente - Custo - Despesas Internas)",
            lucro_total_correct,
            f"Actual: R$ {actual_lucro_total:.2f}, Expected: R$ {expected_lucro_total:.2f}"
        )
        
        # Test 4: Get the created pedido to verify persistence
        retrieved_pedido = self.run_test(
            "Get Created Pedido",
            "GET",
            f"pedidos/{pedido_id}",
            200
        )
        
        if retrieved_pedido:
            # Verify the calculations are still correct after retrieval
            retrieved_valor_venda = retrieved_pedido.get('valor_total_venda', 0)
            retrieved_custo_total = retrieved_pedido.get('custo_total', 0)
            retrieved_lucro_total = retrieved_pedido.get('lucro_total', 0)
            
            persistence_correct = (
                abs(retrieved_valor_venda - expected_total_cliente) < 0.01 and
                abs(retrieved_custo_total - expected_custo_total) < 0.01 and
                abs(retrieved_lucro_total - expected_lucro_total) < 0.01
            )
            
            self.log_test(
                "Calculation Persistence After Retrieval",
                persistence_correct,
                f"Values maintained after database retrieval"
            )
        
        # Test 5: Update pedido and verify recalculation
        updated_pedido_data = test_pedido.copy()
        # Change frete to not be repassado
        updated_pedido_data["repassar_frete"] = False
        
        updated_pedido = self.run_test(
            "Update Pedido (Frete não repassado)",
            "PUT",
            f"pedidos/{pedido_id}",
            200,
            data=updated_pedido_data
        )
        
        if updated_pedido:
            # New expected values:
            # Total Cliente = 1000 + 30 = 1030 (sem frete repassado)
            # Lucro = 1030 - 500 - 10 - 20 = 500 (agora frete é despesa interna)
            expected_total_cliente_updated = 1030.00
            expected_lucro_updated = 500.00
            
            updated_valor_venda = updated_pedido.get('valor_total_venda', 0)
            updated_lucro_total = updated_pedido.get('lucro_total', 0)
            
            update_calculation_correct = (
                abs(updated_valor_venda - expected_total_cliente_updated) < 0.01 and
                abs(updated_lucro_total - expected_lucro_updated) < 0.01
            )
            
            self.log_test(
                "Recalculation After Update (Frete Internal)",
                update_calculation_correct,
                f"Total Cliente: R$ {updated_valor_venda:.2f} (Expected: R$ {expected_total_cliente_updated:.2f}), Lucro: R$ {updated_lucro_total:.2f} (Expected: R$ {expected_lucro_updated:.2f})"
            )
        
        # Test 6: Test with multiple items
        multi_item_pedido = test_pedido.copy()
        multi_item_pedido["itens"] = [
            {
                "produto_id": produto_id,
                "produto_codigo": "PROD-CALC-001",
                "produto_descricao": "Produto Teste Cálculos Item 1",
                "quantidade": 5,
                "preco_compra": 50.00,
                "preco_venda": 100.00,
                "despesas": 0.0,
                "lucro_item": 0.0,
                "subtotal": 500.00,
                "personalizado": False,
                "tipo_personalizacao": "",
                "valor_personalizacao": 0.0,
                "repassar_personalizacao": False
            },
            {
                "produto_id": produto_id,
                "produto_codigo": "PROD-CALC-002",
                "produto_descricao": "Produto Teste Cálculos Item 2",
                "quantidade": 3,
                "preco_compra": 80.00,
                "preco_venda": 150.00,
                "despesas": 0.0,
                "lucro_item": 0.0,
                "subtotal": 450.00,
                "personalizado": False,
                "tipo_personalizacao": "",
                "valor_personalizacao": 0.0,
                "repassar_personalizacao": False
            }
        ]
        multi_item_pedido["repassar_frete"] = True  # Reset to true
        
        multi_item_created = self.run_test(
            "Create Multi-Item Pedido",
            "POST",
            "pedidos",
            200,
            data=multi_item_pedido
        )
        
        if multi_item_created:
            # Expected: (5*100 + 3*150) + 20 + 30 = 950 + 50 = 1000
            # Custo: (5*50 + 3*80) = 250 + 240 = 490
            # Lucro: 1000 - 490 - 10 = 500
            expected_multi_total = 1000.00
            expected_multi_custo = 490.00
            expected_multi_lucro = 500.00
            
            multi_valor_venda = multi_item_created.get('valor_total_venda', 0)
            multi_custo_total = multi_item_created.get('custo_total', 0)
            multi_lucro_total = multi_item_created.get('lucro_total', 0)
            
            multi_calculation_correct = (
                abs(multi_valor_venda - expected_multi_total) < 0.01 and
                abs(multi_custo_total - expected_multi_custo) < 0.01 and
                abs(multi_lucro_total - expected_multi_lucro) < 0.01
            )
            
            self.log_test(
                "Multi-Item Pedido Calculations",
                multi_calculation_correct,
                f"Total: R$ {multi_valor_venda:.2f} (Expected: R$ {expected_multi_total:.2f}), Custo: R$ {multi_custo_total:.2f} (Expected: R$ {expected_multi_custo:.2f}), Lucro: R$ {multi_lucro_total:.2f} (Expected: R$ {expected_multi_lucro:.2f})"
            )
        
        return True

    def run_all_tests(self):
        """Run all pedido calculation tests"""
        print("🚀 Starting Pedidos Calculation Tests...")
        print(f"   Base URL: {self.base_url}")
        print(f"   API URL: {self.api_url}")

        # Test authentication first
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False

        # Run calculation tests
        print("\n" + "="*60)
        print("Testing PEDIDOS CALCULATION LOGIC (Review Request)")
        print("="*60)
        self.test_pedido_calculations()

        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        return self.tests_passed == self.tests_run

def main():
    tester = PedidosCalculationTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    import os
    os.makedirs('/app/test_reports', exist_ok=True)
    
    with open('/app/test_reports/pedidos_calculation_test_results.json', 'w') as f:
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