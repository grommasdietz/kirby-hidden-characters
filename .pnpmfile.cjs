const { devDependencies } = require("./package.json");

module.exports = {
  hooks: {
    readPackage(pkg) {
      // TypeScript ESLint 8 needs the classic compiler API, not the native CLI.
      if (
        pkg.name.startsWith("@typescript-eslint/") &&
        pkg.version.startsWith("8.") &&
        pkg.peerDependencies?.typescript
      ) {
        pkg.dependencies = {
          ...pkg.dependencies,
          typescript: `npm:@typescript/typescript6@${devDependencies["@typescript/typescript6"]}`,
        };
        delete pkg.peerDependencies.typescript;
        if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta.typescript;
      }
      return pkg;
    },
  },
};
