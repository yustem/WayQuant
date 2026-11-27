# Security

Please report suspected vulnerabilities through
[GitHub private vulnerability reporting](https://github.com/yustem/WayQuant/security/advisories/new).
Private reporting is enabled for this repository. Do not post credentials, private
incident data or sensitive exploit details in public issues. Include the release,
execution mode, reproduction steps and expected versus observed behavior.

The public GitHub Pages edition runs simulations in a browser Web Worker and does
not provide a hosted simulation API. Self-hosted APIs require TLS, proxy body/rate
limits, restricted CORS, a bounded worker count and a reviewed memory budget.
Dependency advisories should be checked for each release. Docker execution and
hardened enterprise infrastructure remain separate verification targets; see the
preserved audit and current publication verification for their actual scope.
