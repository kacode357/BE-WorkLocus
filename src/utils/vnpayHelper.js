const moment = require("moment");
const querystring = require("qs");
const crypto = require("crypto");
const config = require("../config/default.json");

const createPaymentUrl = async (body, headers) => {
  try {
    const date = new Date();
    const createDate = moment(date).format("YYYYMMDDHHmmss");
    const ipAddr = headers["x-forwarded-for"] || headers["remote-addr"] || "127.0.0.1";

    const tmnCode = config.vnp_TmnCode;
    const secretKey = config.vnp_HashSecret;
    const vnpUrl = config.vnp_Url;
    const returnUrl = config.vnp_ReturnUrl;

    const orderId = moment(date).format("DDHHmmss");
    const PaymentId = body.paymentId;
    const PaymentIdString = PaymentId.toString();
    console.log("PaymentId", PaymentIdString);
    const amount = body.amount * 100; // Đổi sang đơn vị nhỏ nhất
    const locale = body.language || "vn";
    const currCode = "VND";

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: currCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `${PaymentId}`,
      vnp_OrderType: "other",
      vnp_Amount: amount,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: true });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    vnp_Params["vnp_SecureHash"] = signed;

    return `${vnpUrl}?${querystring.stringify(vnp_Params, { encode: true })}`;
  } catch (error) {
    console.error("Error creating VNPAY payment URL:", error);
    throw new Error("Failed to generate payment URL");
  }
};

const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
};

module.exports = {
  createPaymentUrl,
  sortObject,
};
