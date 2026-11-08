# Sources: Starknet and the post-quantum break (8 Nov 2026)

The owner's own script, kept word for word (spoken handles: "Starknet"). Every fact was checked on 8 Nov 2026 and is read-only.

| Claim | Source (read 8 Nov 2026) |
|---|---|
| On 5 July 2022, NIST picked its first post-quantum algorithms (CRYSTALS-Kyber, CRYSTALS-Dilithium, FALCON, SPHINCS+), with four more still under consideration | NIST news release, "NIST Announces First Four Quantum-Resistant Cryptographic Algorithms", 5 July 2022 (updated 10 Apr 2025): https://www.nist.gov/news-events/news/2022/07/nist-announces-first-four-quantum-resistant-cryptographic-algorithms. Its text: "Four additional algorithms are under consideration…"; "For digital signatures… NIST has selected the three algorithms CRYSTALS-Dilithium, FALCON and SPHINCS+". The four round-4 candidates were BIKE, Classic McEliece, HQC and SIKE. |
| Less than a month later, two researchers in Belgium broke SIKE within an hour on one core of a normal processor | Castryck & Decru (KU Leuven), "An efficient key recovery attack on SIDH", IACR ePrint 2022/975, received 30 July 2022. The preliminary version says it breaks SIKEp434 "in about one hour on a single core". Copy: https://math.mit.edu/~drew/CastryckDecruSikeAttack.pdf. Coverage: The Register, 3 Aug 2022, https://www.theregister.com/2022/08/03/nist_quantum_resistant_crypto_cracked/ (an Intel Xeon E5-2630v2; about 62 minutes). |
| On Starknet, every account is a smart contract with its own signature check, so it can switch signature method without a network-wide upgrade | quantum.starkware.co/architecture: "Each account is a programmable contract that can define its own signature checks… without a protocol-wide change." |
| The proofs run on hash functions, not the elliptic-curve maths Shor's algorithm threatens | quantum.starkware.co/architecture: "STARK proving relies on hash functions rather than the elliptic-curve assumptions threatened by Shor's algorithm." |
| As of the hub's 3 November 2026 update, a Falcon-512 account has been demonstrated on Starknet mainnet | quantum.starkware.co/roadmap, register: "Post-quantum accounts: Demonstrated on mainnet"; public evidence: "OpenZeppelin Falcon‑512 account, Starknet mainnet"; "Last updated: 3 November 2026." |
| It is a demo; existing accounts don't change by themselves; each owner chooses when to move; Starknet is not claiming to be quantum safe today | quantum.starkware.co/roadmap: "Existing accounts do not change automatically: account owners choose when to adopt a post-quantum account, once wallets support it". The hub states a 2027 target for full post-quantum security. |
| The hub shows what is live and what still depends on Ethereum | quantum.starkware.co/roadmap register: "Bridge, messaging and data availability: External dependency: Depends on Ethereum's migration…" |

On-screen pages are the real pages, shown whole under a camera: NIST's release and quantum.starkware.co (home, architecture,
roadmap). The IACR ePrint page refused our automated page load (Cloudflare), so the paper is cited, not shown.
