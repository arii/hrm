### Summary

### Risk & Scope
- [ ] Low risk
- [ ] Medium risk
- [ ] High risk (requires ai:required or risk:high label)

### Architecture Compliance
- [ ] No transport logic added in React components
- [ ] No server-only modules imported into client code
- [ ] Service/store boundaries preserved (service -> store -> hooks -> components)

### Service/Store Impact
- [ ] Touches service layer (list files):
- [ ] Touches state store/reducer (list files):
- [ ] Migration/backward compatibility considered

### Auth/Security
- [ ] Affects auth/session/token flow
- [ ] WebSocket upgrade/auth assumptions reviewed
- [ ] No secrets introduced in code/config/logs

### Testing
- [ ] Lint/type/knip pass locally
- [ ] Unit tests updated
- [ ] Integration tests updated
- [ ] VRT/E2E impact assessed

### Accessibility
- [ ] Realtime announcements use correct aria-live strategy
- [ ] No high-frequency screen-reader spam introduced
- [ ] Contrast/accessibility checks considered
