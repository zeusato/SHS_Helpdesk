"""One source draws searchable A4 PDF and a self-contained vector HTML reader.
Layout follows the approved Scientific Figure Plate direction A.
"""
from pathlib import Path
import base64
import html
import json
import math
import re
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import toColor as HexColor
from reportlab.lib.utils import ImageReader
from reportlab.lib.pagesizes import A4

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
PDF = OUT / 'TVSI_Tu_phan_hoi_den_tri_thuc.pdf'
HTML = HERE / 'TVSI_Tu_phan_hoi_den_tri_thuc.html'
W, H = A4
M = 45
CW = W - 2 * M
INK, RED, MUTED, LINE, PAPER = '#1E1E1E', '#D2353B', '#626267', '#D7D7DA', '#F7F7F8'
REG = ROOT / 'src/app/fonts/Nunito-Regular.ttf'
BOLD = ROOT / 'src/app/fonts/Nunito-Bold.ttf'
LOGO = ROOT / 'public/LOGO.png'
pdfmetrics.registerFont(TTFont('Nunito', str(REG)))
pdfmetrics.registerFont(TTFont('NunitoBold', str(BOLD)))
logo_data = base64.b64encode(LOGO.read_bytes()).decode()


class Document:
    def __init__(self):
        self.pdf_buffer = BytesIO()
        self.c = canvas.Canvas(self.pdf_buffer, pagesize=A4, pageCompression=1)
        self.c.setTitle('Từ phản hồi đến tri thức | Hồ sơ sáng kiến TVSI')
        self.c.setSubject('Tiếp nhận ý kiến, phối hợp xử lý và tích lũy tri thức nghiệp vụ')
        self.c.setAuthor('Trần Thị Quý - Phòng Marketing')
        self.pages, self.parts, self.texts, self.bounds = [], [], [], []
        self.number = 0

    def rect(self, x, y, w, h, fill=None, stroke=None, sw=.7):
        self.c.setLineWidth(sw)
        if fill: self.c.setFillColor(HexColor(fill))
        if stroke: self.c.setStrokeColor(HexColor(stroke))
        self.c.rect(x, H-y-h, w, h, fill=int(bool(fill)), stroke=int(bool(stroke)))
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{sw}"/>')

    def line(self, x1, y1, x2, y2, color=LINE, sw=.7):
        self.c.setStrokeColor(HexColor(color)); self.c.setLineWidth(sw)
        self.c.line(x1,H-y1,x2,H-y2)
        self.parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"/>')

    def arrow(self, points, color=MUTED, sw=1):
        for a,b in zip(points,points[1:]): self.line(*a,*b,color,sw)
        (px,py),(x,y)=points[-2:]
        angle=math.atan2(y-py,x-px)
        coords=[(x,y),(x-6*math.cos(angle-.45),y-6*math.sin(angle-.45)),(x-6*math.cos(angle+.45),y-6*math.sin(angle+.45))]
        self.polygon(coords,color,color)

    def polygon(self, points, fill='white', stroke=RED):
        path=self.c.beginPath(); path.moveTo(points[0][0],H-points[0][1])
        for x,y in points[1:]: path.lineTo(x,H-y)
        path.close(); self.c.setFillColor(HexColor(fill));self.c.setStrokeColor(HexColor(stroke));self.c.drawPath(path,fill=1,stroke=1)
        self.parts.append(f'<polygon points="{" ".join(f"{x},{y}" for x,y in points)}" fill="{fill}" stroke="{stroke}"/>')

    def width(self, text, size, bold=False):
        return pdfmetrics.stringWidth(text,'NunitoBold' if bold else 'Nunito',size)

    def wrap(self, text, width, size, bold=False):
        result=[]
        for paragraph in text.split('\n'):
            line=''
            for word in paragraph.split():
                candidate=(line+' '+word).strip()
                if self.width(candidate,size,bold)>width and line:
                    result.append(line);line=word
                else: line=candidate
            result.append(line)
        return result

    def text(self, text, x, y, width=CW, size=11, leading=15.6, bold=False, color=INK, align='left'):
        lines=self.wrap(text,width,size,bold)
        font='NunitoBold' if bold else 'Nunito'
        self.c.setFont(font,size); self.c.setFillColor(HexColor(color))
        self.texts.append({'page':self.number,'text':text})
        self.parts.append(f'<g class="text-block" data-text="{html.escape(text,quote=True)}" data-x="{x}" data-y="{y}" data-width="{width}" data-size="{size}" data-leading="{leading}" data-lines="{len(lines)}" data-bold="{int(bold)}" data-color="{color}" data-align="{align}"><rect class="edit-hit" x="{x}" y="{y}" width="{width}" height="{len(lines)*leading}" fill="transparent"/>')
        for i,s in enumerate(lines):
            top=y+i*leading
            xx=x if align=='left' else x+(width-self.width(s,size,bold))/(2 if align=='center' else 1)
            baseline=top+size*.85
            self.c.drawString(xx,H-baseline,s)
            self.parts.append(f'<text x="{xx:.3f}" y="{baseline:.3f}" font-family="Nunito" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{html.escape(s)}</text>')
            self.bounds.append({'page':self.number,'text':s,'x':round(xx,2),'y':round(top,2),'w':round(self.width(s,size,bold),2),'h':size})
        self.parts.append('</g>')
        return y+len(lines)*leading

    def para(self,text,y,**kwargs):
        return self.text(text,M,y,**kwargs)+12

    def label(self,text,y,x=M):
        return self.text(text,x,y,size=9.3,leading=13,bold=True,color=RED)

    def sub(self,title,text,y):
        y=self.text(title,M,y,size=12.4,leading=17,bold=True)+6
        return self.para(text,y)

    def note(self,text,y):
        h=len(self.wrap(text,CW-24,10.5))*14.5+22
        self.rect(M,y,CW,h,fill=PAPER)
        self.text(text,M+12,y+11,width=CW-24,size=10.5,leading=14.5)
        return y+h+16

    def caption(self,n,text,y):
        self.label(f'Hình {n:02}',y)
        self.text(text,M+49,y,width=CW-49,size=9.3,leading=13,color=MUTED)
        return y+24

    def new(self,title,label,cover=False):
        if self.number: self.finish_page()
        self.number+=1; self.parts=[]
        self.c.bookmarkPage(f'p{self.number}')
        self.c.addOutlineEntry(title,f'p{self.number}',0,False)
        self.c.drawImage(ImageReader(str(LOGO)),M,H-70,106,106*49/184,mask='auto')
        self.parts.append(f'<image href="data:image/png;base64,{logo_data}" x="{M}" y="{70-106*49/184}" width="106" height="{106*49/184}"/>')
        self.text('HỒ SƠ SÁNG KIẾN',W-M-175,43,width=175,size=9.2,leading=13,align='right')
        self.text('TVSI HELPDESK',W-M-175,58,width=175,size=9,leading=13,color=MUTED,align='right')
        self.line(M,85,W-M,85,RED,1.35)
        self.label(f'{self.number:02}  /  {label.upper()}',111)
        if cover:
            self.text('Từ phản hồi',M,140,size=40.5,leading=46,bold=True)
            self.text('đến tri thức',M,185,size=40.5,leading=46,bold=True,color=RED)
            return 250
        return self.text(title,M,140,size=25,leading=30,bold=True)+19

    def table(self,headers,rows,widths,y,size=10.5):
        heights=[max(len(self.wrap(str(cell),w-18,size,True))*14.5 for cell,w in zip(headers,widths))+20]
        heights += [max(len(self.wrap(str(cell),w-18,size,j==0))*14.5 for j,(cell,w) in enumerate(zip(row,widths)))+22 for row in rows]
        for i,(row,h) in enumerate(zip([headers]+rows,heights)):
            self.rect(M,y,CW,h,fill=PAPER if i==0 else None)
            x=M
            for j,(cell,w) in enumerate(zip(row,widths)):
                self.text(str(cell),x+9,y+10,width=w-18,size=size,leading=14.5,bold=(i==0 or j==0),color=RED if i==0 else INK)
                x+=w
            self.line(M,y+h,W-M,y+h)
            y+=h
        return y+18

    def node(self,text,x,y,w,h,kind='normal',size=10.5):
        self.rect(x,y,w,h,fill=RED if kind=='solid' else 'white',stroke=RED if kind!='normal' else '#99999D',sw=.8)
        lines=self.wrap(text,w-12,size,True)
        self.text(text,x+6,y+(h-len(lines)*14)/2,width=w-12,size=size,leading=14,bold=True,color='white' if kind=='solid' else INK,align='center')

    def finish_page(self):
        self.line(M,H-53,W-M,H-53)
        self.text('TVSI Helpdesk · Từ phản hồi đến tri thức',M,H-39,size=8.7,leading=12,color=MUTED)
        self.text(f'{self.number:02} / 12',W-M-60,H-39,width=60,size=8.7,leading=12,color=RED,align='right')
        self.pages.append('<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trang '+str(self.number)+'" viewBox="0 0 '+str(W)+' '+str(H)+'">'+''.join(self.parts)+'</svg>')
        self.c.showPage()

    def save(self):
        self.finish_page(); self.c.save()
        assert self.number==12
        bad=[b for b in self.bounds if b['x'] < M-1 or b['x']+b['w'] > W-M+1 or b['y']+b['h'] > H-23 or b['y'] < 35]
        if bad: raise ValueError(f'Text outside page bounds: {bad}')
        pending = OUT / '.tvsi-proposal.pending.pdf'
        pending.write_bytes(self.pdf_buffer.getvalue())
        pdf_path = PDF
        try:
            pending.replace(pdf_path)
        except PermissionError:
            version = 2
            while (OUT / f'{PDF.stem}_v{version}.pdf').exists():
                version += 1
            pdf_path = OUT / f'{PDF.stem}_v{version}.pdf'
            pending.replace(pdf_path)
        fonts=''.join(f'@font-face{{font-family:Nunito;src:url(data:font/ttf;base64,{base64.b64encode(p.read_bytes()).decode()});font-weight:{weight}}}' for p,weight in [(REG,400),(BOLD,700)])
        document='''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TVSI · Từ phản hồi đến tri thức</title><style>FONTS
*{box-sizing:border-box}body{margin:0;background:#E8E8EA;color:#1E1E1E;font-family:Nunito,sans-serif}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 24px;background:white;position:sticky;top:0;z-index:5;border-top:4px solid #D2353B}.toolbar strong{display:block;font-size:17px}.toolbar small{font-size:12px;color:#626267}.controls{display:flex;gap:8px;align-items:center}button,select{font:14px Nunito;padding:8px 12px;background:white;border:1px solid #BBB;color:#1E1E1E;cursor:pointer}button:hover{border-color:#D2353B}.page{display:none;margin:24px auto;width:min(794px,calc(100vw - 24px));aspect-ratio:210/297;background:white;box-shadow:0 2px 18px #00000010}.page.active{display:block}.page svg{width:100%;height:100%;display:block}button:focus-visible,select:focus-visible{outline:3px solid #D2353B;outline-offset:3px}.page text{user-select:text}@media(max-width:700px){.toolbar{position:relative;flex-wrap:wrap;padding:12px}.controls{flex-wrap:wrap}button,select{padding:6px}}@page{size:A4;margin:0}@media print{.toolbar{display:none}body{background:white}.page{display:block!important;margin:0;width:210mm;height:297mm;box-shadow:none;break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><header class="toolbar"><div><strong>Từ phản hồi đến tri thức</strong><small>Hồ sơ sáng kiến · Hướng A · 12 trang A4</small></div><nav class="controls" aria-label="Điều khiển tài liệu"><button id="prev">Trước</button><select id="pageSelect" aria-label="Chọn trang">OPTIONS</select><button id="next">Sau</button><button id="print">In tài liệu</button></nav></header><main>PAGES</main><script>const pages=[...document.querySelectorAll('.page')],select=document.getElementById('pageSelect');let current=1;function show(n){current=Math.max(1,Math.min(pages.length,n));pages.forEach((p,i)=>p.classList.toggle('active',i+1===current));select.value=current;document.getElementById('prev').disabled=current===1;document.getElementById('next').disabled=current===pages.length;const u=new URL(location.href);u.searchParams.set('page',current);history.replaceState(null,'',u);localStorage.setItem('tvsi-proposal-page',current)}select.onchange=()=>show(+select.value);document.getElementById('prev').onclick=()=>show(current-1);document.getElementById('next').onclick=()=>show(current+1);document.getElementById('print').onclick=async()=>{await document.fonts.ready;print()};document.addEventListener('keydown',e=>{if(e.target.matches('select,textarea,input')||e.target.closest('dialog'))return;if(e.key==='ArrowRight')show(current+1);if(e.key==='ArrowLeft')show(current-1)});show(Number(new URLSearchParams(location.search).get('page'))||1);</script></body></html>'''
        document=document.replace('FONTS',fonts).replace('OPTIONS',''.join(f'<option value="{n}">Trang {n} / 12</option>' for n in range(1,13))).replace('PAGES',''.join(f'<section class="page" data-page="{i+1}">{svg}</section>' for i,svg in enumerate(self.pages)))
        document=document.replace('In tài liệu</button>', 'In / lưu PDF</button><button id="editMode" aria-pressed="false">Sửa nội dung</button><button id="saveHtml">Lưu bản HTML</button>')
        editor_css='''<style>.edit-hit{pointer-events:none}.editing .text-block{cursor:text}.editing .text-block .edit-hit{pointer-events:all}.editing .text-block:hover .edit-hit{fill:#ffe7e8}.editing #editMode{background:#D2353B;color:white}.edit-help{display:none}.editing .edit-help{display:block;font-size:12px;background:#fff4f4;margin:0;padding:10px 24px}dialog{width:min(680px,90vw);border:1px solid #ccc;padding:24px;font:15px/1.5 Nunito;background:white;color:#1E1E1E}dialog::backdrop{background:#0007}dialog h2{margin:0 0 8px}dialog textarea{width:100%;min-height:180px;padding:12px;font:16px/1.5 Nunito;border:1px solid #aaa}dialog .row{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}#editError{color:#B8262D;min-height:22px}@media print{dialog,.edit-help{display:none!important}.edit-hit{fill:transparent!important}}</style>'''
        editor_html='''<p class="edit-help">Bấm vào đoạn chữ để sửa. Mỗi đoạn có giới hạn dòng để giữ bố cục A4. Sau khi sửa, chọn Lưu bản HTML để giữ thay đổi; chọn In / lưu PDF để xuất bản in.</p><dialog id="editor"><h2>Sửa nội dung</h2><p id="editGuide"></p><textarea id="editText" aria-label="Nội dung đoạn văn"></textarea><p id="editError" role="status"></p><div class="row"><button id="cancelEdit">Hủy</button><button id="applyEdit">Áp dụng</button></div></dialog>'''
        editor_js='''<script>(()=>{
const ns='http://www.w3.org/2000/svg',mode=document.getElementById('editMode'),dlg=document.getElementById('editor'),input=document.getElementById('editText'),err=document.getElementById('editError');let block=null;
mode.onclick=()=>{const on=document.body.classList.toggle('editing');mode.setAttribute('aria-pressed',String(on))};
document.querySelectorAll('.text-block').forEach(g=>g.addEventListener('click',()=>{if(!document.body.classList.contains('editing'))return;block=g;input.value=g.dataset.text;err.textContent='';document.getElementById('editGuide').textContent='Giữ tối đa '+g.dataset.lines+' dòng để không đè nội dung kế tiếp.';dlg.showModal();input.focus()}));
document.getElementById('cancelEdit').onclick=()=>dlg.close();
document.getElementById('applyEdit').onclick=()=>{if(!block)return;const a=block.dataset;const probe=document.createElementNS(ns,'text');probe.setAttribute('font-family','Nunito');probe.setAttribute('font-size',a.size);probe.setAttribute('font-weight',a.bold==='1'?'700':'400');probe.setAttribute('visibility','hidden');block.ownerSVGElement.append(probe);const measure=s=>{probe.textContent=s;return probe.getComputedTextLength()};const lines=[];for(const p of input.value.split('\\n')){let line='';for(const word of p.trim().split(/\\s+/)){if(measure(word)>+a.width){probe.remove();err.textContent='Có từ vượt khung. Hãy rút gọn hoặc thêm khoảng trắng.';return}const t=(line+' '+word).trim();if(line&&measure(t)>+a.width){lines.push(line);line=word}else line=t}lines.push(line)}if(lines.length>+a.lines){probe.remove();err.textContent='Nội dung cần '+lines.length+' dòng; khung hiện có '+a.lines+' dòng. Hãy rút gọn để giữ bố cục.';return}block.querySelectorAll('text').forEach(t=>t.remove());lines.forEach((s,i)=>{const t=document.createElementNS(ns,'text');const width=measure(s);const x=+a.x+(a.align==='left'?0:(+a.width-width)/(a.align==='center'?2:1));t.setAttribute('x',x);t.setAttribute('y',+a.y+i*(+a.leading)+(+a.size)*.85);t.setAttribute('font-family','Nunito');t.setAttribute('font-size',a.size);t.setAttribute('font-weight',a.bold==='1'?'700':'400');t.setAttribute('fill',a.color);t.textContent=s;block.append(t)});probe.remove();a.text=input.value;dlg.close()};
document.getElementById('saveHtml').onclick=()=>{const copy=document.documentElement.cloneNode(true);copy.querySelector('body').classList.remove('editing');copy.querySelector('#editMode').setAttribute('aria-pressed','false');copy.querySelector('#editor').removeAttribute('open');const blob=new Blob(['<!doctype html>\\n'+copy.outerHTML],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='TVSI_Tu_phan_hoi_den_tri_thuc.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
})();</script>'''
        document=document.replace('</head>',editor_css+'</head>').replace('<main>',editor_html+'<main>').replace('</body>',editor_js+'</body>')
        HTML.write_text(document,encoding='utf-8')
        (HERE/'layout-audit.json').write_text(json.dumps({'pages':self.number,'bounds':self.bounds,'sourceText':self.texts},ensure_ascii=False,indent=2),encoding='utf-8')
        result = {'pdf':str(pdf_path),'html':str(HTML),'pages':self.number}
        (HERE/'last-build.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(result,ensure_ascii=False))


d=Document()

# 1: the approved cover grammar, with no invented author/competition fields.
d.new('Từ phản hồi đến tri thức','Tổng quan sáng kiến',cover=True)
d.text('Hệ thống tiếp nhận ý kiến, phối hợp xử lý\nvà tích lũy tri thức nghiệp vụ',M,237,size=14,leading=19,bold=True)
d.text('Tác giả: Trần Thị Quý  |  Phòng Marketing',M,283,size=11,leading=15,bold=True)
d.label('TÓM TẮT',310)
d.text('Một cổng tiếp nhận chung giúp ghi nhận ý kiến và vấn đề cần hỗ trợ, giao đúng đầu mối, theo dõi việc xử lý và phản hồi người gửi. Những cách giải quyết có giá trị được biên tập thành bài tri thức để đội ngũ sử dụng lại.',M+94,307,width=CW-94,size=11.5,leading=16.5)
d.caption(1,'Chu trình tiếp nhận, xử lý và tích lũy tri thức để dùng lại.',414)
d.line(M,438,W-M,438,INK)
for i,(head,body) in enumerate([
    ('Tiếp nhận\ncó đầu mối','Ghi nhận thành phiếu và xác định người phụ trách.'),
    ('Xử lý\ncó phản hồi','Theo dõi việc giải quyết và trả lời người gửi.'),
    ('Kinh nghiệm\nđược tích lũy','Chuẩn hóa cách giải quyết có giá trị thành bài Shape Up.')]):
    x=M+i*(CW+15)/3
    d.label(f'0{i+1} / '+['TIẾP NHẬN','XỬ LÝ','TÍCH LŨY'][i],455,x)
    d.text(head,x,478,width=143,size=13,leading=17,bold=True)
    d.text(body,x,519,width=143,size=10.5,leading=14.5,color=MUTED)
    if i<2:
        d.arrow([(x+148,495),(x+(CW+15)/3-9,495)],RED,1.25)
# The return path makes the figure a cycle: knowledge supports subsequent work.
middle=M+(CW+15)/3+70
last=M+2*(CW+15)/3+70
d.arrow([(last,565),(last,583),(middle,583),(middle,565)],RED,1.15)
d.text('Dùng lại cho yêu cầu tiếp theo',middle-8,592,width=last-middle+16,size=9.5,leading=14,color=RED,align='center')
d.line(M,617,W-M,617)
d.label('SHAPE UP',637)
d.text('Bài tri thức đã chuẩn hóa, gồm vấn đề, cách giải quyết và điều kiện áp dụng. Giữ liên kết với tình huống nguồn để tra cứu và dùng lại.',M+94,635,width=CW-94,size=11,leading=15.6)
d.label('PHẠM VI ÁP DỤNG',679)
d.text('Công nghệ · Chăm sóc khách hàng · Kinh doanh · Vận hành nội bộ',M,701,size=10.5,leading=15)
d.text('Đã có bản hiện thực hóa để kiểm chứng luồng cốt lõi.\nHiệu quả vận hành sẽ được đo trong giai đoạn thí điểm.',M+12,746,width=CW-12,size=9.8,leading=14,color=MUTED)
d.line(M,746,M,774,RED,1.3)

# 2: problem -> intervention -> measurable business value.
y=d.new('Giữ lại giá trị sau mỗi\nyêu cầu được giải quyết','Bài toán & mục tiêu')
y=d.para('Một phản hồi mang theo hai giá trị: nhu cầu cần được giải quyết ngay và kinh nghiệm có thể giúp tổ chức làm tốt hơn trong tương lai. Sáng kiến kết nối hai giá trị này trong một quy trình chung.',y)
y=d.label('NHỮNG ĐIỂM CẦN KHẢO SÁT TẠI ĐƠN VỊ THÍ ĐIỂM',y)+17
y=d.table(['Điểm vướng có thể gặp','Hướng cải tiến'],[
    ['Trao đổi phân tán, khó xác định trách nhiệm','Mỗi yêu cầu có phiếu, nhóm nghiệp vụ và đầu mối.'],
    ['Hỏi lại thông tin, giải thích lại cùng một vấn đề','Chuẩn hóa thông tin đầu vào và dùng hướng dẫn phù hợp.'],
    ['Kinh nghiệm nằm trong trao đổi cá nhân','Biên tập cách giải quyết thành tri thức chung.'],
    ['Khó nhìn được nhóm nhu cầu lặp lại','Theo dõi theo nhóm để chọn chủ đề cần cải tiến.'],
],[CW*.48,CW*.52],y)
y=d.text('Các điểm trên là giả thuyết cần khảo sát, không phải kết luận về thực trạng của mọi đơn vị.',M,y,size=9.8,leading=14,color=MUTED)+30
y=d.sub('Mục tiêu của sáng kiến','Ghi nhận đúng nhu cầu; làm rõ trách nhiệm; tổ chức phản hồi có căn cứ; lưu và dùng lại kinh nghiệm; tạo dữ liệu để quyết định cải tiến.',y)
y=d.sub('Đầu ra kỳ vọng','Một quy trình được đội ngũ sử dụng, một nhóm bài tri thức đáng tin cậy và bộ số liệu đủ để đánh giá hiệu quả trước khi nhân rộng.',y)
d.note('Câu hỏi đánh giá trung tâm: cùng một nhóm yêu cầu, tổ chức có phục vụ rõ ràng hơn và giảm công việc lặp lại với chi phí duy trì hợp lý hay không?',y)

# 3: roles and understandable concepts.
y=d.new('Một mô hình chung,\ntrách nhiệm rõ ở từng bước','Cách tổ chức vận hành')
y=d.table(['Khái niệm','Cách hiểu trong hệ thống'],[
    ['Portal\nCổng tiếp nhận','Trang độc lập để người dùng gửi ý kiến hoặc vấn đề cần hỗ trợ; không cần tài khoản nội bộ.'],
    ['Ticket\nPhiếu tiếp nhận','Đơn vị công việc gồm nhu cầu, người gửi, nhóm nghiệp vụ, người phụ trách, ưu tiên và trạng thái.'],
    ['Shape Up\nBài tri thức','Vấn đề, cách giải quyết và điều kiện áp dụng được chuẩn hóa để dùng lại, có liên kết với tình huống nguồn.'],
],[132,CW-132],y)
y=d.label('BỐN VAI TRÒ TRONG QUY TRÌNH',y)+20
y=d.table(['Vai trò','Trách nhiệm chính'],[
    ['Người gửi','Cung cấp vấn đề, kết quả mong muốn và thông tin liên hệ; bổ sung khi được yêu cầu.'],
    ['Đầu mối tiếp nhận','Kiểm tra nội dung, phân nhóm, giao người phụ trách và theo dõi việc xử lý.'],
    ['Người xử lý','Phối hợp chuyên môn, tra cứu hướng dẫn, giải quyết và chuẩn bị phản hồi.'],
    ['Phụ trách tri thức','Lựa chọn tình huống nên chuẩn hóa, rà soát bài và tổ chức cập nhật.'],
],[132,CW-132],y)
d.note('Một người có thể kiêm nhiệm nhiều vai trò. Thí điểm cần quy định người chịu trách nhiệm chính và người rà soát; tên vai trò nghiệp vụ không mặc nhiên là một cấp phê duyệt đã được tự động hóa.',y)

# 4: main flow figure follows the selected A, with readable decision branches.
d.new('Một yêu cầu được xử lý,\nnhiều lần sau được hưởng lợi','Luồng vận hành đề xuất')
d.caption(2,'Luồng xử lý và vòng tái sử dụng tri thức',218)
d.label('A / XỬ LÝ YÊU CẦU',250,M+72)
d.label('B / TÍCH LŨY TRI THỨC',250,M+337)
nx=M+72;nw=207;rx=M+337;rw=151
for text,y0 in [('Gửi ý kiến qua Portal',276),('Ghi nhận & giao đầu mối',334),('Làm rõ & xử lý',392),('Phản hồi người gửi',450)]:
    d.node(text,nx,y0,nw,39)
for yy in [315,373,431]:d.arrow([(nx+nw/2,yy),(nx+nw/2,yy+19)])
cx=nx+nw/2
d.arrow([(cx,489),(cx,513)])
d.polygon([(cx,513),(nx+nw,548),(cx,583),(nx,548)])
d.text('Đánh giá giá trị\ndùng lại',nx+31,534,width=nw-62,size=10.5,leading=14,bold=True,align='center')
d.arrow([(nx,411),(M+18,411),(M+18,295),(nx,295)])
d.rect(M+5,353,46,34,fill='white')
d.text('Cần\nbổ sung',M+5,355,width=46,size=9.2,leading=13,align='center',color=MUTED)
d.node('Lưu hồ sơ xử lý',nx,623,nw,39)
d.arrow([(cx,583),(cx,623)])
d.text('Không',cx+8,597,width=50,size=9.2,color=MUTED)
d.node('Biên tập Shape Up',rx,529,rw,38,'knowledge')
d.node('Rà soát & công bố',rx,587,rw,38,'knowledge')
d.node('Tra cứu cho yêu cầu mới',rx,645,rw,38,'solid',9.8)
d.arrow([(nx+nw,548),(rx,548)],RED)
d.text('Có',nx+nw+20,532,width=35,size=9.2,color=RED)
d.arrow([(rx+rw/2,567),(rx+rw/2,587)],RED)
d.arrow([(rx+rw/2,625),(rx+rw/2,645)],RED)
d.arrow([(rx+rw,664),(W-M,664),(W-M,411),(nx+nw,411)],RED)
d.text('Dùng lại cách giải quyết',rx-10,390,width=rw+10,size=9.2,color=RED)
d.line(M,704,W-M,704)
d.text('Không phải mọi phiếu đều thành bài tri thức. Cần rà soát nội dung và ẩn thông tin cá nhân trước khi công bố.',M,716,size=10.5,leading=15)
d.text('Luồng đề xuất có bước yêu cầu bổ sung. Hiện đội ngũ cần ghi nhận câu trả lời nhận qua email; hệ thống chưa tự thu email trả lời vào phiếu.',M,757,size=9.4,leading=13,color=MUTED)

# 5: novelty without unverifiable market or deployment claims.
y=d.new('Kết nối việc xử lý hôm nay\nvới năng lực phục vụ ngày mai','Điểm sáng tạo & giá trị')
y=d.para('Điểm nhấn của sáng kiến là cách tổ chức vận hành: kết nối tiếp nhận, trách nhiệm xử lý, phản hồi và tích lũy tri thức trong một vòng thống nhất, phù hợp với đơn vị áp dụng.',y)
items=[
    ('01','Thông tin đi cùng trách nhiệm','Phiếu tiếp nhận gắn một nhu cầu với đầu mối và trạng thái. Người quản lý có căn cứ để theo dõi; người xử lý có bối cảnh để tiếp tục công việc.'),
    ('02','Tri thức hình thành từ tình huống thực','Bài hướng dẫn được lựa chọn từ yêu cầu đã xử lý và giữ liên kết với phiếu nguồn, giúp hiểu vì sao bài tồn tại và khi nào nên dùng.'),
    ('03','Tri thức quay trở lại công việc','Bài đã công bố có thể được tìm, liên kết với yêu cầu mới và dùng khi chuẩn bị phản hồi. Kho tri thức gắn với tác vụ hằng ngày.'),
    ('04','Một khung vận hành cho nhiều nghiệp vụ','Giữ các bước cốt lõi; thay nhóm tiếp nhận, nội dung, người phụ trách và cách hướng dẫn theo nhu cầu của từng đơn vị.'),
]
for num,title,body in items:
    d.line(M,y,W-M,y)
    d.text(num,M,y+14,width=30,size=18,bold=True,color=RED)
    yy=d.text(title,M+47,y+14,width=CW-47,size=12.4,leading=17,bold=True)+7
    y=d.text(body,M+47,yy,width=CW-47,size=11,leading=15.6)+20
y=d.sub('Giá trị kỳ vọng','Giảm giải thích lặp lại, hỗ trợ phản hồi nhất quán, giữ kinh nghiệm khi nhân sự thay đổi và giúp nhận diện nhu cầu cải tiến. Mức độ đạt được cần được kiểm chứng bằng dữ liệu.',y)
d.text('Phạm vi sáng tạo: cải tiến ứng dụng và cách tổ chức công việc; không đặt luận điểm helpdesk hoặc kho kiến thức là phát minh mới trên thị trường.',M,y,size=9.8,leading=14,color=MUTED)

# 6: reusable knowledge with concrete content template and lifecycle.
y=d.new('Đóng gói kinh nghiệm\nthành một bài dùng được','Cấu trúc Shape Up')
y=d.para('Chọn tình huống có khả năng lặp lại, cách giải quyết đã được kiểm tra và phần hướng dẫn có thể dùng cho người khác. Không sao chép nguyên cuộc trao đổi có thông tin riêng vào kho dùng chung.',y)
y=d.caption(3,'Mẫu nội dung đề xuất cho một bài tri thức',y)
y=d.table(['Thành phần','Câu hỏi bài cần trả lời'],[
    ['Tình huống','Người dùng gặp vấn đề gì? Nhận biết bằng dấu hiệu nào?'],
    ['Phạm vi áp dụng','Ai dùng được? Trong điều kiện nào? Khi nào cần chuyển đầu mối khác?'],
    ['Cách giải quyết','Các bước đã xác nhận là gì? Kết quả mong đợi sau từng bước?'],
    ['Căn cứ và nguồn','Tài liệu nào cần đối chiếu? Phiếu nguồn nào tạo ra kinh nghiệm này?'],
    ['Trách nhiệm cập nhật','Ai phụ trách nội dung? Khi nào cần rà soát lại?'],
],[145,CW-145],y)
y=d.label('CHU KỲ TRI THỨC ĐỀ XUẤT',y)+22
boxw=(CW-48)/4
for i,label in enumerate(['Bản nháp','Rà soát','Công bố','Sử dụng']):
    x=M+i*(boxw+16);d.node(label,x,y,boxw,38,'solid' if i==2 else 'normal')
    if i<3:d.arrow([(x+boxw,y+19),(x+boxw+16,y+19)])
y+=57
y=d.para('Phản hồi từ việc sử dụng là căn cứ cập nhật, sửa hoặc ngừng dùng bài không còn phù hợp. Người phụ trách nghiệp vụ chịu trách nhiệm nội dung được công bố.',y)
d.note('Đã có trường vấn đề, giải pháp, tài liệu, tác giả và phiếu nguồn. Điều kiện áp dụng và lịch rà soát có thể ghi trong nội dung khi thí điểm; quản lý phiên bản và nhắc rà soát tự động là hướng hoàn thiện tiếp theo.',y)

# 7: narrative case, distinctly non-technical and illustrative.
y=d.new('Một câu hỏi nghiệp vụ,\nmột hướng dẫn có thể dùng lại','Tình huống minh họa')
y=d.note('Minh họa chăm sóc khách hàng: người dùng hỏi cần chuẩn bị gì cho một thủ tục. Ví dụ mô tả cách vận hành, không phải hướng dẫn thủ tục cụ thể của TVSI.',y)
steps=[
    ('Tiếp nhận nhu cầu','Người gửi nêu thủ tục cần thực hiện, điều chưa rõ và cách liên hệ qua Portal. Phiếu được ghi nhận theo nhóm nghiệp vụ.'),
    ('Làm rõ và giao đúng đầu mối','Đội tiếp nhận xác định trường hợp cụ thể, bổ sung thông tin cần thiết và giao người chịu trách nhiệm phản hồi.'),
    ('Tra cứu, xử lý và phản hồi','Nhân viên đối chiếu tài liệu đang áp dụng, kiểm tra hướng dẫn có sẵn và gửi câu trả lời phù hợp với hoàn cảnh người hỏi.'),
    ('Tách phần kiến thức dùng chung','Người phụ trách chọn phần hướng dẫn có thể tái sử dụng, bỏ thông tin cá nhân và nêu điều kiện áp dụng trước khi rà soát.'),
    ('Sử dụng trong lần hỏi tiếp theo','Nhân viên tìm bài đã công bố, kiểm tra còn phù hợp rồi dùng làm căn cứ. Nếu tình huống khác, tiếp tục xử lý và cập nhật bài khi cần.'),
]
for i,(title,body) in enumerate(steps):
    d.text(f'{i+1:02}',M,y,width=32,size=18,leading=23,bold=True,color=RED)
    yy=d.text(title,M+47,y,width=CW-47,size=12.4,leading=17,bold=True)+6
    y=d.text(body,M+47,yy,width=CW-47,size=11,leading=15.6)+22
    if i<4:d.line(M+11,y-11,M+11,y-2,LINE,1)
d.note('Với ý kiến cải tiến, đầu ra có thể là chấp nhận, cần làm rõ, đưa vào kế hoạch hoặc chưa phù hợp kèm lý do. Tiếp nhận ý kiến không đồng nghĩa cam kết triển khai mọi đề xuất.',y)

# 8: application matrix and boundaries.
y=d.new('Mở rộng theo nghiệp vụ,\ngiữ nguyên vòng vận hành','Khả năng áp dụng rộng rãi')
y=d.para('Mô hình phù hợp khi có đầu vào rõ, đầu mối chịu trách nhiệm, kết quả cần theo dõi, nhu cầu phản hồi và kinh nghiệm có thể chuẩn hóa.',y)
y=d.table(['Mảng nghiệp vụ','Đầu vào điển hình','Tri thức dùng lại'],[
    ['Chăm sóc khách hàng','Câu hỏi thủ tục, phản ánh trải nghiệm, yêu cầu hướng dẫn.','Câu trả lời theo tình huống; cách xử lý điểm vướng thường gặp.'],
    ['Kinh doanh','Câu hỏi về sản phẩm, tài liệu cần giải thích, góp ý cách phục vụ.','Hướng dẫn đã kiểm tra; điều kiện áp dụng; đầu mối chuyển tiếp.'],
    ['Công nghệ / sản phẩm số','Lỗi sử dụng, khó khăn thao tác, đề xuất tính năng.','Cách khắc phục; dấu hiệu nhận biết; thông tin cần thu thập.'],
    ['Vận hành nội bộ','Vướng mắc phối hợp, bàn giao, tra cứu quy trình.','Bảng kiểm; hướng dẫn phối hợp; cách xử lý ngoại lệ.'],
    ['Nhân sự / hành chính','Câu hỏi thủ tục, biểu mẫu, dịch vụ cho nhân viên.','Hướng dẫn thủ tục; câu hỏi thường gặp theo phạm vi được phép.'],
],[109,198,CW-307],y,size=10.5)
y=d.sub('Cách nhân rộng','Bắt đầu bằng cấu hình nhóm và người phụ trách; chuẩn hóa mẫu tiếp nhận, trạng thái và mẫu bài. Nghiệp vụ đặc thù có thể cần thêm trường thông tin, phân quyền hoặc bước duyệt.',y)
d.note('Những công việc có nhiều cấp phê duyệt, thời hạn bắt buộc hoặc dữ liệu riêng của cá nhân cần được đánh giá quy trình và quyền truy cập trước khi áp dụng. Không chỉ đổi tên danh mục rồi triển khai đồng loạt.',y)

# 9: feasibility/maturity and practical resource model.
y=d.new('Khả thi từ nền tảng đã có,\ntriển khai theo phạm vi nhỏ','Tính khả thi & nguồn lực')
y=d.table(['Căn cứ hiện có','Ý nghĩa đối với triển khai'],[
    ['Cổng tiếp nhận độc lập','Có thể kiểm chứng việc gửi yêu cầu ngoài khu vực làm việc nội bộ.'],
    ['Phiếu, phân công, trạng thái, email','Có luồng tiếp nhận và chuẩn bị phản hồi; lịch sử gửi được lưu theo phiếu.'],
    ['Chuyển phiếu thành Shape Up','Đã nối được tình huống nguồn với bản nháp tri thức và thư viện tra cứu.'],
    ['Nhóm nghiệp vụ và thống kê','Có cơ sở tổ chức thí điểm theo phạm vi và theo dõi lượng yêu cầu.'],
],[203,CW-203],y)
y=d.sub('Nguồn lực có thể tổ chức theo quy mô','Một đầu mối điều phối; đại diện tiếp nhận và xử lý của mỗi nhóm; người rà soát tri thức; hỗ trợ kỹ thuật cho hạ tầng, dữ liệu, tài khoản và gửi thư. Các vai trò có thể kiêm nhiệm trong phạm vi nhỏ.',y)
y=d.sub('Nhóm chi phí cần dự toán','Hạ tầng và lưu trữ; tên miền và gửi thư; thời gian cấu hình, đào tạo; thời gian biên tập, rà soát; vận hành và bảo trì. Dự toán dựa trên số người dùng, lượng yêu cầu, dung lượng và yêu cầu dịch vụ của thí điểm.',y)
y=d.sub('Điều kiện trước khi mở ra bên ngoài','Chốt phạm vi tiếp nhận, trách nhiệm phản hồi, quyền xem nội dung và ảnh, kiểm soát yêu cầu rác, sao lưu và phương án khi gián đoạn. Kiểm tra môi trường triển khai theo nhu cầu thực tế.',y)
d.note('Đã có bản hiện thực hóa để kiểm chứng các luồng cốt lõi. Khả năng vận hành chính thức, mức chịu tải và hiệu quả kinh doanh cần được xác nhận trong triển khai và thí điểm.',y)

# 10: plan with a clear decision gate rather than invented promises.
y=d.new('Thí điểm sáu tuần\nđể ra quyết định bằng bằng chứng','Kế hoạch áp dụng đề xuất')
y=d.para('Chọn một nhóm hỗ trợ công nghệ và một nhóm nghiệp vụ ngoài công nghệ để kiểm chứng cả luồng xử lý và khả năng mở rộng. Sáu tuần là khung tham khảo, điều chỉnh theo nguồn lực đơn vị.',y)
y=d.table(['Giai đoạn','Công việc trọng tâm','Đầu ra'],[
    ['Tuần 1-2\nChuẩn bị & đo nền','Khảo sát cách làm hiện tại; chọn loại yêu cầu; giao trách nhiệm; cấu hình nhóm và quyền; hướng dẫn đội ngũ.','Phạm vi, dữ liệu nền, chỉ tiêu và mục tiêu được chốt trước vận hành.'],
    ['Tuần 3-5\nVận hành thí điểm','Theo dõi phiếu, xử lý và phản hồi; chọn tình huống để biên tập bài; rà soát hằng tuần; ghi nhận số liệu.','Yêu cầu được xử lý, bài được công bố, dữ liệu đo và phản hồi sử dụng.'],
    ['Tuần 6\nĐánh giá & quyết định','So sánh nhóm yêu cầu tương đương; tính công sức phát sinh; đánh giá chất lượng và mức phù hợp.','Mở rộng, điều chỉnh rồi thử tiếp hoặc giữ phạm vi hiện tại.'],
],[101,233,CW-334],y)
y=d.label('ĐIỀU KIỆN QUYẾT ĐỊNH NHÂN RỘNG',y)+20
for title,body in [
    ('Quy trình được thực hiện','Đội ngũ có thể tiếp nhận, giao việc, phản hồi và duy trì bài tri thức theo cách đã thống nhất.'),
    ('Dữ liệu đủ tin cậy','Cách đo nhất quán, có đường cơ sở và phân biệt được nhóm yêu cầu hoặc độ phức tạp.'),
    ('Giá trị tương xứng công sức','Lợi ích quan sát được bù đắp công vận hành và biên tập; có người tiếp tục duy trì sau thí điểm.'),
]:y=d.sub(title,body,y)
d.text('Mục tiêu và ngưỡng đánh giá được thống nhất trước giai đoạn vận hành, tránh chọn số liệu có lợi sau khi kết thúc.',M,y,size=9.8,leading=14,color=MUTED)

# 11: measurement has definitions, collection limits and cost accounting.
y=d.new('Đo hiệu quả phục vụ,\nkhông chỉ đếm số phiếu','Chỉ tiêu & phương pháp đánh giá')
y=d.table(['Chỉ tiêu','Cách đo và lưu ý'],[
    ['Phản hồi đầu tiên','Trung vị thời gian từ tiếp nhận đến phản hồi có nội dung đầu tiên. Cần ghi mốc đầu tiên, không dùng email tự xác nhận.'],
    ['Thời gian hoàn tất','Từ tiếp nhận đến tiêu chí kết thúc đã thống nhất; tách nhóm chờ người gửi và độ phức tạp khi so sánh.'],
    ['Tỷ lệ dùng lại tri thức','Phiếu đủ điều kiện thực sự dùng bài đã công bố / tổng phiếu đủ điều kiện. Kiểm tra liên kết bài có hữu ích.'],
    ['Chất lượng bài','Tỷ lệ bài trong mẫu kiểm tra đạt tiêu chí đúng, đủ điều kiện áp dụng, không lộ thông tin riêng và còn cập nhật.'],
    ['Xử lý lại & trải nghiệm','Theo dõi yêu cầu chưa giải quyết thỏa đáng; khảo sát ngắn mức dễ gửi, độ rõ câu trả lời và công sức sử dụng.'],
],[142,CW-142],y)
y=d.sub('Thu thập dữ liệu phù hợp với phiên bản hiện tại','Liên kết phiếu và bài hỗ trợ theo dõi tái sử dụng. Mốc phản hồi đầu tiên, lịch sử trạng thái và khảo sát cần ghi bổ sung bằng bảng theo dõi có kiểm tra hoặc hoàn thiện chức năng đo trong thí điểm.',y)
y=d.label('ƯỚC LƯỢNG LỢI ÍCH THỜI GIAN',y)+19
y=d.note('Số tình huống lặp lại đã xác nhận × chênh lệch thời gian xử lý trước/sau, trừ công biên tập, rà soát và duy trì tri thức.',y)
y=d.para('So sánh các nhóm yêu cầu tương đương và báo cáo trung vị. Chỉ quy đổi tiền khi có đơn giá và phương pháp được đơn vị thống nhất; thời gian tiết kiệm không tự động là khoản tiền mặt tiết kiệm.',y)
d.text('Các chỉ tiêu là phương án đo đề xuất. Hồ sơ chưa đưa ra số tiết kiệm, tỷ lệ cải thiện hoặc hiệu quả kinh doanh đã đạt.',M,y,size=9.8,leading=14,color=MUTED)

# 12: governance, explicit decision sought, and grounded conclusion.
y=d.new('Đề xuất thí điểm,\ntạo nền tảng để mở rộng','Quản trị & kiến nghị')
y=d.sub('Bảo đảm chất lượng tri thức','Giao người phụ trách từng nhóm bài; rà soát theo mức biến động; giữ điều kiện áp dụng và liên kết tình huống nguồn; sửa hoặc ngừng dùng bài không còn phù hợp.',y)
y=d.sub('Giữ đúng phạm vi thông tin','Portal công khai là nơi gửi ý kiến, không đồng nghĩa người ngoài được xem toàn bộ phiếu hoặc kho tri thức. Cần kiểm tra quyền xem phiếu, ảnh và bài; ẩn thông tin cá nhân trước khi chia sẻ nội dung dùng chung.',y)
y=d.sub('Con người quyết định nội dung phản hồi','Nếu bật hỗ trợ AI, dùng như gợi ý tìm bài hoặc soạn nháp trong phạm vi dữ liệu được thống nhất. Người phụ trách kiểm tra độ đúng và điều kiện áp dụng trước khi gửi. Quy trình cốt lõi không phụ thuộc AI.',y)
y=d.label('KIẾN NGHỊ',y)+22
y=d.para('Cho phép thí điểm ở hai nhóm nghiệp vụ, giao đầu mối điều phối, thống nhất trách nhiệm nội dung, nguồn lực và phương pháp đo. Dùng kết quả thực tế để quyết định mức độ mở rộng.',y)
y=d.caption(4,'Chuỗi tình huống có thể kiểm chứng bằng trình diễn sản phẩm',y)
y=d.note('Gửi ý kiến > Tiếp nhận và xử lý > Phản hồi > Tạo bài tri thức > Dùng lại cho yêu cầu tương tự.',y)
y=d.para('Giá trị dài hạn là một thói quen vận hành: sau khi giải quyết một tình huống, tổ chức đồng thời giữ lại phần kinh nghiệm giúp lần sau làm tốt hơn. Một yêu cầu được xử lý đem lại lợi ích cho người gửi; một bài tri thức tốt có thể phục vụ nhiều lần tiếp theo.',y)
d.line(M,y+1,W-M,y+1,RED,1.3)
d.text('Căn cứ hồ sơ: mô hình do tác giả đề xuất và các chức năng trong bản hiện thực hóa TVSI Helpdesk, đối chiếu ngày 01/10/2026. Nhận diện: website chính thức TVSI (www.tvsi.com.vn). Tình huống nêu trong hồ sơ là minh họa; kế hoạch và chỉ tiêu là đề xuất thí điểm.',M,y+14,size=9.2,leading=13,color=MUTED)

d.save()
