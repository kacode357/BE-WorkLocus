const crypto = require("crypto");
const config = require("../config/default.json");

function validateIpnSignature(query) {
  const { vnp_SecureHash, ...restParams } = query;
  const sortedParams = Object.keys(restParams)
    .sort()
    .reduce((obj, key) => {
      obj[key] = restParams[key];
      return obj;
    }, {});

  const querystring = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const secretKey = config.vnp_HashSecret; // Đảm bảo không undefined
  if (!secretKey) {
    throw new Error("vnp_HashSecret is not defined in configuration");
  }

  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(Buffer.from(querystring, "utf-8"))
    .digest("hex");

  return hash === vnp_SecureHash;
}

module.exports = { validateIpnSignature };
