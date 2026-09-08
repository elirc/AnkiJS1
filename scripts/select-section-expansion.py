"""Balance pinned, self-contained practice across all 75 existing decks."""
from pathlib import Path
from collections import defaultdict, Counter
import hashlib, json, math, re

ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'src/data'
baseline=json.loads((DATA/'section-expansion-baseline.json').read_text())
bank=json.loads((ROOT/'artifacts/section-candidates.json').read_text(encoding='utf-8'))
old=json.loads((ROOT/'artifacts/curriculum-v6-packs.json').read_text(encoding='utf-8'))
old_fronts={re.sub(r'\W+','',c['front']).lower() for p in old for c in p['cards']}
bank=[c for c in bank if re.sub(r'\W+','',c['front']).lower() not in old_fronts]

# Earlier entries are more specific to the deck. Broader decks are filled after
# scarce subjects, so they cannot consume the only suitable cards for a topic.
topics={
 2:['typescript','language','functions'],3:['react'],4:['distributed','api','systems'],
 5:['sql'],6:['http','security'],7:['testing','debug'],8:['git','devops'],
 900:['arrays'],901:['arrays'],902:['arrays'],903:['arrays'],
 1000:['objects'],1001:['objects'],1100:['strings'],1101:['strings'],
 1200:['functions'],1201:['functions'],1300:['numbers'],1301:['numbers'],
 1400:['dates'],1500:['browser'],1501:['browser'],1600:['language'],1601:['language'],1602:['language'],
 1700:['python'],1701:['python'],1800:['css'],1801:['css'],1900:['html'],
 2000:['git'],2001:['git'],2100:['react'],2101:['react'],
 3001:['sql'],3002:['distributed'],3003:['api','http'],3004:['security'],
 3005:['typescript'],3006:['testing'],3007:['observability'],3008:['systems'],3009:['devops'],
 4001:['language','numbers'],4002:['functions','language'],4003:['arrays','objects'],
 4004:['debug','functions'],4005:['html','css'],4006:['react'],4007:['sql'],4008:['git','systems'],
 4011:['crud','browser'],4010:['api','http','security'],
 5001:['typescript'],5002:['python'],5003:['debug'],5004:['testing'],5005:['html','css','browser'],
 5006:['api','http'],5007:['sql'],5008:['security'],5009:['devops'],5011:['crud','api'],
 6001:['cs-basics'],6002:['cs-models'],6003:['cs-linq'],6004:['cs-async'],
 6005:['cs-api'],6006:['cs-services'],6007:['cs-data'],6008:['cs-security'],
 6009:['cs-ui'],6010:['cs-testing'],6011:['cs-ops'],6012:['cs-crud'],
}
groups=defaultdict(list)
for card in bank:groups[card['sourceKey']].append(card)
for group in groups.values():group.sort(key=lambda c:c['id'])
available=set(groups)
selected={d['id']:[] for d in baseline}
eligible={}
for deck in baseline:
    wanted=topics[int(deck['id'][-12:])]
    eligible[deck['id']]={k for k,cards in groups.items() if set(wanted)&set(cards[0]['categories'])}
    print(deck['name'],'base',deck['cardCount'],'available',sum(len(groups[k]) for k in eligible[deck['id']]),flush=True)

def score(key,deck):
    card=groups[key][0];wanted=topics[int(deck['id'][-12:])]
    topic=max((len(wanted)-i)*20 for i,t in enumerate(wanted) if t in card['categories'])
    repo=card['source'].split('/blob/')[0].removeprefix('https://github.com/')
    beginner=deck['track']=='Start here'
    teaching=(80 if repo=='freeCodeCamp/freeCodeCamp' else 0) if beginner else 0
    # Specific examples and complete explanations outrank short definitions.
    return topic+teaching+card['quality'],hashlib.sha256((deck['id']+key).encode()).hexdigest()

