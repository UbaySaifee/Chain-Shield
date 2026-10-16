-- ChainShield V2 Initial Risk Indicators Seed Data

INSERT INTO risk_indicators (code, category, title, description, severity, default_weight)
VALUES 
    ('IND-W01', 'WALLET_BEHAVIOR', 'Known Malicious Entity Match', 'Target address matches a cataloged phishing address, illicit mixer, or known drainer.', 'CRITICAL', 45),
    ('IND-W02', 'WALLET_BEHAVIOR', 'Fresh High-Velocity Account', 'Account created less than 7 days ago with unusually high transaction volume.', 'MEDIUM', 20),
    ('IND-W03', 'WALLET_BEHAVIOR', 'Abnormal High-Value Outflow', 'Rapid withdrawal of greater than 80% wallet balance within a short time window.', 'HIGH', 25),
    ('IND-C01', 'CONTRACT_PERMISSIONS', 'Unverified Source Bytecode', 'Smart contract has deployed bytecode but no published verified source code.', 'MEDIUM', 15),
    ('IND-C02', 'CONTRACT_PERMISSIONS', 'Centralized Mint/Burn Control', 'Contract owner retains unilateral authority to mint or burn arbitrary tokens.', 'HIGH', 25),
    ('IND-C03', 'CONTRACT_PERMISSIONS', 'Honeypot Sell Restriction', 'Dry-run transfer or sell execution reverts while token purchases succeed.', 'CRITICAL', 50),
    ('IND-C04', 'CONTRACT_PERMISSIONS', 'Unrestricted Delegatecall', 'Bytecode contains delegatecall instructions targeting user-supplied or mutable addresses.', 'HIGH', 35),
    ('IND-T01', 'TRANSACTION_SIMULATION', 'Unlimited Token Approval', 'Transaction calldata grants excessive or unlimited (Max Uint256) token spending allowance.', 'HIGH', 35),
    ('IND-T02', 'TRANSACTION_SIMULATION', 'Simulation Revert / Execution Failure', 'Pre-execution EVM dry-run reverts with an explicit error or out-of-gas fault.', 'HIGH', 40),
    ('IND-T03', 'TRANSACTION_SIMULATION', 'Drainer Signature Pattern', 'Transaction calldata attempts unconstrained asset transfers without counter-value.', 'CRITICAL', 45)
ON CONFLICT (code) DO NOTHING;

-- Seed Demo Known Threats
INSERT INTO known_threats (address, threat_type, source_feed, description, confidence_level)
VALUES
    ('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 'ILLICIT_MIXER', 'ChainShield Threat Intelligence Feed', 'Simulated Tornado Cash / Privacy Mixer routing address.', 100),
    ('0x90F79bf6EB2c4f870365E785982E1f101E93b906', 'PHISHING_DRAINER', 'ChainShield Blacklist Registry', 'Simulated Malicious Permit Drainer contract.', 95)
ON CONFLICT (address) DO NOTHING;
