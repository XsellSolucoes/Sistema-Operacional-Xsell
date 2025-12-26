import requests
import sys
import json
from datetime import datetime, timedelta

class GestaoAPITester:
    def __init__(self, base_url="https://gestao-central.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_ids = {
            'dados_pagamento': [],
            'clientes': [],
            'pedidos': []
        }

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
        
        # First try to register a test user
        register_data = {
            "email": "test@gestao.com",
            "password": "Test123!",
            "name": "Test User Gestao"
        }
        
        register_response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if register_response and 'access_token' in register_response:
            self.token = register_response['access_token']
            print(f"   Token obtained via registration: {self.token[:20]}...")
            return True
        
        # If registration fails (user exists), try login
        login_data = {
            "email": "test@gestao.com",
            "password": "Test123!"
        }
        
        login_response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if login_response and 'access_token' in login_response:
            self.token = login_response['access_token']
            print(f"   Token obtained via login: {self.token[:20]}...")
            return True
        
        return False

    def test_dados_pagamento_module(self):
        """Test Dados de Pagamento (Payment Data) module"""
        print("\n💳 Testing Dados de Pagamento Module...")
        
        # Test 1: Create new bank account
        test_dados = {
            "banco": "Banco do Brasil",
            "tipo_conta": "corrente",
            "agencia": "1529-6",
            "numero_conta": "81517-9",
            "titular": "XSELL SOLUÇÕES CORPORATIVAS LTDA",
            "cpf_cnpj_titular": "19.820.742/0001-91",
            "pix": "comercial@xsellsolucoes.com.br",
            "observacoes": "Conta principal para recebimentos"
        }

        created_dados = self.run_test(
            "POST /api/dados-pagamento - Create Bank Account",
            "POST",
            "dados-pagamento",
            200,
            data=test_dados
        )

        if created_dados:
            dados_id = created_dados.get('id')
            self.created_ids['dados_pagamento'].append(dados_id)
            
            # Verify all fields were saved correctly
            fields_correct = (
                created_dados.get('banco') == test_dados['banco'] and
                created_dados.get('tipo_conta') == test_dados['tipo_conta'] and
                created_dados.get('agencia') == test_dados['agencia'] and
                created_dados.get('numero_conta') == test_dados['numero_conta'] and
                created_dados.get('titular') == test_dados['titular'] and
                created_dados.get('cpf_cnpj_titular') == test_dados['cpf_cnpj_titular'] and
                created_dados.get('pix') == test_dados['pix'] and
                created_dados.get('ativo') == True
            )
            
            self.log_test(
                "Verify Bank Account Fields",
                fields_correct,
                f"All fields saved correctly: {fields_correct}"
            )

        # Test 2: Get all payment data
        all_dados = self.run_test(
            "GET /api/dados-pagamento - List Accounts",
            "GET",
            "dados-pagamento",
            200
        )

        if all_dados:
            found_created = any(d.get('id') == dados_id for d in all_dados) if dados_id else False
            self.log_test(
                "Find Created Account in List",
                found_created,
                f"Found {len(all_dados)} accounts total"
            )

        # Test 3: Create second account for testing
        test_dados_2 = {
            "banco": "Caixa Econômica Federal",
            "tipo_conta": "poupanca",
            "agencia": "0123",
            "numero_conta": "12345-6",
            "titular": "XSELL SOLUÇÕES CORPORATIVAS LTDA",
            "pix": "19.820.742/0001-91"
        }

        created_dados_2 = self.run_test(
            "Create Second Bank Account",
            "POST",
            "dados-pagamento",
            200,
            data=test_dados_2
        )

        if created_dados_2:
            self.created_ids['dados_pagamento'].append(created_dados_2.get('id'))

        return True

    def test_clientes_module(self):
        """Test Clientes module with new fields (tipo_pessoa, cpf_cnpj, nome_contato, complete address)"""
        print("\n👥 Testing Clientes Module with New Fields...")
        
        # Test 1: Create Pessoa Física client
        test_cliente_pf = {
            "tipo_pessoa": "fisica",
            "cpf_cnpj": "123.456.789-00",
            "nome": "João Silva Santos",
            "nome_contato": "João Silva",
            "rua": "Rua das Flores",
            "numero": "123",
            "complemento": "Apto 45",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01234-567",
            "email": "joao@email.com",
            "telefone": "(11) 99999-9999",
            "whatsapp": "(11) 99999-9999"
        }

        created_cliente_pf = self.run_test(
            "POST /api/clientes - Create Pessoa Física",
            "POST",
            "clientes",
            200,
            data=test_cliente_pf
        )

        if created_cliente_pf:
            cliente_pf_id = created_cliente_pf.get('id')
            self.created_ids['clientes'].append(cliente_pf_id)
            
            # Verify automatic code generation
            codigo_generated = created_cliente_pf.get('codigo', '').startswith('CLI-')
            self.log_test(
                "Automatic Client Code Generation",
                codigo_generated,
                f"Generated code: {created_cliente_pf.get('codigo')}"
            )
            
            # Verify new fields for Pessoa Física
            pf_fields_correct = (
                created_cliente_pf.get('tipo_pessoa') == 'fisica' and
                created_cliente_pf.get('cpf_cnpj') == test_cliente_pf['cpf_cnpj'] and
                created_cliente_pf.get('nome_contato') == test_cliente_pf['nome_contato'] and
                created_cliente_pf.get('rua') == test_cliente_pf['rua'] and
                created_cliente_pf.get('numero') == test_cliente_pf['numero'] and
                created_cliente_pf.get('complemento') == test_cliente_pf['complemento'] and
                created_cliente_pf.get('bairro') == test_cliente_pf['bairro'] and
                created_cliente_pf.get('cidade') == test_cliente_pf['cidade'] and
                created_cliente_pf.get('estado') == test_cliente_pf['estado'] and
                created_cliente_pf.get('cep') == test_cliente_pf['cep']
            )
            
            self.log_test(
                "Verify Pessoa Física New Fields",
                pf_fields_correct,
                f"All PF fields saved correctly: {pf_fields_correct}"
            )

        # Test 2: Create Pessoa Jurídica client
        test_cliente_pj = {
            "tipo_pessoa": "juridica",
            "cpf_cnpj": "12.345.678/0001-90",
            "nome": "Empresa Teste LTDA",
            "razao_social": "Empresa Teste Limitada",
            "nome_fantasia": "Empresa Teste",
            "nome_contato": "Maria Silva",
            "rua": "Avenida Paulista",
            "numero": "1000",
            "complemento": "Sala 1001",
            "bairro": "Bela Vista",
            "cidade": "São Paulo",
            "estado": "SP",
            "cep": "01310-100",
            "email": "contato@empresateste.com",
            "inscricao_estadual": "123.456.789.012",
            "telefone": "(11) 3333-3333",
            "whatsapp": "(11) 99999-8888"
        }

        created_cliente_pj = self.run_test(
            "POST /api/clientes - Create Pessoa Jurídica",
            "POST",
            "clientes",
            200,
            data=test_cliente_pj
        )

        if created_cliente_pj:
            cliente_pj_id = created_cliente_pj.get('id')
            self.created_ids['clientes'].append(cliente_pj_id)
            
            # Verify new fields for Pessoa Jurídica
            pj_fields_correct = (
                created_cliente_pj.get('tipo_pessoa') == 'juridica' and
                created_cliente_pj.get('cpf_cnpj') == test_cliente_pj['cpf_cnpj'] and
                created_cliente_pj.get('razao_social') == test_cliente_pj['razao_social'] and
                created_cliente_pj.get('nome_fantasia') == test_cliente_pj['nome_fantasia'] and
                created_cliente_pj.get('nome_contato') == test_cliente_pj['nome_contato'] and
                created_cliente_pj.get('inscricao_estadual') == test_cliente_pj['inscricao_estadual']
            )
            
            self.log_test(
                "Verify Pessoa Jurídica New Fields",
                pj_fields_correct,
                f"All PJ fields saved correctly: {pj_fields_correct}"
            )

        # Test 3: Add occurrence to client
        if cliente_pj_id:
            test_ocorrencia = {
                "tipo": "observacao",
                "descricao": "Cliente solicitou desconto especial para próximos pedidos"
            }

            ocorrencia_result = self.run_test(
                "POST /api/clientes/{id}/ocorrencias - Add Occurrence",
                "POST",
                f"clientes/{cliente_pj_id}/ocorrencias",
                200,
                data=test_ocorrencia
            )

        # Test 4: Get clients and verify history and occurrences fields
        all_clientes = self.run_test(
            "GET /api/clientes - Verify History and Occurrences Fields",
            "GET",
            "clientes",
            200
        )

        if all_clientes:
            # Find our created client
            our_cliente = next((c for c in all_clientes if c.get('id') == cliente_pj_id), None)
            if our_cliente:
                has_historico_field = 'historico' in our_cliente
                has_ocorrencias_field = 'ocorrencias' in our_cliente
                ocorrencias_has_data = len(our_cliente.get('ocorrencias', [])) > 0
                
                self.log_test(
                    "Verify History and Occurrences Fields",
                    has_historico_field and has_ocorrencias_field,
                    f"historico field: {has_historico_field}, ocorrencias field: {has_ocorrencias_field}, has occurrences: {ocorrencias_has_data}"
                )

        return True

    def test_pedidos_module(self):
        """Test Pedidos module with edit button and payment data selector"""
        print("\n📦 Testing Pedidos Module with New Features...")
        
        # First, ensure we have test data
        if not self.created_ids['clientes'] or not self.created_ids['dados_pagamento']:
            print("❌ Missing test data for pedidos tests")
            return False
        
        cliente_id = self.created_ids['clientes'][0]
        dados_pagamento_id = self.created_ids['dados_pagamento'][0]
        
        # Test 1: Create order with payment data ID
        test_pedido = {
            "cliente_id": cliente_id,
            "itens": [
                {
                    "produto_id": "",
                    "produto_codigo": "PROD-001",
                    "produto_descricao": "Produto Teste",
                    "quantidade": 2,
                    "preco_compra": 50.0,
                    "preco_venda": 100.0,
                    "despesas": 0.0,
                    "lucro_item": 100.0,
                    "subtotal": 200.0,
                    "personalizado": False,
                    "tipo_personalizacao": None,
                    "valor_personalizacao": 0.0,
                    "repassar_personalizacao": False
                }
            ],
            "frete": 25.0,
            "repassar_frete": True,
            "outras_despesas": 0.0,
            "despesas_detalhadas": [],
            "prazo_entrega": "5 dias úteis",
            "forma_pagamento": "pix",
            "dados_pagamento_id": dados_pagamento_id,
            "tipo_venda": "consumidor_final",
            "vendedor": "Vendedor Teste"
        }

        created_pedido = self.run_test(
            "POST /api/pedidos - Create Order with Payment Data",
            "POST",
            "pedidos",
            200,
            data=test_pedido
        )

        if created_pedido:
            pedido_id = created_pedido.get('id')
            self.created_ids['pedidos'].append(pedido_id)
            
            # Verify payment data ID was saved
            payment_data_saved = created_pedido.get('dados_pagamento_id') == dados_pagamento_id
            self.log_test(
                "Verify Payment Data ID Saved",
                payment_data_saved,
                f"dados_pagamento_id: {created_pedido.get('dados_pagamento_id')}"
            )
            
            # Verify automatic order number generation
            numero_generated = created_pedido.get('numero', '').startswith('PED-')
            self.log_test(
                "Automatic Order Number Generation",
                numero_generated,
                f"Generated number: {created_pedido.get('numero')}"
            )
            
            # Verify client history was updated
            cliente_updated = self.run_test(
                "Verify Client History Updated",
                "GET",
                f"clientes",
                200
            )
            
            if cliente_updated:
                our_cliente = next((c for c in cliente_updated if c.get('id') == cliente_id), None)
                if our_cliente:
                    historico = our_cliente.get('historico', [])
                    history_updated = len(historico) > 0
                    self.log_test(
                        "Client History Auto-Update",
                        history_updated,
                        f"History entries: {len(historico)}"
                    )

        # Test 2: Edit existing order (PUT endpoint)
        if pedido_id:
            updated_pedido_data = test_pedido.copy()
            updated_pedido_data["prazo_entrega"] = "7 dias úteis"
            updated_pedido_data["frete"] = 30.0
            updated_pedido_data["dados_pagamento_id"] = self.created_ids['dados_pagamento'][1] if len(self.created_ids['dados_pagamento']) > 1 else dados_pagamento_id

            updated_pedido = self.run_test(
                "PUT /api/pedidos/{id} - Edit Existing Order",
                "PUT",
                f"pedidos/{pedido_id}",
                200,
                data=updated_pedido_data
            )

            if updated_pedido:
                # Verify changes were applied
                changes_applied = (
                    updated_pedido.get('prazo_entrega') == "7 dias úteis" and
                    updated_pedido.get('frete') == 30.0
                )
                self.log_test(
                    "Verify Order Edit Changes",
                    changes_applied,
                    f"prazo_entrega: {updated_pedido.get('prazo_entrega')}, frete: {updated_pedido.get('frete')}"
                )

        # Test 3: Get all orders to verify structure
        all_pedidos = self.run_test(
            "GET /api/pedidos - List All Orders",
            "GET",
            "pedidos",
            200
        )

        if all_pedidos:
            # Find our created order
            our_pedido = next((p for p in all_pedidos if p.get('id') == pedido_id), None)
            if our_pedido:
                # Verify required fields for frontend
                required_fields = ['numero', 'data', 'cliente_nome', 'vendedor', 'valor_total_venda', 'lucro_total', 'status', 'dados_pagamento_id']
                fields_present = all(field in our_pedido for field in required_fields)
                
                self.log_test(
                    "Verify Order Fields for Frontend",
                    fields_present,
                    f"All required fields present: {fields_present}"
                )

        return True

    def test_integration_scenarios(self):
        """Test integration scenarios between modules"""
        print("\n🔗 Testing Integration Scenarios...")
        
        if not self.created_ids['clientes'] or not self.created_ids['dados_pagamento']:
            print("❌ Missing test data for integration tests")
            return False
        
        # Test 1: Create order, verify client history, then add occurrence
        cliente_id = self.created_ids['clientes'][0]
        dados_pagamento_id = self.created_ids['dados_pagamento'][0]
        
        # Create another order for the same client
        test_pedido_2 = {
            "cliente_id": cliente_id,
            "itens": [
                {
                    "produto_id": "",
                    "produto_codigo": "PROD-002",
                    "produto_descricao": "Produto Teste 2",
                    "quantidade": 1,
                    "preco_compra": 75.0,
                    "preco_venda": 150.0,
                    "despesas": 0.0,
                    "lucro_item": 75.0,
                    "subtotal": 150.0,
                    "personalizado": False
                }
            ],
            "frete": 15.0,
            "repassar_frete": False,
            "outras_despesas": 0.0,
            "prazo_entrega": "3 dias úteis",
            "forma_pagamento": "cartao",
            "dados_pagamento_id": dados_pagamento_id,
            "tipo_venda": "revenda",
            "vendedor": "Vendedor Teste 2"
        }

        created_pedido_2 = self.run_test(
            "Create Second Order for Integration Test",
            "POST",
            "pedidos",
            200,
            data=test_pedido_2
        )

        if created_pedido_2:
            # Check if client history now has 2 entries
            cliente_check = self.run_test(
                "Check Client History After Second Order",
                "GET",
                "clientes",
                200
            )
            
            if cliente_check:
                our_cliente = next((c for c in cliente_check if c.get('id') == cliente_id), None)
                if our_cliente:
                    historico = our_cliente.get('historico', [])
                    history_count_correct = len(historico) >= 2
                    self.log_test(
                        "Client History Multiple Orders",
                        history_count_correct,
                        f"History entries: {len(historico)}"
                    )

        # Test 2: Add occurrence related to payment
        payment_occurrence = {
            "tipo": "pagamento_atrasado",
            "descricao": f"Pagamento do pedido {created_pedido_2.get('numero', 'N/A')} está atrasado há 5 dias"
        }

        payment_occurrence_result = self.run_test(
            "Add Payment-Related Occurrence",
            "POST",
            f"clientes/{cliente_id}/ocorrencias",
            200,
            data=payment_occurrence
        )

        # Test 3: Verify complete client data with history and occurrences
        final_cliente_check = self.run_test(
            "Final Client Data Verification",
            "GET",
            "clientes",
            200
        )

        if final_cliente_check:
            our_cliente = next((c for c in final_cliente_check if c.get('id') == cliente_id), None)
            if our_cliente:
                historico = our_cliente.get('historico', [])
                ocorrencias = our_cliente.get('ocorrencias', [])
                
                complete_data = len(historico) >= 2 and len(ocorrencias) >= 2
                self.log_test(
                    "Complete Client Data Integration",
                    complete_data,
                    f"History: {len(historico)} entries, Occurrences: {len(ocorrencias)} entries"
                )

        return True

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created orders
        for pedido_id in self.created_ids['pedidos']:
            self.run_test(
                f"Cleanup: Delete Order {pedido_id}",
                "DELETE",
                f"pedidos/{pedido_id}",
                200
            )
        
        # Delete created clients
        for cliente_id in self.created_ids['clientes']:
            self.run_test(
                f"Cleanup: Delete Client {cliente_id}",
                "DELETE",
                f"clientes/{cliente_id}",
                200
            )
        
        # Delete created payment data
        for dados_id in self.created_ids['dados_pagamento']:
            self.run_test(
                f"Cleanup: Delete Payment Data {dados_id}",
                "DELETE",
                f"dados-pagamento/{dados_id}",
                200
            )

    def run_all_tests(self):
        """Run all tests for business management dashboard"""
        print("🚀 Starting Business Management Dashboard API Tests...")
        print(f"   Base URL: {self.base_url}")
        print(f"   API URL: {self.api_url}")

        # Test authentication first
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False

        # Run test modules
        print("\n" + "="*60)
        print("Testing Dados de Pagamento Module")
        print("="*60)
        self.test_dados_pagamento_module()
        
        print("\n" + "="*60)
        print("Testing Clientes Module with New Fields")
        print("="*60)
        self.test_clientes_module()
        
        print("\n" + "="*60)
        print("Testing Pedidos Module with Edit & Payment Data")
        print("="*60)
        self.test_pedidos_module()
        
        print("\n" + "="*60)
        print("Testing Integration Scenarios")
        print("="*60)
        self.test_integration_scenarios()
        
        # Cleanup
        self.cleanup_test_data()

        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        return self.tests_passed == self.tests_run

def main():
    tester = GestaoAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/gestao_backend_results.json', 'w') as f:
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