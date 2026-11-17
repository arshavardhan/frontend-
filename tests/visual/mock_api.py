"""
Mock of the Teklozy backend used ONLY for visual/e2e checks with Playwright route interception.
Response shapes follow the real services (journey.service.ts, stageModules.service.ts,
dashboard.service.ts, engagement.service.ts, gamification.service.ts). Never shipped in the app.
"""
import json, copy
from urllib.parse import urlparse, parse_qs

LEVEL_TITLES = ['Discover','Learn Basics','Learn Advanced','Start Building','Networking','Advanced Building','Interview Prep','Apply','Premium','Alumni Connect']

def modules_stage(done):
    base = [
        ('welcome','Welcome to Teklozy','Get familiar with the platform and your journey',6,'orientation'),
        ('developer-profile','Set Up Your Developer Profile','Create your profile and personalise your path',8,'profile_setup'),
        ('explore-paths','Explore the Learning Paths','Understand the 10-level journey and key outcomes',7,'path_exploration'),
        ('plan-career','Plan Your Tech Career','Set your goals and unlock the next level',10,'path_finalization'),
    ]
    out=[]; prev=True
    for i,(k,t,d,m,r) in enumerate(base):
        c = i < done
        out.append({'key':k,'position':i+1,'title':t,'description':d,'estimatedMinutes':m,'completionRule':r,'isCompleted':c,'isLocked': (not c) and (not prev)})
        prev = prev and c
        if r=='path_exploration':
            out[-1]['paths']=[{'pathwayId':'software-development','title':'Development','courseVersionId':'cv-dev','isCompleted':False,'percent':0},{'pathwayId':'ai-engineering','title':'Artificial Intelligence','courseVersionId':'cv-ai','isCompleted':False,'percent':0}]
            out[-1]['finalizedPathwayId']=None
    return {'stageNumber':1,'completedModules':done,'totalModules':4,'percent':done*25,'current':next((m['key'] for m in out if not m['isCompleted']),None),'modules':out}

def course(path, enrolled=True):
    ai = path=='ai-engineering'
    mods = [
        ('Introduction to AI','What is AI, why it matters, and where it is used.',6,0) if ai else ('How Software Is Built','From idea to running product: the software lifecycle.',6,0),
        ('Core Areas of AI','Explore ML, DL, GenAI and Agentic AI in simple terms.',10,5) if ai else ('Frontend, Backend & Databases','What each layer does and how they talk.',10,5),
        ('Real-World Applications','See how AI is used in products, industries and everyday life.',10,5) if ai else ('Shipping to Production','Deployment, cloud and keeping apps running.',10,5),
        ('Careers in AI','Roles, skills, tools and a roadmap to get started.',14,10) if ai else ('Careers in Development','Roles, skills, tools and a roadmap to get started.',14,10),
    ]
    out=[]
    for i,(t,d,m,xp) in enumerate(mods):
        lessons=[{'id':f'{path}-l{i}{j}','title':lt,'kind':k,'position':j+1,'estimatedMinutes':lm,'xp':lx,'required':True,'isCompleted':False,
                  'access':{'allowed': enrolled and i==0,'nextAction':None if i==0 else 'Finish the previous module first'},'contentFormat':cf}
                 for j,(lt,k,lm,lx,cf) in enumerate([
                     (('What is AI?' if ai else 'What is software?'),'reading',4,0,'visual'),
                     ('Key notes','reading',2,0,None),
                     ('Quick quiz','quiz',3,xp,None)])]
        out.append({'id':f'{path}-m{i}','title':t,'description':d,'position':i+1,'estimatedMinutes':m,'xp':xp,'isCompleted':False,'isLocked':i>0,'lessons':lessons})
    return {'id':'cv-ai' if ai else 'cv-dev','title':'AI Path' if ai else 'Development Path',
            'description':('Explore Artificial Intelligence, understand how it works, its real-world uses, and the career opportunities it offers.' if ai else 'Explore how software is designed, developed and deployed, and the careers it leads to.'),
            'objectives':(['AI basics and key concepts','Core areas: ML, DL, GenAI, Agentic AI','Real-world applications and impact','AI career roles and a beginner roadmap'] if ai else ['How software is designed and built','Frontend, backend and databases','Deployment and the cloud','Developer career roles and a roadmap']),
            'estimatedMinutes':40,'difficulty':'foundation','enrollmentId':('enr-'+path) if enrolled else None,'enrollmentState':'enrolled' if enrolled else None,
            'totalModules':4,'completedModules':0,'percent':0,'modules':out}

