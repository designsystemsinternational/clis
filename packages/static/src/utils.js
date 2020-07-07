const defaultFileParams = [
  {
    match: ["!*.html", "!*.json"],
    params: {
      CacheControl: "public, max-age=31536000, immutable"
    }
  },
  {
    match: ["*.html", "*.json"],
    params: {
      CacheControl: "public, max-age=300"
    }
  }
];

module.exports = {
  defaultFileParams
};
