"""Build additional, attributed practice for every existing deck.

Sources are pinned in section-sources.json and never executed. Cached source
files live under artifacts/content-sources. Output is split into small lazy
chunks so TypeScript need not infer types for thousands of long answers.
"""
from pathlib import Path
from collections import Counter, defaultdict
from urllib.parse import urljoin
import hashlib, json, math, re
from concurrent.futures import ThreadPoolExecutor

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src/data'
CACHE=ROOT/'artifacts/content-sources'
SOURCES=json.loads((ROOT/'scripts/section-sources.json').read_text())
BASELINE=json.loads((DATA/'section-expansion-baseline.json').read_text())
def read_source(task):
    repo,path=task
    return (repo,path),(CACHE/repo.replace('/','--')/path).read_text(encoding='utf-8')
with ThreadPoolExecutor(max_workers=8) as pool:
    TEXTS=dict(pool.map(read_source,[(s['repository'],p) for s in SOURCES for p in s['files']]))
print('Loaded pinned source text',len(TEXTS),'files',flush=True)
PUZZLE=re.compile(r'leetcode|two[ -]sum|fibonacci|factorial|anagram|palindrome|dynamic programming|breadth.first search|depth.first search|linked list|Dijkstra|knapsack|sudoku|union.find|bubble sort|heap sort|topological sort|binary.search.tree|quicksort|permutations|prime numbers',re.I)
SKIP_HEAD=re.compile(r'^(specifications|browser compatibility|see also|related (content|articles)|next steps|additional resources|feedback|contribute|requirements|applies to|version history|build the sample|run the sample|try it|reference|examples? from|complexity)$',re.I)
BAD_CONTEXT=re.compile(r'\[!INCLUDE|\[!code|<xref:|:::|<Sandpack|</?Recipe|\{\{|\}\}|\b(the (?:above|previous) (?:example|code)|as (?:shown|described) (?:above|earlier)|following (?:illustration|diagram)|see (?:above|below)|previous lesson)\b|^\s*(?://|#)\s*\.{3}',re.I|re.M)
LICENSES={
 'freeCodeCamp/freeCodeCamp':('freeCodeCamp and contributors','BSD-3-Clause','freecodecamp.txt'),
 'mdn/content':('MDN contributors','CC BY-SA 2.5; code CC0 or MIT','mdn.txt'),
 'dotnet/docs':('Microsoft and contributors','CC BY 4.0; code MIT','dotnet-docs.txt'),
 'dotnet/AspNetCore.Docs':('Microsoft and contributors','CC BY 4.0; code MIT','aspnet-docs.txt'),
 'dotnet/EntityFramework.Docs':('Microsoft and contributors','CC BY 4.0; code MIT','ef-docs.txt'),
 'reactjs/react.dev':('Meta and React contributors','CC BY 4.0','react-docs.txt'),
 'git-tips/tips':('Hemanth.HM and contributors','MIT','git-tips.txt'),
 'github/docs':('GitHub and contributors','CC BY 4.0; code MIT','github-docs.txt'),
}

def clean(text, source_url, repo):
    text=re.sub(r'!\[[^\]]*\]\([^)]*\)', '',text)
    text=re.sub(r'<(?:iframe|video|img)\b[^>]*(?:/>|>.*?</(?:iframe|video)>)','',text,flags=re.S)
    text=re.sub(r'^\s*(?:<\/?(?:Intro|Note|Pitfall|DeepDive|Recap|YouWillLearn)>|:::.*|>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\])\s*$', '',text,flags=re.M)
    text=re.sub(r'\{\{(?:jsxref|domxref|cssxref|htmlattrxref|httpheader|HTTPMethod|HTTPStatus|Glossary)\(([^}]*)\)\}\}',lambda m:'`'+re.findall(r'"([^"]+)"',m[1])[0]+'`' if re.findall(r'"([^"]+)"',m[1]) else '',text)
    text=re.sub(r'\{\{[^{}]*\}\}', '',text)
    text=re.sub(r'```([\w+-]*)[^\n]*\n',r'```\1\n',text)
    def link(m):
        label,url=m.groups()
        if url.startswith(('https://','http://','mailto:')): return m[0]
        if url.startswith('javascript:'): return label
        if repo=='mdn/content' and url.startswith('/'): url='https://developer.mozilla.org'+url
        elif repo=='reactjs/react.dev' and url.startswith('/'): url='https://react.dev'+url
        else: url=urljoin(source_url,url)
        return '['+label+']('+url+')'
    text=re.sub(r'\[([^\]\n]+)\]\(([^)\s]+)\)',link,text)
    return re.sub(r'\n{3,}','\n\n',text).strip()