def scenario(name):
    advanced = name in ('advanced','stage2')
    on_stage2 = name=='stage2'
    levels=[]
    for n,t in enumerate(LEVEL_TITLES,1):
        st = 'locked'
        if advanced:
            st = ('completed' if n==1 else 'available' if n==2 else 'locked') if on_stage2 else ('completed' if n<=2 else ('available' if n==3 else 'locked'))
        else:
            st = 'available' if n==1 else 'finalization_required' if n==2 else 'locked'
        levels.append({'number':n,'title':t,'description':'','state':st,'courseVersionId':None,'rewardXp':25,'badge':'Discover' if n==1 else None,'estimatedMinutes':40})
    return {
      'me': {'id':'u1','name':'Gautam Verma','email':'learner@example.com','roles':[]},
      'dashboard': {
        'identity':{'unreadNotifications':1},
        'journey':{'pathwayId':'ai-engineering','levels':levels,'completedLevels':2 if advanced else 0,'nextMilestone':None},
        'gamification':{'totalXp':2450,'platformLevel':3,'xpForCurrentLevel':1200,'xpForNextLevel':3000,'streakDays':12,'achievements':[]},
        'preferences':{'journey_view':'map','leaderboard_visible':True,'public_name':'Gautam V'},
        'announcements':[
          {'id':'a1','title':"Teklozy Hackathon '26",'body':'Build real projects, win rewards and get featured.','starts_at':'2026-11-01T00:00:00Z'},
          {'id':'a2','title':'New Discover lessons','body':'Fresh visual lessons for both career paths.','starts_at':'2026-11-05T00:00:00Z'},
          {'id':'a3','title':'Streak rewards','body':'Keep learning daily to grow your streak.','starts_at':'2026-11-10T00:00:00Z'}],
        'upcomingEvents':[
          {'id':'e1','title':'DSA Tunnel: Kickoff','description':'Start your DSA quest and earn XP','starts_at':'2026-12-02T13:00:00Z','ends_at':'2026-12-02T15:00:00Z','capacity':200,'location':'Online','registrationState':None},
          {'id':'e2','title':'Expert Session: System Design','description':'Learn from industry experts','starts_at':'2026-12-05T13:00:00Z','ends_at':'2026-12-05T15:00:00Z','capacity':100,'location':None,'registrationState':None},
          {'id':'e3','title':'Mock Interview Marathon','description':'Practice, get feedback and improve','starts_at':'2026-12-09T13:00:00Z','ends_at':'2026-12-09T18:00:00Z','capacity':60,'location':None,'registrationState':None}],
        'leaderboard':{'period':'week','items':[{'rank':1,'publicName':'Rohit Varma','xp':5420,'isMe':False},{'rank':2,'publicName':'Sreeja K.','xp':4980,'isMe':False},{'rank':3,'publicName':'Karthik R.','xp':4760,'isMe':False}],'me':{'rank':14,'xp':2450}},
      },
      'pathways': {'items':[
        {'id':'software-development','title':'Software Development','displayTitle':'Development','description':'Discover how software is designed, developed and deployed.','xpReward':25,
         'domains':[{'id':'d1','title':'Frontend'},{'id':'d2','title':'Backend'},{'id':'d3','title':'Database'},{'id':'d4','title':'Deployment'}]},
        {'id':'ai-engineering','title':'Artificial Intelligence','displayTitle':'Artificial Intelligence','description':'Discover how machines learn, generate content and perform intelligent tasks.','xpReward':25,
         'domains':[{'id':'d5','title':'Machine Learning'},{'id':'d6','title':'Deep Learning'},{'id':'d7','title':'GenAI'},{'id':'d8','title':'Agentic AI'}]}]},
      'stage': modules_stage(4 if advanced else 0),
      'name': name,
    }

