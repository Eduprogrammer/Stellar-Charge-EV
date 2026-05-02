#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, Symbol, symbol_short,
};

// ─── Tipos ─────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum SessionState {
    Iniciada,
    EmAndamento,
    Finalizada,
    Erro,
}

#[contracttype]
#[derive(Clone)]
pub struct Session {
    pub usuario: Address,
    pub carregador_id: Symbol,
    pub custo_acumulado: i128, // stroops
    pub estado: SessionState,
}

#[contracttype]
#[derive(Clone)]
pub struct Charger {
    pub operador: Address,
    pub preco_kwh_stroops: i128, // stroops por kWh
    pub ativo: bool,
}

#[contracttype]
pub enum DataKey {
    Session(u64),
    Charger(Symbol),
    NextSessionId,
}

// ─── Contrato ──────────────────────────────────────────────────────────────

#[contract]
pub struct ChargeEvContract;

#[contractimpl]
impl ChargeEvContract {

    // Registrar carregador — qualquer operador pode registrar o próprio EVSE
    pub fn registrar_carregador(
        env: Env,
        carregador_id: Symbol,
        operador: Address,
        preco_kwh_stroops: i128,
    ) {
        operador.require_auth();

        let charger = Charger {
            operador: operador.clone(),
            preco_kwh_stroops,
            ativo: true,
        };

        env.storage().persistent().set(
            &DataKey::Charger(carregador_id.clone()),
            &charger,
        );

        env.events().publish(
            (symbol_short!("ChrgrReg"),),
            (carregador_id, operador, preco_kwh_stroops),
        );
    }

    // Consultar dados do carregador
    pub fn consultar_carregador(env: Env, carregador_id: Symbol) -> Charger {
        env.storage()
            .persistent()
            .get(&DataKey::Charger(carregador_id))
            .expect("Carregador nao encontrado")
    }

    // Iniciar sessão de recarga — usuário assina autorizando a sessão
    pub fn iniciar_sessao(
        env: Env,
        usuario: Address,
        carregador_id: Symbol,
    ) -> u64 {
        usuario.require_auth();

        let charger: Charger = env
            .storage()
            .persistent()
            .get(&DataKey::Charger(carregador_id.clone()))
            .expect("Carregador nao encontrado");

        if !charger.ativo {
            panic!("CARREGADOR_INATIVO");
        }

        let session_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextSessionId)
            .unwrap_or(0u64)
            + 1;
        env.storage()
            .instance()
            .set(&DataKey::NextSessionId, &session_id);

        let session = Session {
            usuario: usuario.clone(),
            carregador_id: carregador_id.clone(),
            custo_acumulado: 0,
            estado: SessionState::Iniciada,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Session(session_id), &session);

        env.events().publish(
            (symbol_short!("SessStart"),),
            (session_id, usuario, carregador_id),
        );

        session_id
    }

    // Atualizar consumo — chamado pelo backend quando recebe MeterValues do OCPP
    pub fn atualizar_consumo(
        env: Env,
        sessao_id: u64,
        custo_incremento: i128,
        operador: Address,
    ) -> i128 {
        operador.require_auth();

        let mut session: Session = env
            .storage()
            .persistent()
            .get(&DataKey::Session(sessao_id))
            .expect("Sessao nao encontrada");

        let charger: Charger = env
            .storage()
            .persistent()
            .get(&DataKey::Charger(session.carregador_id.clone()))
            .expect("Carregador nao encontrado");

        if charger.operador != operador {
            panic!("ACCESS_DENIED");
        }

        if session.estado == SessionState::Finalizada
            || session.estado == SessionState::Erro
        {
            panic!("SESSAO_ENCERRADA");
        }

        session.estado = SessionState::EmAndamento;
        session.custo_acumulado = session
            .custo_acumulado
            .checked_add(custo_incremento)
            .expect("Overflow no custo");

        env.storage()
            .persistent()
            .set(&DataKey::Session(sessao_id), &session);

        env.events().publish(
            (symbol_short!("Consumo"),),
            (sessao_id, custo_incremento, session.custo_acumulado),
        );

        session.custo_acumulado
    }

    // Finalizar sessão
    pub fn finalizar_sessao(env: Env, sessao_id: u64, operador: Address) -> i128 {
        operador.require_auth();

        let mut session: Session = env
            .storage()
            .persistent()
            .get(&DataKey::Session(sessao_id))
            .expect("Sessao nao encontrada");

        if session.estado == SessionState::Finalizada {
            panic!("SESSAO_JA_FINALIZADA");
        }

        let charger: Charger = env
            .storage()
            .persistent()
            .get(&DataKey::Charger(session.carregador_id.clone()))
            .expect("Carregador nao encontrado");

        if charger.operador != operador {
            panic!("ACCESS_DENIED");
        }

        let custo_total = session.custo_acumulado;
        let usuario = session.usuario.clone();

        session.estado = SessionState::Finalizada;
        env.storage()
            .persistent()
            .set(&DataKey::Session(sessao_id), &session);

        env.events().publish(
            (symbol_short!("SessFin"),),
            (sessao_id, usuario, operador, custo_total),
        );

        custo_total
    }

    // Consultar sessão
    pub fn consultar_sessao(env: Env, sessao_id: u64) -> Session {
        env.storage()
            .persistent()
            .get(&DataKey::Session(sessao_id))
            .expect("Sessao nao encontrada")
    }
}