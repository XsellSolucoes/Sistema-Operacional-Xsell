import requests
import sys
import json
from datetime import datetime, timedelta

class AgendaLicitacoesAPITester:
    def __init__(self, base_url="https://compro-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_licitacao_id = None
        self.created_evento_id = None
        self.created_anexo_id = None

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
            "email": "test@agenda.com",
            "password": "Test123!",
            "name": "Test User Agenda"
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
            data={"email": "test@agenda.com", "password": "Test123!"}
        )
        
        if response_data and 'access_token' in response_data:
            self.token = response_data['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_create_agenda_licitacao(self):
        """Test POST /api/agenda-licitacoes - Create new agenda licitacao"""
        print("\n📋 Testing Agenda Licitação Creation...")
        
        # Test data with required fields
        licitacao_data = {
            "data_disputa": (datetime.now() + timedelta(days=7)).isoformat(),
            "horario_disputa": "14:30",
            "numero_licitacao": "PE-001/2025-AGENDA",
            "portal": "ComprasNet",
            "cidade": "São Paulo",
            "estado": "SP",
            "produtos": ["Produto A", "Produto B"],
            "objeto": "Aquisição de produtos para teste da agenda",
            "valor_estimado": 50000.00,
            "observacoes": "Licitação de teste para agenda"
        }
        
        response_data = self.run_test(
            "Create Agenda Licitação",
            "POST",
            "agenda-licitacoes",
            200,
            data=licitacao_data
        )
        
        if response_data:
            self.created_licitacao_id = response_data.get('id')
            
            # Validate required fields
            required_fields = ['id', 'data_disputa', 'horario_disputa', 'numero_licitacao', 'portal', 'cidade', 'estado']
            missing_fields = [field for field in required_fields if field not in response_data]
            
            if not missing_fields:
                self.log_test("Required fields validation", True, "All required fields present")
            else:
                self.log_test("Required fields validation", False, f"Missing fields: {missing_fields}")
            
            # Validate default values
            if response_data.get('status') == 'agendada':
                self.log_test("Default status validation", True, "Status set to 'agendada'")
            else:
                self.log_test("Default status validation", False, f"Expected 'agendada', got {response_data.get('status')}")
            
            # Validate historico creation
            historico = response_data.get('historico', [])
            if len(historico) > 0 and 'criada' in historico[0].get('acao', '').lower():
                self.log_test("History creation", True, "Creation history entry added")
            else:
                self.log_test("History creation", False, "No creation history found")
            
            return response_data
        
        return None

    def test_create_agenda_licitacao_validation(self):
        """Test validation of required fields"""
        print("\n⚠️ Testing Required Fields Validation...")
        
        # Test missing required fields
        invalid_data = {
            "portal": "ComprasNet",
            "cidade": "São Paulo"
            # Missing data_disputa, horario_disputa, numero_licitacao
        }
        
        response_data = self.run_test(
            "Validation - Missing Required Fields",
            "POST",
            "agenda-licitacoes",
            422,  # Expecting validation error
            data=invalid_data
        )
        
        # Test empty required fields
        empty_data = {
            "data_disputa": "",
            "horario_disputa": "",
            "numero_licitacao": "",
            "portal": "ComprasNet",
            "cidade": "São Paulo",
            "estado": "SP"
        }
        
        response_data = self.run_test(
            "Validation - Empty Required Fields",
            "POST",
            "agenda-licitacoes",
            422,  # Expecting validation error
            data=empty_data
        )

    def test_get_agenda_licitacoes(self):
        """Test GET /api/agenda-licitacoes - List all agenda licitacoes"""
        print("\n📊 Testing Agenda Licitações List...")
        
        response_data = self.run_test(
            "Get Agenda Licitações List",
            "GET",
            "agenda-licitacoes",
            200
        )
        
        if response_data and isinstance(response_data, list):
            if len(response_data) > 0:
                licitacao = response_data[0]
                
                # Check calculated fields (alertas)
                if 'alertas' in licitacao:
                    self.log_test("Alerts calculation", True, f"Alerts field present with {len(licitacao['alertas'])} items")
                else:
                    self.log_test("Alerts calculation", False, "Alerts field missing")
                
                # Check date ordering (should be sorted by data_disputa)
                if len(response_data) > 1:
                    first_date = response_data[0].get('data_disputa')
                    second_date = response_data[1].get('data_disputa')
                    if first_date and second_date and first_date <= second_date:
                        self.log_test("Date ordering", True, "Results ordered by data_disputa")
                    else:
                        self.log_test("Date ordering", False, "Results not properly ordered")
                
                return response_data
            else:
                self.log_test("Agenda Licitações list", False, "No agenda licitações found")
        else:
            self.log_test("Agenda Licitações list", False, "Invalid response format")
        
        return None

    def test_get_agenda_licitacao_by_id(self):
        """Test GET /api/agenda-licitacoes/{id} - Get specific agenda licitacao"""
        print("\n🔍 Testing Get Agenda Licitação by ID...")
        
        if not self.created_licitacao_id:
            self.log_test("Get by ID test setup", False, "No licitação ID available")
            return None
        
        response_data = self.run_test(
            "Get Agenda Licitação by ID",
            "GET",
            f"agenda-licitacoes/{self.created_licitacao_id}",
            200
        )
        
        if response_data:
            # Validate ID matches
            if response_data.get('id') == self.created_licitacao_id:
                self.log_test("ID validation", True, "Correct licitação returned")
            else:
                self.log_test("ID validation", False, f"Expected ID {self.created_licitacao_id}, got {response_data.get('id')}")
            
            return response_data
        
        return None

    def test_update_agenda_licitacao(self):
        """Test PUT /api/agenda-licitacoes/{id} - Update agenda licitacao"""
        print("\n✏️ Testing Agenda Licitação Update...")
        
        if not self.created_licitacao_id:
            self.log_test("Update test setup", False, "No licitação ID available")
            return None
        
        # Updated data
        update_data = {
            "data_disputa": (datetime.now() + timedelta(days=10)).isoformat(),
            "horario_disputa": "15:00",
            "numero_licitacao": "PE-001/2025-AGENDA-UPDATED",
            "portal": "BLL",
            "cidade": "Rio de Janeiro",
            "estado": "RJ",
            "produtos": ["Produto A", "Produto B", "Produto C"],
            "objeto": "Aquisição de produtos para teste da agenda - ATUALIZADO",
            "valor_estimado": 75000.00,
            "observacoes": "Licitação de teste para agenda - ATUALIZADA"
        }
        
        response_data = self.run_test(
            "Update Agenda Licitação",
            "PUT",
            f"agenda-licitacoes/{self.created_licitacao_id}",
            200,
            data=update_data
        )
        
        if response_data:
            # Validate updates
            if response_data.get('numero_licitacao') == update_data['numero_licitacao']:
                self.log_test("Update validation", True, "Fields updated correctly")
            else:
                self.log_test("Update validation", False, "Fields not updated properly")
            
            # Check history update
            historico = response_data.get('historico', [])
            if len(historico) >= 2:  # Should have creation + update entries
                update_entry = historico[-1]  # Last entry should be update
                if 'atualizada' in update_entry.get('acao', '').lower():
                    self.log_test("Update history", True, "Update history entry added")
                else:
                    self.log_test("Update history", False, "Update history entry not found")
            else:
                self.log_test("Update history", False, "Insufficient history entries")
            
            return response_data
        
        return None

    def test_update_status(self):
        """Test PUT /api/agenda-licitacoes/{id}/status - Update status"""
        print("\n🔄 Testing Status Update...")
        
        if not self.created_licitacao_id:
            self.log_test("Status update test setup", False, "No licitação ID available")
            return None
        
        # Test valid status update
        response_data = self.run_test(
            "Update Status to 'em_andamento'",
            "PUT",
            f"agenda-licitacoes/{self.created_licitacao_id}/status",
            200,
            params={"status": "em_andamento"}
        )
        
        if response_data:
            # Verify status was updated
            updated_licitacao = self.run_test(
                "Verify Status Update",
                "GET",
                f"agenda-licitacoes/{self.created_licitacao_id}",
                200
            )
            
            if updated_licitacao and updated_licitacao.get('status') == 'em_andamento':
                self.log_test("Status update verification", True, "Status updated to 'em_andamento'")
            else:
                self.log_test("Status update verification", False, f"Status not updated, got: {updated_licitacao.get('status') if updated_licitacao else 'None'}")
        
        # Test invalid status
        invalid_response = self.run_test(
            "Invalid Status Update",
            "PUT",
            f"agenda-licitacoes/{self.created_licitacao_id}/status",
            400,  # Expecting error
            params={"status": "invalid_status"}
        )

    def test_add_evento(self):
        """Test POST /api/agenda-licitacoes/{id}/eventos - Add event"""
        print("\n📅 Testing Add Event...")
        
        if not self.created_licitacao_id:
            self.log_test("Add event test setup", False, "No licitação ID available")
            return None
        
        # Event data
        evento_data = {
            "data": (datetime.now() + timedelta(days=3)).isoformat(),
            "horario": "10:00",
            "tipo": "proposta",
            "descricao": "Prazo para envio de proposta",
            "status": "pendente"
        }
        
        response_data = self.run_test(
            "Add Event to Timeline",
            "POST",
            f"agenda-licitacoes/{self.created_licitacao_id}/eventos",
            200,
            data=evento_data
        )
        
        if response_data:
            evento = response_data.get('evento', {})
            self.created_evento_id = evento.get('id')
            
            if self.created_evento_id:
                self.log_test("Event creation", True, f"Event created with ID: {self.created_evento_id}")
            else:
                self.log_test("Event creation", False, "Event ID not returned")
            
            # Verify event was added to licitação
            updated_licitacao = self.run_test(
                "Verify Event Added",
                "GET",
                f"agenda-licitacoes/{self.created_licitacao_id}",
                200
            )
            
            if updated_licitacao:
                eventos = updated_licitacao.get('eventos', [])
                if len(eventos) > 0:
                    self.log_test("Event integration", True, f"Event added to licitação, total events: {len(eventos)}")
                else:
                    self.log_test("Event integration", False, "Event not found in licitação")
            
            return response_data
        
        return None

    def test_update_evento_status(self):
        """Test PUT /api/agenda-licitacoes/{id}/eventos/{evento_id}/status - Update event status"""
        print("\n🔄 Testing Event Status Update...")
        
        if not self.created_licitacao_id or not self.created_evento_id:
            self.log_test("Event status update test setup", False, "No licitação or event ID available")
            return None
        
        response_data = self.run_test(
            "Update Event Status to 'concluido'",
            "PUT",
            f"agenda-licitacoes/{self.created_licitacao_id}/eventos/{self.created_evento_id}/status",
            200,
            params={"status": "concluido"}
        )
        
        if response_data:
            # Verify event status was updated
            updated_licitacao = self.run_test(
                "Verify Event Status Update",
                "GET",
                f"agenda-licitacoes/{self.created_licitacao_id}",
                200
            )
            
            if updated_licitacao:
                eventos = updated_licitacao.get('eventos', [])
                event_found = False
                for evento in eventos:
                    if evento.get('id') == self.created_evento_id:
                        if evento.get('status') == 'concluido':
                            self.log_test("Event status verification", True, "Event status updated to 'concluido'")
                            event_found = True
                        else:
                            self.log_test("Event status verification", False, f"Event status not updated, got: {evento.get('status')}")
                        break
                
                if not event_found:
                    self.log_test("Event status verification", False, "Event not found in licitação")

    def test_add_anexo(self):
        """Test POST /api/agenda-licitacoes/{id}/anexos - Add attachment"""
        print("\n📎 Testing Add Attachment...")
        
        if not self.created_licitacao_id:
            self.log_test("Add attachment test setup", False, "No licitação ID available")
            return None
        
        # Attachment data
        anexo_data = {
            "nome": "Edital_PE_001_2025.pdf",
            "url": "https://example.com/edital.pdf",
            "tipo": "application/pdf",
            "tamanho": 1024000
        }
        
        response_data = self.run_test(
            "Add Attachment",
            "POST",
            f"agenda-licitacoes/{self.created_licitacao_id}/anexos",
            200,
            data=anexo_data
        )
        
        if response_data:
            anexo = response_data.get('anexo', {})
            self.created_anexo_id = anexo.get('id')
            
            if self.created_anexo_id:
                self.log_test("Attachment creation", True, f"Attachment created with ID: {self.created_anexo_id}")
            else:
                self.log_test("Attachment creation", False, "Attachment ID not returned")
            
            # Verify attachment was added to licitação
            updated_licitacao = self.run_test(
                "Verify Attachment Added",
                "GET",
                f"agenda-licitacoes/{self.created_licitacao_id}",
                200
            )
            
            if updated_licitacao:
                anexos = updated_licitacao.get('anexos', [])
                if len(anexos) > 0:
                    self.log_test("Attachment integration", True, f"Attachment added to licitação, total attachments: {len(anexos)}")
                else:
                    self.log_test("Attachment integration", False, "Attachment not found in licitação")
            
            return response_data
        
        return None

    def test_delete_evento(self):
        """Test DELETE /api/agenda-licitacoes/{id}/eventos/{evento_id} - Delete event"""
        print("\n🗑️ Testing Delete Event...")
        
        if not self.created_licitacao_id or not self.created_evento_id:
            self.log_test("Delete event test setup", False, "No licitação or event ID available")
            return None
        
        response_data = self.run_test(
            "Delete Event",
            "DELETE",
            f"agenda-licitacoes/{self.created_licitacao_id}/eventos/{self.created_evento_id}",
            200
        )
        
        if response_data:
            # Verify event was removed
            updated_licitacao = self.run_test(
                "Verify Event Deleted",
                "GET",
                f"agenda-licitacoes/{self.created_licitacao_id}",
                200
            )
            
            if updated_licitacao:
                eventos = updated_licitacao.get('eventos', [])
                event_found = any(evento.get('id') == self.created_evento_id for evento in eventos)
                
                if not event_found:
                    self.log_test("Event deletion verification", True, "Event successfully deleted")
                else:
                    self.log_test("Event deletion verification", False, "Event still exists after deletion")

    def test_delete_anexo(self):
        """Test DELETE /api/agenda-licitacoes/{id}/anexos/{anexo_id} - Delete attachment"""
        print("\n🗑️ Testing Delete Attachment...")
        
        if not self.created_licitacao_id or not self.created_anexo_id:
            self.log_test("Delete attachment test setup", False, "No licitação or attachment ID available")
            return None
        
        response_data = self.run_test(
            "Delete Attachment",
            "DELETE",
            f"agenda-licitacoes/{self.created_licitacao_id}/anexos/{self.created_anexo_id}",
            200
        )
        
        if response_data:
            # Verify attachment was removed
            updated_licitacao = self.run_test(
                "Verify Attachment Deleted",
                "GET",
                f"agenda-licitacoes/{self.created_licitacao_id}",
                200
            )
            
            if updated_licitacao:
                anexos = updated_licitacao.get('anexos', [])
                anexo_found = any(anexo.get('id') == self.created_anexo_id for anexo in anexos)
                
                if not anexo_found:
                    self.log_test("Attachment deletion verification", True, "Attachment successfully deleted")
                else:
                    self.log_test("Attachment deletion verification", False, "Attachment still exists after deletion")

    def test_get_filtros_options(self):
        """Test GET /api/agenda-licitacoes/filtros/options - Get filter options"""
        print("\n🔍 Testing Filter Options...")
        
        response_data = self.run_test(
            "Get Filter Options",
            "GET",
            "agenda-licitacoes/filtros/options",
            200
        )
        
        if response_data:
            # Check if response has expected structure
            expected_fields = ['cidades', 'estados', 'portais', 'produtos']
            present_fields = [field for field in expected_fields if field in response_data]
            
            if len(present_fields) > 0:
                self.log_test("Filter options structure", True, f"Filter options available: {present_fields}")
            else:
                self.log_test("Filter options structure", False, "No filter options found")
            
            return response_data
        
        return None

    def test_delete_agenda_licitacao(self):
        """Test DELETE /api/agenda-licitacoes/{id} - Delete agenda licitacao"""
        print("\n🗑️ Testing Delete Agenda Licitação...")
        
        if not self.created_licitacao_id:
            self.log_test("Delete test setup", False, "No licitação ID available")
            return None
        
        response_data = self.run_test(
            "Delete Agenda Licitação",
            "DELETE",
            f"agenda-licitacoes/{self.created_licitacao_id}",
            200
        )
        
        if response_data:
            # Verify licitação was deleted
            deleted_check = self.run_test(
                "Verify Licitação Deleted",
                "GET",
                f"agenda-licitacoes/{self.created_licitacao_id}",
                404  # Should return 404 Not Found
            )
            
            # If we got 404, deletion was successful
            # The run_test method will log this as success since we expect 404

    def test_alerts_calculation(self):
        """Test alerts calculation for different time periods"""
        print("\n🚨 Testing Alerts Calculation...")
        
        # Create licitação for today (should generate red alert)
        today_data = {
            "data_disputa": datetime.now().isoformat(),
            "horario_disputa": "16:00",
            "numero_licitacao": "PE-TODAY-TEST",
            "portal": "ComprasNet",
            "cidade": "Brasília",
            "estado": "DF",
            "produtos": ["Produto Teste"],
            "objeto": "Teste de alerta vermelho",
            "valor_estimado": 10000.00,
            "observacoes": "Licitação para teste de alerta hoje"
        }
        
        today_response = self.run_test(
            "Create Today's Licitação",
            "POST",
            "agenda-licitacoes",
            200,
            data=today_data
        )
        
        if today_response:
            today_id = today_response.get('id')
            
            # Create licitação for tomorrow (should generate yellow alert)
            tomorrow_data = {
                "data_disputa": (datetime.now() + timedelta(hours=30)).isoformat(),
                "horario_disputa": "10:00",
                "numero_licitacao": "PE-TOMORROW-TEST",
                "portal": "BLL",
                "cidade": "São Paulo",
                "estado": "SP",
                "produtos": ["Produto Teste"],
                "objeto": "Teste de alerta amarelo",
                "valor_estimado": 15000.00,
                "observacoes": "Licitação para teste de alerta próximas 48h"
            }
            
            tomorrow_response = self.run_test(
                "Create Tomorrow's Licitação",
                "POST",
                "agenda-licitacoes",
                200,
                data=tomorrow_data
            )
            
            if tomorrow_response:
                tomorrow_id = tomorrow_response.get('id')
                
                # Get list and check alerts
                list_response = self.run_test(
                    "Get List with Alerts",
                    "GET",
                    "agenda-licitacoes",
                    200
                )
                
                if list_response:
                    # Find our test licitações and check alerts
                    today_found = False
                    tomorrow_found = False
                    
                    for lic in list_response:
                        if lic.get('id') == today_id:
                            alertas = lic.get('alertas', [])
                            red_alert = any('24h' in alert or '🔴' in alert for alert in alertas)
                            if red_alert:
                                self.log_test("Red alert (today)", True, "Red alert generated for today's licitação")
                            else:
                                self.log_test("Red alert (today)", False, f"No red alert found. Alerts: {alertas}")
                            today_found = True
                        
                        elif lic.get('id') == tomorrow_id:
                            alertas = lic.get('alertas', [])
                            yellow_alert = any('48h' in alert or '🟡' in alert for alert in alertas)
                            if yellow_alert:
                                self.log_test("Yellow alert (48h)", True, "Yellow alert generated for 48h licitação")
                            else:
                                self.log_test("Yellow alert (48h)", False, f"No yellow alert found. Alerts: {alertas}")
                            tomorrow_found = True
                    
                    if not today_found:
                        self.log_test("Red alert test", False, "Today's licitação not found in list")
                    if not tomorrow_found:
                        self.log_test("Yellow alert test", False, "Tomorrow's licitação not found in list")
                
                # Clean up test licitações
                self.run_test("Cleanup Today's Licitação", "DELETE", f"agenda-licitacoes/{today_id}", 200)
                self.run_test("Cleanup Tomorrow's Licitação", "DELETE", f"agenda-licitacoes/{tomorrow_id}", 200)

    def save_results(self):
        """Save test results to file"""
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%",
            "test_details": self.test_results
        }
        
        with open('/app/test_reports/agenda_licitacoes_backend_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📊 Test results saved to /app/test_reports/agenda_licitacoes_backend_results.json")

    def run_all_tests(self):
        """Run all agenda licitações tests"""
        print("🚀 Starting Agenda Licitações Backend API Tests...")
        print(f"   Base URL: {self.base_url}")
        
        # Authentication
        if not self.test_login():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Core CRUD operations
        self.test_create_agenda_licitacao()
        self.test_create_agenda_licitacao_validation()
        self.test_get_agenda_licitacoes()
        self.test_get_agenda_licitacao_by_id()
        self.test_update_agenda_licitacao()
        self.test_update_status()
        
        # Events management
        self.test_add_evento()
        self.test_update_evento_status()
        self.test_delete_evento()
        
        # Attachments management
        self.test_add_anexo()
        self.test_delete_anexo()
        
        # Filter options
        self.test_get_filtros_options()
        
        # Alerts calculation
        self.test_alerts_calculation()
        
        # Cleanup - delete the main test licitação
        self.test_delete_agenda_licitacao()
        
        # Save results
        self.save_results()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = AgendaLicitacoesAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())