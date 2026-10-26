"""충남교육청 '학원 및 교습소 현황'(공공데이터포털 15015298, xlsx)에서
배방·탕정의 유아 대상 영어 과정을 골라 data/academies/<조회일>.json 으로 저장한다.

사용법: python3 -I scripts/academy-extract.py data/raw/academy/충남_학원교습소_20260630.xlsx 2026-06-30
필요: openpyxl

- '영어유치원'은 법적으로 유치원이 아니라 학원이다(유아학비 지원·유치원 공시 대상 아님).
- 등록 자료의 교습비는 '교육청에 등록한 금액'이며 실제 청구액·교재비·차량비는 학원 확인 필요.
- 대상 연령은 교습과목(반) 이름으로만 판단한다. 이름에 유아·유치가 없으면 '대상 연령 미표기'로 둔다.
"""
import json
import re
import sys
from datetime import date

import openpyxl

AREAS = ('배방', '탕정')
PRESCHOOL = re.compile(r'유치|유아|kinder|킨더|\bPK\b|\bK[1-7]\b|프리스쿨', re.I)
WEAK = re.compile(r'Early|PRE\s', re.I)  # 단계 이름일 수도 있어 유아반으로 단정하지 않음
ENGLISH = re.compile(r'영어|어학|English|외국어|파닉스|phonics', re.I)
# 유아 전문으로 알려졌지만 등록 과목명에 대상 연령이 없는 곳(제3자 학원 안내 사이트 표기) → 확인 필요로만 표시
CHECK_NAMES = {
    '힐사이드컬리지잇천안아산학원': "학원 안내 사이트에 '유치부 전문'으로 표기(제3자 자료). 등록 과목명에는 대상 연령 없음",
}


def num(x):
    try:
        return float(str(x).replace(',', ''))
    except (TypeError, ValueError):
        return None


def rows(ws):
    it = ws.iter_rows(values_only=True)
    for _ in range(3):
        next(it)
    hdr = [str(h).strip() if h else '' for h in next(it)]
    for r in it:
        yield dict(zip(hdr, r))


def main(path, as_of):
    wb = openpyxl.load_workbook(path, read_only=True)
    acad = {}
    for sheet, kind, name_col, addr_col, min_col in (
        ('학원(목록)', '학원', '학원명', '학원주소', '총교습시간(분)'),
        ('교습소(목록)', '교습소', '교습소명', '교습소주소', '총교습기간(분)'),
    ):
        for d in rows(wb[sheet]):
            if d.get('지역') != '아산':
                continue
            addr = str(d.get(addr_col) or '').strip()
            area = next((a for a in AREAS if a in addr), None)
            if not area:
                continue
            name = str(d.get(name_col)).strip()
            course = {
                'field': d.get('교습과정'),
                'name': str(d.get('교습과목(반)') or '').strip(),
                'capacity': num(d.get('정원')),
                'period': d.get('교습기간') or d.get('교습기간(개월)'),
                'minutesTotal': num(d.get(min_col)),
                'tuition': num(d.get('교습비')),
                'otherFees': num(d.get('기타경비합계')) if not str(d.get('기타경비합계') or '').startswith('=') else None,
                'vehicleFee': num(d.get('차량비')),
                'mealFee': num(d.get('급식비')),
            }
            a = acad.setdefault(name, {'name': name, 'kind': kind, 'area': area + ('읍' if area == '배방' else '면'), 'address': addr,
                                      'phone': d.get('전화번호'), 'teachers': num(d.get('강사수')), 'courses': []})
            a['courses'].append(course)

    out = []
    for a in acad.values():
        eng = [c for c in a['courses'] if ENGLISH.search(f"{c['field']} {c['name']} {a['name']}")]
        if not eng:
            continue
        pre = [c for c in eng if PRESCHOOL.search(c['name'])]
        weak = [c for c in eng if not PRESCHOOL.search(c['name']) and WEAK.search(c['name'])]
        # 영어유치원 형태: 유아반 이름 + 월 4,000분 이상(하루 약 3시간 20분 이상, 월 20일 기준)
        day = [c for c in pre if (c['minutesTotal'] or 0) >= 4000]
        if day:
            group = '유아 종일 영어반 (영어유치원 형태)'
        elif a['name'] in CHECK_NAMES:
            group = '유아 전문 여부 확인 필요'
        elif pre or weak:
            group = '유치부 단과반 (유치원·어린이집 하원 후)'
        else:
            continue
        note = CHECK_NAMES.get(a['name'])
        if weak and not pre:
            note = "과목명의 'Early'·'PRE'가 유아반인지 단계 이름인지 등록 자료로는 알 수 없음 — 확인 필요"
            pre = weak
        out.append({**a, 'group': group, 'note': note,
                    'englishCourses': eng, 'preschoolCourses': pre, 'courses': None})
    order = {'유아 종일 영어반 (영어유치원 형태)': 0, '유아 전문 여부 확인 필요': 1, '유치부 단과반 (유치원·어린이집 하원 후)': 2}
    out.sort(key=lambda x: (order[x['group']], x['area'], x['name']))
    res = {
        'source': {'name': '충청남도교육청_학원 및 교습소 현황', 'url': 'https://www.data.go.kr/data/15015298/fileData.do', 'asOf': as_of,
                   'kind': '공식 등록 자료', 'readMode': '공식 다운로드 원문'},
        'checkedAt': date.today().isoformat(),
        'scope': '아산시 배방읍·탕정면 주소의 학원·교습소 중 영어 과정이 있고 과목명에 유아·유치 등이 있는 곳',
        'academies': out,
    }
    with open(f'data/academies/{res["checkedAt"]}.json', 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=2, default=str)
    for x in out:
        print(x['group'], '|', x['name'], '|', x['area'], '|', len(x['preschoolCourses']))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
