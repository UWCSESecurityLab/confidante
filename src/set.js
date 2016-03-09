module.exports = {
  intersection: function(a, b) {
    return new Set([...a].filter(x => b.has(x)));
  },
  union: function(a, b) {
    return new Set([...a, ...b]);
  },
  difference: function(a, b) {
    return new Set([...a].filter(x => !b.has(x)));
  }
};
