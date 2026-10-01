from pathlib import Path
import json,re
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
build=json.loads((BASE/'last-build.json').read_text(encoding='utf8'))
reader=PdfReader(build['pdf'])
audit=json.loads((BASE/'layout-audit.json').read_text(encoding='utf8'))
normalize=lambda s: re.sub(r'\s+','',s)
checks=[]
for i,page in enumerate(reader.pages,1):
    text=normalize(page.extract_text())
    expected=''.join(normalize(r['text']) for r in audit['sourceText'] if r['page']==i)
    if text!=expected: raise ValueError(f'Text mismatch page {i}')
    if abs(float(page.mediabox.width)-595.276)>1 or abs(float(page.mediabox.height)-841.89)>1: raise ValueError('Not A4')
    page_bounds=[b for b in audit['bounds'] if b['page']==i and b['y']<790]
    overlaps=[]
    for a in range(len(page_bounds)):
        r=page_bounds[a]
        for s in page_bounds[a+1:]:
            if min(r['x']+r['w'],s['x']+s['w'])-max(r['x'],s['x'])>2 and min(r['y']+r['h'],s['y']+s['h'])-max(r['y'],s['y'])>2:
                overlaps.append([r['text'],s['text']])
    if overlaps: raise ValueError(f'Overlapping text page {i}: {overlaps}')
    checks.append({'page':i,'characters':len(text),'allTextPreserved':True,'textOverlap':False})
if len(reader.pages)!=12: raise ValueError('Page count')
renderdir=ROOT/'tmp/pdfs/tvsi-proposal'
images=sorted(renderdir.glob('page-*.png'))
if len(images)==12:
    for group in range(3):
        sheet=Image.new('RGB',(1240,1780),'#e5e5e7')
        draw=ImageDraw.Draw(sheet)
        for k,path in enumerate(images[group*4:group*4+4]):
            im=Image.open(path).convert('RGB')
            im.thumbnail((590,835))
            x=20+(k%2)*620;y=35+(k//2)*885
            sheet.paste(im,(x,y));draw.text((x,y-20),f'PAGE {group*4+k+1:02}',fill='#222')
        sheet.save(renderdir/f'contact-{group+1}.png')
(BASE/'pdf-verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'pages':len(reader.pages),'allTextPreserved':True,'textOverlaps':0,'renders':len(images)}))
