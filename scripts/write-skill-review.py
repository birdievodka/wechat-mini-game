"""Build the local review document using the bundled document runtime."""
import json
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/skill-review-v5.0.1'
DATA = json.loads((OUT / 'skills.json').read_text())
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.5), Inches(11)
sec.top_margin = sec.bottom_margin = Inches(.65)
sec.left_margin = sec.right_margin = Inches(.8)
sec.header_distance = sec.footer_distance = Inches(.28)

for name in ['Normal', 'Title', 'Subtitle', 'Heading 1', 'Heading 2', 'Header', 'Footer']:
    st = doc.styles[name]
    st.font.name = 'Noto Sans CJK SC'
    st.font.color.rgb = RGBColor(0, 0, 0)
    st.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), 'Noto Sans CJK SC')
    st.font.size = Pt(11)
normal = doc.styles['Normal'].paragraph_format
normal.space_after = Pt(6)
normal.line_spacing = 1.12
doc.styles['Title'].font.size = Pt(26)
doc.styles['Title'].paragraph_format.space_after = Pt(12)
doc.styles['Subtitle'].font.italic = False
doc.styles['Heading 1'].font.size = Pt(19)
doc.styles['Heading 1'].paragraph_format.space_after = Pt(8)
doc.styles['Heading 2'].font.size = Pt(13)
doc.styles['Heading 2'].paragraph_format.space_before = Pt(12)
doc.styles['Heading 2'].paragraph_format.space_after = Pt(6)
sec.header.paragraphs[0].text = '桃园乱斗  当前技能评审'
sec.header.paragraphs[0].runs[0].font.size = Pt(9)
foot = sec.footer.paragraphs[0]
foot.alignment = 2
foot.add_run('2026年11月13日  ·  ')
fld = OxmlElement('w:fldSimple'); fld.set(qn('w:instr'), 'PAGE'); foot._p.append(fld)
for r in foot.runs: r.font.size = Pt(9)

doc.add_paragraph('桃园乱斗当前技能评审册', 'Title')
doc.add_paragraph('24项通用技能的名称 机制与现有效果', 'Subtitle')
doc.add_paragraph('本册汇总已开放的24项通用技能，供下一轮特效重做评审。当前增益和防护造型相似，部分高阶技能的视觉重量不足。本轮未修改战斗代码。')
doc.add_heading('阅读口径', 2)
doc.add_paragraph('每名英雄携带1项技能，开局就绪。成功施法后，击杀普通敌军逐个充能，技能击杀也计；Boss、中立物与召唤物不计。时间不充能，最多储存1次。孔明与道具可降低需求，最低为基础的55%向上取整。')
doc.add_paragraph('S为已装备武器的理论单目标每秒伤害合计乘技能加成，不是单次攻击力。技能不额外随机暴击；范围为世界坐标。防护次数和时长先到即结束，击退受敌人抗性影响。')
doc.add_heading('技能分组', 2)
table = doc.add_table(rows=1, cols=3)
table.autofit = False
for c, w in zip(table.columns, [0.65, 4.8, 1.45]): c.width = Inches(w)
for c, v in zip(table.rows[0].cells, ['威力', '技能名称', '基础击杀']): c.text = v
tiers = ['I', 'II', 'III', 'IV', 'V', 'VI']
for i in range(6):
    ss = DATA['skills'][i*4:(i+1)*4]
    for c, v in zip(table.add_row().cells, [tiers[i], '  '.join(s['name'] for s in ss), f"{ss[0]['killCharge']}至{ss[-1]['killCharge']}"]): c.text = v
pr = table._tbl.tblPr
borders = OxmlElement('w:tblBorders')
for edge in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
    e = OxmlElement('w:'+edge); e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '4'); e.set(qn('w:color'), 'D9D9D9'); borders.append(e)
pr.append(borders)
for i, row in enumerate(table.rows):
    for j, c in enumerate(row.cells):
        c.vertical_alignment = 1
        mar = OxmlElement('w:tcMar')
        for edge in ['top','bottom','left','right']:
            e = OxmlElement('w:'+edge); e.set(qn('w:w'), '85'); e.set(qn('w:type'), 'dxa'); mar.append(e)
        c._tc.get_or_add_tcPr().append(mar)
        for p in c.paragraphs:
            p.paragraph_format.space_after = Pt(0)
            if j != 1: p.alignment = 1
            for r in p.runs: r.font.size = Pt(10.5)
        if i == 0:
            sh = OxmlElement('w:shd'); sh.set(qn('w:fill'), '334D40'); c._tc.get_or_add_tcPr().append(sh)
            for r in c.paragraphs[0].runs: r.font.color.rgb = RGBColor(255,255,255); r.bold = True
doc.add_paragraph('威力阶按伤害、覆盖、控制与生存价值综合排序，不能视为严格的DPS排名或已经验证的胜率。', style='Normal')
doc.add_heading('预览与重做重点', 2)
doc.add_paragraph('预览由当前程序定帧，统一缩放，角色与兵为静态参照。它不是微信实机截图或新设计稿，单帧不能展示完整连段。建议区分增益轮廓，补足盾次数和吸箭反馈，再加强横扫、箭雨与流星的爆发层次。')

for i in range(6):
    h = doc.add_heading(f'威力 {tiers[i]} 技能与当前效果', 1)
    h.paragraph_format.page_break_before = True
    p = doc.add_paragraph()
    p.alignment = 1
    p.paragraph_format.space_after = Pt(6)
    p.add_run().add_picture(str(OUT/f'tier-{i+1}.png'), width=Inches(5.7))
    for s in DATA['skills'][i*4:(i+1)*4]:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(7)
        p.paragraph_format.keep_together = True
        p.add_run(f"{s['name']}  {s['id']}  ·  {s['killCharge']}击杀\n").bold = True
        extra = '' if s['id'] in ['G01','G02','G03','G04','G07','G09','G23'] else ' '+s['detail']
        p.add_run(f"{s['damage']}；{s['range']}；{s['duration']}。{s['effect']}{extra}")
        # The full per-skill visual critique is in the linked plain-text companion.

doc.core_properties.title = '桃园乱斗当前技能评审册'
doc.core_properties.subject = '24通用技能的当前机制与程序效果预览'
doc.core_properties.author = '桃园乱斗项目'
doc.core_properties.comments = DATA['version']+'；来源 chronicles-data.ts CommonSkillRuntime.ts CommonSkillEffects.ts'
# Remove template rules and theme font overrides; explicitly assign Chinese fonts
# to every run, including headers and table cells, for portable PDF rendering.
for style in doc.styles:
    for border in list(style.element.iter(qn('w:pBdr'))): border.getparent().remove(border)
for el in doc.element.iter():
    if el.tag == qn('w:r'):
        rpr = el.find(qn('w:rPr'))
        if rpr is None: rpr = OxmlElement('w:rPr'); el.insert(0, rpr)
        fonts = rpr.find(qn('w:rFonts'))
        if fonts is None: fonts = OxmlElement('w:rFonts'); rpr.insert(0, fonts)
        for key in list(fonts.attrib): del fonts.attrib[key]
        for key in ['ascii','hAnsi','eastAsia','cs']: fonts.set(qn('w:'+key), 'Noto Sans CJK SC')
doc.save(OUT/'桃园乱斗当前技能评审册.docx')
print(OUT/'桃园乱斗当前技能评审册.docx')
