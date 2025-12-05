export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce a specific pattern for state synchronized with a remote source',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [], // No options
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (!node.id || !node.id.name) {
          return;
        }

        // Check for variable names starting with 'remoteData'
        if (node.id.type === 'Identifier' && node.id.name.startsWith('remoteData')) {
          // You could add more checks here, for example, to ensure it's a state variable
          // For now, we'll just check the name
          return;
        }

        // Check for calls to 'useRemoteState'
        if (
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          node.init.callee.name === 'useRemoteState'
        ) {
          return;
        }

        // If the variable is initialized with a value that could be remote, report an error
        // This is a simplified example. A real-world rule would need more sophisticated checks.
        if (node.init && (node.id.name.includes('Data') || node.id.name.includes('remote'))) {
          context.report({
            node,
            message: 'State synchronized with a remote source should be managed using the "useRemoteState" hook or prefixed with "remoteData".',
          });
        }
      },
    };
  },
};