VISUAL = {'lessonId':'x','format':'visual','version':1,'title':'What is AI?','description':'A visual tour of what Artificial Intelligence is.','learningObjectives':['Define AI in one sentence','Recognise AI in everyday products'],'estimatedMinutes':4,
  'sections':[
    {'id':'s1','type':'concept_explanation','title':'AI in one sentence','content':{'body':'Artificial Intelligence is software that learns patterns from data to make predictions or decisions.','highlights':['Learns from examples','Improves with feedback','Works at scale']}},
    {'id':'s2','type':'input_process_output','title':'How a model works','content':{'input':{'title':'Data','description':'Photos, text, numbers'},'process':{'title':'Model','description':'Finds patterns'},'output':{'title':'Prediction','description':'A label or an answer'}}},
    {'id':'s3','type':'key_takeaways','title':'Key takeaways','content':{'items':[{'id':'k1','title':'AI learns from data.'},{'id':'k2','title':'Models make predictions.'}]}}],
  'keyTakeaways':[{'id':'k1','title':'AI learns from data.'},{'id':'k2','title':'Models make predictions.'}],
  'quickCheck':{'sectionId':'q','title':'Quick check','questions':[{'id':'q1','kind':'single','prompt':'What does a model learn from?','options':[{'id':'o1','label':'Data'},{'id':'o2','label':'Magic'}]}]}}

MATERIAL = {'lesson':{'id':'x','title':'What is AI?','kind':'reading','objectives':['Define AI'],'estimated_minutes':4,'required':True},
  'resources':[
    {'id':'r1','kind':'text','title':'Introduction','body':'Artificial Intelligence (AI) is a branch of computer science.\n\nIt builds systems that learn from data.','url':None},
    {'id':'r2','kind':'video','title':'Platform introduction','body':None,'url':'https://www.youtube.com/watch?v=aircAruvnKk','provider':'YouTube'},
    {'id':'r3','kind':'pdf','title':'AI glossary (PDF)','body':None,'url':'https://example.org/ai-glossary.pdf'},
    {'id':'r4','kind':'external','title':'Elements of AI course','body':None,'url':'https://www.elementsofai.com/'}],
  'structuredContent':{'format':'visual'}}

def handle(url, method, body, state):
    u = urlparse(url); path = u.path.replace('/api/v1/','',1); q = {k:v[0] for k,v in parse_qs(u.query).items()}
    s = state
    if path.startswith('/api/auth'):
        return {'session':{'id':'s'}, 'user': s['me']}
    extra = extra_handle(path, q, method, s)
    if extra is not None: return extra
    if path=='me': return s['me']
    if path=='dashboard': return s['dashboard']
    if path=='pathways': return s['pathways']
    if path=='careers/me': return {'activeCareerPath':None,'switchAvailable':False,'pathProgress':[]}
    if path=='journey/stage-modules': return s['stage']
    if path=='stage2/batches/me': return {'enrolled':False,'eligible':False}
    if path=='journey/level':
        pid=q.get('pathwayId')
        return {'pathwayId':pid,'level':{'number':1,'title':'Discover','rewardXp':25,'badge':'Discover','state':'available'},'stageModules':s['stage'],'course':course(pid) if pid else None}
    if path=='journey': return s['dashboard']['journey']
    if path=='events': return {'items':s['dashboard']['upcomingEvents'],'nextOffset':None}
    if path=='announcements': return {'items':s['dashboard']['announcements'],'nextOffset':None}
    if path=='gamification/leaderboard': return {'period':q.get('period','week'),'items':s['dashboard']['leaderboard']['items'],'me':{'rank':14,'xp':2450}}
    if path=='notifications': return {'items':[{'id':'n1','type':'CourseLessonCompleted','created_at':'2026-11-15T10:00:00Z','read_at':None}]}
    if path=='lessons/content': return VISUAL
    if path=='courses/material': return MATERIAL
    if path=='course-assessments': return {'pass_percent':70,'instructions':'Answer all questions.','questions':[{'key':'q1','kind':'single','prompt':'Which of these is an AI application?','options':['Spam filter','Light switch','Paper clip']},{'key':'q2','kind':'boolean','prompt':'AI models learn from data.','options':['True','False']}]}
    if path=='me/preferences': return s['dashboard']['preferences']
    if path=='challenges': return {'items':[]}
    if path=='careers': return {'items':[{'id':'c1','title':'Machine Learning Engineer','summary':'Builds and ships ML models.','salaryRange':'₹8–25 LPA'},{'id':'c2','title':'Frontend Developer','summary':'Builds user interfaces.','salaryRange':'₹5–18 LPA'}]}
    if path=='gamification/achievements': return {'items':[]}
    if method in ('POST','PATCH','PUT'): return {'ok':True}
    return {}


# ---- Screen endpoints added 2026-11-17 (shapes from streaks.rules.ts, tunnels.service.ts, stage2Overview.service.ts, stage2Curriculum.service.ts)
WEEK = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

