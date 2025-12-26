import requests
import sys
import json
from datetime import datetime, timedelta

class RelatoriosAPITester:
    def __init__(self, base_url="https://contrato-manager.preview.emergentagent.com"):
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
        if params:
            print(f"   Params: {params}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

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

    def test_relatorios_filtros(self):
        """Test the filters endpoint"""
        print("\n📋 Testing Relatórios Filtros Endpoint...")
        
        filtros = self.run_test(
            "Get Available Filters",
            "GET",
            "relatorios/filtros",
            200
        )
        
        if filtros:
            # Verify expected structure
            expected_keys = ['vendedores', 'cidades', 'segmentos']
            has_all_keys = all(key in filtros for key in expected_keys)
            
            self.log_test(
                "Filters Structure Validation",
                has_all_keys,
                f"Keys present: {list(filtros.keys())}"
            )
            
            # Verify segmentos structure
            if 'segmentos' in filtros:
                segmentos = filtros['segmentos']
                expected_segmentos = ['todos', 'licitacao', 'consumidor_final', 'revenda', 'brindeiros']
                has_expected_segmentos = any(
                    seg.get('value') in expected_segmentos 
                    for seg in segmentos if isinstance(seg, dict)
                )
                
                self.log_test(
                    "Segmentos Options Validation",
                    has_expected_segmentos,
                    f"Segmentos: {[s.get('value') if isinstance(s, dict) else s for s in segmentos]}"
                )
            
            return filtros
        return None

    def test_relatorios_geral_basic(self):
        """Test basic general report without filters"""
        print("\n📊 Testing Basic General Report...")
        
        relatorio = self.run_test(
            "Get General Report (no filters)",
            "GET",
            "relatorios/geral",
            200
        )
        
        if relatorio:
            # Verify expected structure
            expected_keys = [
                'total_faturado', 'total_custo', 'lucro_total', 'total_despesas',
                'lucro_liquido', 'quantidade_pedidos', 'quantidade_licitacoes',
                'por_segmento', 'por_vendedor', 'por_cidade', 'transacoes_recentes'
            ]
            
            has_all_keys = all(key in relatorio for key in expected_keys)
            self.log_test(
                "Report Structure Validation",
                has_all_keys,
                f"Missing keys: {[k for k in expected_keys if k not in relatorio]}"
            )
            
            # Verify numeric fields are numbers
            numeric_fields = ['total_faturado', 'total_custo', 'lucro_total', 'total_despesas', 'lucro_liquido']
            numeric_valid = all(
                isinstance(relatorio.get(field, 0), (int, float)) 
                for field in numeric_fields
            )
            
            self.log_test(
                "Numeric Fields Validation",
                numeric_valid,
                f"Numeric values: {[(k, relatorio.get(k)) for k in numeric_fields]}"
            )
            
            # Verify calculation: lucro_liquido = lucro_total - total_despesas
            expected_lucro_liquido = relatorio.get('lucro_total', 0) - relatorio.get('total_despesas', 0)
            actual_lucro_liquido = relatorio.get('lucro_liquido', 0)
            calculation_correct = abs(expected_lucro_liquido - actual_lucro_liquido) < 0.01
            
            self.log_test(
                "Lucro Líquido Calculation",
                calculation_correct,
                f"Expected: {expected_lucro_liquido}, Actual: {actual_lucro_liquido}"
            )
            
            return relatorio
        return None

    def test_relatorios_date_filters(self):
        """Test date filtering"""
        print("\n📅 Testing Date Filters...")
        
        # Test with specific date range
        hoje = datetime.now()
        inicio_mes = datetime(hoje.year, hoje.month, 1)
        
        params = {
            'data_inicio': inicio_mes.strftime('%Y-%m-%d'),
            'data_fim': hoje.strftime('%Y-%m-%d')
        }
        
        relatorio_mes = self.run_test(
            "Get Report with Date Filter (Current Month)",
            "GET",
            "relatorios/geral",
            200,
            params=params
        )
        
        if relatorio_mes:
            self.log_test(
                "Date Filter Response Structure",
                'total_faturado' in relatorio_mes,
                f"Keys: {list(relatorio_mes.keys())}"
            )
        
        # Test with 7 days filter
        semana_atras = hoje - timedelta(days=7)
        params_semana = {
            'data_inicio': semana_atras.strftime('%Y-%m-%d'),
            'data_fim': hoje.strftime('%Y-%m-%d')
        }
        
        relatorio_semana = self.run_test(
            "Get Report with Date Filter (Last 7 Days)",
            "GET",
            "relatorios/geral",
            200,
            params=params_semana
        )
        
        return relatorio_semana

    def test_relatorios_segment_filters(self):
        """Test segment filtering"""
        print("\n🏷️ Testing Segment Filters...")
        
        # Test licitacao filter
        relatorio_licitacao = self.run_test(
            "Get Report with Licitação Filter",
            "GET",
            "relatorios/geral",
            200,
            params={'segmento': 'licitacao'}
        )
        
        if relatorio_licitacao:
            # Should have licitações data but no pedidos data
            has_licitacoes = relatorio_licitacao.get('quantidade_licitacoes', 0) >= 0
            self.log_test(
                "Licitação Filter - Structure Check",
                has_licitacoes,
                f"Licitações: {relatorio_licitacao.get('quantidade_licitacoes')}, Pedidos: {relatorio_licitacao.get('quantidade_pedidos')}"
            )
        
        # Test consumidor_final filter
        relatorio_consumidor = self.run_test(
            "Get Report with Consumidor Final Filter",
            "GET",
            "relatorios/geral",
            200,
            params={'segmento': 'consumidor_final'}
        )
        
        # Test revenda filter
        relatorio_revenda = self.run_test(
            "Get Report with Revenda Filter",
            "GET",
            "relatorios/geral",
            200,
            params={'segmento': 'revenda'}
        )
        
        # Test brindeiros filter
        relatorio_brindeiros = self.run_test(
            "Get Report with Brindeiros Filter",
            "GET",
            "relatorios/geral",
            200,
            params={'segmento': 'brindeiros'}
        )
        
        return relatorio_licitacao

    def test_relatorios_other_filters(self):
        """Test vendedor and cidade filters"""
        print("\n👥 Testing Other Filters...")
        
        # Test with vendedor filter (using a common name)
        relatorio_vendedor = self.run_test(
            "Get Report with Vendedor Filter",
            "GET",
            "relatorios/geral",
            200,
            params={'vendedor': 'João Silva'}
        )
        
        # Test with cidade filter
        relatorio_cidade = self.run_test(
            "Get Report with Cidade Filter",
            "GET",
            "relatorios/geral",
            200,
            params={'cidade': 'São Paulo'}
        )
        
        # Test with multiple filters combined
        hoje = datetime.now()
        inicio_mes = datetime(hoje.year, hoje.month, 1)
        
        params_combined = {
            'data_inicio': inicio_mes.strftime('%Y-%m-%d'),
            'data_fim': hoje.strftime('%Y-%m-%d'),
            'segmento': 'licitacao',
            'cidade': 'São Paulo'
        }
        
        relatorio_combined = self.run_test(
            "Get Report with Combined Filters",
            "GET",
            "relatorios/geral",
            200,
            params=params_combined
        )
        
        if relatorio_combined:
            self.log_test(
                "Combined Filters Response",
                'total_faturado' in relatorio_combined,
                f"Total faturado: {relatorio_combined.get('total_faturado', 0)}"
            )
        
        return relatorio_combined

    def test_relatorios_data_analysis(self):
        """Test data analysis sections"""
        print("\n📈 Testing Data Analysis Sections...")
        
        relatorio = self.run_test(
            "Get Report for Analysis",
            "GET",
            "relatorios/geral",
            200
        )
        
        if relatorio:
            # Test por_segmento analysis
            por_segmento = relatorio.get('por_segmento', {})
            if por_segmento:
                # Check structure of segment data
                first_segment = next(iter(por_segmento.values()), {})
                expected_segment_keys = ['quantidade', 'faturamento', 'lucro']
                segment_structure_valid = all(key in first_segment for key in expected_segment_keys)
                
                self.log_test(
                    "Por Segmento Structure",
                    segment_structure_valid,
                    f"Segment keys: {list(first_segment.keys())}"
                )
            
            # Test por_vendedor analysis
            por_vendedor = relatorio.get('por_vendedor', {})
            if por_vendedor:
                first_vendedor = next(iter(por_vendedor.values()), {})
                vendedor_structure_valid = all(key in first_vendedor for key in ['quantidade', 'faturamento', 'lucro'])
                
                self.log_test(
                    "Por Vendedor Structure",
                    vendedor_structure_valid,
                    f"Vendedor keys: {list(first_vendedor.keys())}"
                )
            
            # Test por_cidade analysis
            por_cidade = relatorio.get('por_cidade', {})
            if por_cidade:
                first_cidade = next(iter(por_cidade.values()), {})
                cidade_structure_valid = all(key in first_cidade for key in ['quantidade', 'faturamento', 'lucro'])
                
                self.log_test(
                    "Por Cidade Structure",
                    cidade_structure_valid,
                    f"Cidade keys: {list(first_cidade.keys())}"
                )
            
            # Test transacoes_recentes
            transacoes = relatorio.get('transacoes_recentes', [])
            if transacoes:
                first_transaction = transacoes[0] if transacoes else {}
                expected_transaction_keys = ['tipo', 'numero', 'cliente', 'valor', 'lucro', 'data', 'segmento', 'vendedor']
                transaction_structure_valid = all(key in first_transaction for key in expected_transaction_keys)
                
                self.log_test(
                    "Transações Recentes Structure",
                    transaction_structure_valid,
                    f"Transaction keys: {list(first_transaction.keys())}"
                )
            else:
                self.log_test(
                    "Transações Recentes",
                    True,
                    "No transactions found (empty list is valid)"
                )
        
        return relatorio

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n⚠️ Testing Error Handling...")
        
        # Test with invalid date format
        self.run_test(
            "Invalid Date Format",
            "GET",
            "relatorios/geral",
            422,  # Should return validation error
            params={'data_inicio': 'invalid-date'}
        )
        
        # Test with future dates
        future_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        relatorio_future = self.run_test(
            "Future Date Filter",
            "GET",
            "relatorios/geral",
            200,
            params={'data_inicio': future_date, 'data_fim': future_date}
        )
        
        if relatorio_future:
            # Should return empty results
            empty_results = (
                relatorio_future.get('total_faturado', 0) == 0 and
                relatorio_future.get('quantidade_pedidos', 0) == 0 and
                relatorio_future.get('quantidade_licitacoes', 0) == 0
            )
            
            self.log_test(
                "Future Date Results",
                empty_results,
                f"Faturado: {relatorio_future.get('total_faturado')}, Pedidos: {relatorio_future.get('quantidade_pedidos')}"
            )

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Relatórios API Tests...")
        print(f"   Base URL: {self.base_url}")
        print(f"   API URL: {self.api_url}")

        # Test authentication first
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False

        # Run all test suites
        self.test_relatorios_filtros()
        self.test_relatorios_geral_basic()
        self.test_relatorios_date_filters()
        self.test_relatorios_segment_filters()
        self.test_relatorios_other_filters()
        self.test_relatorios_data_analysis()
        self.test_error_handling()

        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        return self.tests_passed == self.tests_run

def main():
    tester = RelatoriosAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/relatorios_backend_results.json', 'w') as f:
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