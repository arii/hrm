**Context:** UI/Component PR

**Focus Areas:**
- ✅ **Accessibility (A11y):** Verify that all interactive elements have proper ARIA labels, roles, and keyboard support. Use semantic HTML where possible.
- ✅ **Responsive Design:** Check that the component adapts gracefully to different screen sizes. Ensure MUI breakpoints and `theme.spacing` are used for consistency.
- ✅ **Touch Targets:** All buttons, links, and other controls must have a minimum touch target size of 48x48 pixels to comply with mobile accessibility guidelines.
- ✅ **TypeScript Prop Interfaces:** Ensure that component props are well-defined with clear TypeScript interfaces. Avoid using `any`.

**Scope Enforcement:**
- ❌ **No Backend Logic Suggestions:** Do not suggest changes to API endpoints, database schemas, or server-side logic.
- ❌ **No Performance Tuning:** Unless the UI change directly causes a major performance issue, do not delve into backend performance optimizations.