def fill(multiplier,required):
    while True:
        needs=[(d,max(0,math.ceil(d['cardCount']*multiplier)-len(selected[d['id']]))) for d in baseline]
        needs=[(d,n) for d,n in needs if n]
        if not needs:return
        choices=[]
        for deck,need in needs:
            pool=eligible[deck['id']]&available
            if not pool:
                if required:raise ValueError(f"Insufficient subject coverage: {deck['name']} still needs {need} cards")
                continue
            capacity=sum(len(groups[k]) for k in pool)
            choices.append((capacity/need,deck['id'],deck,need,pool))
        if not choices:return
        _,_,deck,need,pool=min(choices,key=lambda c:(c[0],c[1]))
        key=max(pool,key=lambda k:score(k,deck))
        # Keep related understanding/application exercises in one deck. A final
        # odd slot takes the understanding card, never an orphan code exercise.
        selected[deck['id']].extend(groups[key][:need]);available.remove(key)

fill(1,True)  # Every deck is at least doubled before any deck gets extra.
fill(1.5,False)

out=DATA/'section-packs';out.mkdir(exist_ok=True)
packs=[];sections=[]
for deck in baseline:
    cards=selected[deck['id']]
    # Fixed checked-in output is the install order. IDs derive from source
    # identity, so a future change in selection cannot change a saved review.
    cards.sort(key=lambda c:(c['source'],c['sourceKey'],c['id']))
    sections.append({'id':deck['id'],'name':deck['name'],'track':deck['track'],
                     'before':deck['cardCount'],'added':len(cards),'after':deck['cardCount']+len(cards),
                     'multiplier':round((deck['cardCount']+len(cards))/deck['cardCount'],3)})
    packs.append({'id':deck['id'],'cards':[{k:v for k,v in c.items() if k not in ['quality','categories','sourceKey']} for c in cards]})
all_cards=[c for p in packs for c in p['cards']]
assert len({c['id'] for c in all_cards})==len(all_cards)
assert all(2<=d['multiplier']<=3 for d in sections)
chunks=[];pending=[];size=0
for pack in packs:
    if size+len(pack['cards'])>450 and pending:
        chunks.append(pending);pending=[];size=0
    pending.append(pack);size+=len(pack['cards'])
if pending:chunks.append(pending)
names=[]
for index,chunk in enumerate(chunks):
    name=f'section-{index+1:02}.json';names.append(name)
    text=json.dumps(chunk,ensure_ascii=False,separators=(',',':'))+'\n'
    assert len(text.encode())<4*1024*1024,'A chunk is too large for comfortable offline loading'
    (out/name).write_text(text,encoding='utf-8')
# Never delete a computed directory. Obsolete generated files are reported so
# they can be reviewed if a future release uses fewer chunks.
assert {p.name for p in out.glob('*.json')}==set(names),'Review obsolete generated chunks'
source_counts=Counter(c['source'].split('/blob/')[0].removeprefix('https://github.com/') for c in all_cards)
manifest={'version':7,'baseCards':sum(d['cardCount'] for d in baseline),'addedCards':len(all_cards),
          'totalCards':sum(d['after'] for d in sections),'chunks':names,'sections':sections,
          'kinds':dict(Counter(c['kind'] for c in all_cards)), 'sources':dict(source_counts),
          'learningUnits':len({c['id'][:-1] for c in all_cards}),
          'dotnetLearningUnits':len({c['id'][:-1] for d in baseline if d['track']=='C# & .NET' for c in selected[d['id']]})}
(DATA/'section-expansion-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

licenses=ROOT/'public/licenses'
sources=json.loads((ROOT/'scripts/section-sources.json').read_text())
license_names={'freeCodeCamp/freeCodeCamp':'freecodecamp.txt','mdn/content':'mdn.txt','dotnet/docs':'dotnet-docs.txt','dotnet/AspNetCore.Docs':'aspnet-docs.txt','dotnet/EntityFramework.Docs':'ef-docs.txt','reactjs/react.dev':'react-docs.txt','git-tips/tips':'git-tips.txt','github/docs':'github-docs.txt'}
for source in sources:
    if source['repository'] not in source_counts:continue
    combined='\n\n'.join(path+'\n\n'+(ROOT/'artifacts/content-sources'/source['repository'].replace('/','--')/path).read_text(encoding='utf-8') for path in source['licenses'])
    (licenses/license_names[source['repository']]).write_text(combined,encoding='utf-8')
print(json.dumps({k:v for k,v in manifest.items() if k not in ['sections','chunks']},indent=2))