def streak(days):
    week=[{'date':f'2026-11-{16+i:02d}','weekday':w,'done':i<min(days,6),'isToday':i==1,'isFuture':i>1} for i,w in enumerate(WEEK)]
    if days >= 6: week=[{'date':f'2026-11-{10+i:02d}','weekday':w,'done':i<6,'isToday':i==5,'isFuture':i>5} for i,w in enumerate(WEEK)]
    msg = 'Keep the momentum! Learn daily, practice and build consistently.' if days>1 else 'Complete a lesson today to start your streak.'
    return {'timezone':'Asia/Kolkata','today':'2026-11-17','currentDays':days,'longestDays':days,'todayDone':days>0,'atRisk':False,'lastActiveDay':None,'week':week,'message':msg}

TUNNELS = {
  'dsa': {'id':'dsa','batchId':'dsa-tunnel','title':'DSA Tunnel','purpose':'Practise data structures and algorithms through engineering problems: reconciliation, scheduling, deduplication, dependency ordering and budgets.','startHere':'DSA01','whenToEnter':'Open any time.','optional':True,'modulesTotal':10,'modulesPublished':2,'project':None},
  'ai': {'id':'ai','batchId':'ai-basics','title':'AI Tunnel','purpose':'Build a document assistant step by step: Python foundations, evaluation, retrieval, cited answers, controlled tools and safe releases.','startHere':'AI01','whenToEnter':'Open any time.','optional':True,'modulesTotal':20,'modulesPublished':3,'project':{'id':'ai-document-assistant','title':'Document Q&A Assistant','summary':'Parse, search and answer over a policy library.'}},
}

def tunnel_overview(tid, open_):
    t=TUNNELS[tid]
    def card(code,i):
        return {'id':code,'code':code,'title':(['Arrays & reconciliation','Hash maps & dedup','Stacks & undo','Queues & scheduling','Heaps & priority','Trees & hierarchies','Graphs & dependency order','Search & budgets','Dynamic programming','Greedy choices'] if tid=='dsa' else ['Python foundations','Data handling','Evaluation basics','Prompt design','Retrieval','Embeddings','Citations','Tool calling','Safety','FastAPI & tracing'])[i%10],
                'teaches':None,'status':'published' if i<2 else 'awaiting_content','state':('available' if i==0 else 'locked') if open_ else None,'prerequisites':[]}
    if tid=='dsa': levels=[{'id':'dsa','title':'Core','readiness':None,'modules':[card(f'DSA{i+1:02d}',i) for i in range(10)]}]
    else: levels=[{'id':'foundations','title':'Foundations','readiness':None,'modules':[card(f'AI{i+1:02d}',i) for i in range(10)]},{'id':'advanced','title':'Advanced','readiness':'Complete AI10 to open the advanced missions.','modules':[card(f'AI{i+11:02d}',i+10) for i in range(4)]}]
    out=dict(t, open=open_, levels=levels, legacy=None)
    if not open_: out['reason']='ONBOARDING_REQUIRED'
    return out

GROUPS=[('Core Concepts','How browsers, servers and design decisions really work.'),('Build & Compose','Data, components and APIs that fit together.'),('Workflows & Tools','Testing, debugging, security and the tools teams use.'),('Real Development','Reliability, performance and shipping to production.')]

