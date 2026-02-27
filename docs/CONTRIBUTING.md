# Contributing to VaultForge

Thank you for your interest in contributing to VaultForge! This guide covers everything you need to get started.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/VaultForge.git
   cd VaultForge
   ```
3. **Set up** the development environment:
   ```bash
   cp .env.example .env
   docker compose up --build
   ```

See [`docs/SETUP.md`](./SETUP.md) for detailed manual setup instructions.

---

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run the relevant test suite:
   ```bash
   # Smart contracts
   cd contracts && forge test -vvv

   # Backend
   cd backend && uv run pytest --cov=app

   # Frontend
   cd frontend && npm run build
   ```
4. Commit with a descriptive message:
   ```bash
   git commit -m "feat(contracts): add multi-token deposit support"
   ```
5. Push and open a Pull Request against `main`

---

## Code Standards

### Solidity (contracts/)
- Solidity 0.8.28, compiled with Foundry
- Follow OpenZeppelin patterns (ReentrancyGuard, Ownable)
- All public/external functions must have NatSpec comments
- Run `forge fmt` before committing

### Python (backend/)
- Python 3.12, managed with UV
- Linted with Ruff (`ruff check . && ruff format .`)
- Type hints required on all function signatures
- Async endpoints where possible

### TypeScript (frontend/)
- TypeScript strict mode, Next.js 16 App Router
- Linted with ESLint (`npm run lint`)
- Use `wagmi` hooks for all contract interactions
- Environment variables prefixed with `NEXT_PUBLIC_` for browser-exposed values

---

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix a bug
docs(scope): documentation changes
test(scope): add or update tests
refactor(scope): code restructuring without behavior change
```

Scopes: `contracts`, `backend`, `frontend`, `zk`, `db`, `ci`, `docs`

---

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update documentation if behavior changes
- All CI checks must pass before merge
- Request review from at least one maintainer

---

## Security

If you discover a security vulnerability, please **do not** open a public issue. Instead, email the maintainer directly or use GitHub's private vulnerability reporting feature.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).
