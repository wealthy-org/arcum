window.ethereum = {
  isMock: true,
  async request({ method, params }) {
    if (method === "eth_chainId") return "0xb626";
    if (method === "eth_accounts" || method === "eth_requestAccounts")
      return ["0x08f4C59079160385e3FBe00Eede656e22C2dD90B"];
    if (method === "eth_getBlockByNumber") return { number: "0x1", timestamp: "0x" + Math.floor(Date.now()/1000).toString(16) };
    if (method === "eth_sendTransaction") return "0x" + "ab".repeat(32);
    if (method === "eth_getTransactionReceipt") return { status: "0x1", blockNumber: "0x2", gasUsed: "0x1234" };
    throw new Error("mock: unhandled " + method);
  },
  on() {}
};
