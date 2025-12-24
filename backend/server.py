from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import logging
import asyncio
from pathlib import Path

# Try to import resend for email notifications
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Email configuration
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
NOTIFICATION_EMAIL = os.environ.get("NOTIFICATION_EMAIL", "pauloconsultordenegocios@gmail.com")

if RESEND_AVAILABLE and RESEND_API_KEY and not RESEND_API_KEY.startswith("re_test"):
    resend.api_key = RESEND_API_KEY

app = FastAPI()
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET_KEY = os.environ.get("SECRET_KEY", "xsell-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: EmailStr
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class Cliente(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    codigo: str
    cnpj: str
    nome: str
    razao_social: str
    nome_fantasia: str
    endereco: str
    cidade: str
    estado: str
    cep: str
    email: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClienteCreate(BaseModel):
    cnpj: str
    nome: str
    razao_social: str
    nome_fantasia: str
    endereco: str
    cidade: str
    estado: str
    cep: str
    email: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    telefone: Optional[str] = None
    whatsapp: Optional[str] = None


class Produto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    codigo: str
    descricao: str
    preco_compra: float
    preco_venda: float
    margem: float = 40.0
    fornecedor: Optional[str] = None
    variacoes: Optional[List[Dict[str, Any]]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProdutoCreate(BaseModel):
    codigo: str
    descricao: str
    preco_compra: float
    preco_venda: Optional[float] = None
    margem: Optional[float] = 40.0
    fornecedor: Optional[str] = None
    variacoes: Optional[List[Dict[str, Any]]] = None


class ItemPedido(BaseModel):
    produto_id: str
    produto_codigo: str
    produto_descricao: str
    quantidade: float
    preco_compra: float
    preco_venda: float
    despesas: float = 0.0
    lucro_item: float
    personalizado: bool = False
    tipo_personalizacao: Optional[str] = None
    valor_personalizacao: float = 0.0
    repassar_personalizacao: bool = False


class Pedido(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    numero: str
    data: datetime
    cliente_id: str
    cliente_nome: str
    itens: List[ItemPedido]
    frete: float = 0.0
    repassar_frete: bool = False
    outras_despesas: float = 0.0
    descricao_outras_despesas: Optional[str] = None
    repassar_outras_despesas: bool = False
    prazo_entrega: str = ""
    forma_pagamento: str
    tipo_venda: str
    vendedor: str
    custo_total: float
    valor_total_venda: float
    despesas_totais: float
    lucro_total: float
    status: str = "pendente"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PedidoCreate(BaseModel):
    cliente_id: str
    itens: List[ItemPedido]
    frete: float = 0.0
    repassar_frete: bool = False
    outras_despesas: float = 0.0
    descricao_outras_despesas: Optional[str] = None
    repassar_outras_despesas: bool = False
    prazo_entrega: str = ""
    forma_pagamento: str
    tipo_venda: str
    vendedor: str


class ItemOrcamento(BaseModel):
    produto_id: Optional[str] = None
    produto_codigo: Optional[str] = None
    descricao: str
    quantidade: float
    unidade: str = "UN"
    preco_unitario: float
    preco_total: float
    imagem_url: Optional[str] = None
    personalizado: bool = False
    tipo_personalizacao: Optional[str] = None
    valor_personalizacao: float = 0.0


class Orcamento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    numero: str
    data: datetime
    cliente_id: str
    cliente_nome: str
    cliente_cnpj: Optional[str] = None
    cliente_endereco: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_email: Optional[str] = None
    vendedor: Optional[str] = None
    itens: List[Dict[str, Any]]
    valor_total: float
    desconto: float = 0.0
    valor_final: float = 0.0
    validade_dias: int = 15
    forma_pagamento: str
    prazo_entrega: str
    frete_por_conta: str = "destinatario"
    valor_frete: float = 0.0
    repassar_frete: bool = True
    outras_despesas: float = 0.0
    descricao_outras_despesas: Optional[str] = None
    repassar_outras_despesas: bool = False
    observacoes: str = "Produto sujeito à disponibilidade de estoque no momento do fechamento do pedido, devido a estoque rotativo."
    status: str = "aberto"
    dias_cobrar_resposta: Optional[int] = None
    data_cobrar_resposta: Optional[datetime] = None
    cliente_cobrado: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrcamentoCreate(BaseModel):
    cliente_id: str
    vendedor: Optional[str] = None
    itens: List[Dict[str, Any]]
    validade_dias: int = 15
    forma_pagamento: str
    prazo_entrega: str
    frete_por_conta: str = "destinatario"
    valor_frete: float = 0.0
    repassar_frete: bool = True
    outras_despesas: float = 0.0
    descricao_outras_despesas: Optional[str] = None
    repassar_outras_despesas: bool = False
    desconto: float = 0.0
    observacoes: Optional[str] = "Produto sujeito à disponibilidade de estoque no momento do fechamento do pedido, devido a estoque rotativo."
    dias_cobrar_resposta: Optional[int] = None


class ProdutoLicitacao(BaseModel):
    produto_id: Optional[str] = None
    descricao: str
    quantidade_empenhada: float
    quantidade_fornecida: float = 0.0
    quantidade_restante: float = 0.0
    preco_compra: float
    preco_venda: float
    despesas_extras: float = 0.0
    lucro_unitario: float = 0.0


class Licitacao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    numero_licitacao: str
    cidade: str
    estado: str
    orgao_publico: str
    numero_empenho: str
    data_empenho: datetime
    numero_nota_empenho: str
    numero_nota_fornecimento: Optional[str] = None
    produtos: List[Dict[str, Any]]
    previsao_fornecimento: Optional[datetime] = None
    fornecimento_efetivo: Optional[datetime] = None
    previsao_pagamento: Optional[datetime] = None
    frete: float = 0.0
    impostos: float = 0.0
    outras_despesas: float = 0.0
    descricao_outras_despesas: Optional[str] = None
    valor_total_venda: float = 0.0
    valor_total_compra: float = 0.0
    despesas_totais: float = 0.0
    lucro_total: float = 0.0
    status_pagamento: str = "pendente"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LicitacaoCreate(BaseModel):
    numero_licitacao: str
    cidade: str
    estado: str
    orgao_publico: str
    numero_empenho: str
    data_empenho: datetime
    numero_nota_empenho: str
    numero_nota_fornecimento: Optional[str] = None
    produtos: List[Dict[str, Any]]
    previsao_fornecimento: Optional[datetime] = None
    fornecimento_efetivo: Optional[datetime] = None
    previsao_pagamento: Optional[datetime] = None
    frete: float = 0.0
    impostos: float = 0.0
    outras_despesas: float = 0.0
    descricao_outras_despesas: Optional[str] = None


class Despesa(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    tipo: str
    descricao: str
    valor: float
    data_despesa: datetime
    data_vencimento: datetime
    status: str = "pendente"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DespesaCreate(BaseModel):
    tipo: str
    descricao: str
    valor: float
    data_despesa: datetime
    data_vencimento: datetime
    status: Optional[str] = "pendente"


class Fornecedor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    codigo: str
    tipo_fornecedor: str
    razao_social: str
    nome_fantasia: str
    cnpj_cpf: str
    inscricao_estadual: Optional[str] = None
    cep: str
    logradouro: str
    numero: str
    complemento: Optional[str] = None
    bairro: str
    cidade: str
    estado: str
    nome_contato: str
    telefone: str
    whatsapp: str
    email: str
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta_corrente: Optional[str] = None
    tipo_conta: Optional[str] = None
    chave_pix: Optional[str] = None
    produtos_servicos: str
    prazo_entrega: str
    condicoes_pagamento: str
    observacoes: Optional[str] = None
    categoria: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FornecedorCreate(BaseModel):
    tipo_fornecedor: str
    razao_social: str
    nome_fantasia: str
    cnpj_cpf: str
    inscricao_estadual: Optional[str] = None
    cep: str
    logradouro: str
    numero: str
    complemento: Optional[str] = None
    bairro: str
    cidade: str
    estado: str
    nome_contato: str
    telefone: str
    whatsapp: str
    email: str
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta_corrente: Optional[str] = None
    tipo_conta: Optional[str] = None
    chave_pix: Optional[str] = None
    produtos_servicos: str
    prazo_entrega: str
    condicoes_pagamento: str
    observacoes: Optional[str] = None
    categoria: str


class Vendedor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    codigo: str
    nome: str
    email: EmailStr
    telefone: str
    nivel_acesso: str
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendedorCreate(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    nivel_acesso: str
    ativo: Optional[bool] = True


class Caixa(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    saldo: float
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MovimentacaoCaixa(BaseModel):
    tipo: str
    valor: float
    descricao: str
    referencia_id: Optional[str] = None


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)


@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    import uuid
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    caixa_doc = {
        "id": str(uuid.uuid4()),
        "saldo": 0.0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.caixa.insert_one(caixa_doc)
    
    access_token = create_access_token(data={"sub": user_data.email})
    return {"access_token": access_token, "token_type": "bearer"}


@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user_data.email})
    return {"access_token": access_token, "token_type": "bearer"}


@api_router.get("/")
async def root():
    return {"message": "XSELL API is running", "status": "ok"}


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@api_router.get("/clientes", response_model=List[Cliente])
async def get_clientes(current_user: User = Depends(get_current_user)):
    clientes = await db.clientes.find({}, {"_id": 0}).to_list(1000)
    return clientes


@api_router.post("/clientes", response_model=Cliente)
async def create_cliente(cliente_data: ClienteCreate, current_user: User = Depends(get_current_user)):
    import uuid
    cliente_id = str(uuid.uuid4())
    cliente_doc = cliente_data.model_dump()
    cliente_doc["id"] = cliente_id
    cliente_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.clientes.insert_one(cliente_doc)
    return Cliente(**cliente_doc)


@api_router.put("/clientes/{cliente_id}", response_model=Cliente)
async def update_cliente(cliente_id: str, cliente_data: ClienteCreate, current_user: User = Depends(get_current_user)):
    result = await db.clientes.update_one(
        {"id": cliente_id},
        {"$set": cliente_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    return Cliente(**cliente)


@api_router.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: str, current_user: User = Depends(get_current_user)):
    result = await db.clientes.delete_one({"id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente not found")
    return {"message": "Cliente deleted"}


@api_router.get("/produtos", response_model=List[Produto])
async def get_produtos(current_user: User = Depends(get_current_user)):
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    return produtos


@api_router.post("/produtos", response_model=Produto)
async def create_produto(produto_data: ProdutoCreate, current_user: User = Depends(get_current_user)):
    import uuid
    produto_id = str(uuid.uuid4())
    
    produto_dict = produto_data.model_dump()
    if produto_dict.get("preco_venda") is None:
        margem = produto_dict.get("margem", 40.0)
        produto_dict["preco_venda"] = produto_dict["preco_compra"] * (1 + margem / 100)
    
    produto_dict["id"] = produto_id
    produto_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.produtos.insert_one(produto_dict)
    return Produto(**produto_dict)


@api_router.put("/produtos/{produto_id}", response_model=Produto)
async def update_produto(produto_id: str, produto_data: ProdutoCreate, current_user: User = Depends(get_current_user)):
    produto_dict = produto_data.model_dump()
    if produto_dict.get("preco_venda") is None:
        margem = produto_dict.get("margem", 40.0)
        produto_dict["preco_venda"] = produto_dict["preco_compra"] * (1 + margem / 100)
    
    result = await db.produtos.update_one(
        {"id": produto_id},
        {"$set": produto_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produto not found")
    
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    return Produto(**produto)


@api_router.delete("/produtos/{produto_id}")
async def delete_produto(produto_id: str, current_user: User = Depends(get_current_user)):
    result = await db.produtos.delete_one({"id": produto_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto not found")
    return {"message": "Produto deleted"}


@api_router.get("/produtos/codigo/{codigo}", response_model=Produto)
async def get_produto_by_codigo(codigo: str, current_user: User = Depends(get_current_user)):
    produto = await db.produtos.find_one({"codigo": codigo}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto not found")
    if isinstance(produto.get("created_at"), str):
        produto["created_at"] = datetime.fromisoformat(produto["created_at"])
    return Produto(**produto)


@api_router.get("/pedidos", response_model=List[Pedido])
async def get_pedidos(current_user: User = Depends(get_current_user)):
    pedidos = await db.pedidos.find({}, {"_id": 0}).sort("data", -1).to_list(1000)
    for pedido in pedidos:
        if isinstance(pedido.get("data"), str):
            pedido["data"] = datetime.fromisoformat(pedido["data"])
        if isinstance(pedido.get("created_at"), str):
            pedido["created_at"] = datetime.fromisoformat(pedido["created_at"])
    return pedidos


@api_router.get("/pedidos/{pedido_id}", response_model=Pedido)
async def get_pedido(pedido_id: str, current_user: User = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido not found")
    
    if isinstance(pedido.get("data"), str):
        pedido["data"] = datetime.fromisoformat(pedido["data"])
    if isinstance(pedido.get("created_at"), str):
        pedido["created_at"] = datetime.fromisoformat(pedido["created_at"])
    
    return Pedido(**pedido)


@api_router.post("/pedidos", response_model=Pedido)
async def create_pedido(pedido_data: PedidoCreate, current_user: User = Depends(get_current_user)):
    import uuid
    pedido_id = str(uuid.uuid4())
    
    count = await db.pedidos.count_documents({})
    numero = f"PED-{count + 1:06d}"
    
    cliente = await db.clientes.find_one({"id": pedido_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    custo_total = sum(item.preco_compra * item.quantidade for item in pedido_data.itens)
    
    # Calcular valor de venda incluindo personalização repassada ao cliente
    valor_total_venda = sum(
        (item.preco_venda + (item.valor_personalizacao if item.repassar_personalizacao else 0)) * item.quantidade 
        for item in pedido_data.itens
    )
    
    # Adicionar outras despesas ao valor de venda se repassar
    if pedido_data.repassar_outras_despesas:
        valor_total_venda += pedido_data.outras_despesas
    
    # Calcular despesas totais (incluindo personalizações não repassadas)
    despesas_totais = (
        sum(item.despesas * item.quantidade for item in pedido_data.itens) + 
        pedido_data.frete + 
        pedido_data.outras_despesas +
        sum((item.valor_personalizacao if not item.repassar_personalizacao else 0) * item.quantidade for item in pedido_data.itens)
    )
    
    lucro_total = valor_total_venda - custo_total - despesas_totais
    
    pedido_doc = {
        "id": pedido_id,
        "numero": numero,
        "data": datetime.now(timezone.utc).isoformat(),
        "cliente_id": pedido_data.cliente_id,
        "cliente_nome": cliente["nome"],
        "itens": [item.model_dump() for item in pedido_data.itens],
        "frete": pedido_data.frete,
        "outras_despesas": pedido_data.outras_despesas,
        "descricao_outras_despesas": pedido_data.descricao_outras_despesas,
        "repassar_outras_despesas": pedido_data.repassar_outras_despesas,
        "prazo_entrega": pedido_data.prazo_entrega,
        "forma_pagamento": pedido_data.forma_pagamento,
        "tipo_venda": pedido_data.tipo_venda,
        "vendedor": pedido_data.vendedor,
        "custo_total": custo_total,
        "valor_total_venda": valor_total_venda,
        "despesas_totais": despesas_totais,
        "lucro_total": lucro_total,
        "status": "pendente",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pedidos.insert_one(pedido_doc)
    pedido_doc["data"] = datetime.fromisoformat(pedido_doc["data"])
    pedido_doc["created_at"] = datetime.fromisoformat(pedido_doc["created_at"])
    return Pedido(**pedido_doc)


@api_router.put("/pedidos/{pedido_id}/status")
async def update_pedido_status(pedido_id: str, status: str, current_user: User = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido not found")
    
    await db.pedidos.update_one({"id": pedido_id}, {"$set": {"status": status}})
    
    if status == "pago" and pedido.get("status") != "pago":
        caixa = await db.caixa.find_one({}, {"_id": 0})
        if caixa:
            novo_saldo = caixa["saldo"] + pedido["valor_total_venda"]
            await db.caixa.update_one(
                {"id": caixa["id"]},
                {"$set": {"saldo": novo_saldo, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return {"message": "Status updated"}


@api_router.delete("/pedidos/{pedido_id}")
async def delete_pedido(pedido_id: str, current_user: User = Depends(get_current_user)):
    result = await db.pedidos.delete_one({"id": pedido_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pedido not found")
    return {"message": "Pedido deleted"}


@api_router.get("/orcamentos", response_model=List[Orcamento])
async def get_orcamentos(current_user: User = Depends(get_current_user)):
    orcamentos = await db.orcamentos.find({}, {"_id": 0}).sort("data", -1).to_list(1000)
    for orc in orcamentos:
        if isinstance(orc.get("data"), str):
            orc["data"] = datetime.fromisoformat(orc["data"])
        if orc.get("data_cobrar_resposta") and isinstance(orc["data_cobrar_resposta"], str):
            orc["data_cobrar_resposta"] = datetime.fromisoformat(orc["data_cobrar_resposta"])
        if isinstance(orc.get("created_at"), str):
            orc["created_at"] = datetime.fromisoformat(orc["created_at"])
        # Handle legacy data
        if "valor_final" not in orc:
            orc["valor_final"] = orc.get("valor_total", 0) - orc.get("desconto", 0)
        if "desconto" not in orc:
            orc["desconto"] = 0.0
        if "valor_frete" not in orc:
            orc["valor_frete"] = 0.0
        if "repassar_frete" not in orc:
            orc["repassar_frete"] = True
        if "outras_despesas" not in orc:
            orc["outras_despesas"] = 0.0
        if "repassar_outras_despesas" not in orc:
            orc["repassar_outras_despesas"] = False
        if "cliente_cobrado" not in orc:
            orc["cliente_cobrado"] = False
    return orcamentos


@api_router.get("/orcamentos/{orcamento_id}", response_model=Orcamento)
async def get_orcamento(orcamento_id: str, current_user: User = Depends(get_current_user)):
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento not found")
    
    if isinstance(orcamento.get("data"), str):
        orcamento["data"] = datetime.fromisoformat(orcamento["data"])
    if orcamento.get("data_cobrar_resposta") and isinstance(orcamento["data_cobrar_resposta"], str):
        orcamento["data_cobrar_resposta"] = datetime.fromisoformat(orcamento["data_cobrar_resposta"])
    if isinstance(orcamento.get("created_at"), str):
        orcamento["created_at"] = datetime.fromisoformat(orcamento["created_at"])
    
    # Handle legacy data
    if "valor_final" not in orcamento:
        orcamento["valor_final"] = orcamento.get("valor_total", 0) - orcamento.get("desconto", 0)
    if "desconto" not in orcamento:
        orcamento["desconto"] = 0.0
    if "valor_frete" not in orcamento:
        orcamento["valor_frete"] = 0.0
    if "repassar_frete" not in orcamento:
        orcamento["repassar_frete"] = True
    if "outras_despesas" not in orcamento:
        orcamento["outras_despesas"] = 0.0
    if "repassar_outras_despesas" not in orcamento:
        orcamento["repassar_outras_despesas"] = False
    if "cliente_cobrado" not in orcamento:
        orcamento["cliente_cobrado"] = False
    
    return Orcamento(**orcamento)


@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(orc_data: OrcamentoCreate, current_user: User = Depends(get_current_user)):
    import uuid
    orc_id = str(uuid.uuid4())
    
    # Get next number based on year
    ano_atual = datetime.now().year
    count = await db.orcamentos.count_documents({"numero": {"$regex": f"^ORC-{ano_atual}"}})
    numero = f"ORC-{ano_atual}-{count + 1:04d}"
    
    cliente = await db.clientes.find_one({"id": orc_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    # Calculate totals including personalization
    valor_itens = 0
    for item in orc_data.itens:
        # preco_total already includes personalization from frontend
        item_total = item.get("preco_total", item.get("preco_unitario", 0) * item.get("quantidade", 0))
        valor_itens += item_total
    
    # Calculate final value based on repasse options
    valor_frete_cliente = orc_data.valor_frete if orc_data.repassar_frete else 0
    valor_outras_cliente = orc_data.outras_despesas if orc_data.repassar_outras_despesas else 0
    valor_total = valor_itens
    valor_final = valor_total + valor_frete_cliente + valor_outras_cliente - orc_data.desconto
    
    # Calculate data_cobrar_resposta if dias_cobrar_resposta is set
    data_cobrar = None
    if orc_data.dias_cobrar_resposta:
        data_cobrar = (datetime.now(timezone.utc) + timedelta(days=orc_data.dias_cobrar_resposta)).isoformat()
    
    orc_doc = {
        "id": orc_id,
        "numero": numero,
        "data": datetime.now(timezone.utc).isoformat(),
        "cliente_id": orc_data.cliente_id,
        "cliente_nome": cliente.get("nome") or cliente.get("razao_social", ""),
        "cliente_cnpj": cliente.get("cnpj", ""),
        "cliente_endereco": cliente.get("endereco", ""),
        "cliente_telefone": cliente.get("telefone", ""),
        "cliente_email": cliente.get("email", ""),
        "vendedor": orc_data.vendedor,
        "itens": orc_data.itens,
        "valor_total": valor_total,
        "desconto": orc_data.desconto,
        "valor_frete": orc_data.valor_frete,
        "repassar_frete": orc_data.repassar_frete,
        "outras_despesas": orc_data.outras_despesas,
        "descricao_outras_despesas": orc_data.descricao_outras_despesas,
        "repassar_outras_despesas": orc_data.repassar_outras_despesas,
        "valor_final": valor_final,
        "validade_dias": orc_data.validade_dias,
        "forma_pagamento": orc_data.forma_pagamento,
        "prazo_entrega": orc_data.prazo_entrega,
        "frete_por_conta": orc_data.frete_por_conta,
        "observacoes": orc_data.observacoes,
        "status": "aberto",
        "dias_cobrar_resposta": orc_data.dias_cobrar_resposta,
        "data_cobrar_resposta": data_cobrar,
        "cliente_cobrado": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orcamentos.insert_one(orc_doc)
    orc_doc["data"] = datetime.fromisoformat(orc_doc["data"])
    if orc_doc.get("data_cobrar_resposta"):
        orc_doc["data_cobrar_resposta"] = datetime.fromisoformat(orc_doc["data_cobrar_resposta"])
    orc_doc["created_at"] = datetime.fromisoformat(orc_doc["created_at"])
    return Orcamento(**orc_doc)


@api_router.put("/orcamentos/{orcamento_id}", response_model=Orcamento)
async def update_orcamento(orcamento_id: str, orc_data: OrcamentoCreate, current_user: User = Depends(get_current_user)):
    existing = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Orçamento not found")
    
    cliente = await db.clientes.find_one({"id": orc_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    # Calculate totals including personalization
    valor_itens = 0
    for item in orc_data.itens:
        # preco_total already includes personalization from frontend
        item_total = item.get("preco_total", item.get("preco_unitario", 0) * item.get("quantidade", 0))
        valor_itens += item_total
    
    # Calculate final value based on repasse options
    valor_frete_cliente = orc_data.valor_frete if orc_data.repassar_frete else 0
    valor_outras_cliente = orc_data.outras_despesas if orc_data.repassar_outras_despesas else 0
    valor_total = valor_itens
    valor_final = valor_total + valor_frete_cliente + valor_outras_cliente - orc_data.desconto
    
    # Calculate data_cobrar_resposta if dias_cobrar_resposta is set
    data_cobrar = existing.get("data_cobrar_resposta")
    if orc_data.dias_cobrar_resposta and orc_data.dias_cobrar_resposta != existing.get("dias_cobrar_resposta"):
        data_cobrar = (datetime.now(timezone.utc) + timedelta(days=orc_data.dias_cobrar_resposta)).isoformat()
    
    update_doc = {
        "cliente_id": orc_data.cliente_id,
        "cliente_nome": cliente.get("nome") or cliente.get("razao_social", ""),
        "cliente_cnpj": cliente.get("cnpj", ""),
        "cliente_endereco": cliente.get("endereco", ""),
        "cliente_telefone": cliente.get("telefone", ""),
        "cliente_email": cliente.get("email", ""),
        "vendedor": orc_data.vendedor,
        "itens": orc_data.itens,
        "valor_total": valor_total,
        "desconto": orc_data.desconto,
        "valor_frete": orc_data.valor_frete,
        "repassar_frete": orc_data.repassar_frete,
        "outras_despesas": orc_data.outras_despesas,
        "descricao_outras_despesas": orc_data.descricao_outras_despesas,
        "repassar_outras_despesas": orc_data.repassar_outras_despesas,
        "valor_final": valor_final,
        "validade_dias": orc_data.validade_dias,
        "forma_pagamento": orc_data.forma_pagamento,
        "prazo_entrega": orc_data.prazo_entrega,
        "frete_por_conta": orc_data.frete_por_conta,
        "observacoes": orc_data.observacoes,
        "dias_cobrar_resposta": orc_data.dias_cobrar_resposta,
        "data_cobrar_resposta": data_cobrar
    }
    
    await db.orcamentos.update_one({"id": orcamento_id}, {"$set": update_doc})
    
    orc = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if isinstance(orc.get("data"), str):
        orc["data"] = datetime.fromisoformat(orc["data"])
    if orc.get("data_cobrar_resposta") and isinstance(orc["data_cobrar_resposta"], str):
        orc["data_cobrar_resposta"] = datetime.fromisoformat(orc["data_cobrar_resposta"])
    if isinstance(orc.get("created_at"), str):
        orc["created_at"] = datetime.fromisoformat(orc["created_at"])
    
    return Orcamento(**orc)


@api_router.put("/orcamentos/{orcamento_id}/marcar-cobrado")
async def marcar_cliente_cobrado(orcamento_id: str, cobrado: bool = True, current_user: User = Depends(get_current_user)):
    orc = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orc:
        raise HTTPException(status_code=404, detail="Orçamento not found")
    
    await db.orcamentos.update_one({"id": orcamento_id}, {"$set": {"cliente_cobrado": cobrado}})
    return {"message": f"Cliente {'cobrado' if cobrado else 'não cobrado'}", "cliente_cobrado": cobrado}


@api_router.post("/orcamentos/{orcamento_id}/convert")
async def convert_orcamento_to_pedido(orcamento_id: str, vendedor: Optional[str] = None, current_user: User = Depends(get_current_user)):
    orc = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orc:
        raise HTTPException(status_code=404, detail="Orçamento not found")
    
    if orc.get("status") == "convertido":
        raise HTTPException(status_code=400, detail="Orçamento já foi convertido em pedido")
    
    import uuid
    pedido_id = str(uuid.uuid4())
    
    # Get next pedido number
    ano_atual = datetime.now().year
    count = await db.pedidos.count_documents({"numero": {"$regex": f"^PED-{ano_atual}"}})
    numero_pedido = f"PED-{ano_atual}-{count + 1:04d}"
    
    # Convert items to pedido format
    itens_pedido = []
    for item in orc.get("itens", []):
        itens_pedido.append({
            "produto_id": item.get("produto_id", ""),
            "produto_codigo": item.get("produto_codigo", ""),
            "produto_descricao": item.get("descricao", ""),
            "quantidade": item.get("quantidade", 1),
            "preco_venda": item.get("preco_unitario", 0),
            "preco_compra": 0,
            "subtotal": item.get("preco_total", 0),
            "personalizado": False,
            "tipo_personalizacao": "",
            "valor_personalizacao": 0
        })
    
    pedido_doc = {
        "id": pedido_id,
        "numero": numero_pedido,
        "data": datetime.now(timezone.utc).isoformat(),
        "cliente_id": orc["cliente_id"],
        "cliente_nome": orc.get("cliente_nome", ""),
        "vendedor": vendedor or orc.get("vendedor", ""),
        "itens": itens_pedido,
        "frete": orc.get("valor_frete", 0),
        "outras_despesas": 0,
        "descricao_outras_despesas": "",
        "repassar_despesas_cliente": False,
        "prazo_entrega": orc.get("prazo_entrega", ""),
        "forma_pagamento": orc.get("forma_pagamento", ""),
        "tipo_venda": "consumidor_final",
        "custo_total": 0,
        "valor_total_venda": orc.get("valor_final", orc.get("valor_total", 0)),
        "lucro_total": 0,
        "status": "pedido_feito",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "orcamento_origem": orcamento_id
    }
    
    await db.pedidos.insert_one(pedido_doc)
    await db.orcamentos.update_one({"id": orcamento_id}, {"$set": {"status": "convertido"}})
    
    return {"message": "Orçamento convertido em pedido com sucesso", "pedido_id": pedido_id, "pedido_numero": numero_pedido}


@api_router.delete("/orcamentos/{orcamento_id}")
async def delete_orcamento(orcamento_id: str, current_user: User = Depends(get_current_user)):
    result = await db.orcamentos.delete_one({"id": orcamento_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Orçamento not found")
    return {"message": "Orçamento deleted"}


@api_router.get("/licitacoes", response_model=List[Licitacao])
async def get_licitacoes(current_user: User = Depends(get_current_user)):
    licitacoes = await db.licitacoes.find({}, {"_id": 0}).sort("data_empenho", -1).to_list(1000)
    for lic in licitacoes:
        if isinstance(lic.get("data_empenho"), str):
            lic["data_empenho"] = datetime.fromisoformat(lic["data_empenho"])
        if lic.get("previsao_fornecimento") and isinstance(lic["previsao_fornecimento"], str):
            lic["previsao_fornecimento"] = datetime.fromisoformat(lic["previsao_fornecimento"])
        if lic.get("fornecimento_efetivo") and isinstance(lic["fornecimento_efetivo"], str):
            lic["fornecimento_efetivo"] = datetime.fromisoformat(lic["fornecimento_efetivo"])
        if lic.get("previsao_pagamento") and isinstance(lic["previsao_pagamento"], str):
            lic["previsao_pagamento"] = datetime.fromisoformat(lic["previsao_pagamento"])
        if isinstance(lic.get("created_at"), str):
            lic["created_at"] = datetime.fromisoformat(lic["created_at"])
        # Handle legacy data without new fields
        if "status_pagamento" not in lic:
            lic["status_pagamento"] = lic.get("status", "pendente")
        if "valor_total_venda" not in lic:
            lic["valor_total_venda"] = sum(p.get("preco_venda", 0) * p.get("quantidade_empenhada", 0) for p in lic.get("produtos", []))
        if "valor_total_compra" not in lic:
            lic["valor_total_compra"] = sum(p.get("preco_compra", 0) * p.get("quantidade_empenhada", 0) for p in lic.get("produtos", []))
        if "despesas_totais" not in lic:
            lic["despesas_totais"] = lic.get("frete", 0) + lic.get("impostos", 0) + lic.get("outras_despesas", 0)
        if "frete" not in lic:
            lic["frete"] = 0.0
        if "impostos" not in lic:
            lic["impostos"] = 0.0
        if "outras_despesas" not in lic:
            lic["outras_despesas"] = 0.0
    return licitacoes


@api_router.post("/licitacoes", response_model=Licitacao)
async def create_licitacao(lic_data: LicitacaoCreate, current_user: User = Depends(get_current_user)):
    import uuid
    lic_id = str(uuid.uuid4())
    
    # Calcular quantidades restantes para cada produto
    produtos_processados = []
    for p in lic_data.produtos:
        qtd_empenhada = p.get("quantidade_empenhada", 0)
        qtd_fornecida = p.get("quantidade_fornecida", 0)
        qtd_restante = qtd_empenhada - qtd_fornecida
        lucro_unitario = p.get("preco_venda", 0) - p.get("preco_compra", 0) - p.get("despesas_extras", 0)
        
        produtos_processados.append({
            **p,
            "quantidade_restante": qtd_restante,
            "lucro_unitario": lucro_unitario
        })
    
    # Calcular totais
    valor_total_venda = sum(p.get("preco_venda", 0) * p.get("quantidade_empenhada", 0) for p in lic_data.produtos)
    valor_total_compra = sum(p.get("preco_compra", 0) * p.get("quantidade_empenhada", 0) for p in lic_data.produtos)
    despesas_produtos = sum(p.get("despesas_extras", 0) * p.get("quantidade_empenhada", 0) for p in lic_data.produtos)
    despesas_totais = despesas_produtos + lic_data.frete + lic_data.impostos + lic_data.outras_despesas
    lucro_total = valor_total_venda - valor_total_compra - despesas_totais
    
    lic_doc = lic_data.model_dump()
    lic_doc["id"] = lic_id
    lic_doc["produtos"] = produtos_processados
    lic_doc["valor_total_venda"] = valor_total_venda
    lic_doc["valor_total_compra"] = valor_total_compra
    lic_doc["despesas_totais"] = despesas_totais
    lic_doc["lucro_total"] = lucro_total
    lic_doc["status_pagamento"] = "pendente"
    lic_doc["data_empenho"] = lic_doc["data_empenho"].isoformat()
    if lic_doc.get("previsao_fornecimento"):
        lic_doc["previsao_fornecimento"] = lic_doc["previsao_fornecimento"].isoformat()
    if lic_doc.get("fornecimento_efetivo"):
        lic_doc["fornecimento_efetivo"] = lic_doc["fornecimento_efetivo"].isoformat()
    if lic_doc.get("previsao_pagamento"):
        lic_doc["previsao_pagamento"] = lic_doc["previsao_pagamento"].isoformat()
    lic_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.licitacoes.insert_one(lic_doc)
    
    lic_doc["data_empenho"] = datetime.fromisoformat(lic_doc["data_empenho"])
    if lic_doc.get("previsao_fornecimento"):
        lic_doc["previsao_fornecimento"] = datetime.fromisoformat(lic_doc["previsao_fornecimento"])
    if lic_doc.get("fornecimento_efetivo"):
        lic_doc["fornecimento_efetivo"] = datetime.fromisoformat(lic_doc["fornecimento_efetivo"])
    if lic_doc.get("previsao_pagamento"):
        lic_doc["previsao_pagamento"] = datetime.fromisoformat(lic_doc["previsao_pagamento"])
    lic_doc["created_at"] = datetime.fromisoformat(lic_doc["created_at"])
    
    return Licitacao(**lic_doc)


@api_router.get("/licitacoes/{licitacao_id}", response_model=Licitacao)
async def get_licitacao(licitacao_id: str, current_user: User = Depends(get_current_user)):
    lic = await db.licitacoes.find_one({"id": licitacao_id}, {"_id": 0})
    if not lic:
        raise HTTPException(status_code=404, detail="Licitação not found")
    
    # Convert datetime strings
    if isinstance(lic.get("data_empenho"), str):
        lic["data_empenho"] = datetime.fromisoformat(lic["data_empenho"])
    if lic.get("previsao_fornecimento") and isinstance(lic["previsao_fornecimento"], str):
        lic["previsao_fornecimento"] = datetime.fromisoformat(lic["previsao_fornecimento"])
    if lic.get("fornecimento_efetivo") and isinstance(lic["fornecimento_efetivo"], str):
        lic["fornecimento_efetivo"] = datetime.fromisoformat(lic["fornecimento_efetivo"])
    if lic.get("previsao_pagamento") and isinstance(lic["previsao_pagamento"], str):
        lic["previsao_pagamento"] = datetime.fromisoformat(lic["previsao_pagamento"])
    if isinstance(lic.get("created_at"), str):
        lic["created_at"] = datetime.fromisoformat(lic["created_at"])
    
    return Licitacao(**lic)


@api_router.put("/licitacoes/{licitacao_id}", response_model=Licitacao)
async def update_licitacao(licitacao_id: str, lic_data: LicitacaoCreate, current_user: User = Depends(get_current_user)):
    existing = await db.licitacoes.find_one({"id": licitacao_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Licitação not found")
    
    # Calcular quantidades restantes para cada produto
    produtos_processados = []
    for p in lic_data.produtos:
        qtd_empenhada = p.get("quantidade_empenhada", 0)
        qtd_fornecida = p.get("quantidade_fornecida", 0)
        qtd_restante = qtd_empenhada - qtd_fornecida
        lucro_unitario = p.get("preco_venda", 0) - p.get("preco_compra", 0) - p.get("despesas_extras", 0)
        
        produtos_processados.append({
            **p,
            "quantidade_restante": qtd_restante,
            "lucro_unitario": lucro_unitario
        })
    
    # Calcular totais
    valor_total_venda = sum(p.get("preco_venda", 0) * p.get("quantidade_empenhada", 0) for p in lic_data.produtos)
    valor_total_compra = sum(p.get("preco_compra", 0) * p.get("quantidade_empenhada", 0) for p in lic_data.produtos)
    despesas_produtos = sum(p.get("despesas_extras", 0) * p.get("quantidade_empenhada", 0) for p in lic_data.produtos)
    despesas_totais = despesas_produtos + lic_data.frete + lic_data.impostos + lic_data.outras_despesas
    lucro_total = valor_total_venda - valor_total_compra - despesas_totais
    
    update_doc = lic_data.model_dump()
    update_doc["produtos"] = produtos_processados
    update_doc["valor_total_venda"] = valor_total_venda
    update_doc["valor_total_compra"] = valor_total_compra
    update_doc["despesas_totais"] = despesas_totais
    update_doc["lucro_total"] = lucro_total
    update_doc["data_empenho"] = update_doc["data_empenho"].isoformat()
    if update_doc.get("previsao_fornecimento"):
        update_doc["previsao_fornecimento"] = update_doc["previsao_fornecimento"].isoformat()
    if update_doc.get("fornecimento_efetivo"):
        update_doc["fornecimento_efetivo"] = update_doc["fornecimento_efetivo"].isoformat()
    if update_doc.get("previsao_pagamento"):
        update_doc["previsao_pagamento"] = update_doc["previsao_pagamento"].isoformat()
    
    await db.licitacoes.update_one(
        {"id": licitacao_id},
        {"$set": update_doc}
    )
    
    lic = await db.licitacoes.find_one({"id": licitacao_id}, {"_id": 0})
    if isinstance(lic.get("data_empenho"), str):
        lic["data_empenho"] = datetime.fromisoformat(lic["data_empenho"])
    if lic.get("previsao_fornecimento") and isinstance(lic["previsao_fornecimento"], str):
        lic["previsao_fornecimento"] = datetime.fromisoformat(lic["previsao_fornecimento"])
    if lic.get("fornecimento_efetivo") and isinstance(lic["fornecimento_efetivo"], str):
        lic["fornecimento_efetivo"] = datetime.fromisoformat(lic["fornecimento_efetivo"])
    if lic.get("previsao_pagamento") and isinstance(lic["previsao_pagamento"], str):
        lic["previsao_pagamento"] = datetime.fromisoformat(lic["previsao_pagamento"])
    if isinstance(lic.get("created_at"), str):
        lic["created_at"] = datetime.fromisoformat(lic["created_at"])
    
    return Licitacao(**lic)


@api_router.put("/licitacoes/{licitacao_id}/status")
async def update_licitacao_status(licitacao_id: str, status: str, current_user: User = Depends(get_current_user)):
    lic = await db.licitacoes.find_one({"id": licitacao_id}, {"_id": 0})
    if not lic:
        raise HTTPException(status_code=404, detail="Licitação not found")
    
    await db.licitacoes.update_one({"id": licitacao_id}, {"$set": {"status_pagamento": status}})
    
    # Se marcado como pago, creditar no caixa
    if status == "pago" and lic.get("status_pagamento") != "pago":
        caixa = await db.caixa.find_one({}, {"_id": 0})
        if caixa:
            # Usar valor total de venda baseado na quantidade fornecida
            valor_licitacao = sum(p.get("preco_venda", 0) * p.get("quantidade_fornecida", 0) for p in lic["produtos"])
            novo_saldo = caixa["saldo"] + valor_licitacao
            await db.caixa.update_one(
                {"id": caixa["id"]},
                {"$set": {"saldo": novo_saldo, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return {"message": "Status updated"}


@api_router.delete("/licitacoes/{licitacao_id}")
async def delete_licitacao(licitacao_id: str, current_user: User = Depends(get_current_user)):
    result = await db.licitacoes.delete_one({"id": licitacao_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Licitação not found")
    return {"message": "Licitação deleted"}


@api_router.get("/despesas", response_model=List[Despesa])
async def get_despesas(current_user: User = Depends(get_current_user)):
    despesas = await db.despesas.find({}, {"_id": 0}).sort("data_vencimento", -1).to_list(1000)
    for desp in despesas:
        if isinstance(desp.get("data_despesa"), str):
            desp["data_despesa"] = datetime.fromisoformat(desp["data_despesa"])
        if isinstance(desp.get("data_vencimento"), str):
            desp["data_vencimento"] = datetime.fromisoformat(desp["data_vencimento"])
        if isinstance(desp.get("created_at"), str):
            desp["created_at"] = datetime.fromisoformat(desp["created_at"])
    return despesas


@api_router.post("/despesas", response_model=Despesa)
async def create_despesa(desp_data: DespesaCreate, current_user: User = Depends(get_current_user)):
    import uuid
    desp_id = str(uuid.uuid4())
    
    desp_doc = desp_data.model_dump()
    desp_doc["id"] = desp_id
    desp_doc["status"] = "pendente"
    desp_doc["data_despesa"] = desp_doc["data_despesa"].isoformat()
    desp_doc["data_vencimento"] = desp_doc["data_vencimento"].isoformat()
    desp_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.despesas.insert_one(desp_doc)
    
    desp_doc["data_despesa"] = datetime.fromisoformat(desp_doc["data_despesa"])
    desp_doc["data_vencimento"] = datetime.fromisoformat(desp_doc["data_vencimento"])
    desp_doc["created_at"] = datetime.fromisoformat(desp_doc["created_at"])
    
    return Despesa(**desp_doc)


@api_router.put("/despesas/{despesa_id}/status")
async def update_despesa_status(despesa_id: str, status: str, current_user: User = Depends(get_current_user)):
    desp = await db.despesas.find_one({"id": despesa_id}, {"_id": 0})
    if not desp:
        raise HTTPException(status_code=404, detail="Despesa not found")
    
    await db.despesas.update_one({"id": despesa_id}, {"$set": {"status": status}})
    
    if status == "pago" and desp.get("status") != "pago":
        caixa = await db.caixa.find_one({}, {"_id": 0})
        if caixa:
            novo_saldo = caixa["saldo"] - desp["valor"]
            await db.caixa.update_one(
                {"id": caixa["id"]},
                {"$set": {"saldo": novo_saldo, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return {"message": "Status updated"}


@api_router.delete("/despesas/{despesa_id}")
async def delete_despesa(despesa_id: str, current_user: User = Depends(get_current_user)):
    result = await db.despesas.delete_one({"id": despesa_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Despesa not found")
    return {"message": "Despesa deleted"}


# ==================== NOTIFICAÇÕES ====================

@api_router.get("/notificacoes/despesas-vencimento")
async def get_despesas_proximas_vencimento(current_user: User = Depends(get_current_user)):
    """Get despesas that are due within 1 day"""
    hoje = datetime.now(timezone.utc)
    
    despesas = await db.despesas.find({"status": "pendente"}, {"_id": 0}).to_list(1000)
    
    despesas_proximas = []
    for d in despesas:
        data_venc = d.get("data_vencimento")
        if isinstance(data_venc, str):
            data_venc = datetime.fromisoformat(data_venc.replace('Z', '+00:00'))
        
        if data_venc:
            # Check if vencimento is today or tomorrow
            dias_para_vencer = (data_venc.date() - hoje.date()).days
            if dias_para_vencer <= 1 and dias_para_vencer >= 0:
                despesas_proximas.append({
                    "id": d["id"],
                    "descricao": d["descricao"],
                    "tipo": d["tipo"],
                    "valor": d["valor"],
                    "data_vencimento": data_venc.isoformat(),
                    "dias_para_vencer": dias_para_vencer
                })
    
    return {
        "quantidade": len(despesas_proximas),
        "despesas": despesas_proximas
    }


@api_router.post("/notificacoes/enviar-email-vencimentos")
async def enviar_notificacao_vencimentos(current_user: User = Depends(get_current_user)):
    """Send email notification for expenses due within 1 day"""
    
    # Get despesas próximas ao vencimento
    hoje = datetime.now(timezone.utc)
    
    despesas = await db.despesas.find({"status": "pendente"}, {"_id": 0}).to_list(1000)
    
    despesas_proximas = []
    for d in despesas:
        data_venc = d.get("data_vencimento")
        if isinstance(data_venc, str):
            data_venc = datetime.fromisoformat(data_venc.replace('Z', '+00:00'))
        
        if data_venc:
            dias_para_vencer = (data_venc.date() - hoje.date()).days
            if dias_para_vencer <= 1 and dias_para_vencer >= 0:
                despesas_proximas.append({
                    "descricao": d["descricao"],
                    "tipo": d["tipo"],
                    "valor": d["valor"],
                    "data_vencimento": data_venc.strftime("%d/%m/%Y"),
                    "dias_para_vencer": dias_para_vencer
                })
    
    if not despesas_proximas:
        return {"message": "Nenhuma despesa próxima ao vencimento", "enviado": False}
    
    # Build email HTML
    total_valor = sum(d["valor"] for d in despesas_proximas)
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .header {{ background: #1e3a5f; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .alert {{ background: #fef3c7; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th {{ background: #1e3a5f; color: white; padding: 12px; text-align: left; }}
            td {{ padding: 10px; border-bottom: 1px solid #e5e7eb; }}
            .total {{ font-size: 18px; font-weight: bold; color: #dc2626; }}
            .footer {{ background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>⚠️ XSELL - Alerta de Vencimentos</h1>
        </div>
        <div class="content">
            <div class="alert">
                <strong>Atenção!</strong> Você tem <strong>{len(despesas_proximas)} despesa(s)</strong> próxima(s) ao vencimento.
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Valor</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    for d in despesas_proximas:
        status_text = "VENCE HOJE!" if d["dias_para_vencer"] == 0 else "Vence amanhã"
        status_color = "#dc2626" if d["dias_para_vencer"] == 0 else "#f97316"
        html_content += f"""
                    <tr>
                        <td>{d["descricao"]}</td>
                        <td>{d["tipo"]}</td>
                        <td>R$ {d["valor"]:.2f}</td>
                        <td>{d["data_vencimento"]}</td>
                        <td style="color: {status_color}; font-weight: bold;">{status_text}</td>
                    </tr>
        """
    
    html_content += f"""
                </tbody>
            </table>
            
            <p class="total">Total a pagar: R$ {total_valor:.2f}</p>
            
            <p>Acesse o sistema XSELL para mais detalhes e gerenciar suas despesas.</p>
        </div>
        <div class="footer">
            <p>Este é um email automático do sistema XSELL Soluções Corporativas.</p>
            <p>Gerado em: {datetime.now().strftime("%d/%m/%Y às %H:%M")}</p>
        </div>
    </body>
    </html>
    """
    
    # Check if Resend is properly configured
    if not RESEND_AVAILABLE:
        return {
            "message": "Biblioteca Resend não instalada. Execute: pip install resend",
            "enviado": False,
            "despesas_encontradas": len(despesas_proximas),
            "email_destino": NOTIFICATION_EMAIL
        }
    
    if not RESEND_API_KEY or RESEND_API_KEY.startswith("re_test"):
        return {
            "message": "API Key do Resend não configurada. Configure RESEND_API_KEY no arquivo .env",
            "enviado": False,
            "despesas_encontradas": len(despesas_proximas),
            "email_destino": NOTIFICATION_EMAIL,
            "preview_html": html_content[:500] + "..."
        }
    
    # Send email using Resend
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [NOTIFICATION_EMAIL],
            "subject": f"⚠️ XSELL - {len(despesas_proximas)} Despesa(s) Próxima(s) ao Vencimento",
            "html": html_content
        }
        
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        
        return {
            "message": f"Email enviado com sucesso para {NOTIFICATION_EMAIL}",
            "enviado": True,
            "email_id": email_result.get("id"),
            "despesas_notificadas": len(despesas_proximas),
            "total_valor": total_valor
        }
    except Exception as e:
        logging.error(f"Erro ao enviar email: {str(e)}")
        return {
            "message": f"Erro ao enviar email: {str(e)}",
            "enviado": False,
            "despesas_encontradas": len(despesas_proximas)
        }


@api_router.get("/notificacoes/config")
async def get_notificacao_config(current_user: User = Depends(get_current_user)):
    """Get notification configuration status"""
    return {
        "resend_disponivel": RESEND_AVAILABLE,
        "resend_configurado": bool(RESEND_API_KEY) and not RESEND_API_KEY.startswith("re_test"),
        "email_remetente": SENDER_EMAIL,
        "email_destino": NOTIFICATION_EMAIL
    }


@api_router.get("/financeiro/caixa", response_model=Caixa)
async def get_caixa(current_user: User = Depends(get_current_user)):
    caixa = await db.caixa.find_one({}, {"_id": 0})
    if not caixa:
        import uuid
        caixa_doc = {
            "id": str(uuid.uuid4()),
            "saldo": 0.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.caixa.insert_one(caixa_doc)
        caixa = caixa_doc
    
    if isinstance(caixa.get("updated_at"), str):
        caixa["updated_at"] = datetime.fromisoformat(caixa["updated_at"])
    
    return Caixa(**caixa)


@api_router.post("/financeiro/caixa/movimento")
async def add_movimento_caixa(mov: MovimentacaoCaixa, current_user: User = Depends(get_current_user)):
    caixa = await db.caixa.find_one({}, {"_id": 0})
    if not caixa:
        raise HTTPException(status_code=404, detail="Caixa not found")
    
    if mov.tipo == "credito":
        novo_saldo = caixa["saldo"] + mov.valor
    elif mov.tipo == "debito":
        novo_saldo = caixa["saldo"] - mov.valor
    else:
        raise HTTPException(status_code=400, detail="Tipo inválido. Use 'credito' ou 'debito'")
    
    await db.caixa.update_one(
        {"id": caixa["id"]},
        {"$set": {"saldo": novo_saldo, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Movimento registrado", "novo_saldo": novo_saldo}


@api_router.get("/fornecedores", response_model=List[Fornecedor])
async def get_fornecedores(categoria: Optional[str] = None, current_user: User = Depends(get_current_user)):
    filter_query = {}
    if categoria and categoria != "todos":
        filter_query["categoria"] = categoria
    
    fornecedores = await db.fornecedores.find(filter_query, {"_id": 0}).to_list(1000)
    for forn in fornecedores:
        if isinstance(forn.get("created_at"), str):
            forn["created_at"] = datetime.fromisoformat(forn["created_at"])
    return fornecedores


@api_router.post("/fornecedores", response_model=Fornecedor)
async def create_fornecedor(forn_data: FornecedorCreate, current_user: User = Depends(get_current_user)):
    import uuid
    forn_id = str(uuid.uuid4())
    
    count = await db.fornecedores.count_documents({})
    codigo = f"FORN-{count + 1:06d}"
    
    forn_doc = forn_data.model_dump()
    forn_doc["id"] = forn_id
    forn_doc["codigo"] = codigo
    forn_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.fornecedores.insert_one(forn_doc)
    forn_doc["created_at"] = datetime.fromisoformat(forn_doc["created_at"])
    return Fornecedor(**forn_doc)


@api_router.put("/fornecedores/{fornecedor_id}", response_model=Fornecedor)
async def update_fornecedor(fornecedor_id: str, forn_data: FornecedorCreate, current_user: User = Depends(get_current_user)):
    result = await db.fornecedores.update_one(
        {"id": fornecedor_id},
        {"$set": forn_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fornecedor not found")
    
    forn = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    if isinstance(forn.get("created_at"), str):
        forn["created_at"] = datetime.fromisoformat(forn["created_at"])
    return Fornecedor(**forn)


@api_router.delete("/fornecedores/{fornecedor_id}")
async def delete_fornecedor(fornecedor_id: str, current_user: User = Depends(get_current_user)):
    result = await db.fornecedores.delete_one({"id": fornecedor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fornecedor not found")
    return {"message": "Fornecedor deleted"}


@api_router.get("/vendedores", response_model=List[Vendedor])
async def get_vendedores(current_user: User = Depends(get_current_user)):
    vendedores = await db.vendedores.find({}, {"_id": 0}).to_list(1000)
    for vend in vendedores:
        if isinstance(vend.get("created_at"), str):
            vend["created_at"] = datetime.fromisoformat(vend["created_at"])
    return vendedores


async def verificar_nivel_presidente(current_user: User):
    """Verifica se o usuário atual tem nível Presidente"""
    # Buscar o vendedor pelo email do usuário logado
    vendedor = await db.vendedores.find_one({"email": current_user.email}, {"_id": 0})
    
    if not vendedor:
        # Se não for vendedor cadastrado, verificar se é o admin/primeiro usuário
        # ou simplesmente negar acesso
        raise HTTPException(
            status_code=403, 
            detail="Acesso negado. Você precisa ser um vendedor com nível Presidente para realizar esta ação."
        )
    
    if vendedor.get("nivel_acesso", "").lower() != "presidente":
        raise HTTPException(
            status_code=403, 
            detail=f"Acesso negado. Apenas usuários com nível 'Presidente' podem realizar esta ação. Seu nível atual: {vendedor.get('nivel_acesso', 'Não definido')}"
        )
    
    return vendedor


@api_router.get("/vendedores/me")
async def get_current_vendedor(current_user: User = Depends(get_current_user)):
    """Retorna informações do vendedor atual logado"""
    vendedor = await db.vendedores.find_one({"email": current_user.email}, {"_id": 0})
    if vendedor:
        if isinstance(vendedor.get("created_at"), str):
            vendedor["created_at"] = datetime.fromisoformat(vendedor["created_at"])
        return {"vendedor": vendedor, "is_presidente": vendedor.get("nivel_acesso", "").lower() == "presidente"}
    return {"vendedor": None, "is_presidente": False}


@api_router.post("/vendedores", response_model=Vendedor)
async def create_vendedor(vend_data: VendedorCreate, current_user: User = Depends(get_current_user)):
    # Verificar se é Presidente (apenas Presidente pode criar vendedores)
    await verificar_nivel_presidente(current_user)
    
    import uuid
    vend_id = str(uuid.uuid4())
    
    count = await db.vendedores.count_documents({})
    codigo = f"VEND-{count + 1:06d}"
    
    vend_doc = vend_data.model_dump()
    vend_doc["id"] = vend_id
    vend_doc["codigo"] = codigo
    vend_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vendedores.insert_one(vend_doc)
    vend_doc["created_at"] = datetime.fromisoformat(vend_doc["created_at"])
    return Vendedor(**vend_doc)


@api_router.put("/vendedores/{vendedor_id}", response_model=Vendedor)
async def update_vendedor(vendedor_id: str, vend_data: VendedorCreate, current_user: User = Depends(get_current_user)):
    # Verificar se é Presidente (apenas Presidente pode alterar vendedores/níveis)
    await verificar_nivel_presidente(current_user)
    
    result = await db.vendedores.update_one(
        {"id": vendedor_id},
        {"$set": vend_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendedor not found")
    
    vend = await db.vendedores.find_one({"id": vendedor_id}, {"_id": 0})
    if isinstance(vend.get("created_at"), str):
        vend["created_at"] = datetime.fromisoformat(vend["created_at"])
    return Vendedor(**vend)


@api_router.delete("/vendedores/{vendedor_id}")
async def delete_vendedor(vendedor_id: str, current_user: User = Depends(get_current_user)):
    # Verificar se é Presidente (apenas Presidente pode excluir vendedores)
    await verificar_nivel_presidente(current_user)
    
    result = await db.vendedores.delete_one({"id": vendedor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendedor not found")
    return {"message": "Vendedor deleted"}


@api_router.get("/clientes/codigo/{codigo}", response_model=Cliente)
async def get_cliente_by_codigo(codigo: str, current_user: User = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"codigo": codigo}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    if isinstance(cliente.get("created_at"), str):
        cliente["created_at"] = datetime.fromisoformat(cliente["created_at"])
    return Cliente(**cliente)


@api_router.get("/relatorios/geral")
async def get_relatorio_geral(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    cliente_id: Optional[str] = None,
    vendedor: Optional[str] = None,
    segmento: Optional[str] = None,
    cidade: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    # Build filter for pedidos
    filter_pedidos = {}
    if data_inicio and data_fim:
        filter_pedidos["data"] = {
            "$gte": datetime.fromisoformat(data_inicio).isoformat(),
            "$lte": datetime.fromisoformat(data_fim).isoformat()
        }
    if cliente_id:
        filter_pedidos["cliente_id"] = cliente_id
    if vendedor:
        filter_pedidos["vendedor"] = vendedor
    if segmento and segmento != "todos":
        filter_pedidos["tipo_venda"] = segmento
    
    # Build filter for licitações
    filter_licitacoes = {}
    if data_inicio and data_fim:
        filter_licitacoes["data_empenho"] = {
            "$gte": datetime.fromisoformat(data_inicio).isoformat(),
            "$lte": datetime.fromisoformat(data_fim).isoformat()
        }
    if cidade:
        filter_licitacoes["cidade"] = {"$regex": cidade, "$options": "i"}
    
    # Build filter for despesas
    filter_despesas = {}
    if data_inicio and data_fim:
        filter_despesas["data_despesa"] = {
            "$gte": datetime.fromisoformat(data_inicio).isoformat(),
            "$lte": datetime.fromisoformat(data_fim).isoformat()
        }
    
    # Fetch data
    pedidos = await db.pedidos.find(filter_pedidos, {"_id": 0}).to_list(1000)
    
    # If segmento is "licitacao", only get licitações, otherwise filter based on segmento
    if segmento == "licitacao":
        licitacoes = await db.licitacoes.find(filter_licitacoes, {"_id": 0}).to_list(1000)
        pedidos = []  # Clear pedidos when filtering by licitação
    elif segmento and segmento != "todos":
        licitacoes = []  # Clear licitações when filtering by other segments
    else:
        licitacoes = await db.licitacoes.find(filter_licitacoes, {"_id": 0}).to_list(1000)
    
    despesas = await db.despesas.find(filter_despesas, {"_id": 0}).to_list(1000)
    
    # If cidade filter is set, also filter pedidos by cliente cidade
    if cidade:
        cliente_ids_in_cidade = []
        clientes = await db.clientes.find({"cidade": {"$regex": cidade, "$options": "i"}}, {"_id": 0, "id": 1}).to_list(1000)
        cliente_ids_in_cidade = [c["id"] for c in clientes]
        pedidos = [p for p in pedidos if p.get("cliente_id") in cliente_ids_in_cidade]
    
    # Calculate totals
    total_faturado_pedidos = sum(p.get("valor_total_venda", 0) for p in pedidos)
    total_faturado_licitacoes = sum(lic.get("valor_total_venda", 0) for lic in licitacoes)
    total_faturado = total_faturado_pedidos + total_faturado_licitacoes
    
    total_custo_pedidos = sum(p.get("custo_total", 0) for p in pedidos)
    total_custo_licitacoes = sum(lic.get("valor_total_compra", 0) for lic in licitacoes)
    total_custo = total_custo_pedidos + total_custo_licitacoes
    
    total_lucro_pedidos = sum(p.get("lucro_total", 0) for p in pedidos)
    total_lucro_licitacoes = sum(lic.get("lucro_total", 0) for lic in licitacoes)
    
    total_despesas = sum(d.get("valor", 0) for d in despesas)
    
    # Group by segmento
    segmentos_pedidos = {}
    for p in pedidos:
        seg = p.get("tipo_venda", "outros")
        if seg not in segmentos_pedidos:
            segmentos_pedidos[seg] = {"quantidade": 0, "faturamento": 0, "lucro": 0}
        segmentos_pedidos[seg]["quantidade"] += 1
        segmentos_pedidos[seg]["faturamento"] += p.get("valor_total_venda", 0)
        segmentos_pedidos[seg]["lucro"] += p.get("lucro_total", 0)
    
    # Add licitações as a segment
    if licitacoes:
        segmentos_pedidos["licitacao"] = {
            "quantidade": len(licitacoes),
            "faturamento": total_faturado_licitacoes,
            "lucro": total_lucro_licitacoes
        }
    
    # Group by vendedor
    vendedores_stats = {}
    for p in pedidos:
        vend = p.get("vendedor", "Não informado")
        if vend not in vendedores_stats:
            vendedores_stats[vend] = {"quantidade": 0, "faturamento": 0, "lucro": 0}
        vendedores_stats[vend]["quantidade"] += 1
        vendedores_stats[vend]["faturamento"] += p.get("valor_total_venda", 0)
        vendedores_stats[vend]["lucro"] += p.get("lucro_total", 0)
    
    # Group by cidade (from clientes)
    cidades_stats = {}
    clientes_dict = {}
    clientes_all = await db.clientes.find({}, {"_id": 0}).to_list(1000)
    for c in clientes_all:
        clientes_dict[c["id"]] = c
    
    for p in pedidos:
        cliente = clientes_dict.get(p.get("cliente_id"), {})
        cid = cliente.get("cidade", "Não informada")
        if cid not in cidades_stats:
            cidades_stats[cid] = {"quantidade": 0, "faturamento": 0, "lucro": 0}
        cidades_stats[cid]["quantidade"] += 1
        cidades_stats[cid]["faturamento"] += p.get("valor_total_venda", 0)
        cidades_stats[cid]["lucro"] += p.get("lucro_total", 0)
    
    # Add licitações cities
    for lic in licitacoes:
        cid = lic.get("cidade", "Não informada")
        if cid not in cidades_stats:
            cidades_stats[cid] = {"quantidade": 0, "faturamento": 0, "lucro": 0}
        cidades_stats[cid]["quantidade"] += 1
        cidades_stats[cid]["faturamento"] += lic.get("valor_total_venda", 0)
        cidades_stats[cid]["lucro"] += lic.get("lucro_total", 0)
    
    # Recent transactions (last 10)
    transacoes_recentes = []
    for p in sorted(pedidos, key=lambda x: x.get("data", ""), reverse=True)[:10]:
        transacoes_recentes.append({
            "tipo": "Pedido",
            "numero": p.get("numero", ""),
            "cliente": p.get("cliente_nome", ""),
            "valor": p.get("valor_total_venda", 0),
            "lucro": p.get("lucro_total", 0),
            "data": p.get("data", ""),
            "segmento": p.get("tipo_venda", ""),
            "vendedor": p.get("vendedor", "")
        })
    
    for lic in sorted(licitacoes, key=lambda x: x.get("data_empenho", ""), reverse=True)[:10]:
        transacoes_recentes.append({
            "tipo": "Licitação",
            "numero": lic.get("numero_licitacao", ""),
            "cliente": lic.get("orgao_publico", ""),
            "valor": lic.get("valor_total_venda", 0),
            "lucro": lic.get("lucro_total", 0),
            "data": lic.get("data_empenho", ""),
            "segmento": "licitacao",
            "vendedor": "-"
        })
    
    # Sort all transactions by date
    transacoes_recentes = sorted(transacoes_recentes, key=lambda x: x.get("data", ""), reverse=True)[:10]
    
    return {
        "total_faturado": total_faturado,
        "total_faturado_pedidos": total_faturado_pedidos,
        "total_faturado_licitacoes": total_faturado_licitacoes,
        "total_custo": total_custo,
        "total_lucro_pedidos": total_lucro_pedidos,
        "total_lucro_licitacoes": total_lucro_licitacoes,
        "lucro_total": total_lucro_pedidos + total_lucro_licitacoes,
        "total_despesas": total_despesas,
        "lucro_liquido": total_lucro_pedidos + total_lucro_licitacoes - total_despesas,
        "quantidade_pedidos": len(pedidos),
        "quantidade_licitacoes": len(licitacoes),
        "por_segmento": segmentos_pedidos,
        "por_vendedor": vendedores_stats,
        "por_cidade": cidades_stats,
        "transacoes_recentes": transacoes_recentes
    }


@api_router.get("/relatorios/filtros")
async def get_filtros_disponiveis(current_user: User = Depends(get_current_user)):
    """Return available filter options for the reports page"""
    # Get unique vendedores
    vendedores = await db.vendedores.find({"ativo": True}, {"_id": 0, "nome": 1}).to_list(100)
    vendedores_list = [v["nome"] for v in vendedores]
    
    # Get unique cidades from clientes and licitações
    clientes = await db.clientes.find({}, {"_id": 0, "cidade": 1}).to_list(1000)
    licitacoes = await db.licitacoes.find({}, {"_id": 0, "cidade": 1}).to_list(1000)
    
    cidades_set = set()
    for c in clientes:
        if c.get("cidade"):
            cidades_set.add(c["cidade"])
    for lic in licitacoes:
        if lic.get("cidade"):
            cidades_set.add(lic["cidade"])
    
    cidades_list = sorted(list(cidades_set))
    
    # Segmentos disponíveis
    segmentos = [
        {"value": "todos", "label": "Todos"},
        {"value": "licitacao", "label": "Licitação"},
        {"value": "consumidor_final", "label": "Consumidor Final"},
        {"value": "revenda", "label": "Revenda"},
        {"value": "brindeiros", "label": "Brindeiros"}
    ]
    
    return {
        "vendedores": vendedores_list,
        "cidades": cidades_list,
        "segmentos": segmentos
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
