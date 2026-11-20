import json, subprocess
RPC='https://rpc.testnet.chain.robinhood.com'
ENG='0x98F7B4Ae9615a655c4321b1326D588e35303280C'
def rpc(method,params):
    body=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params})
    out=subprocess.run(['curl','-s','-m','60','-X','POST',RPC,'-H','Content-Type: application/json','--data-binary',body],capture_output=True,text=True).stdout
    return json.loads(out).get('result') or []
tx='0xa810b431632ad4aa4a7ae47162ad8fcfa0d03d2693909af4d30912825a328668'
rec=rpc('eth_getTransactionReceipt',[tx])
for l in rec['logs']:
    print('addr',l['address'],'topic0',l['topics'][0][:10],'ntopics',len(l['topics']))
    d=l['data'][2:]
    for i in range(len(d)//64):
        wv=int(d[i*64:(i+1)*64],16)
        print(f'  word{i}: raw={wv} hex={d[i*64:(i+1)*64]}')
    print('---')
