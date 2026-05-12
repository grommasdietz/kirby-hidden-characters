/** @type {import('@commitlint/types').UserConfig} */
const Configuration = {
  extends: ["@commitlint/config-conventional"],
  parserPreset: {
    parserOpts: {
      // Allow emojis or :word: codes at the end of the subject without requiring them
      headerPattern:
        /^(\w*)(?:\(([^)]+)\))?!?:\s+(.*?)(?:\s+(?::\w+:|(?:\ud83c[\udf00-\udfff])|(?:\ud83d[\udc00-\ude4f\ude80-\udeff])|[\u2600-\u2B55]))?$/,
      headerCorrespondence: ["type", "scope", "subject"],
    },
  },
};

module.exports = Configuration;
