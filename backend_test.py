import requests
import sys
import json
from datetime import datetime, timedelta

class XSELLAPITester:
    def __init__(self, base_url="https://bizmanager-85.preview.emergentagent.com"):
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

    def test_p1_orcamentos_module(self):
        """Test P1: Complete Orçamentos (Budget) module functionality"""
        print("\n💰 Testing P1: Orçamentos Module...")
        
        # First, ensure we have test data (cliente and produto)
        cliente_id = self.setup_test_cliente()
        produto_id = self.setup_test_produto()
        
        if not cliente_id or not produto_id:
            print("❌ Failed to setup test data for orçamentos")
            return False
        
        # Test 1: Create new orçamento with automatic numbering
        test_orcamento = {
            "cliente_id": cliente_id,
            "vendedor": "João Silva",
            "itens": [
                {
                    "produto_codigo": "PROD-001",
                    "descricao": "Produto Teste Orçamento",
                    "quantidade": 2,
                    "unidade": "UN",
                    "preco_unitario": 150.00,
                    "preco_total": 300.00,
                    "imagem_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                },
                {
                    "produto_codigo": "PROD-002", 
                    "descricao": "Segundo Produto",
                    "quantidade": 1,
                    "unidade": "UN",
                    "preco_unitario": 200.00,
                    "preco_total": 200.00
                }
            ],
            "validade_dias": 15,
            "forma_pagamento": "À Vista",
            "prazo_entrega": "10 dias úteis",
            "frete_por_conta": "destinatario",
            "valor_frete": 50.00,
            "desconto": 25.00,
            "observacoes": "Produto sujeito à disponibilidade de estoque no momento do fechamento do pedido, devido a estoque rotativo."
        }

        created_orcamento = self.run_test(
            "P1: Create Orçamento with Auto Numbering",
            "POST",
            "orcamentos",
            200,
            data=test_orcamento
        )

        if not created_orcamento:
            return False

        orcamento_id = created_orcamento.get('id')
        orcamento_numero = created_orcamento.get('numero')
        
        # Verify automatic numbering format (ORC-2025-XXXX)
        current_year = datetime.now().year
        expected_format = f"ORC-{current_year}-"
        numbering_correct = orcamento_numero and orcamento_numero.startswith(expected_format)
        
        self.log_test(
            "P1: Automatic Numbering Format (ORC-2025-XXXX)",
            numbering_correct,
            f"Generated number: {orcamento_numero}, Expected format: {expected_format}XXXX"
        )

        # Test 2: Get specific orçamento
        retrieved_orcamento = self.run_test(
            "P1: Get Specific Orçamento",
            "GET",
            f"orcamentos/{orcamento_id}",
            200
        )

        # Test 3: Update existing orçamento
        updated_data = test_orcamento.copy()
        updated_data["vendedor"] = "Maria Santos"
        updated_data["desconto"] = 50.00

        updated_orcamento = self.run_test(
            "P1: Edit Existing Orçamento",
            "PUT",
            f"orcamentos/{orcamento_id}",
            200,
            data=updated_data
        )

        # Test 4: Convert orçamento to pedido
        conversion_result = self.run_test(
            "P1: Convert Orçamento to Pedido",
            "POST",
            f"orcamentos/{orcamento_id}/convert?vendedor=João Silva",
            200
        )

        if conversion_result:
            pedido_numero = conversion_result.get('pedido_numero')
            self.log_test(
                "P1: Pedido Creation from Orçamento",
                bool(pedido_numero),
                f"Created pedido: {pedido_numero}"
            )

        # Test 5: Get all orçamentos
        all_orcamentos = self.run_test(
            "P1: Get All Orçamentos",
            "GET",
            "orcamentos",
            200
        )

        if all_orcamentos:
            found_orcamento = any(orc.get('id') == orcamento_id for orc in all_orcamentos)
            self.log_test(
                "P1: Find Created Orçamento in List",
                found_orcamento,
                f"Found {len(all_orcamentos)} orçamentos total"
            )

        return True

    def test_p2_notificacoes_module(self):
        """Test P2: Email notifications for expense due dates"""
        print("\n📧 Testing P2: Notificações Module...")
        
        # First create test expenses with different due dates
        hoje = datetime.now()
        amanha = hoje + timedelta(days=1)
        
        # Create expense due today
        expense_today = {
            "tipo": "agua",
            "descricao": "Conta de água - vence hoje",
            "valor": 150.00,
            "data_despesa": hoje.isoformat(),
            "data_vencimento": hoje.isoformat(),
            "status": "pendente"
        }
        
        created_expense_today = self.run_test(
            "P2: Create Expense Due Today",
            "POST",
            "despesas",
            200,
            data=expense_today
        )
        
        # Create expense due tomorrow
        expense_tomorrow = {
            "tipo": "luz",
            "descricao": "Conta de luz - vence amanhã",
            "valor": 200.00,
            "data_despesa": hoje.isoformat(),
            "data_vencimento": amanha.isoformat(),
            "status": "pendente"
        }
        
        created_expense_tomorrow = self.run_test(
            "P2: Create Expense Due Tomorrow",
            "POST",
            "despesas",
            200,
            data=expense_tomorrow
        )

        # Test 1: Check expenses near expiration
        vencimentos_response = self.run_test(
            "P2: Get Expenses Near Expiration",
            "GET",
            "notificacoes/despesas-vencimento",
            200
        )

        if vencimentos_response:
            quantidade = vencimentos_response.get('quantidade', 0)
            despesas_proximas = vencimentos_response.get('despesas', [])
            
            # Should find at least the 2 expenses we created
            found_expenses = quantidade >= 2
            self.log_test(
                "P2: Alert Card Data (Expenses Near Due)",
                found_expenses,
                f"Found {quantidade} expenses near expiration"
            )

        # Test 2: Get notification configuration
        config_response = self.run_test(
            "P2: Get Notification Configuration",
            "GET",
            "notificacoes/config",
            200
        )

        if config_response:
            email_destino = config_response.get('email_destino')
            expected_email = "pauloconsultordenegocios@gmail.com"
            correct_email = email_destino == expected_email
            
            self.log_test(
                "P2: Email Destination Configuration",
                correct_email,
                f"Email destino: {email_destino}, Expected: {expected_email}"
            )

        # Test 3: Send email notification endpoint
        email_response = self.run_test(
            "P2: Send Email Notification Endpoint",
            "POST",
            "notificacoes/enviar-email-vencimentos",
            200
        )

        if email_response:
            # Check if email was processed (even if not actually sent due to API key)
            message = email_response.get('message', '')
            despesas_encontradas = email_response.get('despesas_encontradas', 0)
            
            # Should find expenses and process them
            email_processed = despesas_encontradas > 0
            self.log_test(
                "P2: Email Processing Logic",
                email_processed,
                f"Message: {message}, Expenses found: {despesas_encontradas}"
            )

        return True

    def test_p3_access_control_module(self):
        """Test P3: Access control by level (user test@xsell.com is NOT president)"""
        print("\n🔐 Testing P3: Access Control Module...")
        
        # Test 1: Get current user level
        current_user_response = self.run_test(
            "P3: Get Current User Level (/api/vendedores/me)",
            "GET",
            "vendedores/me",
            200
        )

        if current_user_response:
            is_presidente = current_user_response.get('is_presidente', True)  # Should be False
            vendedor_info = current_user_response.get('vendedor')
            
            # test@xsell.com should NOT be president
            correct_level = not is_presidente
            self.log_test(
                "P3: User Level Check (test@xsell.com NOT president)",
                correct_level,
                f"is_presidente: {is_presidente}, vendedor: {vendedor_info}"
            )

        # Test 2: Try to create vendedor (should fail with 403)
        test_vendedor = {
            "nome": "Teste Vendedor",
            "email": "teste@vendedor.com",
            "telefone": "(11) 99999-9999",
            "nivel_acesso": "administrativo",
            "ativo": True
        }

        create_vendedor_response = self.run_test(
            "P3: Non-President Create Vendedor (should fail 403)",
            "POST",
            "vendedores",
            403,  # Should fail with 403 Forbidden
            data=test_vendedor
        )

        # Test 3: Get list of vendedores (should work)
        vendedores_list = self.run_test(
            "P3: Get Vendedores List (should work)",
            "GET",
            "vendedores",
            200
        )

        # Test 4: Try to edit vendedor (should fail with 403)
        if vendedores_list and len(vendedores_list) > 0:
            first_vendedor_id = vendedores_list[0].get('id')
            if first_vendedor_id:
                edit_vendedor_response = self.run_test(
                    "P3: Non-President Edit Vendedor (should fail 403)",
                    "PUT",
                    f"vendedores/{first_vendedor_id}",
                    403,  # Should fail with 403 Forbidden
                    data=test_vendedor
                )

        return True

    def setup_test_cliente(self):
        """Setup test cliente for orçamentos"""
        test_cliente = {
            "codigo": "CLI-TEST-001",
            "cnpj": "12.345.678/0001-90",
            "nome": "Cliente Teste Orçamento",
            "razao_social": "Cliente Teste Orçamento LTDA",
            "nome_fantasia": "Cliente Teste",
            "endereco": "Rua Teste, 123",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567"
        }
        
        created_cliente = self.run_test(
            "Setup: Create Test Cliente",
            "POST",
            "clientes",
            200,
            data=test_cliente
        )
        
        return created_cliente.get('id') if created_cliente else None

    def setup_test_produto(self):
        """Setup test produto for orçamentos"""
        test_produto = {
            "codigo": "PROD-TEST-001",
            "descricao": "Produto Teste para Orçamento",
            "preco_compra": 100.00,
            "preco_venda": 150.00,
            "margem": 50.0,
            "fornecedor": "Fornecedor Teste"
        }
        
        created_produto = self.run_test(
            "Setup: Create Test Produto",
            "POST",
            "produtos",
            200,
            data=test_produto
        )
        
        return created_produto.get('id') if created_produto else None
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

    def run_all_tests(self):
        """Run all tests for XSELL system"""
        print("🚀 Starting XSELL API Tests...")
        print(f"   Base URL: {self.base_url}")
        print(f"   API URL: {self.api_url}")

        # Test authentication first
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False

        # Run P1, P2, P3 test suites
        print("\n" + "="*60)
        print("Testing P1: Orçamentos Module")
        print("="*60)
        self.test_p1_orcamentos_module()
        
        print("\n" + "="*60)
        print("Testing P2: Notificações Module")
        print("="*60)
        self.test_p2_notificacoes_module()
        
        print("\n" + "="*60)
        print("Testing P3: Access Control Module")
        print("="*60)
        self.test_p3_access_control_module()

        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        return self.tests_passed == self.tests_run

def main():
    tester = XSELLAPITester()
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