def title_body(raw):
    title=''
    if raw.startswith('---'):
        _,meta,raw=raw.split('---',2)
        m=re.search(r'^title:\s*(.+)$',meta,re.M)
        if m:title=m[1].strip(' "\'')
        if re.search(r'^status:.*(?:deprecated|experimental)|^\s*-\s*(?:deprecated|experimental)\s*$',meta,re.M): return None,None
    m=re.search(r'^# ([^\n]+)',raw,re.M)
    if not title and m:title=m[1]
    if m and not m[1].startswith('--'):raw=raw[:m.start()]+raw[m.end():]
    title=re.sub(r'\s*\{#.*?\}', '',title)
    return title,raw.strip()

def monikers(raw):
    # Only the .NET 10 branch is used from multi-version ASP.NET documentation.
    active=[True]; result=[]
    for line in raw.splitlines():
        if '::: moniker range=' in line:
            tests=re.findall(r'(>=|<=|>|<|=)\s*aspnetcore-(\d+)',line)
            ok=all({'=':10==int(n),'>':10>int(n),'<':10<int(n),'>=':10>=int(n),'<=':10<=int(n)}[op] for op,n in tests)
            active.append(active[-1] and ok)
        elif '::: moniker-end' in line:
            if len(active)>1:active.pop()
        elif active[-1]:result.append(line)
    return '\n'.join(result)

def sections(raw):
    heading='Overview'; lines=[]; fenced=False
    for line in raw.splitlines():
        if re.match(r'^\s*```',line):fenced=not fenced
        match=not fenced and re.match(r'^#{2,4} (.+)',line)
        if match:
            if lines:yield heading,'\n'.join(lines).strip()
            heading=re.sub(r'\s*\{#.*?\}', '',match[1]);lines=[]
        else:lines.append(line)
    if lines:yield heading,'\n'.join(lines).strip()

def paragraphs(text):
    return re.findall(r'```[^\n]*\n.*?```|(?:(?!```).+?)(?=\n\s*\n|\Z)',text,re.S)

def tokens(text):
    stop={'what','which','when','where','would','should','does','this','that','with','from','your','have','following','javascript','using','used','function','example','code','value','method','return','returns','true','false','none','above','correct','purpose','type','data'}
    return {t.lower() for t in re.findall(r'[A-Za-z_$][A-Za-z_0-9$.-]{2,}',text) if t.lower() not in stop}

def explanation_for(question, answer, text):
    blocks=[p.strip() for p in paragraphs(text) if 90<len(p)<1700 and not p.lstrip().startswith(('```','#','<','http')) and not BAD_CONTEXT.search(p)]
    keys=tokens(question+' '+answer)
    ranked=sorted(enumerate(blocks),key=lambda x:(len(keys&tokens(x[1])),-x[0]),reverse=True)
    selected=[(i,b) for i,b in ranked[:3] if len(keys&tokens(b))>=1]
    if not selected:return ''
    return '\n\n'.join(b for i,b in sorted(selected))[:5000]

