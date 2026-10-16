-- ChainShield V3 Contract Analyzer Risk Indicators Seed Data
-- Adds specific contract capability and permission indicators for Milestone 5

INSERT INTO risk_indicators (code, category, title, description, severity, default_weight)
VALUES 
    ('IND-C05', 'CONTRACT_PERMISSIONS', 'Self-Destruct Capable', 'Contract bytecode contains the SELFDESTRUCT opcode, permitting ether extraction and code erasure.', 'HIGH', 30),
    ('IND-C06', 'PROXY_ARCHITECTURE', 'Upgradeable Proxy Pattern Detected', 'Contract routes execution through an EIP-1967 or delegatecall proxy with mutable implementation.', 'MEDIUM', 15),
    ('IND-C07', 'ACCESS_CONTROL', 'Administrative Ownership Authority', 'Contract designates an administrative owner key with authority over privileged methods.', 'LOW', 10),
    ('IND-C08', 'SECURITY_RISK', 'Arbitrary Balance Extraction Function', 'Contract contains unconstrained methods designed to transfer victim or deposited assets to a treasury.', 'CRITICAL', 40),
    ('IND-C09', 'CONTRACT_DISCOVERY', 'Contract Bytecode Not Deployed', 'Target address is an un-deployed contract account or contains empty bytecode.', 'LOW', 0),
    ('IND-C10', 'ADMINISTRATIVE', 'Owner-Controlled Pause Capability', 'Contract owner can unilaterally halt token transfers or interaction via pause mechanisms.', 'MEDIUM', 15);
