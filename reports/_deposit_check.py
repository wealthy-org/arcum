import json, subprocess, time
RPC='https://rpc.testnet.chain.robinhood.com'
def rpc(method,params):
    body=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params})
    out=subprocess.run(['curl','-s','-m','60','-X','POST',RPC,'-H','Content-Type: application/json','--data-binary',body],capture_output=True,text=True).stdout
    return json.loads(out).get('result') or []
def tsmark(b):
    blk=rpc('eth_getBlockByNumber',[hex(b),False]); return time.strftime('%a %d %b %H:%M UTC',time.gmtime(int(blk['timestamp'],16)))
print('deposit pool blk 153,088,055 =',tsmark(153088055))
tx='0x38a690dcbb37fdc52648959b3590b830f9519226522ff113eca855295980a752'
rec=rpc('eth_getTransactionReceipt',[tx])
for l in rec['logs']:
    if l['topics'][0].startswith('0x0d4d9483'):
        d=l['data'][2:]
        print('BUY3 units',int(d[64:128],16)/1e18,'tokens',int(d[128:192],16)/1e18,'usdg',int(d[192:256],16)/1e6)
    if l['address'].startswith('0x0953') and l['topics'][0].startswith('0xddf252ad'):
        print('BUY3 usdg transfer raw',int(l['data'][2:66],16))