def categories(repo,path,title):
    key=(path+' '+title).lower(); tags=set()
    if repo=='mdn/content':
        if '/global_objects/' in path:
            part=path.split('/global_objects/')[1].split('/')[0]
            groups={'array':'arrays','map':'arrays','set':'arrays','weakmap':'objects','weakset':'objects','object':'objects','string':'strings','regexp':'strings','number':'numbers','date':'dates','promise':'functions','error':'debug','typeerror':'debug'}
            tags.add(groups.get(part,'language'))
            if '/intl/numberformat/' in path:tags.add('numbers')
            if '/intl/datetimeformat/' in path:tags.add('dates')
        elif '/functions/' in path:tags.add('functions')
        elif '/api/' in path:
            tags.add('browser')
            if re.search(r'fetch|request|response|abort|url',path):tags.update(['http','functions'])
            if re.search(r'form|storage',path):tags.add('crud')
        else:tags.add('language')
    elif repo=='freeCodeCamp/freeCodeCamp':
        rules={
          'arrays':r'\barrays?\b|higher-order|javascript-maps-and-sets',
          'objects':r'javascript-objects|javascript-classes|object-destructur|working-with-objects',
          'strings':r'\bstrings?\b|regular-expression|regex',
          'functions':r'asynchronous|\bfunctions?\b|functional-programming|higher-order|callback|promise|closures',
          'dates':r'javascript-dates|date-object',
          'numbers':r'number-method|javascript-math|number-object|math-object',
          'language':r'javascript-(?:fundamentals|comparisons|variables|loops)|scope|hoisting|data-types|operator|\bloops\b|\bvariables\b',
          'browser':r'\bdom\b|event-|js-a11y|form-validation|local-storage',
          'css':r'css|styling-forms|responsive-web-design|design-fundamentals',
          'html':r'html|web-accessibility|semantic',
          'react':r'react', 'typescript':r'typescript',
          'python':r'python|dictionaries-and-sets|loops-and-sequences|classes-and-objects|object-oriented-programming',
          'git':r'git|version-control|code-reviews|branching',
          'devops':r'ci-cd|deployment|bash|npm',
          'systems':r'bash|node-js-core|node-js-intro|operating-system|terminal',
          'sql':r'sql|postgres|relational-database',
          'http':r'http|rest-api|web-services|websocket',
          'api':r'express|rest-api|web-services|node-js',
          'security':r'authentication|authorization|security|privacy',
          'testing':r'testing|test-driven', 'debug':r'debugging|error-handling',
          'observability':r'web-performance|logging|monitoring',
          'distributed':r'websocket|caching|web-performance',
          'crud':r'crud|form-validation|react-forms',
        }
        # Paths carry the subject; words inside a question must not reclassify it.
        subject=path.split('/')[-2]
        for tag,pattern in rules.items():
            if re.search(pattern,subject):tags.add(tag)
        if 'javascript' in subject:tags.discard('python')
    elif repo in ('git-tips/tips','github/docs'):tags.update(['git','devops'])
    elif repo=='reactjs/react.dev':tags.add('react')
    elif repo=='dotnet/EntityFramework.Docs':
        tags.update(['cs-data','cs-crud'])
        if '/testing/' in path:tags.add('cs-testing')
    elif repo=='dotnet/AspNetCore.Docs':
        if '/security/' in path:tags.update(['cs-security','security'])
        if '/web-api/' in path or '/first-web-api/' in path:tags.update(['cs-api','cs-crud','api'])
        if '/fundamentals/' in path:tags.add('cs-services')
        if '/data/' in path:tags.update(['cs-data','cs-crud'])
        if '/test/' in path:tags.update(['cs-testing','testing'])
        if '/mvc/' in path:tags.update(['cs-ui','cs-models'])
        if '/performance/' in path:tags.update(['cs-ops','distributed','observability'])
        if re.search(r'logging|diagnostic|health-check',path):tags.update(['cs-ops','observability'])
    elif repo=='dotnet/docs':
        if '/csharp/' in path:
            tags.add('cs-basics')
            if '/linq/' in path:tags.add('cs-linq')
            if re.search(r'type|class|record|interface|object|nullable|pattern',path):tags.add('cs-models')
            if re.search(r'async|await|task|cancel',path):tags.add('cs-async')
        if '/extensions/' in path:
            tags.add('cs-services')
            if re.search(r'logging|diagnostic|health|host|service',path):tags.update(['cs-ops','observability','systems'])
        if '/testing/' in path:tags.update(['cs-testing','testing'])
        if '/serialization/' in path:tags.update(['cs-models','cs-api'])
        if '/datetime/' in path:tags.add('cs-basics')
    return tags

def identity(key,variant=0):
    h=hashlib.sha256(key.encode()).hexdigest()
    return f'f0000000-{h[:4]}-4{h[4:7]}-8{h[7:10]}-{h[10:21]}{variant}'

def pages(items,credit):
    return '<!-- recall:teaching:v1 -->\n\n'+'\n\n'.join('## '+title+'\n\n'+body for title,body in items if body.strip())+'\n\n'+credit

