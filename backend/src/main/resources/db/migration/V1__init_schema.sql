-- ChainShield V1 Core Schema Migration

CREATE TABLE IF NOT EXISTS analyzed_entities (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL UNIQUE,
    entity_type VARCHAR(20) NOT NULL,
    label VARCHAR(100),
    overall_reputation_score INT NOT NULL DEFAULT 0,
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_indicators (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    default_weight INT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY,
    entity_id BIGINT REFERENCES analyzed_entities(id),
    target_address VARCHAR(42) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    overall_score INT NOT NULL,
    risk_category VARCHAR(20) NOT NULL,
    summary_explanation TEXT NOT NULL,
    metadata_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_indicators (
    id BIGSERIAL PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
    indicator_id BIGINT NOT NULL REFERENCES risk_indicators(id),
    applied_weight INT NOT NULL,
    context_explanation TEXT NOT NULL,
    evidence_data TEXT
);

CREATE TABLE IF NOT EXISTS simulated_transactions (
    id UUID PRIMARY KEY,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value_wei VARCHAR(78) NOT NULL DEFAULT '0',
    calldata_hex TEXT,
    gas_used INT,
    simulation_status VARCHAR(20) NOT NULL,
    revert_reason TEXT,
    balance_deltas_json TEXT,
    allowance_deltas_json TEXT,
    simulated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS known_threats (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(42) NOT NULL UNIQUE,
    threat_type VARCHAR(50) NOT NULL,
    source_feed VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    confidence_level INT NOT NULL DEFAULT 100,
    reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_graph_edges (
    id BIGSERIAL PRIMARY KEY,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    value_eth NUMERIC(18, 6) NOT NULL DEFAULT 0,
    token_symbol VARCHAR(20) NOT NULL DEFAULT 'ETH',
    relationship_type VARCHAR(30) NOT NULL,
    block_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_reports (
    id UUID PRIMARY KEY,
    assessment_id UUID REFERENCES risk_assessments(id),
    target_address VARCHAR(42) NOT NULL,
    risk_category VARCHAR(20) NOT NULL,
    executive_summary TEXT NOT NULL,
    full_report_payload TEXT NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Essential Indexes
CREATE INDEX IF NOT EXISTS idx_entities_address ON analyzed_entities(address);
CREATE INDEX IF NOT EXISTS idx_assessments_address ON risk_assessments(target_address);
CREATE INDEX IF NOT EXISTS idx_known_threats_address ON known_threats(address);
CREATE INDEX IF NOT EXISTS idx_graph_from ON transaction_graph_edges(from_address);
CREATE INDEX IF NOT EXISTS idx_graph_to ON transaction_graph_edges(to_address);
