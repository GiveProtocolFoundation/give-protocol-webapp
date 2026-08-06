# GIV-819 — ASV MEDIUM findings on api.giveprotocol.io:2053/2083 — dispute + Supabase ticket drafts

**Owner:** CTO (d248f580) · **Parent:** GIV-538 (Q3 2026 ASV scan / AOSC) · **Drafted:** 2026-08-03 (UTC)

## 1. Independent verification (CTO live probes, 2026-08-03 UTC, Node.js TLS client)

DNS:

- `api.giveprotocol.io` → CNAME `lhbyfidtlhojnrewpstp.supabase.co` → A `104.18.38.10`, `172.64.149.246` (Supabase-managed Cloudflare zone — **not** a Give Protocol Cloudflare account). Confirms CEO probe of 2026-08-03.

TLS handshake acceptance matrix, ports 2053 and 2083 (identical results on both; port 443 matches):

| Probe                                                                                                    | Result                                              |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| TLS 1.0 / TLS 1.1                                                                                        | **Rejected**                                        |
| TLS 1.3 (AEAD suites)                                                                                    | Accepted (TLS_AES_256_GCM_SHA384)                   |
| TLS 1.2 ECDHE-RSA-AES128/256-GCM                                                                         | Accepted (PCI/Mozilla-Intermediate compliant)       |
| TLS 1.2 ECDHE-RSA-CHACHA20-POLY1305                                                                      | Accepted (compliant)                                |
| TLS 1.2 **DHE-RSA-AES128-GCM-SHA256 / DHE-RSA-AES256-GCM-SHA384** (the suites named in the scan finding) | **Rejected — handshake failure**                    |
| TLS 1.2 DHE-RSA-AES128/256-SHA, DHE-RSA-CHACHA20-POLY1305                                                | Rejected                                            |
| TLS 1.2 static-RSA key exchange (AES-GCM/CBC, no PFS)                                                    | Rejected                                            |
| TLS 1.2 ECDHE-RSA-AES128-SHA / AES256-SHA (SHA-1 CBC)                                                    | Rejected                                            |
| TLS 1.2 ECDHE-RSA-AES128-SHA256 / ECDHE-RSA-AES256-SHA384 (SHA-2 CBC)                                    | Accepted — only deviation from Mozilla Intermediate |

**Conclusion:** the flagged DHE-RSA suites do **not** reproduce as of 2026-08-03. The edge enforces TLS ≥1.2 with forward secrecy (ECDHE) on every accepted suite. The only "discouraged" acceptances are two CBC-mode ECDHE suites with SHA-2 HMACs, which are not prohibited by PCI DSS v4.0.1 strong-cryptography requirements (PFS present, no SHA-1, no known practical attack with modern TLS stacks).

## 2. Draft A — Secusy ASV dispute (false positive / third-party exception)

> **Scan:** Q3 2026 external scan, target `api.giveprotocol.io`, dated 2026-08-01
> **Findings disputed:** "SSL/TLS Recommended Cipher Suites (PCI DSS)", ports 2053 and 2083, CVSS 4.8 (MEDIUM)
>
> We dispute these two findings on the following grounds, per the PCI ASV Program Guide provisions for false positives and third-party-managed components:
>
> 1. **Finding does not reproduce.** The finding identifies DHE-RSA cipher suites (TLS_DHE_RSA_WITH_AES_128_GCM_SHA256, TLS_DHE_RSA_WITH_AES_256_GCM_SHA384). Independent verification on 2026-08-03 (Node.js/OpenSSL TLS client, from an external network) shows the target **rejects all DHE-RSA suites** on ports 2053, 2083, and 443 with a handshake-failure alert. All accepted TLS 1.2 suites use ECDHE key exchange (forward secrecy); TLS 1.0/1.1 and static-RSA key exchange are rejected; TLS 1.3 is enabled. Evidence transcript available on request.
> 2. **Third-party managed infrastructure.** `api.giveprotocol.io` is a CNAME to `lhbyfidtlhojnrewpstp.supabase.co`, terminating on Supabase's managed Cloudflare edge. Give Protocol has no administrative control over cipher configuration or port exposure on this edge. Supabase is a PCI-relevant third-party service provider under our vendor-management program (DPA/SCCs on file). A support request to Supabase regarding cipher/port configuration has been filed in parallel.
> 3. **No cardholder data or application traffic on the flagged ports.** Ports 2053/2083 are Cloudflare alternate-HTTPS ports open by default on the managed edge. Our application exclusively uses port 443; no payment or cardholder data flows traverse ports 2053/2083. Card payments are processed by a PCI DSS Level 1 provider via hosted fields (SAQ A-EP scope).
>
> Requested resolution: mark both findings as false positive (or "noted — third-party responsibility") and issue a passing attestation for this target, or advise what additional evidence is required.

## 3. Draft B — Supabase support ticket

> **Subject:** Custom domain api.giveprotocol.io — restrict TLS cipher suites / close alternate HTTPS ports (PCI ASV finding)
>
> Project ref: `lhbyfidtlhojnrewpstp`. Our custom domain `api.giveprotocol.io` (CNAME to `lhbyfidtlhojnrewpstp.supabase.co`) is subject to quarterly PCI ASV scans. Our Q3 scan flagged "SSL/TLS Recommended Cipher Suites (PCI DSS)" on Cloudflare alternate-HTTPS ports 2053 and 2083.
>
> Requests, in order of preference:
>
> 1. Close/disable alternate HTTPS ports (2053, 2083, 2087, 2096, 8443) for our custom domain, or confirm whether this is configurable — only 443 carries our traffic.
> 2. If port closure isn't possible: restrict TLS 1.2 cipher suites on the edge to the Mozilla Intermediate set (ECDHE-GCM/CHACHA20 only, i.e. drop CBC-mode suites ECDHE-RSA-AES128-SHA256 / ECDHE-RSA-AES256-SHA384).
> 3. If neither is configurable: a short written statement of Supabase's edge TLS posture (min TLS 1.2, ECDHE-only, no DHE/static-RSA) that we can attach to ASV attestations as third-party evidence.

## 4. Execution & verification

1. Board files Draft A in the Secusy portal (asv.secusy.ai) and Draft B with Supabase support (dashboard → support). Both are board-gated credentials (GIV-501 precedent).
2. On Secusy response: trigger re-scan of `api.giveprotocol.io`; verify ports 2053/2083 return no SSL/TLS findings ≥ CVSS 4.0.
3. Notify GIV-538 so the AOSC can be filed with a clean (or exception-documented) attestation.

Note: re-scan may still be affected by the Netlify-edge interference tracked in GIV-818/GIV-820 for `giveprotocol.io` targets; `api.giveprotocol.io` is Supabase-fronted so the Secusy IP whitelist there is not required for this target.