def stage2_overview(enrolled, eligible):
    shared={'level':{'number':2,'title':'Core Foundations'},'hero':{'title':'Build a Strong Foundation','summary':'Learn how real applications work, then prove it by fixing and building them in a real workspace.'},
      'gains':[{'id':'fundamentals','title':'Strong Fundamentals','description':''},{'id':'projects','title':'Build Real Projects','description':''},{'id':'tools','title':'Use Real Tools','description':''},{'id':'ai-ready','title':'Be AI-Ready','description':''}],
      'streak':streak(12),'tools':[],'competitions':[]}
    if not enrolled:
        return dict(shared, enrolled=False, enrollment={'enrolled':False,'eligible':eligible,'reason':None if eligible else 'LEVEL1_REQUIRED'}, learningPath=None, practice=None, projects=[],
                    nextMilestone={'title':'Complete Level 1 to unlock Level 2','unlocksLevel':2}, cta={'label':'Start Learning' if eligible else 'Finish Level 1','action':'enroll' if eligible else 'level1'})
    codes=[['FE01','FE02','UX01','BE01','DB01','QE01'],['FE03','FE04','BE02','DB02','UX02','BE03'],['QE02','DEP01','BE04','FE05','DB03'],['DEP02','BE05','FE06','QE03']]
    titles={'FE01':'How the browser renders','FE02':'HTML semantics & forms','UX01':'Design decisions','BE01':'HTTP & servers','DB01':'Relational data','QE01':'Reading errors'}
    groups=[]
    for gi,(t,sm) in enumerate(GROUPS):
        mods=[{'id':c,'title':titles.get(c, c+' module'),'state':('in_progress' if (gi==0 and j==0) else 'available' if (gi==0 and j==1) else 'locked'),'status':'published' if gi<2 else ('awaiting_content' if j>2 else 'published')} for j,c in enumerate(codes[gi])]
        groups.append({'number':gi+1,'title':t,'summary':sm,'lessonCount':len(mods)*2,'moduleCount':len(mods),'modulesCompleted':0,'percent':0,'state':'in_progress' if gi==0 else 'locked','modules':mods})
    return dict(shared, enrolled=True, batch={'id':'development-basics','title':'Development Basics'},
      learningPath={'groupsCompleted':0,'groupsTotal':4,'modulesCompleted':0,'modulesTotal':21,'groups':groups},
      practice={'items':[]}, projects=[], nextMilestone={'title':'Complete all 4 modules to unlock Level 3.','unlocksLevel':3},
      cta={'label':'Continue Learning','action':'module','moduleId':'FE01'})

def outline(mid):
    items=[{'itemId':f'{mid}-c1:lesson','kind':'lesson','conceptId':f'{mid}-c1','title':'How a page becomes pixels','minutes':12,'format':'reading','state':'completed','position':1},
           {'itemId':f'{mid}-c1:guided','kind':'guided','conceptId':f'{mid}-c1','title':'Guided problem: The blank checkout page','minutes':15,'format':'reading','state':'available','position':2},
           {'itemId':f'{mid}-c2:lesson','kind':'lesson','conceptId':f'{mid}-c2','title':'Critical rendering path','minutes':10,'format':'reading','state':'locked','position':3},
           {'itemId':f'{mid}-c1:challenge','kind':'challenge','conceptId':f'{mid}-c1','title':'Fix the slow product page','moduleId':mid,'challengeId':f'{mid}-slow-page','workspace':{'type':'lab','tools':['terminal']},'state':'locked','position':4}]
    return {'module':{'id':mid,'code':mid,'title':'How the browser renders','trackTitle':'Frontend','state':'in_progress','missingPrerequisites':[],'concepts':[]},
            'progress':{'itemsCompleted':1,'itemsTotal':4,'percent':25,'lessonsCompleted':1,'lessonsTotal':3,'challengesUnlocked':False},'items':items,'next':{'itemId':items[1]['itemId'],'kind':'guided','title':items[1]['title']}}

def extra_handle(path, q, method, s):
    name = s.get('name')
    onboarded = name=='stage2'
    if path=='streaks/me': return streak(12 if name!='fresh' else 0)
    if path=='tunnels':
        return {'items':[dict(TUNNELS[t], open=onboarded, progress=({'percent':10 if t=='dsa' else 0,'modulesCompleted':1 if t=='dsa' else 0,'modulesTotal':TUNNELS[t]['modulesTotal']} if onboarded else None)) for t in ('dsa','ai')]}
    if path=='tunnels/overview': return tunnel_overview(q.get('tunnelId','dsa'), onboarded)
    if path=='stage2/batches/me': return {'enrolled':True,'batch':{'id':'development-basics','title':'Development Basics'}} if name=='stage2' else {'enrolled':False,'eligible':name=='advanced','reason':None}
    if path=='stage2/overview': return stage2_overview(name=='stage2', name=='advanced')
    if path=='stage2/progress': return {'batchId':'development-basics','modulesCompleted':5,'modulesTotal':21,'percent':24,'modules':[]}
    if path=='stage3/eligibility': return {'eligible':False,'missingModules':['FE01','FE02'],'requirements':[]}
    if path=='stage2/modules/outline': return outline(q.get('moduleId','FE01'))
    if path=='stage2/challenges': return {'conceptId':q.get('conceptId'),'storage':{'moduleId':'FE01','challengeId':'FE01-slow-page'},'workspace':{'type':'lab'}}
    if path=='careers/me' and onboarded: return {'activeCareerPath':{'id':'software-development'},'switchAvailable':False,'pathProgress':[]}
    return None
