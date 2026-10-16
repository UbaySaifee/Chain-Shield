-- ChainShield V4 Graph & Address Intelligence Migration
-- Enhances transaction_graph_edges with token address, amount, block number, and function details

ALTER TABLE transaction_graph_edges ADD COLUMN IF NOT EXISTS block_number BIGINT DEFAULT 0;
ALTER TABLE transaction_graph_edges ADD COLUMN IF NOT EXISTS token_address VARCHAR(42);
ALTER TABLE transaction_graph_edges ADD COLUMN IF NOT EXISTS token_amount VARCHAR(78);
ALTER TABLE transaction_graph_edges ADD COLUMN IF NOT EXISTS function_name VARCHAR(100);
ALTER TABLE transaction_graph_edges ADD COLUMN IF NOT EXISTS network VARCHAR(50) DEFAULT 'LOCAL_DEMO_NETWORK';

CREATE INDEX IF NOT EXISTS idx_graph_tx_hash ON transaction_graph_edges(tx_hash);
CREATE INDEX IF NOT EXISTS idx_graph_token_address ON transaction_graph_edges(token_address);
CREATE INDEX IF NOT EXISTS idx_graph_block_number ON transaction_graph_edges(block_number);
