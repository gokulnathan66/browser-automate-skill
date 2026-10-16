const ALIASES = {
  "power bi": ["microsoft power bi"],
  react: ["react.js"],
  express: ["express.js"],
  "rest api": ["rest", "rest apis"],
  postgres: ["postgresql"],
};

const label = raw =>
  raw.replace(/\d[\d,]*\s*followers?/i, "").replace(/\s+/g, " ").trim();

const wantedNames = query => {
  const q = query.toLowerCase();
  return [q, ...(ALIASES[q] || [])];
};

function choose(query, options) {
  const wanted = wantedNames(query);
  return options.map(label).find(n => wanted.includes(n.toLowerCase())) || null;
}

module.exports = { ALIASES, label, wantedNames, choose };
