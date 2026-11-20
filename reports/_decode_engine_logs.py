import json, subprocess, time
RPC='https://rpc.testnet.chain.robinhood.com'
ENG='0x98F7B4Ae9615a655c4321b1326D588e35303280C'
def rpc(method,params):
    body=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params})
    out=subprocess.run(['curl','-s','-m','60','-X','POST',RPC,'-H','Content-Type: application/json','--data-binary',body],capture_output=True,text=True).stdout
    return json.loads(out).get('result') or []
def tsblk(b):
    blk=rpc('eth_getBlockByNumber',[hex(b),False])
    return time.strftime('%a %d %b %H:%M:%S UTC',time.gmtime(int(blk['timestamp'],16)))
def w(d,i): return int(d[i*64:(i+1)*64],16)
def receipt(tx):
    return rpc('eth_getTransactionReceipt',[tx])
logs=rpc('eth_getLogs',[{'address':[ENG],'fromBlock':hex(152722071),'toBlock':'latest'}])
for l in logs:
    t0=l['topics'][0][:10]; d=l['data'][2:]; blk=int(l['blockNumber'],16)
    name={'0x0d4d9483':'Bought','0x93ab99d5':'Sold','0x9a69bf0f':'ShieldBought','0x4654ca58':'Accrued'}.get(t0,'other:'+t0)
    tx=l['transactionHash']
    rec=receipt(tx)
    status=rec.get('status','?') if rec else '?'
    sender=rec.get('from','?') if rec else '?'
    line=f"{name:13s} blk {blk:,} {tsblk(blk)} status={status} from={sender[:10]}.."
    print(line)
    if name in ('Bought','Sold') and len(d)>=320:
        print(f'   units={w(d,0)/1e18:.4f} tokens={w(d,1)/1e18:.6f} usdg={w(d,2)/1e6:,.2f} vMark={w(d,3)/1e18:.4f}')
    if name=='ShieldBought' and len(d)>=128:
        print(f'   tokenUnits={w(d,0)/1e18:.4f} usdgPaid={w(d,1)/1e6:,.2f}')
    print('   tx',tx)
