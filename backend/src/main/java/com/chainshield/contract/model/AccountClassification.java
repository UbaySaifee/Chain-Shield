package com.chainshield.contract.model;

/**
 * Classification of an EVM address according to code existence.
 */
public enum AccountClassification {
    CONTRACT,
    EOA,
    UNKNOWN,
    UNAVAILABLE
}