BANK=[]; COUNTS=Counter(); SEEN=set()
def add(source,path,key,front,body,tags,kind='reference',variant=0,answer_pages=None):
    repo=source['repository'];url=f'https://github.com/{repo}/blob/{source["revision"]}/{path}'
    front=clean(front,url,repo);body=clean(body,url,repo)
    if not tags or PUZZLE.search(front+' '+body) or BAD_CONTEXT.search(body):COUNTS['context or excluded topic']+=1;return
    if re.search(r'\b(?:C# 1[5-9]|\.NET 1[1-9]|experimental|preview feature)\b',front+' '+body,re.I):return
    if not 140<=len(body)<=6200 or body.count('```')%2 or front.count('```')%2:return
    if len(re.sub(r'```.*?```','',body,flags=re.S).split())<22:return
    normalized=re.sub(r'\W+','',front).lower()
    if normalized in SEEN:return
    SEEN.add(normalized)
    author,license_name,license_file=LICENSES[repo]
    credit=f'---\nAdapted from [{author}]({url}) · [{license_name}](/licenses/{license_file}). Wording, formatting, and study prompts adapted for Recall.'
    if answer_pages is None:
        code=re.search(r'```[^\n]*\n.*?```',body,re.S)
        prose=re.sub(r'```.*?```','',body,flags=re.S).strip()
        # Reading the explanation and trying its example are distinct views;
        # keep the complete original passage as the last view for context.
        answer_pages=[('The explanation',prose)]
        if code:answer_pages.append(('A worked example',code[0]))
        if code or len(prose)>1000:answer_pages.append(('Read it together',body))
    back=pages(answer_pages,credit)
    BANK.append({'id':identity(key,variant),'front':front,'back':back,'kind':kind,
                 'source':url,'license':license_name,'categories':sorted(tags),
                 'quality':len(re.findall(r'```',body))*4+min(20,len(body)//100),
                 'sourceKey':key})

def add_document(source,path,raw):
    repo=source['repository'];url=f'https://github.com/{repo}/blob/{source["revision"]}/{path}'
    title,body=title_body(monikers(raw))
    if not title or body is None:return
    tags=categories(repo,path,title)
    occurrences=Counter()
    for heading,part in sections(body):
        if SKIP_HEAD.match(heading) or heading.startswith('--'):continue
        occurrences[heading]+=1
        part=clean(part,url,repo)
        # An isolated list of parameter names is reference material, not a
        # complete lesson. Prefer explanations and examples with their context.
        if re.match(r'^(parameters|syntax|attributes|type parameters|exceptions)$',heading,re.I):continue
        if re.search(r'</?(?:Sandpack|Recipe|Challenges|Illustration|FullWidth|Math|Tabs|TabItem)\b',part):continue
        key=f'{repo}/{path}#{heading}:{occurrences[heading]}'
        context=title if heading=='Overview' else title+' — '+heading
        question=f'**{context}**\n\nExplain this behavior and how you would use it in a web app.'
        add(source,path,key,question,part,tags)
        for language,code in re.findall(r'```([^\n]*)\n(.*?)```',part,re.S)[:1]:
            lines=code.rstrip().splitlines()
            if language not in ['js','javascript','jsx','ts','tsx','csharp','cs','python','py','css','sql','bash','sh']:continue
            if not (3<=len(lines)<=24 and 80<len(code)<1200):continue
            eligible=[(i,line) for i,line in enumerate(lines) if 14<=len(line.strip())<=110 and re.search(r'\breturn\b|(?<![=!<>])=(?!=)|\.\w+\(',line) and not re.match(r'\s*(//|#|/\*|\*|import |using |console\.|print\(|<)',line)]
            if not eligible:continue
            i,line=max(eligible,key=lambda x:len(re.findall(r'[.(=]',x[1])))
            masked=lines[:];masked[i]=' '*(len(line)-len(line.lstrip()))+'____'
            front=f'**Apply it: {context}**\n\nComplete the missing line. An equivalent working solution is fine.\n\n```{language}\n'+ '\n'.join(masked)+'\n```'
            add(source,path,key,front,part,tags,'complete',1,[('One working solution',f'```{language}\n{line.strip()}\n```'),('Why this works',re.sub(r'```.*?```','',part,flags=re.S).strip()),('The complete example',part)])

FCC_CONTEXT={}
for source in SOURCES:
    if source['repository']!='freeCodeCamp/freeCodeCamp':continue
    for file_index,path in enumerate(source['files']):
        if '/review-' not in path and '/lecture-' not in path:continue
        raw=TEXTS[(source['repository'],path)]
        title,body=title_body(raw)
        if not title:continue
        description=re.search(r'# --description--\s*\n(.*?)(?=\n# --|\Z)',body,re.S)
        if description:FCC_CONTEXT[path]=(title,description[1])

def add_fcc(source,path,raw):
    repo=source['repository'];url=f'https://github.com/{repo}/blob/{source["revision"]}/{path}'
    title,body=title_body(raw)
    if not title:return
    tags=categories(repo,path,title)
    if '/lecture-' in path:
        description=FCC_CONTEXT.get(path,('', ''))[1]
        units=re.split(r'^## --text--\s*$',body,flags=re.M)[1:]
        for index,unit in enumerate(units):
            match=re.search(r'(.*?)^## --answers--\s*\n(.*?)^## --video-solution--\s*\n\s*(\d+)',unit,re.S|re.M)
            if not match:continue
            question,choices,solution=match.groups()
            choices=[re.split(r'^### --feedback--',c,flags=re.M)[0].strip() for c in re.split(r'^---\s*$',choices,flags=re.M)]
            if not 0<int(solution)<=len(choices):continue
            correct=int(solution)-1
            emit_quiz(source,path,index,question.strip(),choices,correct,description,tags)
    elif '/quiz-' in path:
        # Match a review/lecture of the same subject for an explanatory answer.
        subject=path.split('/')[-2].removeprefix('quiz-')
        context='\n\n'.join(value[1] for name,value in FCC_CONTEXT.items() if '/review-'+subject+'/' in name)
        if not context:
            keys=tokens(title)
            matches=sorted(FCC_CONTEXT.values(),key=lambda x:len(keys&tokens(x[0])),reverse=True)
            if matches and len(keys&tokens(matches[0][0]))>=1:context=matches[0][1]
        for index,unit in enumerate(re.split(r'^### --question--\s*$',body,flags=re.M)[1:]):
            match=re.search(r'#### --text--\s*\n(.*?)^#### --distractors--\s*\n(.*?)^#### --answer--\s*\n(.*)',unit,re.S|re.M)
            if not match:continue
            question,distractors,answer=match.groups()
            choices=[c.strip() for c in re.split(r'^---\s*$',distractors,flags=re.M)]+[answer.strip()]
            emit_quiz(source,path,index,question.strip(),choices,len(choices)-1,context,tags)

def emit_quiz(source,path,index,question,choices,correct,context,tags):
    # Remove position-dependent choices rather than silently changing their meaning.
    if any(re.search(r'all of (?:the )?(?:above|these)|both [ABCD]|option [ABCD]|none of the above',c,re.I) for c in choices):return
    if len(choices)!=4 or any(not c for c in choices):return
    if PUZZLE.search(question+' '.join(choices)):return
    url=f'https://github.com/{source["repository"]}/blob/{source["revision"]}/{path}'
    context=clean(context,url,source['repository'])
    explanation=explanation_for(question,choices[correct],context)
    if not explanation:return
    key=source['repository']+'/'+path+'#question:'+str(index)
    # Deterministic rotation keeps the correct option from always being last.
    shift=int(hashlib.sha256(key.encode()).hexdigest()[:2],16)%4
    choices=choices[shift:]+choices[:shift];correct=(correct-shift)%4
    front=question+'\n\n'+'\n\n'.join(f'**{chr(65+i)}.** {choice}' for i,choice in enumerate(choices))
    answer=f'**{chr(65+correct)}.** {choices[correct]}'
    code_candidates=re.findall(r'```[^\n]*\n.*?```',context,re.S)
    code=max(code_candidates,key=lambda c:len(tokens(c)&tokens(question+' '+choices[correct])),default='')
    answer_pages=[('The answer, explained',answer+'\n\n'+explanation)]
    if code and len(code)<1800 and len(tokens(code)&tokens(question+' '+choices[correct]))>=2:answer_pages.append(('A worked example',code))
    answer_pages.append(('Check your understanding',question+'\n\nExplain why the selected answer fits before revealing it.\n\n<!-- recall:solution -->\n\n'+answer+'\n\n'+explanation))
    add(source,path,key,front,explanation,tags,'knowledge-check',answer_pages=answer_pages)

for source in SOURCES:
    repo=source['repository'];folder=CACHE/repo.replace('/','--')
    for file_index,path in enumerate(source['files']):
        if file_index%100==0:print(repo,file_index,'files;',len(BANK),'candidates',flush=True)
        if path in source['licenses']:continue
        raw=TEXTS[(repo,path)]
        if repo=='freeCodeCamp/freeCodeCamp':add_fcc(source,path,raw)
        elif repo=='git-tips/tips':
            if path!='tips.json':continue
            for tip in json.loads(raw):
                question=tip.get('title','');answer=tip.get('tip','')
                if not question or not answer:continue
                body=tip.get('description','')+'\n\n```sh\n'+answer+'\n```'
                # Detailed command context is supplied below after inspecting the schema.
                add(source,path,repo+'/'+question,question,body,{'git','devops'},'workflow')
        else:add_document(source,path,raw)
    print(repo,'cumulative candidates',len(BANK),flush=True)

(ROOT/'artifacts/section-candidates.json').write_text(json.dumps(BANK,ensure_ascii=False),encoding='utf-8')
print('CATEGORIES',dict(Counter(tag for card in BANK for tag in card['categories'])),flush=True)
print('FILTERED',dict(COUNTS),flush=True)
