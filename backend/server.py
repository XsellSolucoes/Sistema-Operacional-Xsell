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
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ClienteCreate(BaseModel):
    codigo: str
    cnpj: str
    nome: str
    razao_social: str
    nome_fantasia: str
    endereco: str
    cidade: str
    estado: str
    cep: str


class Produto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    codigo: str
    descricao: str
    preco_compra: float
    preco_venda: float
    margem: float = 40.0
    fornecedor: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProdutoCreate(BaseModel):
    codigo: str
    descricao: str
    preco_compra: float
    preco_venda: Optional[float] = None
    margem: Optional[float] = 40.0
    fornecedor: Optional[str] = None


class ItemPedido(BaseModel):
    produto_id: str
    produto_codigo: str
    produto_descricao: str
    quantidade: float
    preco_compra: float
    preco_venda: float
    despesas: float = 0.0
    lucro_item: float


class Pedido(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    numero: str
    data: datetime
    cliente_id: str
    cliente_nome: str
    itens: List[ItemPedido]
    frete: float = 0.0
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
    forma_pagamento: str
    tipo_venda: str
    vendedor: str


class Orcamento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    numero: str
    data: datetime
    cliente_id: str
    cliente_nome: str
    itens: List[ItemPedido]
    valor_total: float
    validade_dias: int
    forma_pagamento: str
    prazo_entrega: str
    frete_por_conta: str
    observacoes: str = "Produto sujeito à disponibilidade de estoque no momento do fechamento do pedido, devido a estoque rotativo."
    status: str = "aberto"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrcamentoCreate(BaseModel):
    cliente_id: str
    itens: List[ItemPedido]
    validade_dias: int
    forma_pagamento: str
    prazo_entrega: str
    frete_por_conta: str
    observacoes: Optional[str] = "Produto sujeito à disponibilidade de estoque no momento do fechamento do pedido, devido a estoque rotativo."


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
    produtos: List[Dict[str, Any]]
    previsao_fornecimento: Optional[datetime] = None
    fornecimento_efetivo: Optional[datetime] = None
    previsao_pagamento: Optional[datetime] = None
    lucro_total: float
    status: str = "pendente"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LicitacaoCreate(BaseModel):
    numero_licitacao: str
    cidade: str
    estado: str
    orgao_publico: str
    numero_empenho: str
    data_empenho: datetime
    numero_nota_empenho: str
    produtos: List[Dict[str, Any]]
    previsao_fornecimento: Optional[datetime] = None
    previsao_pagamento: Optional[datetime] = None


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
    valor_total_venda = sum(item.preco_venda * item.quantidade for item in pedido_data.itens)
    despesas_totais = sum(item.despesas * item.quantidade for item in pedido_data.itens) + pedido_data.frete
    lucro_total = valor_total_venda - custo_total - despesas_totais
    
    pedido_doc = {
        "id": pedido_id,
        "numero": numero,
        "data": datetime.now(timezone.utc).isoformat(),
        "cliente_id": pedido_data.cliente_id,
        "cliente_nome": cliente["nome"],
        "itens": [item.model_dump() for item in pedido_data.itens],
        "frete": pedido_data.frete,
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
        if isinstance(orc.get("created_at"), str):
            orc["created_at"] = datetime.fromisoformat(orc["created_at"])
    return orcamentos


@api_router.get("/orcamentos/{orcamento_id}", response_model=Orcamento)
async def get_orcamento(orcamento_id: str, current_user: User = Depends(get_current_user)):
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento not found")
    
    if isinstance(orcamento.get("data"), str):
        orcamento["data"] = datetime.fromisoformat(orcamento["data"])
    if isinstance(orcamento.get("created_at"), str):
        orcamento["created_at"] = datetime.fromisoformat(orcamento["created_at"])
    
    return Orcamento(**orcamento)


@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(orc_data: OrcamentoCreate, current_user: User = Depends(get_current_user)):
    import uuid
    orc_id = str(uuid.uuid4())
    
    count = await db.orcamentos.count_documents({})
    numero = f"ORC-{count + 1:06d}"
    
    cliente = await db.clientes.find_one({"id": orc_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente not found")
    
    valor_total = sum(item.preco_venda * item.quantidade for item in orc_data.itens)
    
    orc_doc = {
        "id": orc_id,
        "numero": numero,
        "data": datetime.now(timezone.utc).isoformat(),
        "cliente_id": orc_data.cliente_id,
        "cliente_nome": cliente["nome"],
        "itens": [item.model_dump() for item in orc_data.itens],
        "valor_total": valor_total,
        "validade_dias": orc_data.validade_dias,
        "forma_pagamento": orc_data.forma_pagamento,
        "prazo_entrega": orc_data.prazo_entrega,
        "frete_por_conta": orc_data.frete_por_conta,
        "observacoes": orc_data.observacoes,
        "status": "aberto",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orcamentos.insert_one(orc_doc)
    orc_doc["data"] = datetime.fromisoformat(orc_doc["data"])
    orc_doc["created_at"] = datetime.fromisoformat(orc_doc["created_at"])
    return Orcamento(**orc_doc)


@api_router.post("/orcamentos/{orcamento_id}/convert", response_model=Pedido)
async def convert_orcamento_to_pedido(orcamento_id: str, vendedor: str, current_user: User = Depends(get_current_user)):
    orc = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orc:
        raise HTTPException(status_code=404, detail="Orçamento not found")
    
    pedido_data = PedidoCreate(
        cliente_id=orc["cliente_id"],
        itens=[ItemPedido(**item) for item in orc["itens"]],
        frete=0.0,
        forma_pagamento=orc["forma_pagamento"],
        tipo_venda="orcamento",
        vendedor=vendedor
    )
    
    pedido = await create_pedido(pedido_data, current_user)
    
    await db.orcamentos.update_one({"id": orcamento_id}, {"$set": {"status": "convertido"}})
    
    return pedido


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
    return licitacoes


@api_router.post("/licitacoes", response_model=Licitacao)
async def create_licitacao(lic_data: LicitacaoCreate, current_user: User = Depends(get_current_user)):
    import uuid
    lic_id = str(uuid.uuid4())
    
    lucro_total = sum(
        (p["preco_venda"] - p["preco_compra"] - p.get("despesas_extras", 0)) * p["quantidade_empenhada"]
        for p in lic_data.produtos
    )
    
    lic_doc = lic_data.model_dump()
    lic_doc["id"] = lic_id
    lic_doc["lucro_total"] = lucro_total
    lic_doc["status"] = "pendente"
    lic_doc["data_empenho"] = lic_doc["data_empenho"].isoformat()
    if lic_doc.get("previsao_fornecimento"):
        lic_doc["previsao_fornecimento"] = lic_doc["previsao_fornecimento"].isoformat()
    if lic_doc.get("previsao_pagamento"):
        lic_doc["previsao_pagamento"] = lic_doc["previsao_pagamento"].isoformat()
    lic_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.licitacoes.insert_one(lic_doc)
    
    lic_doc["data_empenho"] = datetime.fromisoformat(lic_doc["data_empenho"])
    if lic_doc.get("previsao_fornecimento"):
        lic_doc["previsao_fornecimento"] = datetime.fromisoformat(lic_doc["previsao_fornecimento"])
    if lic_doc.get("previsao_pagamento"):
        lic_doc["previsao_pagamento"] = datetime.fromisoformat(lic_doc["previsao_pagamento"])
    lic_doc["created_at"] = datetime.fromisoformat(lic_doc["created_at"])
    
    return Licitacao(**lic_doc)


@api_router.put("/licitacoes/{licitacao_id}/status")
async def update_licitacao_status(licitacao_id: str, status: str, current_user: User = Depends(get_current_user)):
    lic = await db.licitacoes.find_one({"id": licitacao_id}, {"_id": 0})
    if not lic:
        raise HTTPException(status_code=404, detail="Licitação not found")
    
    await db.licitacoes.update_one({"id": licitacao_id}, {"$set": {"status": status}})
    
    if status == "pago" and lic.get("status") != "pago":
        caixa = await db.caixa.find_one({}, {"_id": 0})
        if caixa:
            valor_licitacao = sum(p["preco_venda"] * p["quantidade_fornecida"] for p in lic["produtos"])
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


@api_router.get("/relatorios/geral")
async def get_relatorio_geral(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    cliente_id: Optional[str] = None,
    vendedor: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
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
    
    pedidos = await db.pedidos.find(filter_pedidos, {"_id": 0}).to_list(1000)
    licitacoes = await db.licitacoes.find({}, {"_id": 0}).to_list(1000)
    despesas = await db.despesas.find({}, {"_id": 0}).to_list(1000)
    
    total_faturado = sum(p["valor_total_venda"] for p in pedidos)
    total_custo = sum(p["custo_total"] for p in pedidos)
    total_lucro_pedidos = sum(p["lucro_total"] for p in pedidos)
    total_lucro_licitacoes = sum(l["lucro_total"] for l in licitacoes)
    total_despesas = sum(d["valor"] for d in despesas)
    
    return {
        "total_faturado": total_faturado,
        "total_custo": total_custo,
        "total_lucro_pedidos": total_lucro_pedidos,
        "total_lucro_licitacoes": total_lucro_licitacoes,
        "lucro_total": total_lucro_pedidos + total_lucro_licitacoes,
        "total_despesas": total_despesas,
        "lucro_liquido": total_lucro_pedidos + total_lucro_licitacoes - total_despesas,
        "quantidade_pedidos": len(pedidos),
        "quantidade_licitacoes": len(licitacoes)
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
