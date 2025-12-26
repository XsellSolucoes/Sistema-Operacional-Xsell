import requests
import sys
import json
import io
from datetime import datetime, timedelta

class XSELLAPITester:
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

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        # Only set Content-Type for JSON requests
        if not files and data:
            headers['Content-Type'] = 'application/json'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
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
                    # For file downloads, return the response object
                    return response
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_login(self):
        """Test login and get token"""
        print("\n🔐 Testing Authentication...")
        
        # First try with the test credentials from the review request
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
        
        # Fallback to original test user
        response_data = self.run_test(
            "User Login (test@xsell.com)",
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
        """Test P1: Complete Orçamentos (Budget) module functionality with new features"""
        print("\n💰 Testing P1: Orçamentos Module with New Features...")
        
        # First, ensure we have test data (cliente and produto)
        cliente_id = self.setup_test_cliente()
        produto_id = self.setup_test_produto()
        
        if not cliente_id or not produto_id:
            print("❌ Failed to setup test data for orçamentos")
            return False
        
        # Test 1: Create new orçamento with all new fields including personalization
        test_orcamento = {
            "cliente_id": cliente_id,
            "vendedor": "João Silva",
            "itens": [
                {
                    "produto_codigo": "PROD-001",
                    "descricao": "Produto com Personalização",
                    "quantidade": 2,
                    "unidade": "UN",
                    "preco_unitario": 150.00,
                    "preco_total": 320.00,  # 2 * (150 + 10) = 320
                    "personalizado": True,
                    "tipo_personalizacao": "Gravação a Laser",
                    "valor_personalizacao": 10.00,
                    "imagem_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                },
                {
                    "produto_codigo": "PROD-002", 
                    "descricao": "Produto Sem Personalização",
                    "quantidade": 1,
                    "unidade": "UN",
                    "preco_unitario": 200.00,
                    "preco_total": 200.00,
                    "personalizado": False,
                    "tipo_personalizacao": "",
                    "valor_personalizacao": 0.00
                }
            ],
            "validade_dias": 15,
            "forma_pagamento": "À Vista",
            "prazo_entrega": "10 dias úteis",
            "frete_por_conta": "destinatario",
            "valor_frete": 50.00,
            "repassar_frete": True,
            "outras_despesas": 30.00,
            "descricao_outras_despesas": "Taxa de embalagem especial",
            "repassar_outras_despesas": True,
            "desconto": 25.00,
            "dias_cobrar_resposta": 5,
            "observacoes": "Produto sujeito à disponibilidade de estoque no momento do fechamento do pedido, devido a estoque rotativo."
        }

        created_orcamento = self.run_test(
            "P1: Create Orçamento with Personalization & New Fields",
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

        # Test 2: Verify automatic calculations with new fields
        expected_subtotal = 520.00  # 320 + 200
        expected_frete_cliente = 50.00  # repassar_frete = True
        expected_outras_cliente = 30.00  # repassar_outras_despesas = True
        expected_valor_final = expected_subtotal + expected_frete_cliente + expected_outras_cliente - 25.00  # 575.00
        
        calculations_correct = (
            abs(created_orcamento.get('valor_total', 0) - expected_subtotal) < 0.01 and
            abs(created_orcamento.get('valor_final', 0) - expected_valor_final) < 0.01
        )
        
        self.log_test(
            "P1: Automatic Calculations with Frete/Despesas Repasse",
            calculations_correct,
            f"Subtotal: {created_orcamento.get('valor_total')}, Final: {created_orcamento.get('valor_final')}, Expected Final: {expected_valor_final}"
        )

        # Test 3: Verify data_cobrar_resposta was set correctly
        data_cobrar = created_orcamento.get('data_cobrar_resposta')
        cobrar_dias_correct = bool(data_cobrar) and created_orcamento.get('dias_cobrar_resposta') == 5
        
        self.log_test(
            "P1: Days to Charge Response Configuration",
            cobrar_dias_correct,
            f"dias_cobrar_resposta: {created_orcamento.get('dias_cobrar_resposta')}, data_cobrar_resposta: {data_cobrar}"
        )

        # Test 4: Get specific orçamento and verify all fields
        retrieved_orcamento = self.run_test(
            "P1: Get Specific Orçamento with New Fields",
            "GET",
            f"orcamentos/{orcamento_id}",
            200
        )

        if retrieved_orcamento:
            # Verify personalization fields are preserved
            first_item = retrieved_orcamento.get('itens', [{}])[0]
            personalization_preserved = (
                first_item.get('personalizado') == True and
                first_item.get('tipo_personalizacao') == "Gravação a Laser" and
                first_item.get('valor_personalizacao') == 10.00
            )
            
            self.log_test(
                "P1: Personalization Fields Preserved",
                personalization_preserved,
                f"personalizado: {first_item.get('personalizado')}, tipo: {first_item.get('tipo_personalizacao')}, valor: {first_item.get('valor_personalizacao')}"
            )

        # Test 5: Test "Já Cobrei o Cliente" functionality
        cobrado_result = self.run_test(
            "P1: Mark Cliente as Cobrado",
            "PUT",
            f"orcamentos/{orcamento_id}/marcar-cobrado?cobrado=true",
            200
        )

        if cobrado_result:
            cobrado_status = cobrado_result.get('cliente_cobrado')
            self.log_test(
                "P1: Cliente Cobrado Status Update",
                cobrado_status == True,
                f"cliente_cobrado: {cobrado_status}"
            )

        # Test 6: Update orçamento with different repasse options
        updated_data = test_orcamento.copy()
        updated_data["repassar_frete"] = False  # Don't pass freight to client
        updated_data["repassar_outras_despesas"] = False  # Don't pass other expenses to client
        updated_data["dias_cobrar_resposta"] = 10  # Change to 10 days

        updated_orcamento = self.run_test(
            "P1: Edit Orçamento with Different Repasse Options",
            "PUT",
            f"orcamentos/{orcamento_id}",
            200,
            data=updated_data
        )

        if updated_orcamento:
            # With repasse = False, valor_final should be lower
            expected_final_no_repasse = expected_subtotal - 25.00  # Only subtotal - discount = 495.00
            final_value_correct = abs(updated_orcamento.get('valor_final', 0) - expected_final_no_repasse) < 0.01
            
            self.log_test(
                "P1: Calculations with Repasse = False",
                final_value_correct,
                f"Final value: {updated_orcamento.get('valor_final')}, Expected: {expected_final_no_repasse}"
            )

        # Test 7: Convert orçamento to pedido
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

        # Test 8: Get all orçamentos and verify status cards data
        all_orcamentos = self.run_test(
            "P1: Get All Orçamentos for Status Cards",
            "GET",
            "orcamentos",
            200
        )

        if all_orcamentos:
            found_orcamento = any(orc.get('id') == orcamento_id for orc in all_orcamentos)
            converted_count = len([orc for orc in all_orcamentos if orc.get('status') == 'convertido'])
            abertos_count = len([orc for orc in all_orcamentos if orc.get('status') == 'aberto'])
            
            self.log_test(
                "P1: Find Created Orçamento in List",
                found_orcamento,
                f"Found {len(all_orcamentos)} orçamentos total, {abertos_count} abertos, {converted_count} convertidos"
            )

        # Test 9: Create another orçamento to test cobrança indicators
        test_orcamento_urgente = test_orcamento.copy()
        test_orcamento_urgente["dias_cobrar_resposta"] = 1  # Due tomorrow
        
        urgente_orcamento = self.run_test(
            "P1: Create Orçamento with 1-day Response Time",
            "POST",
            "orcamentos",
            200,
            data=test_orcamento_urgente
        )

        if urgente_orcamento:
            urgente_id = urgente_orcamento.get('id')
            # This should appear in pending cobrança list
            self.log_test(
                "P1: Urgent Orçamento Created for Cobrança Testing",
                bool(urgente_id),
                f"Created urgent orçamento: {urgente_orcamento.get('numero')}"
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
        
    def test_boleto_download_functionality(self):
        """Test complete boleto download functionality as requested in review"""
        print("\n💳 Testing Boleto Download Functionality...")
        
        # Step 1: Create a test user (if needed)
        test_user = {
            "email": "testfinanceiro@test.com",
            "password": "test123",
            "name": "Test Financeiro User"
        }
        
        user_created = self.run_test(
            "Create Test User (if not exists)",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        # Step 2: Create a test despesa
        test_despesa = {
            "tipo": "fornecedor",
            "descricao": "Despesa de teste para boleto",
            "valor": 1500.00,
            "data_despesa": datetime.now().isoformat(),
            "data_vencimento": (datetime.now() + timedelta(days=30)).isoformat(),
            "status": "pendente"
        }
        
        created_despesa = self.run_test(
            "Create Test Despesa",
            "POST",
            "despesas",
            200,
            data=test_despesa
        )
        
        if not created_despesa:
            print("❌ Failed to create test despesa - cannot continue boleto tests")
            return False
        
        despesa_id = created_despesa.get('id')
        print(f"   Created despesa ID: {despesa_id}")
        
        # Step 3: Create a test PDF file for upload
        test_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF"
        
        # Step 4: Upload boleto file
        files = {
            'file': ('test_boleto.pdf', io.BytesIO(test_pdf_content), 'application/pdf')
        }
        
        upload_result = self.run_test(
            "Upload Boleto File",
            "POST",
            f"despesas/{despesa_id}/upload-boleto",
            200,
            files=files
        )
        
        if not upload_result:
            print("❌ Failed to upload boleto - cannot continue download tests")
            return False
        
        boleto_info = upload_result.get('boleto', {})
        print(f"   Uploaded boleto: {boleto_info.get('nome')}")
        
        # Step 5: Verify despesa now includes boleto information
        updated_despesa = self.run_test(
            "Get Despesa with Boleto Info",
            "GET",
            f"despesas",
            200
        )
        
        if updated_despesa:
            # Find our despesa in the list
            our_despesa = None
            for desp in updated_despesa:
                if desp.get('id') == despesa_id:
                    our_despesa = desp
                    break
            
            if our_despesa and our_despesa.get('boleto'):
                self.log_test(
                    "Despesa Contains Boleto Info",
                    True,
                    f"Boleto attached: {our_despesa['boleto'].get('nome')}"
                )
            else:
                self.log_test(
                    "Despesa Contains Boleto Info",
                    False,
                    "Boleto info not found in despesa"
                )
        
        # Step 6: Test boleto download endpoint
        download_response = self.run_test(
            "Download Boleto File",
            "GET",
            f"despesas/{despesa_id}/boleto/download",
            200
        )
        
        if download_response and hasattr(download_response, 'content'):
            # Verify the downloaded content
            downloaded_content = download_response.content
            content_length = len(downloaded_content)
            
            # Check if we got some content back
            download_success = content_length > 0
            self.log_test(
                "Boleto Download Content Verification",
                download_success,
                f"Downloaded {content_length} bytes"
            )
            
            # Check content type header
            content_type = download_response.headers.get('content-type', '')
            correct_content_type = 'application/pdf' in content_type or 'application/octet-stream' in content_type
            self.log_test(
                "Boleto Download Content-Type",
                correct_content_type,
                f"Content-Type: {content_type}"
            )
        
        # Step 7: Test download of non-existent boleto (should fail)
        # First create a despesa without boleto
        despesa_no_boleto = {
            "tipo": "fornecedor",
            "descricao": "Despesa sem boleto",
            "valor": 500.00,
            "data_despesa": datetime.now().isoformat(),
            "data_vencimento": (datetime.now() + timedelta(days=15)).isoformat(),
            "status": "pendente"
        }
        
        created_despesa_no_boleto = self.run_test(
            "Create Despesa Without Boleto",
            "POST",
            "despesas",
            200,
            data=despesa_no_boleto
        )
        
        if created_despesa_no_boleto:
            despesa_no_boleto_id = created_despesa_no_boleto.get('id')
            
            # Try to download boleto from despesa without boleto (should fail with 404)
            self.run_test(
                "Download Non-existent Boleto (should fail 404)",
                "GET",
                f"despesas/{despesa_no_boleto_id}/boleto/download",
                404
            )
        
        # Step 8: Test download with invalid despesa ID (should fail)
        self.run_test(
            "Download Boleto Invalid Despesa ID (should fail 404)",
            "GET",
            "despesas/invalid-id/boleto/download",
            404
        )
        
        # Step 9: Test specific despesa ID mentioned in review request
        existing_despesa_id = "3306f4a4-f623-4b2f-a886-dcda2fee9d4d"
        existing_boleto_download = self.run_test(
            "Download Existing Boleto (ID from review)",
            "GET",
            f"despesas/{existing_despesa_id}/boleto/download",
            200
        )
        
        if existing_boleto_download and hasattr(existing_boleto_download, 'content'):
            content_length = len(existing_boleto_download.content)
            self.log_test(
                "Existing Boleto Download Success",
                content_length > 0,
                f"Downloaded {content_length} bytes from existing despesa"
            )
        
        # Step 10: Test boleto deletion
        delete_result = self.run_test(
            "Delete Boleto",
            "DELETE",
            f"despesas/{despesa_id}/boleto",
            200
        )
        
        if delete_result:
            # Verify boleto is removed
            self.run_test(
                "Download Deleted Boleto (should fail 404)",
                "GET",
                f"despesas/{despesa_id}/boleto/download",
                404
            )
        
        return True
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

        # Run Boleto Download Test (Priority test from review request)
        print("\n" + "="*60)
        print("Testing BOLETO DOWNLOAD FUNCTIONALITY (Review Request)")
        print("="*60)
        self.test_boleto_download_functionality()

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