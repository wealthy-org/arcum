import json, subprocess
RPC='https://rpc.testnet.chain.robinhood.com'
def rpc(method,params):
    body=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params})
    out=subprocess.run(['curl','-s','-m','60','-X','POST',RPC,'-H','Content-Type: application/json','--data-binary',body],capture_output=True,text=True).stdout
    return json.loads(out).get('result') or []
for label,tx in [('SOLD','0xc4103b1337a4cb94d73727a9e6b5eaa5199cba3515bfbe0d338fcc3692dd1a55'),('SHIELD','0x5ecc65cf086cf38e3c80b00fe2f06412d50a24eb59b63146305927d16ac8c5b0'),('BUY2','0x2a3ed93c7bcc29ae8617531575d56b2699e0ae3dfeffa7049806e67699c52000')]:
    rec=rpc('eth_getTransactionReceipt',[tx])
    print('====',label)
    for l in rec['logs']:
        print('addr',l['address'][:12],'t0',l['topics'][0][:10],'n',len(l['topics']))
        d=l['data'][2:]
        for i in range(len(d)//64):
            print(f'  w{i}:',int(d[i*64:(i+1)*64],16))
